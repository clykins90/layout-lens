import { Eye, EyeOff, Frame, Lock, Unlock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatLength } from '../../utils/units';
import type { LengthUnit, UnitSystem, VerticalItem } from '../../types';
import { TOOL_ICON_MAP } from './constants';

type ElevationItemListProps = {
    items: VerticalItem[];
    selectedItemId: string | null;
    unitSystem: UnitSystem;
    lengthUnit: LengthUnit;
    onSelectItem: (id: string) => void;
    onToggleHidden: (id: string) => void;
    onToggleLocked: (id: string) => void;
};

export const ElevationItemList = ({
    items,
    selectedItemId,
    unitSystem,
    lengthUnit,
    onSelectItem,
    onToggleHidden,
    onToggleLocked,
}: ElevationItemListProps) => {
    if (items.length === 0) {
        return <div className="text-xs text-muted-foreground">No items placed yet.</div>;
    }

    return (
        <div className="space-y-2">
            {items.map((item) => {
                const Icon = TOOL_ICON_MAP.get(item.item_type) || Frame;
                const isSelected = item.id === selectedItemId;
                const status = [item.hidden ? 'Hidden' : null, item.locked ? 'Locked' : null]
                    .filter(Boolean)
                    .join(' • ');

                return (
                    <button
                        key={item.id}
                        type="button"
                        className={`w-full rounded-md border px-2 py-2 text-left text-xs transition ${
                            isSelected ? 'border-primary/50 bg-primary/5' : 'border-muted/40 hover:border-muted/80'
                        }`}
                        onClick={() => onSelectItem(item.id)}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Icon className="size-4 text-muted-foreground" />
                                <div className="font-medium capitalize">{item.item_type}</div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onToggleHidden(item.id);
                                    }}
                                    title={item.hidden ? 'Show item' : 'Hide item'}
                                >
                                    {item.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onToggleLocked(item.id);
                                    }}
                                    title={item.locked ? 'Unlock item' : 'Lock item'}
                                >
                                    {item.locked ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                                </Button>
                            </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                            Along {formatLength(item.position.along, unitSystem, lengthUnit)} • Height{' '}
                            {formatLength(item.position.height, unitSystem, lengthUnit)}
                        </div>
                        {status && <div className="text-[10px] text-muted-foreground mt-1">{status}</div>}
                    </button>
                );
            })}
        </div>
    );
};
