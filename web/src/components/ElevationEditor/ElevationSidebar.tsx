import type { LengthUnit, UnitSystem, VerticalItem } from '../../types';
import { ElevationItemList } from './ElevationItemList';
import { ElevationItemProperties } from './ElevationItemProperties';

type ElevationSidebarProps = {
    items: VerticalItem[];
    selectedItemId: string | null;
    selectedItem: VerticalItem | null;
    unitSystem: UnitSystem;
    lengthUnit: LengthUnit;
    toUnit: (inches: number) => number;
    onSelectItem: (id: string) => void;
    onUpdatePosition: (updates: Partial<VerticalItem['position']>) => void;
    onUpdateSize: (updates: Partial<VerticalItem['size']>) => void;
    onToggleHidden: (id: string) => void;
    onToggleLocked: (id: string) => void;
    onDeleteSelected: () => void;
};

export const ElevationSidebar = ({
    items,
    selectedItemId,
    selectedItem,
    unitSystem,
    lengthUnit,
    toUnit,
    onSelectItem,
    onUpdatePosition,
    onUpdateSize,
    onToggleHidden,
    onToggleLocked,
    onDeleteSelected,
}: ElevationSidebarProps) => {
    const handleToggleHidden = () => {
        if (!selectedItem) return;
        onToggleHidden(selectedItem.id);
    };

    const handleToggleLocked = () => {
        if (!selectedItem) return;
        onToggleLocked(selectedItem.id);
    };

    return (
        <div className="w-80 shrink-0 bg-background border-l p-4 overflow-y-auto">
            <div className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">Items</h3>
                        <span className="text-xs text-muted-foreground">{items.length}</span>
                    </div>
                    <ElevationItemList
                        items={items}
                        selectedItemId={selectedItemId}
                        unitSystem={unitSystem}
                        lengthUnit={lengthUnit}
                        onSelectItem={onSelectItem}
                        onToggleHidden={onToggleHidden}
                        onToggleLocked={onToggleLocked}
                    />
                </div>
                <div className="pt-4 border-t">
                    <ElevationItemProperties
                        item={selectedItem}
                        unitSystem={unitSystem}
                        lengthUnit={lengthUnit}
                        toUnit={toUnit}
                        onUpdatePosition={onUpdatePosition}
                        onUpdateSize={onUpdateSize}
                        onToggleHidden={handleToggleHidden}
                        onToggleLocked={handleToggleLocked}
                        onDelete={onDeleteSelected}
                    />
                </div>
            </div>
        </div>
    );
};
