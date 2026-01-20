import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Text, Group, Rect, Path } from 'react-konva';
import Konva from 'konva';
import ElevationEditor from './ElevationEditor';
import MagicBuildModal from './MagicBuildModal';
import BabylonViewer from './BabylonViewer';

import { useProjectData } from '../hooks/useProjectData';
import { useEditorState } from '../hooks/useEditorState';
import { Toolbar } from './Editor/Toolbar';
import { ToolPalette } from './Editor/ToolPalette';
import { PropertiesPanel } from './Editor/PropertiesPanel';

import type { Element, ElementType, OpeningSpec, Room } from '../types';
import { distance, getControlPoint, calculatePolygonArea, snapToGrid, mergeCollinearSegments, findEnclosingRoom } from '../utils/geometry';
import { formatArea, formatLength, getGridStep, lengthUnitForSystem, toPx, toPxPoint, fromPxPoint } from '../utils/units';

const DEFAULT_WALL_THICKNESS_IN = 4;
const DEFAULT_WALL_HEIGHT_IN = 96;
const DEFAULT_DOOR_HEIGHT_IN = 80;
const DEFAULT_WINDOW_SILL_IN = 36;
const DEFAULT_WINDOW_HEAD_IN = 72;
const WINDOW_STROKE_PX = 6;
const DOOR_STROKE_PX = 8;
const OPENING_STROKE_PX = 6;

