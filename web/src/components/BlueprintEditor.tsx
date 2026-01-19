import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Text, Group, Rect, Path } from 'react-konva';
import Konva from 'konva';
import ElevationEditor from './ElevationEditor';
import MagicBuildModal from './MagicBuildModal';

import { useProjectData } from '../hooks/useProjectData';
import { useEditorState } from '../hooks/useEditorState';
import { Toolbar } from './Editor/Toolbar';
import { ToolPalette } from './Editor/ToolPalette';
import { PropertiesPanel } from './Editor/PropertiesPanel';

import type { Element, ElementType, Room } from '../types';
import { distance, getControlPoint, calculatePolygonArea, snapToGrid, getGridSize, formatLength } from '../utils/geometry';

const WALL_THICKNESS = 10;

const BlueprintEditor: React.FC = () => {
    // Hooks
    const { 
        elements, setElements, rooms, setRooms, 
        projectName, setProjectName, 
        isSaving, saveProject 
    } = useProjectData();
    
    const { 
        tool, setTool, 
        selectedId, setSelectedId, 
        activePoints, setActivePoints, 
        mousePos, setMousePos,
        unitSystem, setUnitSystem, 
        gridMode, setGridMode 
    } = useEditorState();

    // Local UI State
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    const stageRef = useRef<Konva.Stage>(null);

    // Derived State
    const selectedElement = elements.find(el => el.id === selectedId);
    // const selectedRoom = rooms.find(r => r.id === selectedId); // Unused for now
    const editingElement = elements.find(el => el.id === editingElementId);

    // --- Interaction Handlers ---

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
        const snapped = snapToGrid(pointer, getGridSize(unitSystem, gridMode));
        
        if (tool === 'wall' || tool === 'window' || tool === 'door' || tool === 'opening') {
            if (activePoints.length === 0) {
                setActivePoints([snapped]);
            } else {
                const start = activePoints[0];
                const end = snapped;
                if (start.x !== end.x || start.y !== end.y) {
                    const newEl: Element = { 
                        id: crypto.randomUUID(), 
                        start, end, 
                        thickness: WALL_THICKNESS, 
                        element_type: tool as ElementType, 
                        height: 400, 
                        items: [], 
                        curvature: 0 
                    };
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

    const handleMagicGenerate = (generatedProject: any) => {
        let offsetX = 0;
        if (elements.length > 0) {
            const maxX = Math.max(...elements.map(e => Math.max(e.start.x, e.end.x)));
            offsetX = maxX + 100; 
        }
        const newElements = generatedProject.elements.map((el: Element) => ({
            ...el,
            start: { x: el.start.x + offsetX, y: el.start.y },
            end: { x: el.end.x + offsetX, y: el.end.y }
        }));
        const newRooms = generatedProject.rooms.map((r: Room) => ({
            ...r,
            points: r.points.map(p => ({ x: p.x + offsetX, y: p.y })),
            label_pos: { x: r.label_pos.x + offsetX, y: r.label_pos.y },
        }));
        setElements([...elements, ...newElements]);
        setRooms([...rooms, ...newRooms]);
    };

    // --- Effects ---

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
    }, [selectedId, elements, rooms, setElements, setRooms, setSelectedId, setActivePoints, setTool]);

    // --- Render Helpers ---

    const renderGrid = () => {
        const size = getGridSize(unitSystem, gridMode);
        const lines = [];
        for (let i = 0; i <= 100; i++) {
            lines.push(<Line key={`v${i}`} points={[i*size, 0, i*size, 5000]} stroke="#eee" strokeWidth={1} />);
            lines.push(<Line key={`h${i}`} points={[0, i*size, 5000, i*size]} stroke="#eee" strokeWidth={1} />);
        }
        return <Group>{lines}</Group>;
    };

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-100 font-sans text-gray-900">
            <Toolbar 
                projectName={projectName} 
                setProjectName={setProjectName}
                unitSystem={unitSystem}
                setUnitSystem={setUnitSystem}
                gridMode={gridMode}
                setGridMode={setGridMode}
                onSave={saveProject}
                isSaving={isSaving}
                onMagicBuild={() => setShowMagicModal(true)}
            />

            <div className="flex flex-1 relative overflow-hidden">
                <ToolPalette tool={tool} setTool={setTool} />

                <div className="flex-1 relative bg-gray-50 flex overflow-hidden">
                    <div className="flex-1 relative">
                        <Stage 
                            width={window.innerWidth - 80 - 250} 
                            height={window.innerHeight - 64} 
                            onWheel={handleWheel} 
                            onClick={handleStageClick}
                            onMouseMove={() => {
                                const stage = stageRef.current;
                                if (!stage) return;
                                const pointer = stage.getRelativePointerPosition();
                                if (pointer) setMousePos(snapToGrid(pointer, getGridSize(unitSystem, gridMode)));
                            }} 
                            draggable={tool === 'select'} 
                            scaleX={stageScale} 
                            scaleY={stageScale} 
                            x={stagePos.x} 
                            y={stagePos.y} 
                            ref={stageRef}
                        >
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
                                            <Text x={midX} y={midY - 20} text={formatLength(distance(el.start, el.end), unitSystem)} fontSize={12} fill="#666" align="center" />
                                            {el.items && el.items.length > 0 && <Rect x={midX} y={midY} width={8} height={8} fill="#fbbf24" rotation={45} offsetX={4} offsetY={4} />}
                                        </Group>
                                    );
                                })}
                                {activePoints.length > 0 && mousePos && <Line points={[...activePoints.flatMap(p => [p.x, p.y]), mousePos.x, mousePos.y]} stroke="#666" strokeWidth={2} dash={[5, 5]} />}
                            </Layer>
                        </Stage>
                    </div>
                    
                    <PropertiesPanel 
                        selectedElement={selectedElement}
                        unitSystem={unitSystem}
                        onUpdateLength={updateElementLength}
                        onUpdateCurvature={(val) => setElements(elements.map(el => el.id === selectedId ? {...el, curvature: val} : el))}
                        onEditVertical={() => selectedId && setEditingElementId(selectedId)}
                    />
                </div>
            </div>

            <MagicBuildModal open={showMagicModal} onOpenChange={setShowMagicModal} onGenerate={handleMagicGenerate} /> 
            {editingElementId && editingElement && <ElevationEditor element={editingElement as any} allElements={elements as any[]} onUpdate={(updated) => setElements(elements.map(el => el.id === updated.id ? updated as Element : el))} onClose={() => setEditingElementId(null)} />} 
        </div>
    );
};

export default BlueprintEditor;