import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Konva from 'konva';

export const useBlueprintViewport = () => {
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        const updateSize = (width: number, height: number) => {
            setCanvasSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            updateSize(width, height);
        });

        const { width, height } = container.getBoundingClientRect();
        updateSize(width, height);
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const handleWheel = useCallback((event: Konva.KonvaEventObject<WheelEvent>) => {
        event.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };
        const newScale = event.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    }, []);

    const handleDragEnd = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return;
        setStagePos({ x: stage.x(), y: stage.y() });
    }, []);

    return {
        stageRef,
        containerRef,
        canvasSize,
        stageScale,
        stagePos,
        setStageScale,
        setStagePos,
        handleWheel,
        handleDragEnd,
    };
};
