import type { Point } from '../types';

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
