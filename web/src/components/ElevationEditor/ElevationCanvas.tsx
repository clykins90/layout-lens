import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Path } from 'react-konva';
import Konva from 'konva';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { snapToGrid } from '../../utils/geometry';
import { fromPxPoint, toPx } from '../../utils/units';
import type { Element, LengthUnit, VerticalItem } from '../../types';
import {
    clampItemPosition,
    getItemTopLeft,
    getPositionFromTopLeft,
    snapItemPosition,
    type Intersection,
} from './geometry';
import { WALL_PADDING_PX, type ItemType, type ToolType } from './constants';

type DefaultItemSizes = Partial<Record<VerticalItem['item_type'], { w: number; h: number }>>;

type ElevationCanvasProps = {
    element: Element;
    tool: ToolType;
    selectedItemId: string | null;
    wallLength: number;
    wallHeight: number;
    wallLengthPx: number;
    wallHeightPx: number;
    gridStep: number;
    gridPx: number;
    intersections: Intersection[];
    lengthUnit: LengthUnit;
    defaultItemSizes: DefaultItemSizes;
    toUnit: (inches: number) => number;
    onSelectItem: (id: string | null) => void;
    onToolChange: (tool: ToolType) => void;
    onUpdate: (updatedElement: Element) => void;
};

type ElevationGridProps = {
    wallLengthPx: number;
    wallHeightPx: number;
    gridPx: number;
};

type ElevationIntersectionsProps = {
    intersections: Intersection[];
    lengthUnit: LengthUnit;
    wallHeightPx: number;
};

type ElevationItemShapeProps = {
    itemType: ItemType;
    widthPx: number;
    heightPx: number;
};

type ElevationItemsProps = {
    items: VerticalItem[];
    element: Element;
    tool: ToolType;
    selectedItemId: string | null;
    wallLength: number;
    wallHeight: number;
    lengthUnit: LengthUnit;
    defaultItemSizes: DefaultItemSizes;
    gridStep: number;
    toUnit: (inches: number) => number;
    onSelectItem: (id: string | null) => void;
    onUpdate: (updatedElement: Element) => void;
};

const ElevationGrid = memo(({ wallLengthPx, wallHeightPx, gridPx }: ElevationGridProps) => {
    const verticalCount = Math.ceil(wallLengthPx / gridPx);
    const horizontalCount = Math.ceil(wallHeightPx / gridPx);

    return (
        <>
            {Array.from({ length: verticalCount }).map((_, index) => (
                <Line
                    key={`v${index}`}
                    points={[
                        WALL_PADDING_PX + index * gridPx,
                        WALL_PADDING_PX,
                        WALL_PADDING_PX + index * gridPx,
                        WALL_PADDING_PX + wallHeightPx,
                    ]}
                    stroke="#f0f0f0"
                    strokeWidth={1}
                />
            ))}
            {Array.from({ length: horizontalCount }).map((_, index) => (
                <Line
                    key={`h${index}`}
                    points={[
                        WALL_PADDING_PX,
                        WALL_PADDING_PX + index * gridPx,
                        WALL_PADDING_PX + wallLengthPx,
                        WALL_PADDING_PX + index * gridPx,
                    ]}
                    stroke="#f0f0f0"
                    strokeWidth={1}
                />
            ))}
        </>
    );
});

ElevationGrid.displayName = 'ElevationGrid';

const ElevationIntersections = memo(({ intersections, lengthUnit, wallHeightPx }: ElevationIntersectionsProps) => (
    <>
        {intersections.map((intersection, index) => {
            const startPx = toPx(intersection.start, lengthUnit);
            const endPx = toPx(intersection.end, lengthUnit);
            const heightPx = toPx(intersection.height, lengthUnit);
            const sillPx = toPx(intersection.y, lengthUnit);

            return (
                <Group
                    key={`${intersection.type}-${index}`}
                    x={WALL_PADDING_PX + startPx}
                    y={WALL_PADDING_PX + (wallHeightPx - sillPx - heightPx)}
                >
                    <Rect width={endPx - startPx} height={heightPx} fill="#e0f2fe" stroke="#3b82f6" strokeWidth={2} />
                    <Text
                        text={intersection.type}
                        y={heightPx / 2 - 5}
                        width={endPx - startPx}
                        align="center"
                        fill="#3b82f6"
                        fontSize={10}
                    />
                </Group>
            );
        })}
    </>
));

