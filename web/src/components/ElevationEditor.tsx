import React, { useState, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Path } from 'react-konva';
import Konva from 'konva';

// --- Types ---

interface VerticalItem {
    id: string;
    item_type: 'switch' | 'outlet' | 'sconce' | 'frame' | 'tv' | 'picture' | 'arch' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Point { x: number; y: number; }

interface Element {
    id: string;
    start: Point;
    end: Point;
    thickness: number;
    element_type: string;
    height: number;
    items: VerticalItem[];
}

interface ElevationEditorProps {
    element: Element;
    allElements: Element[]; 
    onUpdate: (updatedElement: Element) => void;
    onClose: () => void;
}

// --- Constants ---

const GRID_SIZE = 50; // 1 ft
const PX_PER_INCH = GRID_SIZE / 12;

const TV_SIZES = [
    { diag: 43, w: 38, h: 22 },
    { diag: 55, w: 48, h: 27 },
    { diag: 65, w: 57, h: 33 },
    { diag: 75, w: 66, h: 38 },
    { diag: 85, w: 75, h: 43 },
];

const FRAME_SIZES = [
    { label: '5x7"', w: 5, h: 7 },
    { label: '8x10"', w: 8, h: 10 },
    { label: '11x14"', w: 11, h: 14 },
    { label: '16x20"', w: 16, h: 20 },
    { label: '24x36"', w: 24, h: 36 },
    { label: '30x40"', w: 30, h: 40 },
];

// --- Helpers ---

const getIntersections = (targetWall: Element, allElements: Element[]) => {
    const wallVec = { x: targetWall.end.x - targetWall.start.x, y: targetWall.end.y - targetWall.start.y };
    const wallLen = Math.sqrt(wallVec.x * wallVec.x + wallVec.y * wallVec.y);
    const wallUnit = { x: wallVec.x / wallLen, y: wallVec.y / wallLen };

    const intersections: { type: string, start: number, end: number, height: number, y: number }[] = [];

    allElements.forEach(el => {
        if (el.id === targetWall.id) return;
        if (el.element_type !== 'window' && el.element_type !== 'door' && el.element_type !== 'opening') return;

        const vStart = { x: el.start.x - targetWall.start.x, y: el.start.y - targetWall.start.y };
        const vEnd = { x: el.end.x - targetWall.start.x, y: el.end.y - targetWall.start.y };

        const t1 = vStart.x * wallUnit.x + vStart.y * wallUnit.y;
        const t2 = vEnd.x * wallUnit.x + vEnd.y * wallUnit.y;

        const startDist = Math.min(t1, t2);
        const endDist = Math.max(t1, t2);

        if (startDist < wallLen && endDist > 0) {
            const clipStart = Math.max(0, startDist);
            const clipEnd = Math.min(wallLen, endDist);
            
            if (clipEnd > clipStart) {
                let height = 150; // Default window height
                let y = 100; // Default window y
                if (el.element_type === 'door' || el.element_type === 'opening') {
                    height = 350; // 7ft
                    y = 0; 
                }
                intersections.push({ type: el.element_type, start: clipStart, end: clipEnd, height, y });
            }
        }
    });
    return intersections;
};

const ElevationEditor: React.FC<ElevationEditorProps> = ({ element, allElements, onUpdate, onClose }) => {
    const [tool, setTool] = useState<'select' | 'switch' | 'outlet' | 'sconce' | 'tv' | 'picture' | 'arch' | 'circle'>('select');
    const [selectedItemId, setSelectedId] = useState<string | null>(null);

    const wallLength = Math.sqrt(Math.pow(element.end.x - element.start.x, 2) + Math.pow(element.end.y - element.start.y, 2));
    const wallHeight = element.height || 400; 

    const intersections = getIntersections(element, allElements);
    const selectedItem = element.items?.find(i => i.id === selectedItemId);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;
        
        // If clicking background/wall, deselect
        if (e.target.name() === 'background') {
            setSelectedId(null);
        }

        if (tool !== 'select') {
            const pos = stage.getRelativePointerPosition();
            if (!pos) return;
            
            const wallX = 50;
            const wallY = 50;
            const relX = pos.x - wallX;
            const relY = pos.y - wallY;

            if (relX >= 0 && relX <= wallLength && relY >= 0 && relY <= wallHeight) {
                // Defaults
                let w = 0, h = 0;
                if (tool === 'switch') { w = 20; h = 30; }
                else if (tool === 'outlet') { w = 16; h = 16; }
                else if (tool === 'sconce') { w = 30; h = 40; }
                else if (tool === 'tv') { w = 48 * PX_PER_INCH; h = 27 * PX_PER_INCH; } // Default 55"
                else if (tool === 'picture') { w = 24 * PX_PER_INCH; h = 36 * PX_PER_INCH; }
                else if (tool === 'arch') { w = 150; h = 250; }
                else if (tool === 'circle') { w = 100; h = 100; }

                const newItem: VerticalItem = {
                    id: crypto.randomUUID(),
                    item_type: tool,
                    x: relX,
                    y: wallHeight - relY,
                    width: w,
                    height: h
                };
                onUpdate({ ...element, items: [...(element.items || []), newItem] });
                setTool('select');
                setSelectedId(newItem.id);
            }
        }
    };

