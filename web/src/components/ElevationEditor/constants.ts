import { MousePointer2, ToggleLeft, Plug, Lightbulb, Tv, Frame, Spline, CircleDot } from 'lucide-react';

import type { VerticalItem } from '../../types';

export const WALL_PADDING_PX = 50;
export const DEFAULT_DOOR_HEIGHT_IN = 80;
export const DEFAULT_WINDOW_SILL_IN = 36;
export const DEFAULT_WINDOW_HEAD_IN = 72;

export const TV_SIZES = [
    { diag: 43, w: 38, h: 22 },
    { diag: 55, w: 48, h: 27 },
    { diag: 65, w: 57, h: 33 },
    { diag: 75, w: 66, h: 38 },
    { diag: 85, w: 75, h: 43 },
];

export const FRAME_SIZES = [
    { label: '5x7"', w: 5, h: 7 },
    { label: '8x10"', w: 8, h: 10 },
    { label: '11x14"', w: 11, h: 14 },
    { label: '16x20"', w: 16, h: 20 },
    { label: '24x36"', w: 24, h: 36 },
    { label: '30x40"', w: 30, h: 40 },
];

export const TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'switch', icon: ToggleLeft, label: 'Switch' },
    { id: 'outlet', icon: Plug, label: 'Outlet' },
    { id: 'sconce', icon: Lightbulb, label: 'Sconce' },
    { id: 'tv', icon: Tv, label: 'TV' },
    { id: 'picture', icon: Frame, label: 'Picture' },
    { id: 'arch', icon: Spline, label: 'Arch' },
    { id: 'circle', icon: CircleDot, label: 'Circle' },
] as const;

export type ToolType = typeof TOOLS[number]['id'];
export type ItemType = VerticalItem['item_type'];

export const TOOL_ICON_MAP = new Map<ItemType, typeof TOOLS[number]['icon']>([
    ['switch', ToggleLeft],
    ['outlet', Plug],
    ['sconce', Lightbulb],
    ['tv', Tv],
    ['picture', Frame],
    ['frame', Frame],
    ['arch', Spline],
    ['circle', CircleDot],
]);

export const HEIGHT_PRESETS_IN: Partial<Record<ItemType, { label: string; value: number }[]>> = {
    outlet: [
        { label: '12" Standard', value: 12 },
        { label: '18" Counter', value: 18 },
    ],
    switch: [
        { label: '42" Low', value: 42 },
        { label: '48" Standard', value: 48 },
    ],
    sconce: [
        { label: '60" Accent', value: 60 },
        { label: '66" Standard', value: 66 },
    ],
    tv: [
        { label: '48" Center', value: 48 },
        { label: '60" Center', value: 60 },
    ],
    picture: [
        { label: '57" Center', value: 57 },
    ],
    frame: [
        { label: '57" Center', value: 57 },
    ],
};
