import { Suspense, lazy, useCallback, useMemo, useState } from 'react';

import { useEditorState } from '../../hooks/useEditorState';
import { useMeasurement } from '../../hooks/useMeasurement';
import { useProjectData } from '../../hooks/useProjectData';
import { useBlueprintViewport } from '../../hooks/useBlueprintViewport';
import { useBlueprintInteractions } from '../../hooks/useBlueprintInteractions';
import { useRoomRecalculation } from '../../hooks/useRoomRecalculation';
import type { Element, Room, UnitSystem } from '../../types';

import { Toolbar } from '../Editor/Toolbar';
import { ToolPalette } from '../Editor/ToolPalette';
import { PropertiesPanel } from '../Editor/PropertiesPanel';
import MagicBuildModal from '../MagicBuildModal';

import BlueprintCanvas from './BlueprintCanvas';
import { DEFAULT_WALL_HEIGHT_IN, DEFAULT_WALL_THICKNESS_IN } from './constants';
import { buildDefaultOpening } from './helpers';

const ElevationEditor = lazy(() => import('../ElevationEditor'));
const BabylonViewer = lazy(() => import('../BabylonViewer'));

const BlueprintEditor = () => {
    const {
        elements,
        setElements,
        rooms,
        setRooms,
        projectName,
        setProjectName,
        unitSystem,
        setUnitSystem,
        isSaving,
        saveProject,
    } = useProjectData();

    const {
        tool,
        setTool,
        selectedId,
        setSelectedId,
        activePoints,
        setActivePoints,
        mousePos,
        setMousePos,
        gridMode,
        setGridMode,
    } = useEditorState();

    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [show3D, setShow3D] = useState(false);

    const { lengthUnit, toUnit, gridStep } = useMeasurement(unitSystem, gridMode);
    const { updateElements } = useRoomRecalculation({ rooms, setElements, setRooms });
    const { stageRef, containerRef, canvasSize, stageScale, stagePos, handleWheel, handleDragEnd } =
        useBlueprintViewport();

    const { handleStageClick, handleStageMouseMove } = useBlueprintInteractions({
        tool,
        setTool,
        selectedId,
        setSelectedId,
        activePoints,
        setActivePoints,
        setMousePos,
        elements,
        rooms,
        updateElements,
        setRooms,
        lengthUnit,
        gridStep,
        toUnit,
    });

    const selectedElement = useMemo(() => elements.find((el) => el.id === selectedId) ?? null, [elements, selectedId]);
    const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedId) ?? null, [rooms, selectedId]);
    const editingElement = useMemo(
        () => elements.find((el) => el.id === editingElementId) ?? null,
        [elements, editingElementId]
    );

    const convertUnits = useCallback(
        (nextUnitSystem: UnitSystem) => {
            if (nextUnitSystem === unitSystem) return;
            const factor = nextUnitSystem === 'metric' ? 25.4 : 1 / 25.4;

            const convertPoint = (point: { x: number; y: number }) => ({
                x: point.x * factor,
                y: point.y * factor,
            });

            const nextElements = elements.map((el) => ({
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
                items: (el.items || []).map((item) => ({
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

            const nextRooms = rooms.map((room) => ({
                ...room,
                points: room.points.map(convertPoint),
                label_pos: convertPoint(room.label_pos),
            }));

            setElements(nextElements);
            setRooms(nextRooms);
            setActivePoints([]);
            setMousePos(null);
            setUnitSystem(nextUnitSystem);
        },
        [elements, rooms, setElements, setRooms, setActivePoints, setMousePos, setUnitSystem, unitSystem]
    );

    const updateElementLength = useCallback(
        (v1: number, v2: number, v3: number) => {
            if (!selectedElement) return;
            let targetLength = 0;
            if (unitSystem === 'imperial') {
                const totalInches = v1 * 12 + v2 + v3 / 16;
                targetLength = lengthUnit === 'in' ? totalInches : totalInches * 25.4;
            } else {
                const meters = v1;
                targetLength = lengthUnit === 'mm' ? meters * 1000 : meters * 39.3701;
            }
            const dx = selectedElement.end.x - selectedElement.start.x;
            const dy = selectedElement.end.y - selectedElement.start.y;
            const currentLen = Math.sqrt(dx * dx + dy * dy);
            if (currentLen === 0) return;
            const uX = dx / currentLen;
            const uY = dy / currentLen;
            const newEnd = {
                x: selectedElement.start.x + uX * targetLength,
                y: selectedElement.start.y + uY * targetLength,
            };
            updateElements(elements.map((el) => (el.id === selectedElement.id ? { ...el, end: newEnd } : el)));
        },
        [elements, lengthUnit, selectedElement, unitSystem, updateElements]
    );

    const handleMagicGenerate = useCallback(
        (generatedProject: { units?: UnitSystem; elements: Element[]; rooms: Room[] }) => {
            if (generatedProject.units && elements.length === 0 && rooms.length === 0) {
                setUnitSystem(generatedProject.units);
            }
            let offsetX = 0;
            if (elements.length > 0) {
                const maxX = Math.max(...elements.map((el) => Math.max(el.start.x, el.end.x)));
                offsetX = maxX + toUnit(24);
            }
            const newElements = generatedProject.elements.map((el) => {
                const wallHeight = el.height || toUnit(DEFAULT_WALL_HEIGHT_IN);
                const opening =
                    el.element_type !== 'wall'
                        ? el.opening || buildDefaultOpening(el.element_type, wallHeight, toUnit)
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

            const newRooms = generatedProject.rooms.map((room) => ({
                ...room,
                points: room.points.map((point) => ({ x: point.x + offsetX, y: point.y })),
                label_pos: { x: room.label_pos.x + offsetX, y: room.label_pos.y },
                isValid: true,
            }));
            setElements([...elements, ...newElements]);
            setRooms([...rooms, ...newRooms]);
        },
        [elements, rooms, setElements, setRooms, setUnitSystem, toUnit]
    );

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
                    <BlueprintCanvas
                        elements={elements}
                        rooms={rooms}
                        selectedId={selectedId}
                        activePoints={activePoints}
                        mousePos={mousePos}
                        tool={tool}
                        unitSystem={unitSystem}
                        lengthUnit={lengthUnit}
                        gridStep={gridStep}
                        stageScale={stageScale}
                        stagePos={stagePos}
                        canvasSize={canvasSize}
                        stageRef={stageRef}
                        containerRef={containerRef}
                        onStageClick={handleStageClick}
                        onStageMouseMove={handleStageMouseMove}
                        onWheel={handleWheel}
                        onDragEnd={handleDragEnd}
                        onSelectId={setSelectedId}
                    />

                    <PropertiesPanel
                        selectedElement={selectedElement}
                        selectedRoom={selectedRoom}
                        unitSystem={unitSystem}
                        onUpdateLength={updateElementLength}
                        onUpdateCurvature={(val) =>
                            updateElements(elements.map((el) => (el.id === selectedId ? { ...el, curvature: val } : el)))
                        }
                        onEditVertical={() => selectedId && setEditingElementId(selectedId)}
                        onUpdateRoom={(updatedRoom) =>
                            setRooms(rooms.map((room) => (room.id === updatedRoom.id ? updatedRoom : room)))
                        }
                        onUpdateElement={(updatedElement) =>
                            updateElements(elements.map((el) => (el.id === updatedElement.id ? updatedElement : el)))
                        }
                    />
                </div>
            </div>

            <MagicBuildModal
                open={showMagicModal}
                onOpenChange={setShowMagicModal}
                onGenerate={handleMagicGenerate}
            />

            <Suspense fallback={null}>
                {editingElementId && editingElement && (
                    <ElevationEditor
                        unitSystem={unitSystem}
                        gridMode={gridMode}
                        element={editingElement}
                        allElements={elements}
                        onUpdate={(updated) =>
                            updateElements(elements.map((el) => (el.id === updated.id ? updated : el)))
                        }
                        onClose={() => setEditingElementId(null)}
                    />
                )}

                {show3D && (
                    <BabylonViewer
                        project={{ id: 'current', name: projectName, units: unitSystem, lengthUnit, elements, rooms }}
                        onExit={() => setShow3D(false)}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default BlueprintEditor;
