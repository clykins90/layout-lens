import { memo } from 'react';
import { Group, Line, Text } from 'react-konva';

import type { LengthUnit, Room, UnitSystem } from '../../types';
import type { Tool } from '../../hooks/useEditorState';
import { calculatePolygonArea } from '../../utils/geometry';
import { formatArea, toPxPoint } from '../../utils/units';

type BlueprintRoomsLayerProps = {
    rooms: Room[];
    selectedId: string | null;
    tool: Tool;
    unitSystem: UnitSystem;
    lengthUnit: LengthUnit;
    onSelectId: (id: string) => void;
};

const BlueprintRoomsLayer = memo(
    ({ rooms, selectedId, tool, unitSystem, lengthUnit, onSelectId }: BlueprintRoomsLayerProps) => (
        <>
            {rooms.map((room) => {
                const isSelected = selectedId === room.id;
                const isValid = room.isValid !== false;
                const roomPointsPx = room.points.map((point) => toPxPoint(point, lengthUnit));
                const labelPosPx = toPxPoint(room.label_pos, lengthUnit);

                let fillColor = isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(200, 200, 200, 0.1)';
                let strokeColor = isSelected ? '#4f46e5' : 'transparent';
                let dash: number[] = [];

                if (!isValid) {
                    strokeColor = '#ef4444';
                    dash = [10, 5];
                    fillColor = 'rgba(239, 68, 68, 0.05)';
                } else if (room.flooring?.hex) {
                    fillColor = room.flooring.hex;
                } else if (room.paint?.hex) {
                    fillColor = room.paint.hex;
                }

                return (
                    <Group
                        key={room.id}
                        onClick={() => {
                            if (tool === 'select') onSelectId(room.id);
                        }}
                    >
                        <Line
                            points={roomPointsPx.flatMap((point) => [point.x, point.y])}
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
                            text={
                                isValid
                                    ? `${room.name}\n${formatArea(
                                          calculatePolygonArea(room.points),
                                          unitSystem,
                                          lengthUnit
                                      )}`
                                    : `${room.name}\n(Open Loop)`
                            }
                            align="center"
                            width={100}
                            fontSize={14}
                            fill={!isValid ? '#ef4444' : fillColor === 'rgba(200, 200, 200, 0.1)' ? '#555' : '#333'}
                            fontStyle="bold"
                        />
                    </Group>
                );
            })}
        </>
    )
);

BlueprintRoomsLayer.displayName = 'BlueprintRoomsLayer';

export default BlueprintRoomsLayer;
