import { useCallback, useMemo } from 'react';

import type { GridMode, LengthUnit, UnitSystem } from '../types';
import { getGridStep, lengthUnitForSystem } from '../utils/units';

type UseMeasurementResult = {
    lengthUnit: LengthUnit;
    unitFactor: number;
    toUnit: (inches: number) => number;
    gridStep: number;
};

export const useMeasurement = (unitSystem: UnitSystem, gridMode: GridMode = 'fine'): UseMeasurementResult => {
    const lengthUnit = useMemo(() => lengthUnitForSystem(unitSystem), [unitSystem]);
    const unitFactor = lengthUnit === 'in' ? 1 : 25.4;
    const toUnit = useCallback((inches: number) => inches * unitFactor, [unitFactor]);
    const gridStep = useMemo(() => getGridStep(unitSystem, gridMode, lengthUnit), [unitSystem, gridMode, lengthUnit]);

    return { lengthUnit, unitFactor, toUnit, gridStep };
};
