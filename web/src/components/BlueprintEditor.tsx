import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Text, Group, Rect, Circle, Path } from 'react-konva';
import Konva from 'konva';
import ElevationEditor from './ElevationEditor';
import MagicBuildModal from './MagicBuildModal';

// --- Types ---

interface Point {
  x: number;
  y: number;
}

interface VerticalItem {
    id: string;
    item_type: 'switch' | 'outlet' | 'sconce' | 'frame' | 'tv' | 'picture' | 'arch' | 'circle';
    x: number;
    y: number;
    width?: number;
    height?: number;
}

type ElementType = 'wall' | 'window' | 'door' | 'opening';

interface Element {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  element_type: ElementType;
  height: number;
  curvature: number; 
  items: VerticalItem[];
}

interface Room {
    id: string;
    name: string;
    points: Point[];
    label_pos: Point;
    wallIds: string[]; 
}

interface Project {
    id: string;
    name: string;
    elements: Element[];
    rooms: Room[];
}

// --- Constants ---

const WALL_THICKNESS = 10;
const API_URL = 'http://localhost:3000';

// --- Helpers ---

const distance = (p1: Point, p2: Point) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const getControlPoint = (p1: Point, p2: Point, curvature: number) => {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return { x: midX, y: midY };
    const uX = -dy / len;
    const uY = dx / len;
    return { x: midX + uX * curvature, y: midY + uY * curvature };
};

const calculatePolygonArea = (points: Point[], unitSystem: 'imperial' | 'metric') => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    const pxArea = Math.abs(area / 2);
    
    if (unitSystem === 'imperial') {
        return (pxArea / 2500).toFixed(1) + " sq ft";
    } else {
        return (pxArea / (164*164)).toFixed(2) + " m²";
    }
};

const doSegmentsOverlap = (p1: Point, p2: Point, p3: Point, p4: Point) => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p4.x - p3.x, y: p4.y - p3.y };
    const crossProd = v1.x * v2.y - v1.y * v2.x;
    if (Math.abs(crossProd) > 1) return false; 
    const v3 = { x: p3.x - p1.x, y: p3.y - p1.y };
    const collinearCross = v1.x * v3.y - v1.y * v3.x;
    if (Math.abs(collinearCross) > 1) return false;
    if (Math.abs(v1.x) < 1) {
        const min1 = Math.min(p1.y, p2.y);
        const max1 = Math.max(p1.y, p2.y);
        const min2 = Math.min(p3.y, p4.y);
        const max2 = Math.max(p3.y, p4.y);
        return Math.max(min1, min2) < Math.min(max1, max2) - 1;
    } else {
        const min1 = Math.min(p1.x, p2.x);
        const max1 = Math.max(p1.x, p2.x);
        const min2 = Math.min(p3.x, p4.x);
        const max2 = Math.max(p3.x, p4.x);
        return Math.max(min1, min2) < Math.min(max1, max2) - 1;
    }
};

// --- Component ---

type Tool = 'select' | 'wall' | 'window' | 'door' | 'opening' | 'room';