ElevationIntersections.displayName = 'ElevationIntersections';

const ElevationItemShape = memo(({ itemType, widthPx, heightPx }: ElevationItemShapeProps) => {
    if (itemType === 'switch') {
        return <Rect width={widthPx} height={heightPx} fill="#f3f4f6" stroke="#6b7280" cornerRadius={2} />;
    }

    if (itemType === 'outlet') {
        return (
            <Circle
                x={widthPx / 2}
                y={heightPx / 2}
                radius={Math.min(widthPx, heightPx) / 2}
                fill="#f3f4f6"
                stroke="#6b7280"
                strokeWidth={2}
            />
        );
    }

    if (itemType === 'sconce') {
        return (
            <Group>
                <Line
                    points={[widthPx / 2, heightPx, widthPx / 2, heightPx / 2, 0, 0, widthPx, 0, widthPx / 2, heightPx / 2]}
                    fill="gold"
                    closed
                />
            </Group>
        );
    }

    if (itemType === 'tv') {
        return (
            <Group>
                <Rect width={widthPx} height={heightPx} fill="#111" stroke="#333" cornerRadius={2} />
                <Rect width={Math.max(0, widthPx - 4)} height={Math.max(0, heightPx - 4)} x={2} y={2} fill="#222" />
            </Group>
        );
    }

    if (itemType === 'picture' || itemType === 'frame') {
        return (
            <Group>
                <Rect width={widthPx} height={heightPx} fill="#f9fafb" stroke="#78350f" strokeWidth={Math.max(2, widthPx * 0.05)} />
                <Line
                    points={[
                        widthPx * 0.2,
                        heightPx * 0.8,
                        widthPx * 0.4,
                        heightPx * 0.4,
                        widthPx * 0.6,
                        heightPx * 0.6,
                        widthPx * 0.8,
                        heightPx * 0.2,
                        widthPx,
                        heightPx * 0.5,
                    ]}
                    stroke="#d1d5db"
                    strokeWidth={1}
                />
            </Group>
        );
    }

    if (itemType === 'arch') {
        return (
            <Path
                data={`M0,${heightPx} L0,${heightPx * 0.4} Q${widthPx / 2},0 ${widthPx},${heightPx * 0.4} L${widthPx},${heightPx} Z`}
                fill="#e5e7eb"
                stroke="#9ca3af"
                strokeWidth={2}
            />
        );
    }

    if (itemType === 'circle') {
        return (
            <Circle
                x={widthPx / 2}
                y={heightPx / 2}
                radius={Math.min(widthPx, heightPx) / 2}
                fill="#e5e7eb"
                stroke="#9ca3af"
                strokeWidth={2}
            />
        );
    }

    return <Rect width={widthPx} height={heightPx} fill="pink" />;
});

ElevationItemShape.displayName = 'ElevationItemShape';

const ElevationItems = memo(({
    items,
    element,
    tool,
    selectedItemId,
    wallLength,
    wallHeight,
    lengthUnit,
    defaultItemSizes,
    gridStep,
    toUnit,
    onSelectItem,
    onUpdate,
}: ElevationItemsProps) => (
    <>
        {items.map((item) => {
            if (item.hidden) return null;

            const fallback = defaultItemSizes[item.item_type] || { w: toUnit(12), h: toUnit(12) };
            const size = { width: item.size?.width ?? fallback.w, height: item.size?.height ?? fallback.h };
            const topLeft = getItemTopLeft({ ...item, size }, wallHeight);
            const topLeftPx = {
                x: toPx(topLeft.x, lengthUnit),
                y: toPx(topLeft.y, lengthUnit),
            };
            const widthPx = toPx(size.width, lengthUnit);
            const heightPx = toPx(size.height, lengthUnit);

            return (
                <Group
                    key={item.id}
                    x={WALL_PADDING_PX + topLeftPx.x}
                    y={WALL_PADDING_PX + topLeftPx.y}
                    draggable={tool === 'select' && !item.locked}
                    onDragEnd={(event) => {
                        const newTopLeftPx = {
                            x: event.target.x() - WALL_PADDING_PX,
                            y: event.target.y() - WALL_PADDING_PX,
                        };
                        const newTopLeft = fromPxPoint(newTopLeftPx, lengthUnit);
                        const clampedTopLeft = clampItemPosition(newTopLeft, { ...item, size }, wallLength, wallHeight);
                        const rawPosition = getPositionFromTopLeft(clampedTopLeft, { ...item, size }, wallHeight);
                        const snappedPosition = snapItemPosition(
                            { x: rawPosition.along, y: rawPosition.height },
                            { ...item, size, position: rawPosition },
                            wallLength,
                            wallHeight,
                            gridStep
                        );
                        const updatedItems = items.map((it) =>
                            it.id === item.id ? { ...it, position: snappedPosition, size } : it
                        );
                        onUpdate({ ...element, items: updatedItems });
                    }}
                    onClick={(event) => {
                        event.cancelBubble = true;
                        onSelectItem(item.id);
                    }}
                >
                    <ElevationItemShape itemType={item.item_type} widthPx={widthPx} heightPx={heightPx} />
                    {selectedItemId === item.id && (
                        <Rect width={widthPx + 4} height={heightPx + 4} x={-2} y={-2} stroke="#4f46e5" strokeWidth={1} dash={[4, 4]} />
                    )}
                </Group>
            );
        })}
    </>
));

