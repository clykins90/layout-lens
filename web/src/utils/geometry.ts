import type { Point, Element } from '../types';

export const distance = (p1: Point, p2: Point) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getControlPoint = (p1: Point, p2: Point, curvature: number) => {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return { x: midX, y: midY };
    const uX = -dy / len;
    const uY = dx / len;
    return { x: midX + uX * curvature, y: midY + uY * curvature };
};

export const calculatePolygonArea = (points: Point[], unitSystem: 'imperial' | 'metric') => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    const pxArea = Math.abs(area / 2);
    
    if (unitSystem === 'imperial') {
        return (pxArea / 2500).toFixed(1) + " sq ft";
    } else {
        return (pxArea / (164*164)).toFixed(2) + " m²";
    }
};

export const doSegmentsOverlap = (p1: Point, p2: Point, p3: Point, p4: Point) => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p4.x - p3.x, y: p4.y - p3.y };
    const crossProd = v1.x * v2.y - v1.y * v2.x;
    if (Math.abs(crossProd) > 1) return false; 
    const v3 = { x: p3.x - p1.x, y: p3.y - p1.y };
    const collinearCross = v1.x * v3.y - v1.y * v3.x;
    if (Math.abs(collinearCross) > 1) return false;
    if (Math.abs(v1.x) < 1) {
        const min1 = Math.min(p1.y, p2.y);
        const max1 = Math.max(p1.y, p2.y);
        const min2 = Math.min(p3.y, p4.y);
        const max2 = Math.max(p3.y, p4.y);
        return Math.max(min1, min2) < Math.min(max1, max2) - 1;
    } else {
        const min1 = Math.min(p1.x, p2.x);
        const max1 = Math.max(p1.x, p2.x);
        const min2 = Math.min(p3.x, p4.x);
        const max2 = Math.max(p3.x, p4.x);
        return Math.max(min1, min2) < Math.min(max1, max2) - 1;
    }
};

export const formatLength = (px: number, unitSystem: 'imperial' | 'metric') => {
    if (unitSystem === 'imperial') {
        const totalInches = px / (50/12);
        const feet = Math.floor(totalInches / 12);
        const inches = Math.floor(totalInches % 12);
        const fraction = Math.round((totalInches - Math.floor(totalInches)) * 16);
        let text = `${feet}' ${inches}"`;
        if (fraction > 0) text += ` ${fraction}/16`;
        return text;
    } else {
        const meters = px / 164;
        return `${meters.toFixed(2)}m`;
    }
};

export const getGridSize = (unitSystem: 'imperial' | 'metric', gridMode: 'coarse' | 'fine') => {
    if (unitSystem === 'imperial') {
        return gridMode === 'coarse' ? 50 : 50/12;
    } else {
        return gridMode === 'coarse' ? 82 : 16.4; 
    }
};

export const snapToGrid = (pos: Point, gridSize: number) => {
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize,
    };
};

export const pointsEqual = (p1: Point, p2: Point, tolerance = 1) => {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
};

export const areCollinear = (p1: Point, p2: Point, p3: Point, tolerance = 1) => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p1.x, y: p3.y - p1.y };
    const cross = v1.x * v2.y - v1.y * v2.x;
    return Math.abs(cross) < tolerance;
};

export const mergeCollinearSegments = (
    existingStart: Point,
    existingEnd: Point,
    newStart: Point,
    newEnd: Point
): { start: Point; end: Point } | null => {
    if (!areCollinear(existingStart, existingEnd, newStart) ||
        !areCollinear(existingStart, existingEnd, newEnd)) {
        return null;
    }

    const connectsAtExistingEnd = pointsEqual(existingEnd, newStart);
    const connectsAtExistingStart = pointsEqual(existingStart, newEnd);
    const connectsAtExistingEndReversed = pointsEqual(existingEnd, newEnd);
    const connectsAtExistingStartReversed = pointsEqual(existingStart, newStart);

    if (connectsAtExistingEnd) {
        return { start: existingStart, end: newEnd };
    } else if (connectsAtExistingStart) {
        return { start: newStart, end: existingEnd };
    } else if (connectsAtExistingEndReversed) {
        return { start: existingStart, end: newStart };
    } else if (connectsAtExistingStartReversed) {
        return { start: newEnd, end: existingEnd };
    }

    return null;
};

