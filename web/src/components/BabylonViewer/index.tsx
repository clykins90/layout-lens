import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Scene, Vector3 } from '@babylonjs/core';
import BabylonScene from './BabylonScene';
import { setupFirstPersonController } from './FirstPersonController';
import { buildWalls } from './WallBuilder';
import { buildFloors } from './FloorBuilder';
import { buildOpenings } from './OpeningBuilder';
import { setupEnvironment } from './EnvironmentSetup';
import { setupPostProcessing, disposePostProcessing } from './PostProcessing';
import type { PostProcessingResult } from './PostProcessing';
import type { Project } from '../../types';
import { unitToMeters } from '../../utils/units';

const PLAYER_HEIGHT_M = 1.7;

interface BabylonViewerProps {
  project: Project;
  onExit: () => void;
}

const BabylonViewer: React.FC<BabylonViewerProps> = ({ project, onExit }) => {
  const postProcessingRef = useRef<PostProcessingResult | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const worldScale = unitToMeters(project.lengthUnit);

  // Calculate starting position from center of first room
  const startPos = useMemo<Vector3>(() => {
    if (project.rooms.length > 0 && project.rooms[0].points.length > 0) {
      const points = project.rooms[0].points;
      const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      return new Vector3(centerX * worldScale, PLAYER_HEIGHT_M, centerY * worldScale);
    }
    return new Vector3(0, PLAYER_HEIGHT_M, 0);
  }, [project.rooms, worldScale]);

  // Handle scene setup when ready
  const handleSceneReady = useCallback(
    (scene: Scene) => {
      sceneRef.current = scene;

      // 1. Setup environment (lighting, shadows, skybox)
      const { shadowGenerator } = setupEnvironment(scene);

      // 2. Setup first-person controller
      const camera = setupFirstPersonController(scene, startPos);

      // 3. Build geometry
      // Build walls
      buildWalls(scene, project.elements, worldScale, shadowGenerator);

      // Build floors
      buildFloors(scene, project.rooms, worldScale);

      // Build openings (windows, doors, openings)
      buildOpenings(scene, project.elements, worldScale, shadowGenerator);

      // 4. Setup post-processing
      postProcessingRef.current = setupPostProcessing(scene, camera);
    },
    [project, startPos, worldScale]
  );

  // Handle ESC key for exit (when not in pointer lock)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Check if pointer is locked
        const canvas = sceneRef.current?.getEngine().getRenderingCanvas();
        if (document.pointerLockElement !== canvas) {
          // Pointer is not locked, so exit viewer
          onExit();
        }
        // If pointer IS locked, the browser will automatically unlock it,
        // and we don't exit the viewer
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // Cleanup post-processing on unmount
  useEffect(() => {
    return () => {
      if (postProcessingRef.current) {
        disposePostProcessing(postProcessingRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-50 flex gap-4 text-white">
        <button
          onClick={onExit}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-bold"
        >
          Exit 3D View (ESC)
        </button>
        <div className="bg-black/50 px-4 py-2 rounded">
          Click to start. WASD to Move. Mouse to Look. ESC to Exit cursor lock.
        </div>
      </div>

      {/* Babylon.js Canvas */}
      <BabylonScene onSceneReady={handleSceneReady} />
    </div>
  );
};

export default BabylonViewer;
