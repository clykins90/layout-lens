import React from 'react';
import type { Tool } from '../../hooks/useEditorState';

interface ToolPaletteProps {
    tool: Tool;
    setTool: (t: Tool) => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({ tool, setTool }) => {
    const tools = [ 
        { id: 'select', label: '👆', name: 'Select' }, 
        { id: 'wall', label: '🧱', name: 'Wall' }, 
        { id: 'window', label: '🪟', name: 'Window' }, 
        { id: 'door', label: '🚪', name: 'Door' }, 
        { id: 'opening', label: '⬜', name: 'Opening' }, 
        { id: 'room', label: '📐', name: 'Room' } 
    ];

    return (
        <div className="w-20 bg-white border-r flex flex-col items-center py-6 gap-6 z-10 shadow-sm">
            {tools.map(t => (
                <button key={t.id} onClick={() => setTool(t.id as Tool)}
                        className={`flex flex-col items-center gap-1 group w-full transition-all ${tool === t.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                    <div className={`p-2 rounded-xl transition-all ${tool === t.id ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'group-hover:bg-gray-50'}`}><span className="text-xl">{t.label}</span></div>
                    <span className={`text-[9px] font-bold tracking-widest uppercase ${tool === t.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{t.name}</span>
                </button>
            ))}
        </div>
    );
};
