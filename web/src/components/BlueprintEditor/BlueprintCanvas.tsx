import type Konva from 'konva';
import type { RefObject } from 'react';
import { Stage, Layer } from 'react-konva';

import type { Element, LengthUnit, Point, Room, UnitSystem } from '../../types';
import type { Tool } from '../../hooks/useEditorState';
import BlueprintElementsLayer from './BlueprintElementsLayer';
import BlueprintGridLayer from './BlueprintGridLayer';
import BlueprintRoomsLayer from './BlueprintRoomsLayer';

type BlueprintCanvasProps = {
    elements: Element[];
    rooms: Room[];
    selectedId: string | null;
    activePoints: Point[];
    mousePos: Point | null;
    tool: Tool;
    unitSystem: UnitSystem;
    lengthUnit: LengthUnit;
    gridStep: number;
    stageScale: number;
    stagePos: Point;
    canvasSize: { width: number; height: number };
    stageRef: RefObject<Konva.Stage>;
    containerRef: RefObject<HTMLDivElement>;
    onStageClick: (event: Konva.KonvaEventObject<MouseEvent>) => void;
    onStageMouseMove: (event: Konva.KonvaEventObject<MouseEvent>) => void;
    onWheel: (event: Konva.KonvaEventObject<WheelEvent>) => void;
    onDragEnd: () => void;
    onSelectId: (id: string | null) => void;
};

const BlueprintCanvas = ({
    elements,
    rooms,
    selectedId,
    activePoints,
    mousePos,
    tool,
    unitSystem,
    lengthUnit,
    gridStep,
    stageScale,
    stagePos,
    canvasSize,
    stageRef,
    containerRef,
    onStageClick,
    onStageMouseMove,
    onWheel,
    onDragEnd,
    onSelectId,
}: BlueprintCanvasProps) => (
    <div ref={containerRef} className="flex-1 relative">
        <Stage
            width={Math.max(1, canvasSize.width)}
            height={Math.max(1, canvasSize.height)}
            onWheel={onWheel}
            onClick={onStageClick}
            onMouseMove={onStageMouseMove}
            onDragEnd={onDragEnd}
            draggable={tool === 'select'}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            ref={stageRef}
        >
            <Layer>
                <BlueprintGridLayer gridStep={gridStep} lengthUnit={lengthUnit} />
            </Layer>
            <Layer>
                <BlueprintRoomsLayer
                    rooms={rooms}
                    selectedId={selectedId}
                    tool={tool}
                    unitSystem={unitSystem}
                    lengthUnit={lengthUnit}
                    onSelectId={onSelectId}
                />
            </Layer>
            <Layer>
                <BlueprintElementsLayer
                    elements={elements}
                    selectedId={selectedId}
                    tool={tool}
                    unitSystem={unitSystem}
                    lengthUnit={lengthUnit}
                    activePoints={activePoints}
                    mousePos={mousePos}
                    onSelectId={onSelectId}
                />
            </Layer>
        </Stage>
    </div>
);

export default BlueprintCanvas;
