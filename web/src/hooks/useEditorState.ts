import { useState } from 'react';
import type { Point } from '../types';

export type Tool = 'select' | 'wall' | 'window' | 'door' | 'opening' | 'room';

export const useEditorState = () => {
    const [tool, setTool] = useState<Tool>('wall');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activePoints, setActivePoints] = useState<Point[]>([]); 
    const [mousePos, setMousePos] = useState<Point | null>(null);
    
    // Settings
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
    const [gridMode, setGridMode] = useState<'coarse' | 'fine'>('coarse');

    return {
        tool, setTool,
        selectedId, setSelectedId,
        activePoints, setActivePoints,
        mousePos, setMousePos,
        unitSystem, setUnitSystem,
        gridMode, setGridMode
    };
};
