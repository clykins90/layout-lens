import type { LengthUnit, UnitSystem, Point } from '../types';

export const DEFAULT_UNIT_SYSTEM: UnitSystem = 'imperial';
export const DEFAULT_LENGTH_UNIT: LengthUnit = 'in';
export const DEFAULT_PX_PER_IN = 4;

export const lengthUnitForSystem = (unitSystem: UnitSystem): LengthUnit =>
    unitSystem === 'metric' ? 'mm' : 'in';

export const getPxPerUnit = (lengthUnit: LengthUnit, pxPerIn = DEFAULT_PX_PER_IN) =>
    lengthUnit === 'in' ? pxPerIn : pxPerIn / 25.4;

export const toPx = (value: number, lengthUnit: LengthUnit, pxPerIn = DEFAULT_PX_PER_IN) =>
    value * getPxPerUnit(lengthUnit, pxPerIn);

export const fromPx = (value: number, lengthUnit: LengthUnit, pxPerIn = DEFAULT_PX_PER_IN) =>
    value / getPxPerUnit(lengthUnit, pxPerIn);

export const toPxPoint = (point: Point, lengthUnit: LengthUnit, pxPerIn = DEFAULT_PX_PER_IN): Point => ({
    x: toPx(point.x, lengthUnit, pxPerIn),
    y: toPx(point.y, lengthUnit, pxPerIn),
});

export const fromPxPoint = (point: Point, lengthUnit: LengthUnit, pxPerIn = DEFAULT_PX_PER_IN): Point => ({
    x: fromPx(point.x, lengthUnit, pxPerIn),
    y: fromPx(point.y, lengthUnit, pxPerIn),
});

export const formatLength = (value: number, unitSystem: UnitSystem, lengthUnit: LengthUnit) => {
    if (unitSystem === 'imperial') {
        const inches = lengthUnit === 'in' ? value : value / 25.4;
        const feet = Math.floor(inches / 12);
        const remainder = inches - feet * 12;
        const wholeInches = Math.floor(remainder);
        const fraction = Math.round((remainder - wholeInches) * 16);
        let text = `${feet}' ${wholeInches}"`;
        if (fraction > 0) text += ` ${fraction}/16`;
        return text;
    }

    const mm = lengthUnit === 'mm' ? value : value * 25.4;
    const meters = mm / 1000;
    return `${meters.toFixed(2)}m`;
};

export const formatArea = (area: number, unitSystem: UnitSystem, lengthUnit: LengthUnit) => {
    if (unitSystem === 'imperial') {
        const areaInSqIn = lengthUnit === 'in' ? area : area / (25.4 * 25.4);
        const areaSqFt = areaInSqIn / 144;
        return `${areaSqFt.toFixed(1)} sq ft`;
    }

    const areaSqMm = lengthUnit === 'mm' ? area : area * 25.4 * 25.4;
    const areaSqM = areaSqMm / 1_000_000;
    return `${areaSqM.toFixed(2)} m^2`;
};

export const getGridStep = (
    unitSystem: UnitSystem,
    gridMode: 'coarse' | 'fine',
    lengthUnit: LengthUnit
) => {
    if (unitSystem === 'imperial') {
        const stepInInches = gridMode === 'coarse' ? 12 : 1;
        return lengthUnit === 'in' ? stepInInches : stepInInches * 25.4;
    }

    const stepInMm = gridMode === 'coarse' ? 1000 : 100;
    return lengthUnit === 'mm' ? stepInMm : stepInMm / 25.4;
};

export const unitToMeters = (lengthUnit: LengthUnit) =>
    lengthUnit === 'in' ? 0.0254 : 0.001;