const subtractPoints = (p1: Point, p2: Point): Point => ({ x: p1.x - p2.x, y: p1.y - p2.y });
const crossProduct = (v1: Point, v2: Point): number => v1.x * v2.y - v1.y * v2.x;
const dotProduct = (v1: Point, v2: Point): number => v1.x * v2.x + v1.y * v2.y;

export const findEnclosingRoom = (elements: Element[], clickPoint: Point): { points: Point[], wallIds: string[] } | null => {
    const walls = elements.filter(el => ['wall', 'window', 'door', 'opening'].includes(el.element_type));
    
    let closestWall: Element | null = null;
    let closestDist = Infinity;
    let startEndpointIndex = 0; 

    for (const wall of walls) {
        const minY = Math.min(wall.start.y, wall.end.y);
        const maxY = Math.max(wall.start.y, wall.end.y);
        const maxX = Math.max(wall.start.x, wall.end.x);

        if (clickPoint.y < minY || clickPoint.y > maxY || clickPoint.x > maxX) continue;

        const s = subtractPoints(wall.end, wall.start);
        const r = { x: 1, y: 0 };
        const qp = subtractPoints(wall.start, clickPoint);
        const rXs = crossProduct(r, s);

        if (Math.abs(rXs) < 1e-5) continue;

        const t = crossProduct(qp, s) / rXs;
        const u = crossProduct(qp, r) / rXs;

        if (t >= 0 && u >= 0 && u <= 1) {
            if (t < closestDist) {
                closestDist = t;
                closestWall = wall;
                startEndpointIndex = rXs > 0 ? 0 : 1; 
            }
        }
    }

    if (!closestWall) return null;

    const pathPoints: Point[] = [];
    const pathWallIds: string[] = [];
    let currentWall = closestWall;
    let currentTarget = startEndpointIndex === 1 ? currentWall.end : currentWall.start;
    let currentSource = startEndpointIndex === 1 ? currentWall.start : currentWall.end;

    pathPoints.push(currentSource);
    pathWallIds.push(currentWall.id);

    const maxSteps = 100;
    for (let step = 0; step < maxSteps; step++) {
        pathPoints.push(currentTarget);
        
        if (pointsEqual(currentTarget, pathPoints[0])) {
            return { points: pathPoints.slice(0, -1), wallIds: pathWallIds };
        }

        const connectedWalls = walls.filter(w => 
            w.id !== currentWall!.id && 
            (pointsEqual(w.start, currentTarget) || pointsEqual(w.end, currentTarget))
        );

        if (connectedWalls.length === 0) return null;

        const vIn = subtractPoints(currentTarget, currentSource);
        let bestWall: Element | null = null;
        let bestAngle = -Infinity;
        let nextTarget: Point | null = null;

        for (const nextW of connectedWalls) {
            const isStart = pointsEqual(nextW.start, currentTarget);
            const pNext = isStart ? nextW.end : nextW.start;
            const vOut = subtractPoints(pNext, currentTarget);

            const dot = dotProduct(vIn, vOut);
            const det = crossProduct(vIn, vOut);
            let angle = Math.atan2(det, dot);
            
            if (angle > bestAngle) {
                bestAngle = angle;
                bestWall = nextW;
                nextTarget = pNext;
            }
        }
        
        if (bestWall && nextTarget) {
            if (bestWall.id === currentWall!.id) return null; 
            currentWall = bestWall;
            currentSource = currentTarget;
            currentTarget = nextTarget;
            pathWallIds.push(currentWall.id);
        } else {
            return null;
        }
    }

    return null;
};