export interface Point {
    x: number;
    y: number;
}
  
export interface VerticalItem {
    id: string;
    item_type: 'switch' | 'outlet' | 'sconce' | 'frame' | 'tv' | 'picture' | 'arch' | 'circle';
    x: number;
    y: number;
    width?: number;
    height?: number;
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
}
  
export interface Project {
    id: string;
    name: string;
    elements: Element[];
    rooms: Room[];
}