    const updateItem = (updates: Partial<VerticalItem>) => {
        if (!selectedItemId) return;
        const updatedItems = element.items.map(it => 
            it.id === selectedItemId ? { ...it, ...updates } : it
        );
        onUpdate({ ...element, items: updatedItems });
    };

    const deleteItem = () => {
        if (!selectedItemId) return;
        const updatedItems = element.items.filter(it => it.id !== selectedItemId);
        onUpdate({ ...element, items: updatedItems });
        setSelectedId(null);
    };

    const renderProperties = () => {
        if (!selectedItem) return <div className="text-gray-400 text-sm text-center mt-10">Select an item to edit</div>;

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-gray-700 capitalize">{selectedItem.item_type}</h3>
                    <button onClick={deleteItem} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </div>

                {/* Position */}
                <div>
                    <label className="block text-xs font-medium text-gray-500">Position (from Left / Floor)</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                            <span className="text-xs text-gray-400">X</span>
                            <input 
                                type="number" className="w-full border rounded px-2 py-1 text-sm" 
                                value={Math.round(selectedItem.x)} 
                                onChange={e => updateItem({ x: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">Y</span>
                            <input 
                                type="number" className="w-full border rounded px-2 py-1 text-sm" 
                                value={Math.round(selectedItem.y)} 
                                onChange={e => updateItem({ y: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>

                {/* Size Controls */}
                {selectedItem.item_type === 'tv' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Diagonal Size</label>
                        <select 
                            className="w-full border rounded px-2 py-1 text-sm bg-white"
                            onChange={(e) => {
                                const size = TV_SIZES.find(s => s.diag === Number(e.target.value));
                                if (size) updateItem({ width: size.w * PX_PER_INCH, height: size.h * PX_PER_INCH });
                            }}
                        >
                            <option value="">Select Size...</option>
                            {TV_SIZES.map(s => (
                                <option key={s.diag} value={s.diag}>{s.diag}" ({s.w}x{s.h}")</option>
                            ))}
                        </select>
                    </div>
                )}

                {(selectedItem.item_type === 'picture' || selectedItem.item_type === 'frame') && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Frame Size</label>
                        <select 
                            className="w-full border rounded px-2 py-1 text-sm bg-white"
                            onChange={(e) => {
                                const [w, h] = e.target.value.split(',').map(Number);
                                updateItem({ width: w * PX_PER_INCH, height: h * PX_PER_INCH });
                            }}
                        >
                            <option value="">Select Size...</option>
                            {FRAME_SIZES.map(s => (
                                <option key={s.label} value={`${s.w},${s.h}`}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Generic Dimensions for everything */}
                <div className="pt-2 border-t">
                    <label className="block text-xs font-medium text-gray-500">Dimensions (px)</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                            <span className="text-xs text-gray-400">W</span>
                            <input 
                                type="number" className="w-full border rounded px-2 py-1 text-sm" 
                                value={Math.round(selectedItem.width)} 
                                onChange={e => updateItem({ width: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">H</span>
                            <input 
                                type="number" className="w-full border rounded px-2 py-1 text-sm" 
                                value={Math.round(selectedItem.height)} 
                                onChange={e => updateItem({ height: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        {(selectedItem.width/PX_PER_INCH).toFixed(1)}" x {(selectedItem.height/PX_PER_INCH).toFixed(1)}"
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Elevation View</h2>
                        <p className="text-sm text-gray-500">Wall ID: {element.id.slice(0,8)} • Length: {(wallLength/50).toFixed(1)}'</p>
                    </div>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700">Close</button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Toolbar */}
                    <div className="w-24 bg-gray-50 border-r flex flex-col items-center py-6 gap-6 z-10 shadow-sm overflow-y-auto">
                        {[
                            { id: 'select', label: '👆', tooltip: 'Select' },
                            { id: 'switch', label: '🎚️', tooltip: 'Switch' },
                            { id: 'outlet', label: '🔌', tooltip: 'Outlet' },
                            { id: 'sconce', label: '💡', tooltip: 'Sconce' },
                            { id: 'tv', label: '📺', tooltip: 'TV' },
                            { id: 'picture', label: '🖼️', tooltip: 'Picture' },
                            { id: 'arch', label: '∩', tooltip: 'Arch' },
                            { id: 'circle', label: '⚪', tooltip: 'Circle' }
                        ].map((t) => (
                            <button 
                                key={t.id}
                                onClick={() => setTool(t.id as any)}
                                className={`flex flex-col items-center gap-1 group w-full transition-all ${tool === t.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                            >
                                <div className={`p-2 rounded-xl transition-all ${tool === t.id ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'group-hover:bg-white group-hover:shadow-sm'}`}>
                                    <span className="text-xl">{t.label}</span>
                                </div>
                                <span className={`text-[8px] font-bold tracking-widest uppercase transition-colors ${tool === t.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                    {t.tooltip}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 bg-gray-100 relative overflow-auto flex items-center justify-center">
                        <Stage width={wallLength + 100} height={wallHeight + 100} onClick={handleStageClick}>
                            <Layer>
                                <Rect name="background" x={50} y={50} width={wallLength} height={wallHeight} fill="white" stroke="#333" strokeWidth={2} />
                                {Array.from({length: Math.ceil(wallLength/50)}).map((_, i) => (
                                    <Line key={`v${i}`} points={[50 + i*50, 50, 50 + i*50, 50 + wallHeight]} stroke="#f0f0f0" strokeWidth={1} />
                                ))}
                                {Array.from({length: Math.ceil(wallHeight/50)}).map((_, i) => (
                                    <Line key={`h${i}`} points={[50, 50 + i*50, 50 + wallLength, 50 + i*50]} stroke="#f0f0f0" strokeWidth={1} />
                                ))}

                                {intersections.map((int, i) => (
                                    <Group key={i} x={50 + int.start} y={50 + (wallHeight - int.y - int.height)}>
                                        <Rect width={int.end - int.start} height={int.height} fill="#e0f2fe" stroke="#3b82f6" strokeWidth={2} />
                                        <Text text={int.type} y={int.height / 2 - 5} width={int.end - int.start} align="center" fill="#3b82f6" fontSize={10} />
                                    </Group>
                                ))}

                                {element.items?.map(item => {
                                    const canvasY = 50 + (wallHeight - item.y); // Bottom-up Y
                                    const canvasX = 50 + item.x;
                                    const w = item.width || 30;
                                    const h = item.height || 30;

                                    let content = <Rect width={w} height={h} fill="pink" />;
                                    
                                    if (item.item_type === 'switch') content = <Rect width={w} height={h} fill="#f3f4f6" stroke="#6b7280" cornerRadius={2} />;
                                    else if (item.item_type === 'outlet') content = <Circle radius={w/2} fill="#f3f4f6" stroke="#6b7280" strokeWidth={2} />;
                                    else if (item.item_type === 'sconce') content = <Group><Line points={[w/2, h, w/2, h/2, 0, 0, w, 0, w/2, h/2]} fill="gold" closed /></Group>;
                                    else if (item.item_type === 'tv') content = (
                                        <Group>
                                            <Rect width={w} height={h} fill="#111" stroke="#333" cornerRadius={2} />
                                            <Rect width={w-4} height={h-4} x={2} y={2} fill="#222" />
                                        </Group>
                                    );
                                    else if (item.item_type === 'picture') content = (
                                        <Group>
                                            <Rect width={w} height={h} fill="#f9fafb" stroke="#78350f" strokeWidth={Math.max(2, w*0.05)} />
                                            <Line points={[w*0.2, h*0.8, w*0.4, h*0.4, w*0.6, h*0.6, w*0.8, h*0.2, w, h*0.5]} stroke="#d1d5db" strokeWidth={1} />
                                        </Group>
                                    );
                                    else if (item.item_type === 'arch') content = (
                                        <Path
                                            data={`M0,${h} L0,${h*0.4} Q${w/2},0 ${w},${h*0.4} L${w},${h} Z`}
                                            fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2}
                                        />
                                    );
                                    else if (item.item_type === 'circle') content = <Circle radius={w/2} offsetX={-w/2} offsetY={-h/2} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2} />;

                                    return (
                                        <Group 
                                            key={item.id} x={canvasX} y={canvasY - h} // anchor bottom-left for easier mental model? No, canvasY is top-left of item in canvas coords.
                                            // Actually, let's stick to: canvasY = 50 + (wallHeight - item.y). item.y is height of item center? or item bottom?
                                            // Let's assume item.y is CENTER of item height for convenience, or BOTTOM.
                                            // Standard elevation: Y is usually height of the BOTTOM of the element above floor.
                                            // So canvasY (top of rect) = 50 + (wallHeight - (item.y + item.height))
                                            // Let's assume item.y stored is the BOTTOM of the item.
                                            // Then Canvas Top = 50 + wallHeight - item.y - item.height.
                                            draggable={tool === 'select'}
                                            onDragEnd={(e) => {
                                                const newX = e.target.x() - 50;
                                                const newCanvasTop = e.target.y() - 50;
                                                // Convert Canvas Top back to Bottom-Y
                                                // BottomY = WallHeight - CanvasTop - Height
                                                const newY = wallHeight - newCanvasTop - h;
                                                updateItem({ ...item, x: newX, y: newY }); // Hack: accessing updateItem via closure capture might be stale? 
                                                // Better to use onUpdate directly.
                                                const updatedItems = element.items.map(it => it.id === item.id ? { ...it, x: newX, y: newY } : it);
                                                onUpdate({ ...element, items: updatedItems });
                                            }}
                                            onClick={(e) => { e.cancelBubble = true; setSelectedId(item.id); }}
                                        >
                                            {content}
                                            {selectedItemId === item.id && <Rect width={w+4} height={h+4} x={-2} y={-2} stroke="#4f46e5" strokeWidth={1} dash={[4,4]} />}
                                        </Group>
                                    );
                                })}
                            </Layer>
                        </Stage>
                    </div>

                    {/* Properties Sidebar */}
                    <div className="w-64 bg-white border-l p-4 overflow-y-auto">
                        {renderProperties()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToolBtn = ({ id, label, current, set, tooltip }: any) => (
    <div className="relative group">
        <button onClick={() => set(id)} className={`p-3 rounded-xl border transition ${current === id ? 'bg-indigo-100 border-indigo-500 shadow-sm' : 'bg-white border-transparent hover:border-gray-300'}`}>
            <span className="text-2xl">{label}</span>
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            {tooltip}
        </div>
    </div>
);

export default ElevationEditor;
