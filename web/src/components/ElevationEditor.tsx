import { useState, useRef, useEffect, useMemo, type FC, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Path } from 'react-konva';
import Konva from 'konva';
import { MousePointer2, ToggleLeft, Plug, Lightbulb, Tv, Frame, Spline, CircleDot, Trash2, ZoomIn, ZoomOut, Maximize2, X, ChevronLeft, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Element, Point, UnitSystem, VerticalItem } from '../types';
import { distance, snapToGrid } from '../utils/geometry';
import { formatLength, getGridStep, lengthUnitForSystem, toPx, fromPxPoint } from '../utils/units';

interface ElevationEditorProps {
    unitSystem: UnitSystem;
    element: Element;
    allElements: Element[];
    onUpdate: (updatedElement: Element) => void;
    onClose: () => void;
}

// --- Constants ---

const WALL_PADDING_PX = 50;
const DEFAULT_DOOR_HEIGHT_IN = 80;
const DEFAULT_WINDOW_SILL_IN = 36;
const DEFAULT_WINDOW_HEAD_IN = 72;

const TV_SIZES = [
    { diag: 43, w: 38, h: 22 },
    { diag: 55, w: 48, h: 27 },
    { diag: 65, w: 57, h: 33 },
    { diag: 75, w: 66, h: 38 },
    { diag: 85, w: 75, h: 43 },
];

const FRAME_SIZES = [
    { label: '5x7"', w: 5, h: 7 },
    { label: '8x10"', w: 8, h: 10 },
    { label: '11x14"', w: 11, h: 14 },
    { label: '16x20"', w: 16, h: 20 },
    { label: '24x36"', w: 24, h: 36 },
    { label: '30x40"', w: 30, h: 40 },
];

const TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'switch', icon: ToggleLeft, label: 'Switch' },
    { id: 'outlet', icon: Plug, label: 'Outlet' },
    { id: 'sconce', icon: Lightbulb, label: 'Sconce' },
    { id: 'tv', icon: Tv, label: 'TV' },
    { id: 'picture', icon: Frame, label: 'Picture' },
    { id: 'arch', icon: Spline, label: 'Arch' },
    { id: 'circle', icon: CircleDot, label: 'Circle' },
] as const;

type ToolType = typeof TOOLS[number]['id'];
type ItemType = VerticalItem['item_type'];

const TOOL_ICON_MAP = new Map<ItemType, typeof TOOLS[number]['icon']>([
    ['switch', ToggleLeft],
    ['outlet', Plug],
    ['sconce', Lightbulb],
    ['tv', Tv],
    ['picture', Frame],
    ['frame', Frame],
    ['arch', Spline],
    ['circle', CircleDot],
]);

const HEIGHT_PRESETS_IN: Partial<Record<ItemType, { label: string; value: number }[]>> = {
    outlet: [
        { label: '12" Standard', value: 12 },
        { label: '18" Counter', value: 18 },
    ],
    switch: [
        { label: '42" Low', value: 42 },
        { label: '48" Standard', value: 48 },
    ],
    sconce: [
        { label: '60" Accent', value: 60 },
        { label: '66" Standard', value: 66 },
    ],
    tv: [
        { label: '48" Center', value: 48 },
        { label: '60" Center', value: 60 },
    ],
    picture: [
        { label: '57" Center', value: 57 },
    ],
    frame: [
        { label: '57" Center', value: 57 },
    ],
};

// --- Helpers ---

