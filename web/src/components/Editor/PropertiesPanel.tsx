import React from 'react';
import type { Element } from '../../types';
import { distance } from '../../utils/geometry';

interface PropertiesPanelProps {
    selectedElement: Element | null | undefined;
    unitSystem: 'imperial' | 'metric';
    onUpdateLength: (v1: number, v2: number, v3: number) => void;
    onUpdateCurvature: (val: number) => void;
    onEditVertical: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedElement,
    unitSystem,
    onUpdateLength,
    onUpdateCurvature,
    onEditVertical
}) => {
    return (
        <div className="w-64 bg-white border-l p-4 overflow-y-auto">
            {selectedElement ? (
                <div className="space-y-4">
                    <h3 className="font-bold border-b pb-2">Wall Properties</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {unitSystem === 'imperial' ? (
                            <>
                                <input type="number" className="border rounded p-1 text-sm" 
                                    value={Math.floor(distance(selectedElement.start, selectedElement.end)/(50/12)/12)} 
                                    onChange={e => onUpdateLength(Number(e.target.value), 0, 0)} />
                                <input type="number" className="border rounded p-1 text-sm" 
                                    value={Math.floor((distance(selectedElement.start, selectedElement.end)/(50/12)) % 12)} 
                                    readOnly />
                                <div className="text-[10px] col-span-3 text-gray-400">Length in Ft / In</div>
                            </>
                        ) : (
                            <input type="number" step="0.01" className="col-span-3 border rounded p-1 text-sm" 
                                value={distance(selectedElement.start, selectedElement.end)/164} 
                                onChange={e => onUpdateLength(Number(e.target.value), 0, 0)} />
                        )}
                    </div>
                    <label className="block text-xs text-gray-500">Curvature</label>
                    <input type="range" min="-200" max="200" className="w-full" 
                        value={selectedElement.curvature || 0} 
                        onChange={(e) => onUpdateCurvature(Number(e.target.value))} />
                    <button onClick={onEditVertical} className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-medium">🏗️ Edit Vertical View</button>
                </div>
            ) : <div className="text-gray-400 text-sm">Select a wall to edit properties.</div>}
        </div>
    );
};
