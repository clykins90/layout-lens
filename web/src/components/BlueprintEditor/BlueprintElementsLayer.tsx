import { memo, useMemo } from 'react';
import { Group, Line, Path, Rect, Text } from 'react-konva';

import type { Element, LengthUnit, Point, UnitSystem } from '../../types';
import type { Tool } from '../../hooks/useEditorState';
import { distance, getControlPoint } from '../../utils/geometry';
import { formatLength, toPx, toPxPoint } from '../../utils/units';
import { DOOR_STROKE_PX, OPENING_STROKE_PX, WINDOW_STROKE_PX } from './constants';

type BlueprintElementsLayerProps = {
    elements: Element[];
    selectedId: string | null;
    tool: Tool;
    unitSystem: UnitSystem;
    lengthUnit: LengthUnit;
    activePoints: Point[];
    mousePos: Point | null;
    onSelectId: (id: string) => void;
};

const BlueprintElementsLayer = memo(
    ({
        elements,
        selectedId,
        tool,
        unitSystem,
        lengthUnit,
        activePoints,
        mousePos,
        onSelectId,
    }: BlueprintElementsLayerProps) => {
        const activePointsPx = useMemo(
            () => activePoints.map((point) => toPxPoint(point, lengthUnit)),
            [activePoints, lengthUnit]
        );
        const mousePosPx = useMemo(() => (mousePos ? toPxPoint(mousePos, lengthUnit) : null), [mousePos, lengthUnit]);

        return (
            <>
                {elements.map((el) => {
                    let color = '#333';
                    let width = 0;
                    let dash: number[] = [];
                    const startPx = toPxPoint(el.start, lengthUnit);
                    const endPx = toPxPoint(el.end, lengthUnit);
                    const thicknessPx = Math.max(2, toPx(el.thickness, lengthUnit));
                    if (el.element_type === 'window') {
                        color = '#60a5fa';
                        width = WINDOW_STROKE_PX;
                    } else if (el.element_type === 'door') {
                        color = '#92400e';
                        width = DOOR_STROKE_PX;
                    } else if (el.element_type === 'opening') {
                        color = '#d1d5db';
                        width = OPENING_STROKE_PX;
                        dash = [10, 10];
                    } else {
                        width = thicknessPx;
                    }

                    if (el.element_type === 'wall' && el.paint?.hex) {
                        color = el.paint.hex;
                    }

                    const isSelected = selectedId === el.id;
                    const midX = (startPx.x + endPx.x) / 2;
                    const midY = (startPx.y + endPx.y) / 2;
                    const curvature = el.curvature || 0;
                    const controlPoint = curvature === 0 ? null : getControlPoint(el.start, el.end, curvature);
                    const controlPointPx = controlPoint ? toPxPoint(controlPoint, lengthUnit) : null;

                    return (
                        <Group
                            key={el.id}
                            onClick={(event) => {
                                if (tool === 'select') {
                                    event.cancelBubble = true;
                                    onSelectId(el.id);
                                }
                            }}
                        >
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
                            {el.items && el.items.length > 0 && (
                                <Rect
                                    x={midX}
                                    y={midY}
                                    width={8}
                                    height={8}
                                    fill="#fbbf24"
                                    rotation={45}
                                    offsetX={4}
                                    offsetY={4}
                                />
                            )}
                        </Group>
                    );
                })}
                {activePointsPx.length > 0 && mousePosPx && (
                    <Line
                        points={[...activePointsPx.flatMap((point) => [point.x, point.y]), mousePosPx.x, mousePosPx.y]}
                        stroke="#666"
                        strokeWidth={2}
                        dash={[5, 5]}
                    />
                )}
            </>
        );
    }
);

BlueprintElementsLayer.displayName = 'BlueprintElementsLayer';

export default BlueprintElementsLayer;
