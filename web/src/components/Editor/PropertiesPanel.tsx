import { Building2 } from 'lucide-react';
import type { Element } from '../../types';
import { distance } from '../../utils/geometry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

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
                    <Button onClick={onEditVertical} className="w-full">
                        <Building2 className="size-4" />
                        Edit Vertical View
                    </Button>
                </div>
            ) : (
                <div className="text-muted-foreground text-sm">Select a wall to edit properties.</div>
            )}
        </div>
    );
};
