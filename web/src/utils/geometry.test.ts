import { describe, it, expect } from 'vitest';
import { distance, getControlPoint, calculatePolygonArea, doSegmentsOverlap, formatLength } from './geometry';

describe('Geometry Utils', () => {
  it('calculates distance correctly', () => {
    expect(distance({x: 0, y: 0}, {x: 3, y: 4})).toBe(5);
  });

  it('calculates control point for bezier', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 10, y: 0 };
    // Midpoint is 5,0. Vector is 10,0. Normal is 0,1.
    // result: 5 + 0*curv, 0 + 1*curv => 5, curv
    expect(getControlPoint(p1, p2, 5)).toEqual({ x: 5, y: 5 });
  });

  it('calculates polygon area (Imperial)', () => {
    // 50x50 px box. 50px = 1ft. Area = 1 sq ft.
    const points = [
        {x: 0, y: 0},
        {x: 50, y: 0},
        {x: 50, y: 50},
        {x: 0, y: 50}
    ];
    expect(calculatePolygonArea(points, 'imperial')).toBe("1.0 sq ft");
  });

  it('calculates polygon area (Metric)', () => {
    // 164x164 px box. 164px = 1m. Area = 1 m².
    const points = [
        {x: 0, y: 0},
        {x: 164, y: 0},
        {x: 164, y: 164},
        {x: 0, y: 164}
    ];
    expect(calculatePolygonArea(points, 'metric')).toBe("1.00 m²");
  });

  describe('doSegmentsOverlap', () => {
    it('returns true for overlapping collinear segments', () => {
      // Horizontal overlap
      const p1 = {x: 0, y: 0};
      const p2 = {x: 10, y: 0};
      const p3 = {x: 5, y: 0};
      const p4 = {x: 15, y: 0};
      expect(doSegmentsOverlap(p1, p2, p3, p4)).toBe(true);
    });

    it('returns false for non-overlapping collinear segments', () => {
      const p1 = {x: 0, y: 0};
      const p2 = {x: 10, y: 0};
      const p3 = {x: 12, y: 0}; // gap of 2
      const p4 = {x: 15, y: 0};
      expect(doSegmentsOverlap(p1, p2, p3, p4)).toBe(false);
    });

    it('returns false for parallel but not collinear', () => {
      const p1 = {x: 0, y: 0};
      const p2 = {x: 10, y: 0};
      const p3 = {x: 0, y: 1};
      const p4 = {x: 10, y: 1};
      expect(doSegmentsOverlap(p1, p2, p3, p4)).toBe(false);
    });
  });
  
  it('formats length correctly', () => {
      // 50px = 1ft = 12in
      expect(formatLength(50, 'imperial')).toContain(`1' 0"`);
      // 25px = 0.5ft = 6in
      expect(formatLength(25, 'imperial')).toContain(`0' 6"`);
      
      // 164px = 1m
      expect(formatLength(164, 'metric')).toBe("1.00m");
  });
});