const getIntersections = (
    targetWall: Element,
    allElements: Element[],
    wallHeight: number,
    defaultDoorHeight: number,
    defaultWindowSill: number,
    defaultWindowHead: number
) => {
    const wallVec = { x: targetWall.end.x - targetWall.start.x, y: targetWall.end.y - targetWall.start.y };
    const wallLen = Math.sqrt(wallVec.x * wallVec.x + wallVec.y * wallVec.y);
    if (wallLen === 0) return [];
    const wallUnit = { x: wallVec.x / wallLen, y: wallVec.y / wallLen };

    const intersections: { type: string, start: number, end: number, height: number, y: number }[] = [];

    allElements.forEach(el => {
        if (el.id === targetWall.id) return;
        if (el.element_type !== 'window' && el.element_type !== 'door' && el.element_type !== 'opening') return;

        const vStart = { x: el.start.x - targetWall.start.x, y: el.start.y - targetWall.start.y };
        const vEnd = { x: el.end.x - targetWall.start.x, y: el.end.y - targetWall.start.y };

        const t1 = vStart.x * wallUnit.x + vStart.y * wallUnit.y;
        const t2 = vEnd.x * wallUnit.x + vEnd.y * wallUnit.y;

        const startDist = Math.min(t1, t2);
        const endDist = Math.max(t1, t2);

        if (startDist < wallLen && endDist > 0) {
            const clipStart = Math.max(0, startDist);
            const clipEnd = Math.min(wallLen, endDist);

            if (clipEnd > clipStart) {
                const opening = el.opening;
                let sillHeight = 0;
                let headHeight = wallHeight;

                if (el.element_type === 'door') {
                    sillHeight = opening?.sillHeight ?? 0;
                    headHeight = opening?.headHeight ?? Math.min(wallHeight, defaultDoorHeight);
                } else if (el.element_type === 'window') {
                    sillHeight = opening?.sillHeight ?? defaultWindowSill;
                    headHeight = opening?.headHeight ?? defaultWindowHead;
                } else if (el.element_type === 'opening') {
                    sillHeight = opening?.sillHeight ?? 0;
                    headHeight = opening?.headHeight ?? wallHeight;
                }

                sillHeight = Math.max(0, Math.min(sillHeight, wallHeight));
                headHeight = Math.max(sillHeight, Math.min(headHeight, wallHeight));
                const height = Math.max(0, headHeight - sillHeight);
                intersections.push({ type: el.element_type, start: clipStart, end: clipEnd, height, y: sillHeight });
            }
        }
    });
    return intersections;
};

