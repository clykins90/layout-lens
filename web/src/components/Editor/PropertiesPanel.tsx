import { useState, type FC } from 'react';
import { Building2, Palette, Waves, ChevronsRight, ChevronsLeft, Settings2 } from 'lucide-react';
import type { Element, Room } from '../../types';
import { distance } from '../../utils/geometry';
import { lengthUnitForSystem } from '../../utils/units';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PaintSelector } from './PaintSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

export const PropertiesPanel: FC<PropertiesPanelProps> = ({
    selectedElement,
    selectedRoom,
    unitSystem,
    onUpdateLength,
    onUpdateCurvature,
    onEditVertical,
    onUpdateRoom,
    onUpdateElement
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const lengthUnit = lengthUnitForSystem(unitSystem);
    const selectedLength = selectedElement ? distance(selectedElement.start, selectedElement.end) : 0;
    const selectedLengthInInches = lengthUnit === 'in' ? selectedLength : selectedLength / 25.4;
    const selectedLengthInMeters = lengthUnit === 'mm' ? selectedLength / 1000 : selectedLength * 0.0254;
    const selectedLengthFeet = Math.floor(selectedLengthInInches / 12);
    const selectedLengthRemainderInches = Math.round(selectedLengthInInches % 12);
    const displayUnitLabel = unitSystem === 'metric' ? 'm' : 'in';
    const toDisplayLength = (value: number) => unitSystem === 'metric' ? value / 1000 : value;
    const fromDisplayLength = (value: number) => unitSystem === 'metric' ? value * 1000 : value;

    if (isCollapsed) {
        return (
            <div className="w-12 bg-background border-l flex flex-col items-center py-4 gap-4 transition-all duration-300">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsCollapsed(false)}
                    title="Expand Properties"
                >
                    <ChevronsLeft className="size-5" />
                </Button>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-background border-l flex flex-col overflow-hidden transition-all duration-300",
            "w-80" // Increased width slightly for better responsiveness
        )}>
            {/* Header / Collapse Toggle */}
            <div className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
                    <Settings2 className="size-4" />
                    Properties
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => setIsCollapsed(true)}
                    title="Collapse"
                >
                    <ChevronsRight className="size-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {selectedElement ? (
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-lg mb-1">Wall</h3>
                            <p className="text-xs text-muted-foreground font-mono">{selectedElement.id.slice(0, 8)}</p>
                        </div>
                        
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dimensions</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {unitSystem === 'imperial' ? (
                                    <>
                                        <div className="col-span-1 space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">Feet</Label>
                                            <Input
                                                type="number"
                                                className="h-8 text-sm"
                                                value={selectedLengthFeet}
                                                onChange={e => onUpdateLength(Number(e.target.value), selectedLengthRemainderInches, 0)}
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">Inches</Label>
                                            <Input
                                                type="number"
                                                className="h-8 text-sm"
                                                value={selectedLengthRemainderInches}
                                                onChange={e => onUpdateLength(selectedLengthFeet, Number(e.target.value), 0)}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Meters</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="h-8 text-sm"
                                            value={Number(selectedLengthInMeters.toFixed(2))}
                                            onChange={e => onUpdateLength(Number(e.target.value), 0, 0)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Height ({displayUnitLabel})</Label>
                            <Input
                                type="number"
                                step={unitSystem === 'metric' ? '0.01' : '1'}
                                className="h-8 text-sm"
                                value={Number(toDisplayLength(selectedElement.height).toFixed(2))}
                                onChange={e => onUpdateElement({ ...selectedElement, height: fromDisplayLength(Number(e.target.value)) })}
                            />
                        </div>

                        {selectedElement.element_type !== 'wall' && (
                            <div className="space-y-3 pt-2 border-t">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Opening ({displayUnitLabel})</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Sill</Label>
                                        <Input
                                            type="number"
                                            step={unitSystem === 'metric' ? '0.01' : '1'}
                                            className="h-8 text-sm"
                                            value={Number(toDisplayLength(selectedElement.opening?.sillHeight ?? 0).toFixed(2))}
                                            onChange={e => onUpdateElement({
                                                ...selectedElement,
                                                opening: {
                                                    ...(selectedElement.opening || { sillHeight: 0, headHeight: selectedElement.height }),
                                                    sillHeight: fromDisplayLength(Number(e.target.value)),
                                                }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Head</Label>
                                        <Input
                                            type="number"
                                            step={unitSystem === 'metric' ? '0.01' : '1'}
                                            className="h-8 text-sm"
                                            value={Number(toDisplayLength(selectedElement.opening?.headHeight ?? selectedElement.height).toFixed(2))}
                                            onChange={e => onUpdateElement({
                                                ...selectedElement,
                                                opening: {
                                                    ...(selectedElement.opening || { sillHeight: 0, headHeight: selectedElement.height }),
                                                    headHeight: fromDisplayLength(Number(e.target.value)),
                                                }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Curvature</Label>
                                <span className="text-xs text-muted-foreground">{selectedElement.curvature || 0}</span>
                            </div>
                            <Slider
                                min={-200}
                                max={200}
                                step={10}
                                value={[selectedElement.curvature || 0]}
                                onValueChange={(values) => onUpdateCurvature(values[0])}
                                className="py-2"
                            />
                        </div>

                        {selectedElement.element_type === 'wall' && (
                            <div className="space-y-3 pt-2 border-t">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Palette className="size-3" />
                                    Appearance
                                </Label>
                                <PaintSelector 
                                    initialColor={selectedElement.paint}
                                    onSelect={(color) => onUpdateElement({...selectedElement, paint: color})}
                                />
                                {selectedElement.paint && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full text-xs h-8"
                                        onClick={() => onUpdateElement({...selectedElement, paint: undefined})}
                                    >
                                        Remove Paint
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ) : selectedRoom ? (
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                                <Waves className="size-5 text-primary" />
                                {selectedRoom.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">Room Properties</p>
                        </div>
                        
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</Label>
                            <Input 
                                value={selectedRoom.name} 
                                onChange={e => onUpdateRoom({...selectedRoom, name: e.target.value})}
                                className="h-9"
                            />
                        </div>

                        <Tabs defaultValue="paint" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-9 mb-4">
                                <TabsTrigger value="paint" className="text-xs">Walls</TabsTrigger>
                                <TabsTrigger value="flooring" className="text-xs">Flooring</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="paint" className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wall Color</Label>
                                    <PaintSelector 
                                        initialColor={selectedRoom.paint}
                                        onSelect={(color) => onUpdateRoom({...selectedRoom, paint: color})}
                                    />
                                    {selectedRoom.paint && (
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full text-xs h-8"
                                            onClick={() => onUpdateRoom({...selectedRoom, paint: undefined})}
                                        >
                                            Reset to Default
                                        </Button>
                                    )}
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="flooring" className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Material</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Carpet', 'Hardwood', 'Tile', 'Rug'].map(type => (
                                            <Button 
                                                key={type} 
                                                variant={selectedRoom.flooring?.flooring_type === type ? "default" : "outline"}
                                                size="sm"
                                                className="text-xs h-8"
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
                                    <div className="space-y-2 pt-2 border-t">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Texture Color</Label>
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
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full text-xs h-8 mt-2"
                                        onClick={() => onUpdateRoom({...selectedRoom, flooring: undefined})}
                                    >
                                        Remove Flooring
                                    </Button>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-50">
                        <Settings2 className="size-12 stroke-1" />
                        <p className="text-sm">Select an item to edit</p>
                    </div>
                )}
            </div>
            
            {/* Sticky Bottom Actions */}
            {selectedElement && !isCollapsed && (
                <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <Button onClick={onEditVertical} className="w-full gap-2 shadow-sm">
                        <Building2 className="size-4" />
                        Edit Elevation
                    </Button>
                </div>
            )}
        </div>
    );
};