ElevationItems.displayName = 'ElevationItems';

export const ElevationCanvas = ({
    element,
    tool,
    selectedItemId,
    wallLength,
    wallHeight,
    wallLengthPx,
    wallHeightPx,
    gridStep,
    gridPx,
    intersections,
    lengthUnit,
    defaultItemSizes,
    toUnit,
    onSelectItem,
    onToolChange,
    onUpdate,
}: ElevationCanvasProps) => {
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const items = element.items || [];

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        const updateSize = (width: number, height: number) => {
            setCanvasSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            updateSize(width, height);
        });

        const { width, height } = container.getBoundingClientRect();
        updateSize(width, height);
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
        event.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };
        const newScale = event.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    };

    const handleZoomIn = () => setStageScale((current) => current * 1.2);
    const handleZoomOut = () => setStageScale((current) => current / 1.2);

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
        const offsetX = (container.clientWidth - contentWidth * scale) / 2;
        const offsetY = (container.clientHeight - contentHeight * scale) / 2;
        setStagePos({ x: offsetX, y: offsetY });
    };

    const handleStageClick = (event: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = event.target.getStage();
        if (!stage) return;

        if (event.target.name() === 'background') {
            onSelectItem(null);
        }

        if (tool !== 'select') {
            const pos = stage.getRelativePointerPosition();
            if (!pos) return;

            const relPx = { x: pos.x - WALL_PADDING_PX, y: pos.y - WALL_PADDING_PX };
            const rel = fromPxPoint(relPx, lengthUnit);

            if (rel.x >= 0 && rel.x <= wallLength && rel.y >= 0 && rel.y <= wallHeight) {
                const toolItemType = tool as ItemType;
                const baseSize = defaultItemSizes[toolItemType] || { w: toUnit(12), h: toUnit(12) };
                const snapped = snapToGrid({ x: rel.x, y: wallHeight - rel.y }, gridStep);

                const newItem: VerticalItem = {
                    id: crypto.randomUUID(),
                    item_type: toolItemType,
                    position: { along: snapped.x, height: snapped.y },
                    size: { width: baseSize.w, height: baseSize.h },
                    anchor: 'bottom-left',
                };

                const topLeft = clampItemPosition(getItemTopLeft(newItem, wallHeight), newItem, wallLength, wallHeight);
                const position = getPositionFromTopLeft(topLeft, newItem, wallHeight);

                onUpdate({ ...element, items: [...items, { ...newItem, position }] });
                onToolChange('select');
                onSelectItem(newItem.id);
            }
        }
    };

    return (
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
                    <ElevationGrid wallLengthPx={wallLengthPx} wallHeightPx={wallHeightPx} gridPx={gridPx} />
                    <ElevationIntersections intersections={intersections} lengthUnit={lengthUnit} wallHeightPx={wallHeightPx} />
                    <ElevationItems
                        items={items}
                        element={element}
                        tool={tool}
                        selectedItemId={selectedItemId}
                        wallLength={wallLength}
                        wallHeight={wallHeight}
                        lengthUnit={lengthUnit}
                        defaultItemSizes={defaultItemSizes}
                        gridStep={gridStep}
                        toUnit={toUnit}
                        onSelectItem={onSelectItem}
                        onUpdate={onUpdate}
                    />
                </Layer>
            </Stage>

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
    );
};