const BlueprintEditor: React.FC = () => {
  const [elements, setElements] = useState<Element[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tool, setTool] = useState<Tool>('wall');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePoints, setActivePoints] = useState<Point[]>([]); 
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('My Design');
  const [isSaving, setIsSaving] = useState(false);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [showMagicModal, setShowMagicModal] = useState(false);
  
  // Settings
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [gridMode, setGridMode] = useState<'coarse' | 'fine'>('coarse');
  
  const stageRef = useRef<Konva.Stage>(null);

  const selectedElement = elements.find(el => el.id === selectedId);
  const selectedRoom = rooms.find(r => r.id === selectedId);
  const editingElement = elements.find(el => el.id === editingElementId);

  const getGridSize = () => {
      if (unitSystem === 'imperial') {
          return gridMode === 'coarse' ? 50 : 50/12;
      } else {
          return gridMode === 'coarse' ? 82 : 16.4; 
      }
  };

  const snapToGrid = (pos: Point) => {
    const size = getGridSize();
    return {
      x: Math.round(pos.x / size) * size,
      y: Math.round(pos.y / size) * size,
    };
  };

  const formatLength = (px: number) => {
      if (unitSystem === 'imperial') {
          const totalInches = px / (50/12);
          const feet = Math.floor(totalInches / 12);
          const inches = Math.floor(totalInches % 12);
          const fraction = Math.round((totalInches - Math.floor(totalInches)) * 16);
          let text = `${feet}' ${inches}"`;
          if (fraction > 0) text += ` ${fraction}/16`;
          return text;
      } else {
          const meters = px / 164;
          return `${meters.toFixed(2)}m`;
      }
  };
  
  const updateElementLength = (v1: number, v2: number, v3: number) => {
      if (!selectedElement) return;
      let totalPixels = 0;
      if (unitSystem === 'imperial') {
          totalPixels = (v1 * 12 + v2 + (v3 / 16)) * (50/12);
      } else {
          totalPixels = v1 * 164;
      }
      const dx = selectedElement.end.x - selectedElement.start.x;
      const dy = selectedElement.end.y - selectedElement.start.y;
      const currentLen = Math.sqrt(dx*dx + dy*dy);
      if (currentLen === 0) return;
      const uX = dx / currentLen;
      const uY = dy / currentLen;
      const newEnd = { x: selectedElement.start.x + uX * totalPixels, y: selectedElement.start.y + uY * totalPixels };
      setElements(elements.map(el => el.id === selectedElement.id ? { ...el, end: newEnd } : el));
  };

  const handleMagicGenerate = (generatedProject: Project) => {
      let offsetX = 0;
      if (elements.length > 0) {
          const maxX = Math.max(...elements.map(e => Math.max(e.start.x, e.end.x)));
          offsetX = maxX + 100; 
      }
      const newElements = generatedProject.elements.map(el => ({
          ...el,
          start: { x: el.start.x + offsetX, y: el.start.y },
          end: { x: el.end.x + offsetX, y: el.end.y }
      }));
      const newRooms = generatedProject.rooms.map(r => ({
          ...r,
          points: r.points.map(p => ({ x: p.x + offsetX, y: p.y })),
          label_pos: { x: r.label_pos.x + offsetX, y: r.label_pos.y },
      }));
      setElements([...elements, ...newElements]);
      setRooms([...rooms, ...newRooms]);
  };

  const handleElevationUpdate = (updated: Element) => {
      setElements(elements.map(el => el.id === updated.id ? updated : el));
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
    setStageScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) setSelectedId(null);
      if (tool === 'select') return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition(); 
      if (!pointer) return;
      const snapped = snapToGrid(pointer);
      
      if (tool === 'wall' || tool === 'window' || tool === 'door' || tool === 'opening') {
          if (activePoints.length === 0) {
              setActivePoints([snapped]);
          } else {
              const start = activePoints[0];
              const end = snapped;
              if (start.x !== end.x || start.y !== end.y) {
                  const newEl: Element = { id: crypto.randomUUID(), start, end, thickness: WALL_THICKNESS, element_type: tool as ElementType, height: 400, items: [], curvature: 0 };
                  setElements([...elements, newEl]);
                  if (tool === 'wall' || tool === 'opening') setActivePoints([end]); else setActivePoints([]);
              }
          }
      } else if (tool === 'room') {
          if (activePoints.length > 2) {
              const first = activePoints[0];
              if (distance(snapped, first) < 20) {
                  const name = prompt("Enter room name:", "Living Room") || "Room";
                  const cx = activePoints.reduce((acc, p) => acc + p.x, 0) / activePoints.length;
                  const cy = activePoints.reduce((acc, p) => acc + p.y, 0) / activePoints.length;
                  const newWalls: Element[] = [];
                  const wallIds: string[] = [];
                  for (let i = 0; i < activePoints.length; i++) {
                      const p1 = activePoints[i];
                      const p2 = activePoints[(i + 1) % activePoints.length];
                      const wid = crypto.randomUUID();
                      wallIds.push(wid);
                      newWalls.push({ id: wid, start: p1, end: p2, thickness: WALL_THICKNESS, element_type: 'wall', height: 400, items: [], curvature: 0 });
                  }
                  const newRoom: Room = { id: crypto.randomUUID(), name, points: activePoints, label_pos: { x: cx, y: cy }, wallIds };
                  setElements([...elements, ...newWalls]);
                  setRooms([...rooms, newRoom]);
                  setActivePoints([]);
                  return;
              }
          }
          if (activePoints.length > 0 && distance(snapped, activePoints[activePoints.length - 1]) < 1) return;
          setActivePoints([...activePoints, snapped]);
      }
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedId) {
                  setElements(elements.filter(el => el.id !== selectedId));
                  setRooms(rooms.filter(r => r.id !== selectedId));
                  setSelectedId(null);
              }
          }
          if (e.key === 'Escape') { setActivePoints([]); setTool('select'); }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, rooms]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const payload = { id: projectId || '', name: projectName, elements, rooms };
        let url = `${API_URL}/projects`;
        let method = 'POST';
        if (projectId) { url = `${API_URL}/projects/${projectId}`; method = 'PUT'; }
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Failed');
        const saved = await response.json();
        setProjectId(saved.id);
        alert('Saved!');
    } catch (error) { console.error(error); alert('Save failed'); } finally { setIsSaving(false); }
  };

  const renderGrid = () => {
      const size = getGridSize();
      const lines = [];
      for (let i = 0; i <= 100; i++) {
          lines.push(<Line key={`v${i}`} points={[i*size, 0, i*size, 5000]} stroke="#eee" strokeWidth={1} />);
          lines.push(<Line key={`h${i}`} points={[0, i*size, 5000, i*size]} stroke="#eee" strokeWidth={1} />);
      }
      return <Group>{lines}</Group>;
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-100 font-sans text-gray-900">
        <div className="bg-white border-b px-4 py-3 flex justify-between items-center z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <span className="font-bold text-xl text-indigo-600">LayoutLens</span>
                <input className="border rounded px-2 py-1 text-sm bg-gray-50" value={projectName} onChange={e => setProjectName(e.target.value)} />
                <div className="flex bg-gray-100 rounded p-1 gap-1">
                    <button onClick={() => setUnitSystem('imperial')} className={`px-2 py-0.5 text-xs rounded ${unitSystem === 'imperial' ? 'bg-white shadow' : 'text-gray-500'}`}>Imperial</button>
                    <button onClick={() => setUnitSystem('metric')} className={`px-2 py-0.5 text-xs rounded ${unitSystem === 'metric' ? 'bg-white shadow' : 'text-gray-500'}`}>Metric</button>
                </div>
                <div className="flex bg-gray-100 rounded p-1 gap-1">
                    <button onClick={() => setGridMode('coarse')} className={`px-2 py-0.5 text-xs rounded ${gridMode === 'coarse' ? 'bg-white shadow' : 'text-gray-500'}`}>Coarse</button>
                    <button onClick={() => setGridMode('fine')} className={`px-2 py-0.5 text-xs rounded ${gridMode === 'fine' ? 'bg-white shadow' : 'text-gray-500'}`}>Fine</button>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowMagicModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition flex items-center gap-2">✨ Magic Build</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 transition shadow-sm">{isSaving ? 'Saving...' : 'Save Project'}</button>
            </div>
        </div>

        <div className="flex flex-1 relative overflow-hidden">
            <div className="w-20 bg-white border-r flex flex-col items-center py-6 gap-6 z-10 shadow-sm">
                {[ 
                    { id: 'select', label: '👆', name: 'Select' }, { id: 'wall', label: '🧱', name: 'Wall' }, { id: 'window', label: '🪟', name: 'Window' }, 
                    { id: 'door', label: '🚪', name: 'Door' }, { id: 'opening', label: '⬜', name: 'Opening' }, { id: 'room', label: '📐', name: 'Room' } 
                ].map(t => (
                    <button key={t.id} onClick={() => { setTool(t.id as Tool); setActivePoints([]); }}
                            className={`flex flex-col items-center gap-1 group w-full transition-all ${tool === t.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                        <div className={`p-2 rounded-xl transition-all ${tool === t.id ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'group-hover:bg-gray-50'}`}><span className="text-xl">{t.label}</span></div>
                        <span className={`text-[9px] font-bold tracking-widest uppercase ${tool === t.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{t.name}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 relative bg-gray-50 flex overflow-hidden">
                <div className="flex-1 relative">
                    <Stage width={window.innerWidth - 80 - 250} height={window.innerHeight - 64} onWheel={handleWheel} onClick={handleStageClick}
                           onMouseMove={() => {
                               const stage = stageRef.current;
                               if (!stage) return;
                               const pointer = stage.getRelativePointerPosition();
                               if (pointer) setMousePos(snapToGrid(pointer));
                           }} 
                           draggable={tool === 'select'} scaleX={stageScale} scaleY={stageScale} x={stagePos.x} y={stagePos.y} ref={stageRef}>
                        <Layer>{renderGrid()}</Layer>
                        <Layer>
                            {rooms.map(room => (
                                <Group key={room.id} onClick={() => tool === 'select' && setSelectedId(room.id)}>
                                    <Line points={room.points.flatMap(p => [p.x, p.y])} closed fill={selectedId === room.id ? "rgba(99, 102, 241, 0.2)" : "rgba(200, 200, 200, 0.1)"} />
                                    <Text x={room.label_pos.x - 50} y={room.label_pos.y} text={`${room.name}\n${calculatePolygonArea(room.points, unitSystem)}`} align="center" width={100} fontSize={14} fill="#555" />
                                </Group>
                            ))}
                        </Layer>
                        <Layer>
                            {elements.map(el => {
                                let color = '#333'; let width = el.thickness; let dash: number[] = [];
                                if (el.element_type === 'window') { color = '#60a5fa'; width = 6; }
                                else if (el.element_type === 'door') { color = '#92400e'; width = 8; }
                                else if (el.element_type === 'opening') { color = '#d1d5db'; width = 6; dash = [10, 10]; } 
                                const isSelected = selectedId === el.id;
                                const midX = (el.start.x + el.end.x) / 2;
                                const midY = (el.start.y + el.end.y) / 2;
                                const curvature = el.curvature || 0;
                                return (
                                    <Group key={el.id} onClick={e => { if (tool === 'select') { e.cancelBubble = true; setSelectedId(el.id); } }}>
                                        {curvature === 0 ? <Line points={[el.start.x, el.start.y, el.end.x, el.end.y]} stroke={isSelected ? '#4f46e5' : color} strokeWidth={width} dash={dash} lineCap="round" />
                                                         : <Path data={`M${el.start.x},${el.start.y} Q${getControlPoint(el.start, el.end, curvature).x},${getControlPoint(el.start, el.end, curvature).y} ${el.end.x},${el.end.y}`} stroke={isSelected ? '#4f46e5' : color} strokeWidth={width} dash={dash} lineCap="round" fill="transparent" />}
                                        <Text x={midX} y={midY - 20} text={formatLength(distance(el.start, el.end))} fontSize={12} fill="#666" align="center" />
                                        {el.items && el.items.length > 0 && <Rect x={midX} y={midY} width={8} height={8} fill="#fbbf24" rotation={45} offsetX={4} offsetY={4} />}
                                    </Group>
                                );
                            })}
                            {activePoints.length > 0 && mousePos && <Line points={[...activePoints.flatMap(p => [p.x, p.y]), mousePos.x, mousePos.y]} stroke="#666" strokeWidth={2} dash={[5, 5]} />}
                        </Layer>
                    </Stage>
                </div>
                <div className="w-64 bg-white border-l p-4 overflow-y-auto">
                    {selectedElement ? (
                        <div className="space-y-4">
                            <h3 className="font-bold border-b pb-2">Wall Properties</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {unitSystem === 'imperial' ? (
                                    <>
                                        <input type="number" className="border rounded p-1 text-sm" value={Math.floor(distance(selectedElement.start, selectedElement.end)/(50/12)/12)} onChange={e => updateElementLength(Number(e.target.value), 0, 0)} />
                                        <input type="number" className="border rounded p-1 text-sm" value={Math.floor((distance(selectedElement.start, selectedElement.end)/(50/12)) % 12)} />
                                        <div className="text-[10px] col-span-3 text-gray-400">Length in Ft / In</div>
                                    </>
                                ) : (
                                    <input type="number" step="0.01" className="col-span-3 border rounded p-1 text-sm" value={distance(selectedElement.start, selectedElement.end)/164} onChange={e => updateElementLength(Number(e.target.value), 0, 0)} />
                                )}
                            </div>
                            <label className="block text-xs text-gray-500">Curvature</label>
                            <input type="range" min="-200" max="200" className="w-full" value={selectedElement.curvature || 0} onChange={(e) => setElements(elements.map(el => el.id === selectedElement.id ? {...el, curvature: Number(e.target.value)} : el))} />
                            <button onClick={() => setEditingElementId(selectedElement.id)} className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-medium">🏗️ Edit Vertical View</button>
                        </div>
                    ) : <div className="text-gray-400 text-sm">Select a wall to edit properties.</div>}
                </div>
            </div>
        </div>

        {showMagicModal && <MagicBuildModal onClose={() => setShowMagicModal(false)} onGenerate={handleMagicGenerate} />} 
        {editingElementId && editingElement && <ElevationEditor element={editingElement} allElements={elements} onUpdate={handleElevationUpdate} onClose={() => setEditingElementId(null)} />} 
    </div>
  );
};

export default BlueprintEditor;