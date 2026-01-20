export type UnitSystem = 'imperial' | 'metric';
export type LengthUnit = 'in' | 'mm';

export interface Point {
    x: number;
    y: number;
}

export interface OpeningSpec {
    sillHeight: number;
    headHeight: number;
    jambDepth?: number;
    swing?: 'left' | 'right' | 'none';
}

export interface VerticalItemPosition {
    along: number;
    height: number;
}

export interface VerticalItemSize {
    width: number;
    height: number;
    depth?: number;
}

export interface VerticalItem {
    id: string;
    item_type: 'switch' | 'outlet' | 'sconce' | 'frame' | 'tv' | 'picture' | 'arch' | 'circle';
    position: VerticalItemPosition;
    size: VerticalItemSize;
    anchor: 'bottom-left' | 'bottom-center' | 'center';
    rotation?: number;
    locked?: boolean;
    hidden?: boolean;
    meta?: Record<string, string | number>;
}

export type ElementType = 'wall' | 'window' | 'door' | 'opening';

export interface Element {
    id: string;
    start: Point;
    end: Point;
    thickness: number;
    element_type: ElementType;
    height: number;
    curvature: number; 
    opening?: OpeningSpec;
    items: VerticalItem[];
    paint?: PaintColor;
}
  
export interface PaintColor {
    manufacturer: string;
    name: string;
    code: string;
    hex: string;
}

export interface Flooring {
    flooring_type: string;
    manufacturer?: string;
    name?: string;
    code?: string;
    hex?: string;
}

export interface Room {
    id: string;
    name: string;
    points: Point[];
    label_pos: Point;
    wallIds: string[]; 
    paint?: PaintColor;
    flooring?: Flooring;
    isValid?: boolean;
}
  
export interface Project {
    id: string;
    name: string;
    units: UnitSystem;
    lengthUnit: LengthUnit;
    elements: Element[];
    rooms: Room[];
}
