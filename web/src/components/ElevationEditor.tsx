import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Path } from 'react-konva';
import Konva from 'konva';
import { MousePointer2, ToggleLeft, Plug, Lightbulb, Tv, Frame, Spline, CircleDot, Trash2, ZoomIn, ZoomOut, Maximize2, X, ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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

const TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'switch', icon: ToggleLeft, label: 'Switch' },
    { id: 'outlet', icon: Plug, label: 'Outlet' },
    { id: 'sconce', icon: Lightbulb, label: 'Sconce' },
    { id: 'tv', icon: Tv, label: 'TV' },
    { id: 'picture', icon: Frame, label: 'Picture' },
    { id: 'arch', icon: Spline, label: 'Arch' },
    { id: 'circle', icon: CircleDot, label: 'Circle' },
] as const;

type ToolType = typeof TOOLS[number]['id'];

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
    const [tool, setTool] = useState<ToolType>('select');
    const [selectedItemId, setSelectedId] = useState<string | null>(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const wallLength = Math.sqrt(Math.pow(element.end.x - element.start.x, 2) + Math.pow(element.end.y - element.start.y, 2));
    const wallHeight = element.height || 400;

    const intersections = getIntersections(element, allElements);
    const selectedItem = element.items?.find(i => i.id === selectedItemId);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setCanvasSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Zoom handlers
    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    };

    const handleZoomIn = () => setStageScale(s => s * 1.2);
    const handleZoomOut = () => setStageScale(s => s / 1.2);

    const handleFitToView = () => {
        const container = containerRef.current;
        if (!container) return;
        const padding = 40;
        const availableWidth = container.clientWidth - padding * 2;
        const availableHeight = container.clientHeight - padding * 2;
        const contentWidth = wallLength + 100;
        const contentHeight = wallHeight + 100;
        const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1);
        setStageScale(scale);
        // Center the content
        const offsetX = (container.clientWidth - contentWidth * scale) / 2;
        const offsetY = (container.clientHeight - contentHeight * scale) / 2;
        setStagePos({ x: offsetX, y: offsetY });
    };

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
        if (!selectedItem) return <div className="text-muted-foreground text-sm text-center mt-10">Select an item to edit</div>;

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold capitalize">{selectedItem.item_type}</h3>
                    <Button variant="ghost" size="sm" onClick={deleteItem} className="text-destructive hover:text-destructive">
                        <Trash2 className="size-4" />
                        Delete
                    </Button>
                </div>

                {/* Position */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Position (from Left / Floor)</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">X</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.x)}
                                onChange={e => updateItem({ x: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Y</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.y)}
                                onChange={e => updateItem({ y: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>

                {/* Size Controls */}
                {selectedItem.item_type === 'tv' && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Diagonal Size</Label>
                        <Select
                            onValueChange={(value) => {
                                const size = TV_SIZES.find(s => s.diag === Number(value));
                                if (size) updateItem({ width: size.w * PX_PER_INCH, height: size.h * PX_PER_INCH });
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Size..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TV_SIZES.map(s => (
                                    <SelectItem key={s.diag} value={String(s.diag)}>
                                        {s.diag}" ({s.w}x{s.h}")
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(selectedItem.item_type === 'picture' || selectedItem.item_type === 'frame') && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Frame Size</Label>
                        <Select
                            onValueChange={(value) => {
                                const [w, h] = value.split(',').map(Number);
                                updateItem({ width: w * PX_PER_INCH, height: h * PX_PER_INCH });
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Size..." />
                            </SelectTrigger>
                            <SelectContent>
                                {FRAME_SIZES.map(s => (
                                    <SelectItem key={s.label} value={`${s.w},${s.h}`}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Generic Dimensions for everything */}
                <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs text-muted-foreground">Dimensions (px)</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">W</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.width)}
                                onChange={e => updateItem({ width: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">H</span>
                            <Input
                                type="number"
                                className="h-8"
                                value={Math.round(selectedItem.height)}
                                onChange={e => updateItem({ height: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {(selectedItem.width / PX_PER_INCH).toFixed(1)}" x {(selectedItem.height / PX_PER_INCH).toFixed(1)}"
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-4 bg-background">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose} title="Back">
                         <ChevronLeft className="size-5" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-semibold leading-none tracking-tight">Elevation View</h2>
                        <p className="text-sm text-muted-foreground">Wall ID: {element.id.slice(0, 8)} • Length: {(wallLength / 50).toFixed(1)}'</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="size-5" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Toolbar */}
                <div className="w-16 shrink-0 bg-muted/30 border-r flex flex-col items-center py-4 z-10 overflow-y-auto">
                    <ToggleGroup
                        type="single"
                        value={tool}
                        onValueChange={(v) => v && setTool(v as ToolType)}
                        orientation="vertical"
                        className="flex-col gap-2"
                    >
                        {TOOLS.map((t) => (
                            <ToggleGroupItem
                                key={t.id}
                                value={t.id}
                                className="flex flex-col items-center gap-1 h-auto py-2 px-2 w-14 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                                title={t.label}
                            >
                                <t.icon className="size-5" />
                                {/* <span className="text-[9px] font-bold tracking-widest uppercase truncate w-full text-center">{t.label}</span> */}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                {/* Canvas */}
                <div ref={containerRef} className="flex-1 min-w-0 bg-muted/20 relative overflow-hidden">
                    <Stage
                        ref={stageRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        onClick={handleStageClick}
                        onWheel={handleWheel}
                        draggable={tool === 'select'}
                        scaleX={stageScale}
                        scaleY={stageScale}
                        x={stagePos.x}
                        y={stagePos.y}
                    >
                        <Layer>
                            <Rect name="background" x={50} y={50} width={wallLength} height={wallHeight} fill="white" stroke="#333" strokeWidth={2} />
                            {Array.from({ length: Math.ceil(wallLength / 50) }).map((_, i) => (
                                <Line key={`v${i}`} points={[50 + i * 50, 50, 50 + i * 50, 50 + wallHeight]} stroke="#f0f0f0" strokeWidth={1} />
                            ))}
                            {Array.from({ length: Math.ceil(wallHeight / 50) }).map((_, i) => (
                                <Line key={`h${i}`} points={[50, 50 + i * 50, 50 + wallLength, 50 + i * 50]} stroke="#f0f0f0" strokeWidth={1} />
                            ))}

                            {intersections.map((int, i) => (
                                <Group key={i} x={50 + int.start} y={50 + (wallHeight - int.y - int.height)}>
                                    <Rect width={int.end - int.start} height={int.height} fill="#e0f2fe" stroke="#3b82f6" strokeWidth={2} />
                                    <Text text={int.type} y={int.height / 2 - 5} width={int.end - int.start} align="center" fill="#3b82f6" fontSize={10} />
                                </Group>
                            ))}

                            {element.items?.map(item => {
                                const canvasY = 50 + (wallHeight - item.y);
                                const canvasX = 50 + item.x;
                                const w = item.width || 30;
                                const h = item.height || 30;

                                let content = <Rect width={w} height={h} fill="pink" />;

                                if (item.item_type === 'switch') content = <Rect width={w} height={h} fill="#f3f4f6" stroke="#6b7280" cornerRadius={2} />;
                                else if (item.item_type === 'outlet') content = <Circle radius={w / 2} fill="#f3f4f6" stroke="#6b7280" strokeWidth={2} />;
                                else if (item.item_type === 'sconce') content = <Group><Line points={[w / 2, h, w / 2, h / 2, 0, 0, w, 0, w / 2, h / 2]} fill="gold" closed /></Group>;
                                else if (item.item_type === 'tv') content = (
                                    <Group>
                                        <Rect width={w} height={h} fill="#111" stroke="#333" cornerRadius={2} />
                                        <Rect width={w - 4} height={h - 4} x={2} y={2} fill="#222" />
                                    </Group>
                                );
                                else if (item.item_type === 'picture') content = (
                                    <Group>
                                        <Rect width={w} height={h} fill="#f9fafb" stroke="#78350f" strokeWidth={Math.max(2, w * 0.05)} />
                                        <Line points={[w * 0.2, h * 0.8, w * 0.4, h * 0.4, w * 0.6, h * 0.6, w * 0.8, h * 0.2, w, h * 0.5]} stroke="#d1d5db" strokeWidth={1} />
                                    </Group>
                                );
                                else if (item.item_type === 'arch') content = (
                                    <Path
                                        data={`M0,${h} L0,${h * 0.4} Q${w / 2},0 ${w},${h * 0.4} L${w},${h} Z`}
                                        fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2}
                                    />
                                );
                                else if (item.item_type === 'circle') content = <Circle radius={w / 2} offsetX={-w / 2} offsetY={-h / 2} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2} />;

                                return (
                                    <Group
                                        key={item.id} x={canvasX} y={canvasY - h}
                                        draggable={tool === 'select'}
                                        onDragEnd={(e) => {
                                            const newX = e.target.x() - 50;
                                            const newCanvasTop = e.target.y() - 50;
                                            const newY = wallHeight - newCanvasTop - h;
                                            const updatedItems = element.items.map(it => it.id === item.id ? { ...it, x: newX, y: newY } : it);
                                            onUpdate({ ...element, items: updatedItems });
                                        }}
                                        onClick={(e) => { e.cancelBubble = true; setSelectedId(item.id); }}
                                    >
                                        {content}
                                        {selectedItemId === item.id && <Rect width={w + 4} height={h + 4} x={-2} y={-2} stroke="#4f46e5" strokeWidth={1} dash={[4, 4]} />}
                                    </Group>
                                );
                            })}
                        </Layer>
                    </Stage>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-4 right-4 flex gap-1 bg-background/90 border rounded-lg p-1 shadow-sm">
                        <Button variant="ghost" size="sm" onClick={handleFitToView} title="Fit to view">
                            <Maximize2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom out">
                            <ZoomOut className="size-4" />
                        </Button>
                        <span className="px-2 text-xs flex items-center text-muted-foreground min-w-[3rem] justify-center">
                            {Math.round(stageScale * 100)}%
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom in">
                            <ZoomIn className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Properties Sidebar */}
                <div className="w-80 shrink-0 bg-background border-l p-4 overflow-y-auto">
                    {renderProperties()}
                </div>
            </div>
        </div>
    );
};

export default ElevationEditor;