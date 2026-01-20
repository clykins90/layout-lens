import { useCallback, useMemo, useState, type FC, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { Element, UnitSystem, VerticalItem } from '../types';
import { distance } from '../utils/geometry';
import { getGridStep, lengthUnitForSystem, toPx } from '../utils/units';
import {
    DEFAULT_DOOR_HEIGHT_IN,
    DEFAULT_WINDOW_HEAD_IN,
    DEFAULT_WINDOW_SILL_IN,
    type ToolType,
} from './ElevationEditor/constants';
import {
    clampItemPosition,
    getIntersections,
    getItemTopLeft,
    getPositionFromTopLeft,
} from './ElevationEditor/geometry';
import { ElevationCanvas } from './ElevationEditor/ElevationCanvas';
import { ElevationHeader } from './ElevationEditor/ElevationHeader';
import { ElevationSidebar } from './ElevationEditor/ElevationSidebar';
import { ElevationToolbar } from './ElevationEditor/ElevationToolbar';

interface ElevationEditorProps {
    unitSystem: UnitSystem;
    element: Element;
    allElements: Element[];
    onUpdate: (updatedElement: Element) => void;
    onClose: () => void;
}

const ElevationEditor: FC<ElevationEditorProps> = ({ unitSystem, element, allElements, onUpdate, onClose }) => {
    const [tool, setTool] = useState<ToolType>('select');
    const [selectedItemId, setSelectedId] = useState<string | null>(null);

    const lengthUnit = lengthUnitForSystem(unitSystem);
    const unitFactor = lengthUnit === 'in' ? 1 : 25.4;
    const toUnit = useCallback((inches: number) => inches * unitFactor, [unitFactor]);

    const wallLength = distance(element.start, element.end);
    const wallHeight = element.height || toUnit(96);
    const wallLengthPx = toPx(wallLength, lengthUnit);
    const wallHeightPx = toPx(wallHeight, lengthUnit);

    const defaultDoorHeight = toUnit(DEFAULT_DOOR_HEIGHT_IN);
    const defaultWindowSill = toUnit(DEFAULT_WINDOW_SILL_IN);
    const defaultWindowHead = toUnit(DEFAULT_WINDOW_HEAD_IN);

    const intersections = useMemo(
        () =>
            getIntersections(
                element,
                allElements,
                wallHeight,
                defaultDoorHeight,
                defaultWindowSill,
                defaultWindowHead
            ),
        [element, allElements, wallHeight, defaultDoorHeight, defaultWindowSill, defaultWindowHead]
    );

    const items = element.items || [];
    const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

    const gridStep = getGridStep(unitSystem, 'fine', lengthUnit);
    const gridPx = toPx(gridStep, lengthUnit);

    const defaultItemSizes = useMemo<Partial<Record<VerticalItem['item_type'], { w: number; h: number }>>>(
        () => ({
            switch: { w: 3 * unitFactor, h: 5 * unitFactor },
            outlet: { w: 3 * unitFactor, h: 5 * unitFactor },
            sconce: { w: 6 * unitFactor, h: 10 * unitFactor },
            tv: { w: 48 * unitFactor, h: 27 * unitFactor },
            picture: { w: 24 * unitFactor, h: 36 * unitFactor },
            frame: { w: 24 * unitFactor, h: 36 * unitFactor },
            arch: { w: 36 * unitFactor, h: 80 * unitFactor },
            circle: { w: 20 * unitFactor, h: 20 * unitFactor },
        }),
        [unitFactor]
    );

    const updateItemById = useCallback(
        (id: string, updater: (item: VerticalItem) => VerticalItem) => {
            const updatedItems = items.map((item) => (item.id === id ? updater(item) : item));
            onUpdate({ ...element, items: updatedItems });
        },
        [items, onUpdate, element]
    );

    const updateItem = useCallback(
        (updater: (item: VerticalItem) => VerticalItem) => {
            if (!selectedItemId) return;
            updateItemById(selectedItemId, updater);
        },
        [selectedItemId, updateItemById]
    );

    const updateItemPosition = useCallback(
        (updates: Partial<VerticalItem['position']>) => {
            updateItem((item) => {
                const next = { ...item, position: { ...item.position, ...updates } };
                const topLeft = clampItemPosition(getItemTopLeft(next, wallHeight), next, wallLength, wallHeight);
                return { ...next, position: getPositionFromTopLeft(topLeft, next, wallHeight) };
            });
        },
        [updateItem, wallHeight, wallLength]
    );

    const updateItemSize = useCallback(
        (updates: Partial<VerticalItem['size']>) => {
            updateItem((item) => {
                const next = { ...item, size: { ...item.size, ...updates } };
                const topLeft = clampItemPosition(getItemTopLeft(next, wallHeight), next, wallLength, wallHeight);
                return { ...next, position: getPositionFromTopLeft(topLeft, next, wallHeight) };
            });
        },
        [updateItem, wallHeight, wallLength]
    );

    const handleKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLDivElement>) => {
            if (!selectedItem || selectedItem.locked) return;
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement
            ) {
                return;
            }

            const baseStep = gridStep;
            const fineStep = baseStep / 4;
            const coarseStep = unitSystem === 'imperial' ? baseStep * 12 : baseStep * 10;
            const step = event.altKey ? fineStep : event.shiftKey ? coarseStep : baseStep;

            let deltaX = 0;
            let deltaY = 0;
            if (event.key === 'ArrowLeft') deltaX = -step;
            if (event.key === 'ArrowRight') deltaX = step;
            if (event.key === 'ArrowUp') deltaY = step;
            if (event.key === 'ArrowDown') deltaY = -step;
            if (deltaX === 0 && deltaY === 0) return;

            event.preventDefault();
            updateItem((item) => {
                const next = {
                    ...item,
                    position: {
                        along: item.position.along + deltaX,
                        height: item.position.height + deltaY,
                    },
                };
                const topLeft = clampItemPosition(getItemTopLeft(next, wallHeight), next, wallLength, wallHeight);
                return { ...next, position: getPositionFromTopLeft(topLeft, next, wallHeight) };
            });
        },
        [selectedItem, gridStep, unitSystem, updateItem, wallHeight, wallLength]
    );

    const deleteItem = useCallback(() => {
        if (!selectedItemId) return;
        const updatedItems = items.filter((item) => item.id !== selectedItemId);
        onUpdate({ ...element, items: updatedItems });
        setSelectedId(null);
    }, [items, selectedItemId, onUpdate, element]);

    const toggleItemLocked = useCallback(
        (id: string) => {
            updateItemById(id, (item) => ({ ...item, locked: !item.locked }));
        },
        [updateItemById]
    );

    const toggleItemHidden = useCallback(
        (id: string) => {
            updateItemById(id, (item) => ({ ...item, hidden: !item.hidden }));
        },
        [updateItemById]
    );

    return (
        <div
            className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200"
            role="application"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseDown={(event) => (event.currentTarget as HTMLDivElement).focus()}
        >
            <ElevationHeader
                element={element}
                wallLength={wallLength}
                wallHeight={wallHeight}
                unitSystem={unitSystem}
                lengthUnit={lengthUnit}
                onClose={onClose}
            />

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <ElevationToolbar tool={tool} onToolChange={setTool} />
                <ElevationCanvas
                    element={element}
                    tool={tool}
                    selectedItemId={selectedItemId}
                    wallLength={wallLength}
                    wallHeight={wallHeight}
                    wallLengthPx={wallLengthPx}
                    wallHeightPx={wallHeightPx}
                    gridStep={gridStep}
                    gridPx={gridPx}
                    intersections={intersections}
                    lengthUnit={lengthUnit}
                    defaultItemSizes={defaultItemSizes}
                    toUnit={toUnit}
                    onSelectItem={setSelectedId}
                    onToolChange={setTool}
                    onUpdate={onUpdate}
                />
                <ElevationSidebar
                    items={items}
                    selectedItemId={selectedItemId}
                    selectedItem={selectedItem}
                    unitSystem={unitSystem}
                    lengthUnit={lengthUnit}
                    toUnit={toUnit}
                    onSelectItem={setSelectedId}
                    onUpdatePosition={updateItemPosition}
                    onUpdateSize={updateItemSize}
                    onToggleHidden={toggleItemHidden}
                    onToggleLocked={toggleItemLocked}
                    onDeleteSelected={deleteItem}
                />
            </div>
        </div>
    );
};

export default ElevationEditor;
