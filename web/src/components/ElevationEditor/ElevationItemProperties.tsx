import { Eye, EyeOff, Lock, Trash2, Unlock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatLength } from '../../utils/units';
import type { LengthUnit, UnitSystem, VerticalItem } from '../../types';
import { FRAME_SIZES, HEIGHT_PRESETS_IN, TV_SIZES } from './constants';

type ElevationItemPropertiesProps = {
    item: VerticalItem | null;
    unitSystem: UnitSystem;
    lengthUnit: LengthUnit;
    toUnit: (inches: number) => number;
    onUpdatePosition: (updates: Partial<VerticalItem['position']>) => void;
    onUpdateSize: (updates: Partial<VerticalItem['size']>) => void;
    onToggleHidden: () => void;
    onToggleLocked: () => void;
    onDelete: () => void;
};

export const ElevationItemProperties = ({
    item,
    unitSystem,
    lengthUnit,
    toUnit,
    onUpdatePosition,
    onUpdateSize,
    onToggleHidden,
    onToggleLocked,
    onDelete,
}: ElevationItemPropertiesProps) => {
    if (!item) {
        return <div className="text-muted-foreground text-sm text-center mt-10">Select an item to edit</div>;
    }

    const presets = HEIGHT_PRESETS_IN[item.item_type] || [];
    const unitLabel = lengthUnit === 'in' ? 'in' : 'mm';
    const anchorLabel = item.anchor === 'center' ? 'center' : item.anchor === 'bottom-center' ? 'bottom center' : 'bottom';

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold capitalize">{item.item_type}</h3>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleHidden}
                        title={item.hidden ? 'Show item' : 'Hide item'}
                    >
                        {item.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleLocked}
                        title={item.locked ? 'Unlock item' : 'Lock item'}
                    >
                        {item.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
                        <Trash2 className="size-4" />
                        Delete
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                    Position (Along / Height • {anchorLabel} anchor) • {unitLabel}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Along</span>
                        <Input
                            type="number"
                            className="h-8"
                            value={Math.round(item.position.along)}
                            onChange={(event) => onUpdatePosition({ along: Number(event.target.value) })}
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Height</span>
                        <Input
                            type="number"
                            className="h-8"
                            value={Math.round(item.position.height)}
                            onChange={(event) => onUpdatePosition({ height: Number(event.target.value) })}
                        />
                    </div>
                </div>
            </div>

            {presets.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Height Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {presets.map((preset) => (
                            <Button
                                key={preset.label}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 justify-start"
                                onClick={() => onUpdatePosition({ height: toUnit(preset.value) })}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {item.item_type === 'tv' && (
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Diagonal Size</Label>
                    <Select
                        onValueChange={(value) => {
                            const size = TV_SIZES.find((option) => option.diag === Number(value));
                            if (size) {
                                onUpdateSize({ width: toUnit(size.w), height: toUnit(size.h) });
                            }
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Size..." />
                        </SelectTrigger>
                        <SelectContent>
                            {TV_SIZES.map((option) => (
                                <SelectItem key={option.diag} value={String(option.diag)}>
                                    {option.diag}" ({option.w}x{option.h})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {(item.item_type === 'picture' || item.item_type === 'frame') && (
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Frame Size</Label>
                    <Select
                        onValueChange={(value) => {
                            const [width, height] = value.split(',').map(Number);
                            onUpdateSize({ width: toUnit(width), height: toUnit(height) });
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Size..." />
                        </SelectTrigger>
                        <SelectContent>
                            {FRAME_SIZES.map((size) => (
                                <SelectItem key={size.label} value={`${size.w},${size.h}`}>
                                    {size.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs text-muted-foreground">Dimensions ({unitLabel})</Label>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">W</span>
                        <Input
                            type="number"
                            className="h-8"
                            value={Math.round(item.size.width)}
                            onChange={(event) => onUpdateSize({ width: Number(event.target.value) })}
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">H</span>
                        <Input
                            type="number"
                            className="h-8"
                            value={Math.round(item.size.height)}
                            onChange={(event) => onUpdateSize({ height: Number(event.target.value) })}
                        />
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {formatLength(item.size.width, unitSystem, lengthUnit)} x {formatLength(item.size.height, unitSystem, lengthUnit)}
                </div>
            </div>
        </div>
    );
};