const BlueprintEditor: React.FC = () => {
    // Hooks
    const { 
        elements, setElements, rooms, setRooms, 
        projectName, setProjectName, 
        unitSystem, setUnitSystem,
        isSaving, saveProject 
    } = useProjectData();
    
    const { 
        tool, setTool, 
        selectedId, setSelectedId, 
        activePoints, setActivePoints, 
        mousePos, setMousePos,
        gridMode, setGridMode 
    } = useEditorState();

    // Local UI State
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [show3D, setShow3D] = useState(false);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    const stageRef = useRef<Konva.Stage>(null);

    // Derived State
    const selectedElement = elements.find(el => el.id === selectedId);
    const selectedRoom = rooms.find(r => r.id === selectedId);
    const editingElement = elements.find(el => el.id === editingElementId);
    const lengthUnit = lengthUnitForSystem(unitSystem);

    const toUnit = (inches: number) => (lengthUnit === 'in' ? inches : inches * 25.4);

    const buildDefaultOpening = (type: ElementType, wallHeight: number): OpeningSpec => {
        if (type === 'door') {
            return { sillHeight: 0, headHeight: Math.min(wallHeight, toUnit(DEFAULT_DOOR_HEIGHT_IN)) };
        }
        if (type === 'window') {
            return {
                sillHeight: Math.min(wallHeight * 0.5, toUnit(DEFAULT_WINDOW_SILL_IN)),
                headHeight: Math.min(wallHeight, toUnit(DEFAULT_WINDOW_HEAD_IN))
            };
        }
        return { sillHeight: 0, headHeight: wallHeight };
    };

    // --- Core Logic: Update Elements & Auto-Recalculate Rooms ---

    const updateElements = (newElements: Element[]) => {
        // 1. Recalculate all existing rooms based on new geometry
        const updatedRooms = rooms.map(room => {
            // Use the room's current label position as the seed point
            const result = findEnclosingRoom(newElements, room.label_pos);
            
            if (result) {
                // Room is still valid (closed loop found around seed)
                const cx = result.points.reduce((acc, p) => acc + p.x, 0) / result.points.length;
                const cy = result.points.reduce((acc, p) => acc + p.y, 0) / result.points.length;
                return {
                    ...room,
                    points: result.points,
                    wallIds: result.wallIds,
                    label_pos: { x: cx, y: cy }, // Update label to new centroid
                    isValid: true
                };
            } else {
                // Room is broken (no closed loop found)
                return {
                    ...room,
                    isValid: false
                };
            }
        });

        setElements(newElements);
        setRooms(updatedRooms);
    };

    const convertUnits = (nextUnitSystem: typeof unitSystem) => {
        if (nextUnitSystem === unitSystem) return;
        const factor = nextUnitSystem === 'metric' ? 25.4 : 1 / 25.4;

        const convertPoint = (point: { x: number; y: number }) => ({
            x: point.x * factor,
            y: point.y * factor,
        });

        const nextElements = elements.map(el => ({
            ...el,
            start: convertPoint(el.start),
            end: convertPoint(el.end),
            thickness: el.thickness * factor,
            height: el.height * factor,
            curvature: el.curvature * factor,
            opening: el.opening
                ? {
                    ...el.opening,
                    sillHeight: el.opening.sillHeight * factor,
                    headHeight: el.opening.headHeight * factor,
                    jambDepth: el.opening.jambDepth ? el.opening.jambDepth * factor : undefined,
                }
                : undefined,
            items: (el.items || []).map(item => ({
                ...item,
                position: {
                    along: item.position.along * factor,
                    height: item.position.height * factor,
                },
                size: {
                    width: item.size.width * factor,
                    height: item.size.height * factor,
                    depth: item.size.depth ? item.size.depth * factor : undefined,
                },
            })),
        }));

        const nextRooms = rooms.map(room => ({
            ...room,
            points: room.points.map(convertPoint),
            label_pos: convertPoint(room.label_pos),
        }));

        setElements(nextElements);
        setRooms(nextRooms);
        setActivePoints([]);
        setMousePos(null);
        setUnitSystem(nextUnitSystem);
    };

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
        const pointerPx = stage.getRelativePointerPosition(); 
        if (!pointerPx) return;
        const pointer = fromPxPoint(pointerPx, lengthUnit);
        const gridStep = getGridStep(unitSystem, gridMode, lengthUnit);
        const snapped = snapToGrid(pointer, gridStep);
        
        if (tool === 'wall' || tool === 'window' || tool === 'door' || tool === 'opening') {
            if (activePoints.length === 0) {
                setActivePoints([snapped]);
            } else {
                const start = activePoints[0];
                const end = snapped;
                if (start.x !== end.x || start.y !== end.y) {
                    if (tool === 'wall') {
                        const walls = elements.filter(el => el.element_type === 'wall' && el.curvature === 0);
                        let merged = false;
                        for (const wall of walls) {
                            const mergeResult = mergeCollinearSegments(wall.start, wall.end, start, end);
                            if (mergeResult) {
                                updateElements(elements.map(el =>
                                    el.id === wall.id
                                        ? { ...el, start: mergeResult.start, end: mergeResult.end }
                                        : el
                                ));
                                merged = true;
                                break;
                            }
                        }
                        if (!merged) {
                            const wallHeight = toUnit(DEFAULT_WALL_HEIGHT_IN);
                            const newEl: Element = {
                                id: crypto.randomUUID(),
                                start, end,
                                thickness: toUnit(DEFAULT_WALL_THICKNESS_IN),
                                element_type: 'wall',
                                height: wallHeight,
                                items: [],
                                curvature: 0
                            };
                            updateElements([...elements, newEl]);
                        }
                    } else {
                        const wallHeight = toUnit(DEFAULT_WALL_HEIGHT_IN);
                        const newEl: Element = {
                            id: crypto.randomUUID(),
                            start, end,
                            thickness: toUnit(DEFAULT_WALL_THICKNESS_IN),
                            element_type: tool as ElementType,
                            height: wallHeight,
                            opening: buildDefaultOpening(tool as ElementType, wallHeight),
                            items: [],
                            curvature: 0
                        };
                        updateElements([...elements, newEl]);
                    }
                    if (tool === 'wall' || tool === 'opening') setActivePoints([end]); else setActivePoints([]);
                }
            }
        } else if (tool === 'room') {
            const result = findEnclosingRoom(elements, pointer);
            
            if (result) {
                const name = prompt("Enter room name:", "Living Room") || "Room";
                const cx = result.points.reduce((acc, p) => acc + p.x, 0) / result.points.length;
                const cy = result.points.reduce((acc, p) => acc + p.y, 0) / result.points.length;
                
                const newRoom: Room = { 
                    id: crypto.randomUUID(), 
                    name, 
                    points: result.points, 
                    label_pos: { x: cx, y: cy }, 
                    wallIds: result.wallIds,
                    isValid: true
                };
                
                setRooms([...rooms, newRoom]);
                // No new walls created, so no need to call updateElements() here, just setRooms is fine
                // because we just added a room, existing rooms shouldn't change validity.
                setTool('select');
            } else {
                alert("No enclosed room detected. Please ensure walls form a closed loop around the click point.");
            }
        }
    };

    const updateElementLength = (v1: number, v2: number, v3: number) => {
        if (!selectedElement) return;
        let targetLength = 0;
        if (unitSystem === 'imperial') {
            const totalInches = v1 * 12 + v2 + (v3 / 16);
            targetLength = lengthUnit === 'in' ? totalInches : totalInches * 25.4;
        } else {
            const meters = v1;
            targetLength = lengthUnit === 'mm' ? meters * 1000 : meters * 39.3701;
        }
        const dx = selectedElement.end.x - selectedElement.start.x;
        const dy = selectedElement.end.y - selectedElement.start.y;
        const currentLen = Math.sqrt(dx*dx + dy*dy);
        if (currentLen === 0) return;
        const uX = dx / currentLen;
        const uY = dy / currentLen;
        const newEnd = { x: selectedElement.start.x + uX * targetLength, y: selectedElement.start.y + uY * targetLength };
        updateElements(elements.map(el => el.id === selectedElement.id ? { ...el, end: newEnd } : el));
    };

    const handleMagicGenerate = (generatedProject: any) => {
        if (generatedProject.units && elements.length === 0 && rooms.length === 0) {
            setUnitSystem(generatedProject.units);
        }
        let offsetX = 0;
        if (elements.length > 0) {
            const maxX = Math.max(...elements.map(e => Math.max(e.start.x, e.end.x)));
            offsetX = maxX + toUnit(24); 
        }
        const newElements = generatedProject.elements.map((el: Element) => {
            const wallHeight = el.height || toUnit(DEFAULT_WALL_HEIGHT_IN);
            const opening = el.element_type !== 'wall'
                ? (el.opening || buildDefaultOpening(el.element_type, wallHeight))
                : undefined;
            return {
                ...el,
                start: { x: el.start.x + offsetX, y: el.start.y },
                end: { x: el.end.x + offsetX, y: el.end.y },
                height: wallHeight,
                thickness: el.thickness || toUnit(DEFAULT_WALL_THICKNESS_IN),
                opening,
            };
        });
        // For magic generate, we trust the generator or run a recalc pass if needed.
        // Let's just merge and set for now.
        const newRooms = generatedProject.rooms.map((r: Room) => ({
            ...r,
            points: r.points.map(p => ({ x: p.x + offsetX, y: p.y })),
            label_pos: { x: r.label_pos.x + offsetX, y: r.label_pos.y },
            isValid: true
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
                    const elToDelete = elements.find(el => el.id === selectedId);
                    if (elToDelete) {
                         const newElements = elements.filter(el => el.id !== selectedId);
                         updateElements(newElements); // Use updateElements to trigger room recalc
                         setSelectedId(null);
                    } else {
                        // Deleting a room directly
                        setRooms(rooms.filter(r => r.id !== selectedId));
                        setSelectedId(null);
                    }
                }
            }
            if (e.key === 'Escape') { setActivePoints([]); setTool('select'); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, elements, rooms, setElements, setRooms, setSelectedId, setActivePoints, setTool]);

    // --- Render Helpers ---

    const renderGrid = () => {
        const gridStep = getGridStep(unitSystem, gridMode, lengthUnit);
        const size = toPx(gridStep, lengthUnit);
        const lines = [];
        for (let i = 0; i <= 100; i++) {
            lines.push(<Line key={`v${i}`} points={[i*size, 0, i*size, 5000]} stroke="#eee" strokeWidth={1} />);
            lines.push(<Line key={`h${i}`} points={[0, i*size, 5000, i*size]} stroke="#eee" strokeWidth={1} />);
        }
        return <Group>{lines}</Group>;
    };

    const activePointsPx = activePoints.map(p => toPxPoint(p, lengthUnit));
    const mousePosPx = mousePos ? toPxPoint(mousePos, lengthUnit) : null;

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-100 font-sans text-gray-900">
            <Toolbar 
                projectName={projectName} 
                setProjectName={setProjectName}
                unitSystem={unitSystem}
                setUnitSystem={convertUnits}
                gridMode={gridMode}
                setGridMode={setGridMode}
                onSave={saveProject}
                isSaving={isSaving}
                onMagicBuild={() => setShowMagicModal(true)}
                onToggle3D={() => setShow3D(true)}
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
                                if (!pointer) return;
                                const unitPoint = fromPxPoint(pointer, lengthUnit);
                                const gridStep = getGridStep(unitSystem, gridMode, lengthUnit);
                                setMousePos(snapToGrid(unitPoint, gridStep));
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
                                {rooms.map(room => {
                                    const isSelected = selectedId === room.id;
                                    const isValid = room.isValid !== false; // Default to true if undefined
                                    const roomPointsPx = room.points.map(p => toPxPoint(p, lengthUnit));
                                    const labelPosPx = toPxPoint(room.label_pos, lengthUnit);

                                    let fillColor = isSelected ? "rgba(99, 102, 241, 0.2)" : "rgba(200, 200, 200, 0.1)";
                                    let strokeColor = isSelected ? "#4f46e5" : "transparent";
                                    let dash: number[] = [];

                                    if (!isValid) {
                                        strokeColor = "#ef4444"; // Red
                                        dash = [10, 5];
                                        fillColor = "rgba(239, 68, 68, 0.05)"; // Very light red
                                    } else if (room.flooring?.hex) {
                                        fillColor = room.flooring.hex;
                                    } else if (room.paint?.hex) {
                                        fillColor = room.paint.hex;
                                    }

                                    return (
                                        <Group key={room.id} onClick={() => tool === 'select' && setSelectedId(room.id)}>
                                            <Line 
                                                points={roomPointsPx.flatMap(p => [p.x, p.y])} 
                                                closed 
                                                fill={fillColor} 
                                                opacity={isSelected ? 0.6 : 0.4}
                                                stroke={strokeColor}
                                                strokeWidth={isValid ? 2 : 1}
                                                dash={dash}
                                            />
                                            <Text 
                                                x={labelPosPx.x - 50} 
                                                y={labelPosPx.y} 
                                                text={isValid 
                                                    ? `${room.name}\n${formatArea(calculatePolygonArea(room.points), unitSystem, lengthUnit)}`
                                                    : `${room.name}\n(Open Loop)`
                                                } 
                                                align="center" 
                                                width={100} 
                                                fontSize={14} 
                                                fill={!isValid ? "#ef4444" : (fillColor === "rgba(200, 200, 200, 0.1)" ? "#555" : "#333")} 
                                                fontStyle="bold"
                                            />
                                        </Group>
                                    );
                                })}
                            </Layer>
                            <Layer>
                                {elements.map(el => {
                                    let color = '#333'; let width = 0; let dash: number[] = [];
                                    const startPx = toPxPoint(el.start, lengthUnit);
                                    const endPx = toPxPoint(el.end, lengthUnit);
                                    const thicknessPx = Math.max(2, toPx(el.thickness, lengthUnit));
                                    if (el.element_type === 'window') { color = '#60a5fa'; width = WINDOW_STROKE_PX; }
                                    else if (el.element_type === 'door') { color = '#92400e'; width = DOOR_STROKE_PX; }
                                    else if (el.element_type === 'opening') { color = '#d1d5db'; width = OPENING_STROKE_PX; dash = [10, 10]; }
                                    else { width = thicknessPx; }
                                    
                                    // Override wall color if painted
                                    if (el.element_type === 'wall' && el.paint?.hex) {
                                        color = el.paint.hex;
                                        // Make painted walls slightly thicker to be visible? Or just trust the color.
                                    }

                                    const isSelected = selectedId === el.id;
                                    const midX = (startPx.x + endPx.x) / 2;
                                    const midY = (startPx.y + endPx.y) / 2;
                                    const curvature = el.curvature || 0;
                                    const controlPoint = curvature === 0 ? null : getControlPoint(el.start, el.end, curvature);
                                    const controlPointPx = controlPoint ? toPxPoint(controlPoint, lengthUnit) : null;
                                    return (
                                        <Group key={el.id} onClick={e => { if (tool === 'select') { e.cancelBubble = true; setSelectedId(el.id); } }}>
                                            {curvature === 0 || !controlPointPx ? (
                                                <Line
                                                    points={[startPx.x, startPx.y, endPx.x, endPx.y]}
                                                    stroke={isSelected ? '#4f46e5' : color}
                                                    strokeWidth={width}
                                                    dash={dash}
                                                    lineCap="round"
                                                />
                                            ) : (
                                                <Path
                                                    data={`M${startPx.x},${startPx.y} Q${controlPointPx.x},${controlPointPx.y} ${endPx.x},${endPx.y}`}
                                                    stroke={isSelected ? '#4f46e5' : color}
                                                    strokeWidth={width}
                                                    dash={dash}
                                                    lineCap="round"
                                                    fill="transparent"
                                                />
                                            )}
                                            <Text
                                                x={midX}
                                                y={midY - 20}
                                                text={formatLength(distance(el.start, el.end), unitSystem, lengthUnit)}
                                                fontSize={12}
                                                fill="#666"
                                                align="center"
                                            />
                                            {el.items && el.items.length > 0 && <Rect x={midX} y={midY} width={8} height={8} fill="#fbbf24" rotation={45} offsetX={4} offsetY={4} />}
                                        </Group>
                                    );
                                })}
                                {activePointsPx.length > 0 && mousePosPx && (
                                    <Line
                                        points={[...activePointsPx.flatMap(p => [p.x, p.y]), mousePosPx.x, mousePosPx.y]}
                                        stroke="#666"
                                        strokeWidth={2}
                                        dash={[5, 5]}
                                    />
                                )}
                            </Layer>
                        </Stage>
                    </div>
                    
                    <PropertiesPanel 
                        selectedElement={selectedElement}
                        selectedRoom={selectedRoom}
                        unitSystem={unitSystem}
                        onUpdateLength={updateElementLength}
                        onUpdateCurvature={(val) => updateElements(elements.map(el => el.id === selectedId ? {...el, curvature: val} : el))}
                        onEditVertical={() => selectedId && setEditingElementId(selectedId)}
                        onUpdateRoom={(updatedRoom) => setRooms(rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r))}
                        onUpdateElement={(updatedElement) => updateElements(elements.map(el => el.id === updatedElement.id ? updatedElement : el))}
                    />
                </div>
            </div>

            <MagicBuildModal open={showMagicModal} onOpenChange={setShowMagicModal} onGenerate={handleMagicGenerate} /> 
            {editingElementId && editingElement && (
                <ElevationEditor
                    unitSystem={unitSystem}
                    element={editingElement}
                    allElements={elements}
                    onUpdate={(updated) => updateElements(elements.map(el => el.id === updated.id ? updated : el))}
                    onClose={() => setEditingElementId(null)}
                />
            )} 
            {show3D && (
                <BabylonViewer
                    project={{ id: 'current', name: projectName, units: unitSystem, lengthUnit, elements, rooms }}
                    onExit={() => setShow3D(false)}
                />
            )}
        </div>
    );
};

export default BlueprintEditor;
