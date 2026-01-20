import { useCallback, useEffect } from 'react';
import type Konva from 'konva';

import type { Element, ElementType, LengthUnit, Point, Room } from '../types';
import type { Tool } from './useEditorState';
import { findEnclosingRoom, mergeCollinearSegments, snapToGrid } from '../utils/geometry';
import { fromPxPoint } from '../utils/units';
import { DEFAULT_WALL_HEIGHT_IN, DEFAULT_WALL_THICKNESS_IN } from '../components/BlueprintEditor/constants';
import { buildDefaultOpening } from '../components/BlueprintEditor/helpers';

type UseBlueprintInteractionsArgs = {
    tool: Tool;
    setTool: (tool: Tool) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    activePoints: Point[];
    setActivePoints: (points: Point[]) => void;
    setMousePos: (point: Point | null) => void;
    elements: Element[];
    rooms: Room[];
    updateElements: (elements: Element[]) => void;
    setRooms: (rooms: Room[]) => void;
    lengthUnit: LengthUnit;
    gridStep: number;
    toUnit: (inches: number) => number;
};

export const useBlueprintInteractions = ({
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
}: UseBlueprintInteractionsArgs) => {
    const handleStageClick = useCallback(
        (event: Konva.KonvaEventObject<MouseEvent>) => {
            const clickedOnEmpty = event.target === event.target.getStage();
            if (clickedOnEmpty) setSelectedId(null);
            if (tool === 'select') return;

            const stage = event.target.getStage();
            if (!stage) return;
            const pointerPx = stage.getRelativePointerPosition();
            if (!pointerPx) return;
            const pointer = fromPxPoint(pointerPx, lengthUnit);
            const snapped = snapToGrid(pointer, gridStep);

            if (tool === 'wall' || tool === 'window' || tool === 'door' || tool === 'opening') {
                if (activePoints.length === 0) {
                    setActivePoints([snapped]);
                } else {
                    const start = activePoints[0];
                    const end = snapped;
                    if (start.x !== end.x || start.y !== end.y) {
                        if (tool === 'wall') {
                            const walls = elements.filter((el) => el.element_type === 'wall' && el.curvature === 0);
                            let merged = false;
                            for (const wall of walls) {
                                const mergeResult = mergeCollinearSegments(wall.start, wall.end, start, end);
                                if (mergeResult) {
                                    updateElements(
                                        elements.map((el) =>
                                            el.id === wall.id
                                                ? { ...el, start: mergeResult.start, end: mergeResult.end }
                                                : el
                                        )
                                    );
                                    merged = true;
                                    break;
                                }
                            }
                            if (!merged) {
                                const wallHeight = toUnit(DEFAULT_WALL_HEIGHT_IN);
                                const newEl: Element = {
                                    id: crypto.randomUUID(),
                                    start,
                                    end,
                                    thickness: toUnit(DEFAULT_WALL_THICKNESS_IN),
                                    element_type: 'wall',
                                    height: wallHeight,
                                    items: [],
                                    curvature: 0,
                                };
                                updateElements([...elements, newEl]);
                            }
                        } else {
                            const wallHeight = toUnit(DEFAULT_WALL_HEIGHT_IN);
                            const elementType = tool as ElementType;
                            const newEl: Element = {
                                id: crypto.randomUUID(),
                                start,
                                end,
                                thickness: toUnit(DEFAULT_WALL_THICKNESS_IN),
                                element_type: elementType,
                                height: wallHeight,
                                opening: buildDefaultOpening(elementType, wallHeight, toUnit),
                                items: [],
                                curvature: 0,
                            };
                            updateElements([...elements, newEl]);
                        }
                        if (tool === 'wall' || tool === 'opening') setActivePoints([end]);
                        else setActivePoints([]);
                    }
                }
            } else if (tool === 'room') {
                const result = findEnclosingRoom(elements, pointer);

                if (result) {
                    const name = prompt('Enter room name:', 'Living Room') || 'Room';
                    const cx = result.points.reduce((acc, point) => acc + point.x, 0) / result.points.length;
                    const cy = result.points.reduce((acc, point) => acc + point.y, 0) / result.points.length;

                    const newRoom: Room = {
                        id: crypto.randomUUID(),
                        name,
                        points: result.points,
                        label_pos: { x: cx, y: cy },
                        wallIds: result.wallIds,
                        isValid: true,
                    };

                    setRooms([...rooms, newRoom]);
                    setTool('select');
                } else {
                    alert('No enclosed room detected. Please ensure walls form a closed loop around the click point.');
                }
            }
        },
        [
            tool,
            setSelectedId,
            lengthUnit,
            gridStep,
            activePoints,
            elements,
            rooms,
            setActivePoints,
            updateElements,
            setRooms,
            setTool,
            toUnit,
        ]
    );

    const handleStageMouseMove = useCallback(
        (event: Konva.KonvaEventObject<MouseEvent>) => {
            const stage = event.target.getStage();
            if (!stage) return;
            const pointer = stage.getRelativePointerPosition();
            if (!pointer) return;
            const unitPoint = fromPxPoint(pointer, lengthUnit);
            setMousePos(snapToGrid(unitPoint, gridStep));
        },
        [lengthUnit, gridStep, setMousePos]
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement
            ) {
                return;
            }
            if (event.key === 'Delete' || event.key === 'Backspace') {
                if (selectedId) {
                    const elToDelete = elements.find((el) => el.id === selectedId);
                    if (elToDelete) {
                        const newElements = elements.filter((el) => el.id !== selectedId);
                        updateElements(newElements);
                        setSelectedId(null);
                    } else {
                        setRooms(rooms.filter((room) => room.id !== selectedId));
                        setSelectedId(null);
                    }
                }
            }
            if (event.key === 'Escape') {
                setActivePoints([]);
                setTool('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, elements, rooms, updateElements, setSelectedId, setRooms, setActivePoints, setTool]);

    return { handleStageClick, handleStageMouseMove };
};
