import type { Element, Point, VerticalItem, VerticalItemPosition } from '../../types';
import { snapToGrid } from '../../utils/geometry';

export type Intersection = {
    type: string;
    start: number;
    end: number;
    height: number;
    y: number;
};

export const getIntersections = (
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

    const intersections: Intersection[] = [];

    allElements.forEach((el) => {
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

export const getItemTopLeft = (item: VerticalItem, wallHeight: number): Point => {
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

export const getPositionFromTopLeft = (topLeft: Point, item: VerticalItem, wallHeight: number): VerticalItemPosition => {
    const { width, height: itemHeight } = item.size;
    if (item.anchor === 'bottom-center') {
        return { along: topLeft.x + width / 2, height: wallHeight - topLeft.y - itemHeight };
    }
    if (item.anchor === 'center') {
        return { along: topLeft.x + width / 2, height: wallHeight - topLeft.y - itemHeight / 2 };
    }
    return { along: topLeft.x, height: wallHeight - topLeft.y - itemHeight };
};

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const clampItemPosition = (position: Point, item: VerticalItem, wallLength: number, wallHeight: number) => {
    const maxX = Math.max(0, wallLength - item.size.width);
    const maxY = Math.max(0, wallHeight - item.size.height);
    return {
        x: clampValue(position.x, 0, maxX),
        y: clampValue(position.y, 0, maxY),
    };
};

export const snapItemPosition = (
    position: Point,
    item: VerticalItem,
    wallLength: number,
    wallHeight: number,
    gridStep: number
): VerticalItemPosition => {
    const snapped = snapToGrid(position, gridStep);
    const next = { ...item, position: { ...item.position, along: snapped.x, height: snapped.y } };
    const topLeft = clampItemPosition(getItemTopLeft(next, wallHeight), next, wallLength, wallHeight);
    return getPositionFromTopLeft(topLeft, next, wallHeight);
};
