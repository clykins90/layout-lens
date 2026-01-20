import { useCallback } from 'react';

import type { Element, Room } from '../types';
import { findEnclosingRoom } from '../utils/geometry';

type UseRoomRecalculationArgs = {
    rooms: Room[];
    setElements: (elements: Element[]) => void;
    setRooms: (rooms: Room[]) => void;
};

export const useRoomRecalculation = ({ rooms, setElements, setRooms }: UseRoomRecalculationArgs) => {
    const updateElements = useCallback(
        (newElements: Element[]) => {
            const updatedRooms = rooms.map((room) => {
                const result = findEnclosingRoom(newElements, room.label_pos);

                if (result) {
                    const cx = result.points.reduce((acc, point) => acc + point.x, 0) / result.points.length;
                    const cy = result.points.reduce((acc, point) => acc + point.y, 0) / result.points.length;
                    return {
                        ...room,
                        points: result.points,
                        wallIds: result.wallIds,
                        label_pos: { x: cx, y: cy },
                        isValid: true,
                    };
                }

                return {
                    ...room,
                    isValid: false,
                };
            });

            setElements(newElements);
            setRooms(updatedRooms);
        },
        [rooms, setElements, setRooms]
    );

    return { updateElements };
};
