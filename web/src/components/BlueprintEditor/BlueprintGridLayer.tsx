import { memo, useMemo } from 'react';
import { Group, Line } from 'react-konva';

import type { LengthUnit } from '../../types';
import { toPx } from '../../utils/units';
import { GRID_EXTENT_PX, GRID_LINE_COUNT } from './constants';

type BlueprintGridLayerProps = {
    gridStep: number;
    lengthUnit: LengthUnit;
};

const BlueprintGridLayer = memo(({ gridStep, lengthUnit }: BlueprintGridLayerProps) => {
    const lines = useMemo(() => {
        const size = toPx(gridStep, lengthUnit);
        return Array.from({ length: GRID_LINE_COUNT + 1 }).flatMap((_, index) => [
            <Line
                key={`v${index}`}
                points={[index * size, 0, index * size, GRID_EXTENT_PX]}
                stroke="#eee"
                strokeWidth={1}
            />,
            <Line
                key={`h${index}`}
                points={[0, index * size, GRID_EXTENT_PX, index * size]}
                stroke="#eee"
                strokeWidth={1}
            />,
        ]);
    }, [gridStep, lengthUnit]);

    return <Group>{lines}</Group>;
});

BlueprintGridLayer.displayName = 'BlueprintGridLayer';

export default BlueprintGridLayer;
