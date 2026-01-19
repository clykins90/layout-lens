import React from 'react';

interface ToolbarProps {
    projectName: string;
    setProjectName: (name: string) => void;
    unitSystem: 'imperial' | 'metric';
    setUnitSystem: (sys: 'imperial' | 'metric') => void;
    gridMode: 'coarse' | 'fine';
    setGridMode: (mode: 'coarse' | 'fine') => void;
    onSave: () => void;
    isSaving: boolean;
    onMagicBuild: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    projectName, setProjectName,
    unitSystem, setUnitSystem,
    gridMode, setGridMode,
    onSave, isSaving,
    onMagicBuild
}) => {
    return (
        <div className="bg-white border-b px-4 py-3 flex justify-between items-center z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <span className="font-bold text-xl text-indigo-600">LayoutLens</span>
                <input className="border rounded px-2 py-1 text-sm bg-gray-50" value={projectName} onChange={e => setProjectName(e.target.value)} />
                <div className="flex bg-gray-100 rounded p-1 gap-1">
                    <button onClick={() => setUnitSystem('imperial')} className={`px-2 py-0.5 text-xs rounded ${unitSystem === 'imperial' ? 'bg-white shadow' : 'text-gray-500'}`}>Imperial</button>
                    <button onClick={() => setUnitSystem('metric')} className={`px-2 py-0.5 text-xs rounded ${unitSystem === 'metric' ? 'bg-white shadow' : 'text-gray-500'}`}>Metric</button>
                </div>
                <div className="flex bg-gray-100 rounded p-1 gap-1">
                    <button onClick={() => setGridMode('coarse')} className={`px-2 py-0.5 text-xs rounded ${gridMode === 'coarse' ? 'bg-white shadow' : 'text-gray-500'}`}>Coarse</button>
                    <button onClick={() => setGridMode('fine')} className={`px-2 py-0.5 text-xs rounded ${gridMode === 'fine' ? 'bg-white shadow' : 'text-gray-500'}`}>Fine</button>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={onMagicBuild} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition flex items-center gap-2">✨ Magic Build</button>
                <button onClick={onSave} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 transition shadow-sm">{isSaving ? 'Saving...' : 'Save Project'}</button>
            </div>
        </div>
    );
};
