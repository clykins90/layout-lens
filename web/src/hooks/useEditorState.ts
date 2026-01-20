import { useState } from 'react';
import type { GridMode, Point } from '../types';

export type Tool = 'select' | 'wall' | 'window' | 'door' | 'opening' | 'room';

export const useEditorState = () => {
    const [tool, setTool] = useState<Tool>('wall');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activePoints, setActivePoints] = useState<Point[]>([]); 
    const [mousePos, setMousePos] = useState<Point | null>(null);
    
    // Settings
    const [gridMode, setGridMode] = useState<GridMode>('coarse');

    return {
        tool, setTool,
        selectedId, setSelectedId,
        activePoints, setActivePoints,
        mousePos, setMousePos,
        gridMode, setGridMode
    };
};
