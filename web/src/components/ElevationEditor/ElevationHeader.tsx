import { ChevronLeft, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatLength } from '../../utils/units';
import type { Element, LengthUnit, UnitSystem } from '../../types';

type ElevationHeaderProps = {
    element: Element;
    wallLength: number;
    wallHeight: number;
    unitSystem: UnitSystem;
    lengthUnit: LengthUnit;
    onClose: () => void;
};

export const ElevationHeader = ({ element, wallLength, wallHeight, unitSystem, lengthUnit, onClose }: ElevationHeaderProps) => (
    <div className="flex h-14 items-center justify-between border-b px-4 bg-background">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} title="Back">
                <ChevronLeft className="size-5" />
            </Button>
            <div>
                <h2 className="text-lg font-semibold leading-none tracking-tight">Elevation View</h2>
                <p className="text-sm text-muted-foreground">
                    Wall ID: {element.id.slice(0, 8)} • Length: {formatLength(wallLength, unitSystem, lengthUnit)} • Height:{' '}
                    {formatLength(wallHeight, unitSystem, lengthUnit)}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="size-5" />
            </Button>
        </div>
    </div>
);
