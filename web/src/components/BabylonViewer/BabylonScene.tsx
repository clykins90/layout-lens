import React, { useEffect, useRef } from 'react';
import { Engine, Scene } from '@babylonjs/core';

interface BabylonSceneProps {
  onSceneReady: (scene: Scene) => void;
}

const BabylonScene: React.FC<BabylonSceneProps> = ({ onSceneReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize Babylon Engine with antialiasing
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    engineRef.current = engine;

    // Create Scene
    const scene = new Scene(engine);
    sceneRef.current = scene;

    // Notify parent that scene is ready
    onSceneReady(scene);

    // Run render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle window resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [onSceneReady]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        outline: 'none',
      }}
    />
  );
};

export default BabylonScene;
