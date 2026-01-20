import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type RoomPolygonPoint = { x: number; z: number };
type RoomPolygon = { id: string; name: string; points: RoomPolygonPoint[] };

const isPointInPolygon = (point: RoomPolygonPoint, polygon: RoomPolygonPoint[]): boolean => {
  // Ray casting algorithm
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersects =
      zi > point.z !== zj > point.z &&
      point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const findRoomForPosition = (rooms: RoomPolygon[], point: RoomPolygonPoint): RoomPolygon | null => {
  for (const room of rooms) {
    if (room.points.length >= 3 && isPointInPolygon(point, room.points)) {
      return room;
    }
  }
  return null;
};

interface BabylonViewerProps {
  project: Project;
  onExit: () => void;
}

const BabylonViewer: React.FC<BabylonViewerProps> = ({ project, onExit }) => {
  const postProcessingRef = useRef<PostProcessingResult | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const lastRoomIdRef = useRef<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const worldScale = unitToMeters(project.lengthUnit);

  const roomPolygons = useMemo<RoomPolygon[]>(() => {
    return project.rooms
      .filter((room) => room.isValid !== false && room.points.length >= 3)
      .map((room) => ({
        id: room.id,
        name: room.name.trim() || 'Unnamed room',
        points: room.points.map((point) => ({
          x: point.x * worldScale,
          z: point.y * worldScale,
        })),
      }));
  }, [project.rooms, worldScale]);

  // Calculate starting position from center of a valid room or wall bounds.
  const startPos = useMemo<Vector3>(() => {
    const room =
      project.rooms.find((candidate) => candidate.isValid !== false && candidate.points.length > 0) ??
      project.rooms.find((candidate) => candidate.points.length > 0) ??
      null;
    if (room) {
      const points = room.points;
      const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      return new Vector3(centerX * worldScale, PLAYER_HEIGHT_M, centerY * worldScale);
    }
    const wallPoints = project.elements
      .filter((element) => element.element_type === 'wall')
      .flatMap((element) => [element.start, element.end]);
    if (wallPoints.length > 0) {
      const centerX = wallPoints.reduce((sum, p) => sum + p.x, 0) / wallPoints.length;
      const centerY = wallPoints.reduce((sum, p) => sum + p.y, 0) / wallPoints.length;
      return new Vector3(centerX * worldScale, PLAYER_HEIGHT_M, centerY * worldScale);
    }
    return new Vector3(0, PLAYER_HEIGHT_M, 0);
  }, [project.elements, project.rooms, worldScale]);

  const startLookTarget = useMemo<Vector3>(() => {
    // Aim slightly forward and down so the room is visible on entry.
    return startPos.add(new Vector3(0, -0.3, 0.75));
  }, [startPos]);

  // Handle scene setup when ready
  const handleSceneReady = useCallback(
    (scene: Scene) => {
      sceneRef.current = scene;

      // 1. Setup environment (lighting, shadows, skybox)
      const { shadowGenerator } = setupEnvironment(scene);

      // 2. Setup first-person controller
      const camera = setupFirstPersonController(scene, startPos, startLookTarget);

      // 3. Build geometry
      // Build walls
      buildWalls(scene, project.elements, worldScale, shadowGenerator);

      // Build floors
      buildFloors(scene, project.rooms, worldScale);

      // Build openings (windows, doors, openings)
      buildOpenings(scene, project.elements, worldScale, shadowGenerator);

      // 4. Setup post-processing
      postProcessingRef.current = setupPostProcessing(scene, camera);

      const observer = scene.onBeforeRenderObservable.add(() => {
        const position = camera.position;
        const room = findRoomForPosition(roomPolygons, { x: position.x, z: position.z });
        const nextRoomId = room?.id ?? null;
        if (nextRoomId !== lastRoomIdRef.current) {
          lastRoomIdRef.current = nextRoomId;
          setCurrentRoomName(room?.name ?? null);
        }
      });

      scene.onDisposeObservable.addOnce(() => {
        scene.onBeforeRenderObservable.remove(observer);
      });
    },
    [project, roomPolygons, startLookTarget, startPos, worldScale]
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
        <div className="bg-black/50 px-4 py-2 rounded" aria-live="polite">
          {currentRoomName ? `Room: ${currentRoomName}` : 'Outside rooms'}
        </div>
      </div>

      {/* Babylon.js Canvas */}
      <BabylonScene onSceneReady={handleSceneReady} />
    </div>
  );
};

export default BabylonViewer;