const ElevationEditor: FC<ElevationEditorProps> = ({ unitSystem, element, allElements, onUpdate, onClose }) => {
    const [tool, setTool] = useState<ToolType>('select');
    const [selectedItemId, setSelectedId] = useState<string | null>(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const lengthUnit = lengthUnitForSystem(unitSystem);
    const unitFactor = lengthUnit === 'in' ? 1 : 25.4;
    const toUnit = (inches: number) => inches * unitFactor;

    const wallLength = distance(element.start, element.end);
    const wallHeight = element.height || toUnit(96);
    const wallLengthPx = toPx(wallLength, lengthUnit);
    const wallHeightPx = toPx(wallHeight, lengthUnit);

    const defaultDoorHeight = toUnit(DEFAULT_DOOR_HEIGHT_IN);
    const defaultWindowSill = toUnit(DEFAULT_WINDOW_SILL_IN);
    const defaultWindowHead = toUnit(DEFAULT_WINDOW_HEAD_IN);

    const intersections = getIntersections(
        element,
        allElements,
        wallHeight,
        defaultDoorHeight,
        defaultWindowSill,
        defaultWindowHead
    );
    const selectedItem = element.items?.find(i => i.id === selectedItemId);
    const gridStep = getGridStep(unitSystem, 'fine', lengthUnit);
    const gridPx = toPx(gridStep, lengthUnit);

    const defaultItemSizes = useMemo<Partial<Record<VerticalItem['item_type'], { w: number; h: number }>>>(() => ({
        switch: { w: 3 * unitFactor, h: 5 * unitFactor },
        outlet: { w: 3 * unitFactor, h: 5 * unitFactor },
        sconce: { w: 6 * unitFactor, h: 10 * unitFactor },
        tv: { w: 48 * unitFactor, h: 27 * unitFactor },
        picture: { w: 24 * unitFactor, h: 36 * unitFactor },
        frame: { w: 24 * unitFactor, h: 36 * unitFactor },
        arch: { w: 36 * unitFactor, h: 80 * unitFactor },
        circle: { w: 20 * unitFactor, h: 20 * unitFactor },
    }), [unitFactor]);
    const unitLabel = lengthUnit === 'in' ? 'in' : 'mm';

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setCanvasSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const getItemTopLeft = (item: VerticalItem): Point => {
        const { along, height } = item.position;
        const { width, height: itemHeight } = item.size;

        if (item.anchor === 'bottom-center') {
            return { x: along - width / 2, y: wallHeight - height - itemHeight };
        }
        if (item.anchor === 'center') {
            return { x: along - width / 2, y: wallHeight - height - itemHeight / 2 };
        }
        return { x: along, y: wallHeight - height - itemHeight };
    };

    const getPositionFromTopLeft = (topLeft: Point, item: VerticalItem) => {
        const { width, height: itemHeight } = item.size;
        if (item.anchor === 'bottom-center') {
            return { along: topLeft.x + width / 2, height: wallHeight - topLeft.y - itemHeight };
        }
        if (item.anchor === 'center') {
            return { along: topLeft.x + width / 2, height: wallHeight - topLeft.y - itemHeight / 2 };
        }
        return { along: topLeft.x, height: wallHeight - topLeft.y - itemHeight };
    };

    const clampItemPosition = (position: Point, item: VerticalItem) => {
        const maxX = Math.max(0, wallLength - item.size.width);
        const maxY = Math.max(0, wallHeight - item.size.height);
        return {
            x: clampValue(position.x, 0, maxX),
            y: clampValue(position.y, 0, maxY),
        };
    };

    const snapItemPosition = (position: Point, item: VerticalItem) => {
        const snapped = snapToGrid(position, gridStep);
        const next = { ...item, position: { ...item.position, along: snapped.x, height: snapped.y } };
        const topLeft = clampItemPosition(getItemTopLeft(next), next);
        return getPositionFromTopLeft(topLeft, next);
    };

    // Zoom handlers
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

    const handleZoomIn = () => setStageScale(s => s * 1.2);
    const handleZoomOut = () => setStageScale(s => s / 1.2);

    const handleFitToView = () => {
        const container = containerRef.current;
        if (!container) return;
        const padding = 40;
        const availableWidth = container.clientWidth - padding * 2;
        const availableHeight = container.clientHeight - padding * 2;
        const contentWidth = wallLengthPx + WALL_PADDING_PX * 2;
        const contentHeight = wallHeightPx + WALL_PADDING_PX * 2;
        const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1);
        setStageScale(scale);
        // Center the content
        const offsetX = (container.clientWidth - contentWidth * scale) / 2;
        const offsetY = (container.clientHeight - contentHeight * scale) / 2;
        setStagePos({ x: offsetX, y: offsetY });
    };

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // If clicking background/wall, deselect
        if (e.target.name() === 'background') {
            setSelectedId(null);
        }

        if (tool !== 'select') {
            const pos = stage.getRelativePointerPosition();
            if (!pos) return;

            const relPx = { x: pos.x - WALL_PADDING_PX, y: pos.y - WALL_PADDING_PX };
            const rel = fromPxPoint(relPx, lengthUnit);

            if (rel.x >= 0 && rel.x <= wallLength && rel.y >= 0 && rel.y <= wallHeight) {
                const baseSize = defaultItemSizes[tool] || { w: toUnit(12), h: toUnit(12) };
                const snapped = snapToGrid({ x: rel.x, y: wallHeight - rel.y }, gridStep);

                const newItem: VerticalItem = {
                    id: crypto.randomUUID(),
                    item_type: tool,
                    position: { along: snapped.x, height: snapped.y },
                    size: { width: baseSize.w, height: baseSize.h },
                    anchor: 'bottom-left',
                };

                const topLeft = clampItemPosition(getItemTopLeft(newItem), newItem);
                const position = getPositionFromTopLeft(topLeft, newItem);

                onUpdate({ ...element, items: [...(element.items || []), { ...newItem, position }] });
                setTool('select');
                setSelectedId(newItem.id);
            }
        }
    };

    const updateItemById = (id: string, updater: (item: VerticalItem) => VerticalItem) => {
        const updatedItems = element.items.map(it => (it.id === id ? updater(it) : it));
        onUpdate({ ...element, items: updatedItems });
    };

    const updateItem = (updater: (item: VerticalItem) => VerticalItem) => {
        if (!selectedItemId) return;
        updateItemById(selectedItemId, updater);
    };

    const updateItemPosition = (updates: Partial<VerticalItem['position']>) => {
        updateItem((item) => {
            const next = { ...item, position: { ...item.position, ...updates } };
            const topLeft = clampItemPosition(getItemTopLeft(next), next);
            return { ...next, position: getPositionFromTopLeft(topLeft, next) };
        });
    };

    const updateItemSize = (updates: Partial<VerticalItem['size']>) => {
        updateItem((item) => {
            const next = { ...item, size: { ...item.size, ...updates } };
            const topLeft = clampItemPosition(getItemTopLeft(next), next);
            return { ...next, position: getPositionFromTopLeft(topLeft, next) };
        });
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (!selectedItem || selectedItem.locked) return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

        const baseStep = gridStep;
        const fineStep = baseStep / 4;
        const coarseStep = unitSystem === 'imperial' ? baseStep * 12 : baseStep * 10;
        const step = e.altKey ? fineStep : e.shiftKey ? coarseStep : baseStep;

        let deltaX = 0;
        let deltaY = 0;
        if (e.key === 'ArrowLeft') deltaX = -step;
        if (e.key === 'ArrowRight') deltaX = step;
        if (e.key === 'ArrowUp') deltaY = step;
        if (e.key === 'ArrowDown') deltaY = -step;
        if (deltaX === 0 && deltaY === 0) return;

        e.preventDefault();
        updateItem((item) => {
            const next = {
                ...item,
                position: {
                    along: item.position.along + deltaX,
                    height: item.position.height + deltaY,
                },
            };
            const topLeft = clampItemPosition(getItemTopLeft(next), next);
            return { ...next, position: getPositionFromTopLeft(topLeft, next) };
        });
    };

    const deleteItem = () => {
        if (!selectedItemId) return;
        const updatedItems = element.items.filter(it => it.id !== selectedItemId);
        onUpdate({ ...element, items: updatedItems });
        setSelectedId(null);
    };

    const toggleItemLocked = (id: string) => {
        updateItemById(id, (item) => ({ ...item, locked: !item.locked }));
    };

    const toggleItemHidden = (id: string) => {
        updateItemById(id, (item) => ({ ...item, hidden: !item.hidden }));
    };

    const renderItemList = () => {
        const items = element.items || [];
        if (items.length === 0) {
            return <div className="text-xs text-muted-foreground">No items placed yet.</div>;
        }

        return (
            <div className="space-y-2">
                {items.map(item => {
                    const Icon = TOOL_ICON_MAP.get(item.item_type) || Frame;
                    const isSelected = item.id === selectedItemId;
                    const status = [
                        item.hidden ? 'Hidden' : null,
                        item.locked ? 'Locked' : null,
                    ].filter(Boolean).join(' • ');
                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={`w-full rounded-md border px-2 py-2 text-left text-xs transition ${
                                isSelected ? 'border-primary/50 bg-primary/5' : 'border-muted/40 hover:border-muted/80'
                            }`}
                            onClick={() => setSelectedId(item.id)}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Icon className="size-4 text-muted-foreground" />
                                    <div className="font-medium capitalize">{item.item_type}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => { e.stopPropagation(); toggleItemHidden(item.id); }}
                                        title={item.hidden ? 'Show item' : 'Hide item'}
                                    >
                                        {item.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => { e.stopPropagation(); toggleItemLocked(item.id); }}
                                        title={item.locked ? 'Unlock item' : 'Lock item'}
                                    >
                                        {item.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                                Along {formatLength(item.position.along, unitSystem, lengthUnit)} • Height {formatLength(item.position.height, unitSystem, lengthUnit)}
                            </div>
                            {status && <div className="text-[10px] text-muted-foreground mt-1">{status}</div>}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderProperties = () => {
        if (!selectedItem) return <div className="text-muted-foreground text-sm text-center mt-10">Select an item to edit</div>;
        const presets = HEIGHT_PRESETS_IN[selectedItem.item_type] || [];
        const anchorLabel = selectedItem.anchor === 'center' ? 'center' : selectedItem.anchor === 'bottom-center' ? 'bottom center' : 'bottom';

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold capitalize">{selectedItem.item_type}</h3>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleItemHidden(selectedItem.id)}
                            title={selectedItem.hidden ? 'Show item' : 'Hide item'}
                        >
                            {selectedItem.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleItemLocked(selectedItem.id)}
                            title={selectedItem.locked ? 'Unlock item' : 'Lock item'}
                        >
                            {selectedItem.locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={deleteItem} className="text-destructive hover:text-destructive">
                            <Trash2 className="size-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Position */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Position (Along / Height • {anchorLabel} anchor) • {unitLabel}</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Along</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.position.along)}
                                onChange={e => updateItemPosition({ along: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Height</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.position.height)}
                                onChange={e => updateItemPosition({ height: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>

                {presets.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Height Presets</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8 justify-start"
                                    onClick={() => updateItemPosition({ height: toUnit(preset.value) })}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Size Controls */}
                {selectedItem.item_type === 'tv' && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Diagonal Size</Label>
                        <Select
                            onValueChange={(value) => {
                                const size = TV_SIZES.find(s => s.diag === Number(value));
                                if (size) updateItemSize({ width: toUnit(size.w), height: toUnit(size.h) });
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Size..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TV_SIZES.map(s => (
                                    <SelectItem key={s.diag} value={String(s.diag)}>
                                        {s.diag}" ({s.w}x{s.h}")
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(selectedItem.item_type === 'picture' || selectedItem.item_type === 'frame') && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Frame Size</Label>
                        <Select
                            onValueChange={(value) => {
                                const [w, h] = value.split(',').map(Number);
                                updateItemSize({ width: toUnit(w), height: toUnit(h) });
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Size..." />
                            </SelectTrigger>
                            <SelectContent>
                                {FRAME_SIZES.map(s => (
                                    <SelectItem key={s.label} value={`${s.w},${s.h}`}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Generic Dimensions for everything */}
                <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs text-muted-foreground">Dimensions ({unitLabel})</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">W</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.size.width)}
                                onChange={e => updateItemSize({ width: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">H</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.size.height)}
                                onChange={e => updateItemSize({ height: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {formatLength(selectedItem.size.width, unitSystem, lengthUnit)} x {formatLength(selectedItem.size.height, unitSystem, lengthUnit)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200"
            role="application"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => (e.currentTarget as HTMLDivElement).focus()}
        >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-4 bg-background">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose} title="Back">
                         <ChevronLeft className="size-5" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-semibold leading-none tracking-tight">Elevation View</h2>
                        <p className="text-sm text-muted-foreground">Wall ID: {element.id.slice(0, 8)} • Length: {formatLength(wallLength, unitSystem, lengthUnit)} • Height: {formatLength(wallHeight, unitSystem, lengthUnit)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="size-5" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Toolbar */}
                <div className="w-16 shrink-0 bg-muted/30 border-r flex flex-col items-center py-4 z-10 overflow-y-auto">
                    <ToggleGroup
                        type="single"
                        value={tool}
                        onValueChange={(v) => v && setTool(v as ToolType)}
                        orientation="vertical"
                        className="flex-col gap-2"
                    >
                        {TOOLS.map((t) => (
                            <ToggleGroupItem
                                key={t.id}
                                value={t.id}
                                className="flex flex-col items-center gap-1 h-auto py-2 px-2 w-14 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                                title={t.label}
                            >
                                <t.icon className="size-5" />
                                {/* <span className="text-[9px] font-bold tracking-widest uppercase truncate w-full text-center">{t.label}</span> */}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                {/* Canvas */}
                <div ref={containerRef} className="flex-1 min-w-0 bg-muted/20 relative overflow-hidden">
                    <Stage
                        ref={stageRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        onClick={handleStageClick}
                        onWheel={handleWheel}
                        draggable={tool === 'select'}
                        scaleX={stageScale}
                        scaleY={stageScale}
                        x={stagePos.x}
                        y={stagePos.y}
                    >
                        <Layer>
                            <Rect
                                name="background"
                                x={WALL_PADDING_PX}
                                y={WALL_PADDING_PX}
                                width={wallLengthPx}
                                height={wallHeightPx}
                                fill="white"
                                stroke="#333"
                                strokeWidth={2}
                            />
                            {Array.from({ length: Math.ceil(wallLengthPx / gridPx) }).map((_, i) => (
                                <Line
                                    key={`v${i}`}
                                    points={[WALL_PADDING_PX + i * gridPx, WALL_PADDING_PX, WALL_PADDING_PX + i * gridPx, WALL_PADDING_PX + wallHeightPx]}
                                    stroke="#f0f0f0"
                                    strokeWidth={1}
                                />
                            ))}
                            {Array.from({ length: Math.ceil(wallHeightPx / gridPx) }).map((_, i) => (
                                <Line
                                    key={`h${i}`}
                                    points={[WALL_PADDING_PX, WALL_PADDING_PX + i * gridPx, WALL_PADDING_PX + wallLengthPx, WALL_PADDING_PX + i * gridPx]}
                                    stroke="#f0f0f0"
                                    strokeWidth={1}
                                />
                            ))}

                            {intersections.map((int, i) => {
                                const startPx = toPx(int.start, lengthUnit);
                                const endPx = toPx(int.end, lengthUnit);
                                const heightPx = toPx(int.height, lengthUnit);
                                const sillPx = toPx(int.y, lengthUnit);
                                return (
                                    <Group key={i} x={WALL_PADDING_PX + startPx} y={WALL_PADDING_PX + (wallHeightPx - sillPx - heightPx)}>
                                        <Rect width={endPx - startPx} height={heightPx} fill="#e0f2fe" stroke="#3b82f6" strokeWidth={2} />
                                        <Text text={int.type} y={heightPx / 2 - 5} width={endPx - startPx} align="center" fill="#3b82f6" fontSize={10} />
                                    </Group>
                                );
                            })}

                            {element.items?.map(item => {
                                if (item.hidden) return null;
                                const fallback = defaultItemSizes[item.item_type] || { w: toUnit(12), h: toUnit(12) };
                                const size = { width: item.size?.width ?? fallback.w, height: item.size?.height ?? fallback.h };
                                const topLeft = getItemTopLeft({ ...item, size });
                                const topLeftPx = {
                                    x: toPx(topLeft.x, lengthUnit),
                                    y: toPx(topLeft.y, lengthUnit),
                                };
                                const wPx = toPx(size.width, lengthUnit);
                                const hPx = toPx(size.height, lengthUnit);

                                let content = <Rect width={wPx} height={hPx} fill="pink" />;

                                if (item.item_type === 'switch') content = <Rect width={wPx} height={hPx} fill="#f3f4f6" stroke="#6b7280" cornerRadius={2} />;
                                else if (item.item_type === 'outlet') content = <Circle x={wPx / 2} y={hPx / 2} radius={Math.min(wPx, hPx) / 2} fill="#f3f4f6" stroke="#6b7280" strokeWidth={2} />;
                                else if (item.item_type === 'sconce') content = <Group><Line points={[wPx / 2, hPx, wPx / 2, hPx / 2, 0, 0, wPx, 0, wPx / 2, hPx / 2]} fill="gold" closed /></Group>;
                                else if (item.item_type === 'tv') content = (
                                    <Group>
                                        <Rect width={wPx} height={hPx} fill="#111" stroke="#333" cornerRadius={2} />
                                        <Rect width={Math.max(0, wPx - 4)} height={Math.max(0, hPx - 4)} x={2} y={2} fill="#222" />
                                    </Group>
                                );
                                else if (item.item_type === 'picture' || item.item_type === 'frame') content = (
                                    <Group>
                                        <Rect width={wPx} height={hPx} fill="#f9fafb" stroke="#78350f" strokeWidth={Math.max(2, wPx * 0.05)} />
                                        <Line points={[wPx * 0.2, hPx * 0.8, wPx * 0.4, hPx * 0.4, wPx * 0.6, hPx * 0.6, wPx * 0.8, hPx * 0.2, wPx, hPx * 0.5]} stroke="#d1d5db" strokeWidth={1} />
                                    </Group>
                                );
                                else if (item.item_type === 'arch') content = (
                                    <Path
                                        data={`M0,${hPx} L0,${hPx * 0.4} Q${wPx / 2},0 ${wPx},${hPx * 0.4} L${wPx},${hPx} Z`}
                                        fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2}
                                    />
                                );
                                else if (item.item_type === 'circle') content = <Circle x={wPx / 2} y={hPx / 2} radius={Math.min(wPx, hPx) / 2} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2} />;

                                return (
                                    <Group
                                        key={item.id}
                                        x={WALL_PADDING_PX + topLeftPx.x}
                                        y={WALL_PADDING_PX + topLeftPx.y}
                                        draggable={tool === 'select' && !item.locked}
                                        onDragEnd={(e) => {
                                            const newTopLeftPx = { x: e.target.x() - WALL_PADDING_PX, y: e.target.y() - WALL_PADDING_PX };
                                            const newTopLeft = fromPxPoint(newTopLeftPx, lengthUnit);
                                            const clampedTopLeft = clampItemPosition(newTopLeft, { ...item, size });
                                            const rawPosition = getPositionFromTopLeft(clampedTopLeft, { ...item, size });
                                            const snappedPosition = snapItemPosition(
                                                { x: rawPosition.along, y: rawPosition.height },
                                                { ...item, size, position: rawPosition }
                                            );
                                            const updatedItems = element.items.map(it => it.id === item.id ? { ...it, position: snappedPosition, size } : it);
                                            onUpdate({ ...element, items: updatedItems });
                                        }}
                                        onClick={(e) => { e.cancelBubble = true; setSelectedId(item.id); }}
                                    >
                                        {content}
                                        {selectedItemId === item.id && <Rect width={wPx + 4} height={hPx + 4} x={-2} y={-2} stroke="#4f46e5" strokeWidth={1} dash={[4, 4]} />}
                                    </Group>
                                );
                            })}
                        </Layer>
                    </Stage>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-4 right-4 flex gap-1 bg-background/90 border rounded-lg p-1 shadow-sm">
                        <Button variant="ghost" size="sm" onClick={handleFitToView} title="Fit to view">
                            <Maximize2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom out">
                            <ZoomOut className="size-4" />
                        </Button>
                        <span className="px-2 text-xs flex items-center text-muted-foreground min-w-[3rem] justify-center">
                            {Math.round(stageScale * 100)}%
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom in">
                            <ZoomIn className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Properties Sidebar */}
                <div className="w-80 shrink-0 bg-background border-l p-4 overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold">Items</h3>
                                <span className="text-xs text-muted-foreground">{element.items?.length || 0}</span>
                            </div>
                            {renderItemList()}
                        </div>
                        <div className="pt-4 border-t">
                            {renderProperties()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElevationEditor;
