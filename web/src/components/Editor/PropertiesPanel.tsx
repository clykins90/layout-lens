import { Building2, Palette, Waves } from 'lucide-react';
import type { Element, Room } from '../../types';
import { distance } from '../../utils/geometry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PaintSelector } from './PaintSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PropertiesPanelProps {
    selectedElement: Element | null | undefined;
    selectedRoom: Room | null | undefined;
    unitSystem: 'imperial' | 'metric';
    onUpdateLength: (v1: number, v2: number, v3: number) => void;
    onUpdateCurvature: (val: number) => void;
    onEditVertical: () => void;
    onUpdateRoom: (room: Room) => void;
    onUpdateElement: (element: Element) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedElement,
    selectedRoom,
    unitSystem,
    onUpdateLength,
    onUpdateCurvature,
    onEditVertical,
    onUpdateRoom,
    onUpdateElement
}) => {
    return (
        <div className="w-64 bg-background border-l p-4 overflow-y-auto">
            {selectedElement ? (
                <div className="space-y-4">
                    <h3 className="font-bold border-b pb-2">Wall Properties</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {unitSystem === 'imperial' ? (
                            <>
                                <Input
                                    type="number"
                                    className="h-8 text-sm"
                                    value={Math.floor(distance(selectedElement.start, selectedElement.end)/(50/12)/12)}
                                    onChange={e => onUpdateLength(Number(e.target.value), 0, 0)}
                                />
                                <Input
                                    type="number"
                                    className="h-8 text-sm"
                                    value={Math.floor((distance(selectedElement.start, selectedElement.end)/(50/12)) % 12)}
                                    readOnly
                                />
                                <div className="text-[10px] col-span-3 text-muted-foreground">Length in Ft / In</div>
                            </>
                        ) : (
                            <Input
                                type="number"
                                step="0.01"
                                className="col-span-3 h-8 text-sm"
                                value={distance(selectedElement.start, selectedElement.end)/164}
                                onChange={e => onUpdateLength(Number(e.target.value), 0, 0)}
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Curvature</Label>
                        <Slider
                            min={-200}
                            max={200}
                            value={[selectedElement.curvature || 0]}
                            onValueChange={(values) => onUpdateCurvature(values[0])}
                        />
                    </div>

                    {selectedElement.element_type === 'wall' && (
                        <div className="space-y-2 border-t pt-2">
                            <Label className="text-xs font-medium flex items-center gap-2">
                                <Palette className="size-3" />
                                Wall Paint
                            </Label>
                            <PaintSelector 
                                initialColor={selectedElement.paint}
                                onSelect={(color) => onUpdateElement({...selectedElement, paint: color})}
                            />
                            {selectedElement.paint && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full text-xs"
                                    onClick={() => onUpdateElement({...selectedElement, paint: undefined})}
                                >
                                    Clear Paint
                                </Button>
                            )}
                        </div>
                    )}

                    <Button onClick={onEditVertical} className="w-full">
                        <Building2 className="size-4" />
                        Edit Vertical View
                    </Button>
                </div>
            ) : selectedRoom ? (
                <div className="space-y-4">
                    <h3 className="font-bold border-b pb-2 text-primary flex items-center gap-2">
                        <Waves className="size-4" />
                        Room: {selectedRoom.name}
                    </h3>
                    
                    <div className="space-y-2">
                        <Label className="text-xs">Room Name</Label>
                        <Input 
                            value={selectedRoom.name} 
                            onChange={e => onUpdateRoom({...selectedRoom, name: e.target.value})}
                            className="h-8"
                        />
                    </div>

                    <Tabs defaultValue="paint" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-8">
                            <TabsTrigger value="paint" className="text-xs">Paint</TabsTrigger>
                            <TabsTrigger value="flooring" className="text-xs">Flooring</TabsTrigger>
                        </TabsList>
                        <TabsContent value="paint" className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Palette className="size-4" />
                                Wall Paint
                            </div>
                            <PaintSelector 
                                initialColor={selectedRoom.paint}
                                onSelect={(color) => onUpdateRoom({...selectedRoom, paint: color})}
                            />
                            {selectedRoom.paint && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full text-xs"
                                    onClick={() => onUpdateRoom({...selectedRoom, paint: undefined})}
                                >
                                    Clear Paint
                                </Button>
                            )}
                        </TabsContent>
                        <TabsContent value="flooring" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Flooring Type</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Carpet', 'Hardwood', 'Tile', 'Rug'].map(type => (
                                        <Button 
                                            key={type} 
                                            variant={selectedRoom.flooring?.flooring_type === type ? "default" : "outline"}
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => onUpdateRoom({
                                                ...selectedRoom, 
                                                flooring: { ...selectedRoom.flooring, flooring_type: type }
                                            })}
                                        >
                                            {type}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {selectedRoom.flooring?.flooring_type === 'Carpet' || selectedRoom.flooring?.flooring_type === 'Rug' ? (
                                <div className="space-y-2">
                                    <Label className="text-xs">Color (Optional)</Label>
                                    <PaintSelector 
                                        initialColor={selectedRoom.flooring?.hex ? {
                                            manufacturer: selectedRoom.flooring.manufacturer || '',
                                            name: selectedRoom.flooring.name || '',
                                            code: selectedRoom.flooring.code || '',
                                            hex: selectedRoom.flooring.hex
                                        } : undefined}
                                        onSelect={(color) => onUpdateRoom({
                                            ...selectedRoom,
                                            flooring: {
                                                ...selectedRoom.flooring!,
                                                manufacturer: color.manufacturer,
                                                name: color.name,
                                                code: color.code,
                                                hex: color.hex
                                            }
                                        })}
                                    />
                                </div>
                            ) : null}

                            {selectedRoom.flooring && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full text-xs"
                                    onClick={() => onUpdateRoom({...selectedRoom, flooring: undefined})}
                                >
                                    Clear Flooring
                                </Button>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            ) : (
                <div className="text-muted-foreground text-sm">Select a wall or room to edit properties.</div>
            )}
        </div>
    );
};
