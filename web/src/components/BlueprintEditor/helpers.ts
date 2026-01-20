import type { ElementType, OpeningSpec } from '../../types';
import { DEFAULT_DOOR_HEIGHT_IN, DEFAULT_WINDOW_HEAD_IN, DEFAULT_WINDOW_SILL_IN } from './constants';

export const buildDefaultOpening = (
    type: ElementType,
    wallHeight: number,
    toUnit: (inches: number) => number
): OpeningSpec => {
    if (type === 'door') {
        return { sillHeight: 0, headHeight: Math.min(wallHeight, toUnit(DEFAULT_DOOR_HEIGHT_IN)) };
    }
    if (type === 'window') {
        return {
            sillHeight: Math.min(wallHeight * 0.5, toUnit(DEFAULT_WINDOW_SILL_IN)),
            headHeight: Math.min(wallHeight, toUnit(DEFAULT_WINDOW_HEAD_IN)),
        };
    }
    return { sillHeight: 0, headHeight: wallHeight };
};
