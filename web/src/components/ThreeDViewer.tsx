import React, { useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import type { Project, Element, Room } from '../types';

// Constants
const SCALE = 0.1; // Scale down so it's not huge
const WALL_HEIGHT_DEFAULT = 300; // px
const PLAYER_HEIGHT = 170 * SCALE; // Eye level
const MOVEMENT_SPEED = 5; // Units per second

interface ThreeDViewerProps {
  project: Project;
  onExit: () => void;
}

const PlayerController = () => {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = true;
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = MOVEMENT_SPEED * delta * 100 * SCALE; // Adjust speed relative to scale
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(
      0,
      0,
      Number(moveBackward.current) - Number(moveForward.current)
    );
    const sideVector = new THREE.Vector3(
      Number(moveLeft.current) - Number(moveRight.current),
      0,
      0
    );

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation);

    camera.position.add(direction);
    // Lock height to stay on ground
    camera.position.y = PLAYER_HEIGHT; 
  });

  return null;
};

// Helper to convert 2D points to 3D mesh props
const WallMesh = ({ element }: { element: Element }) => {
  const { start, end, thickness, height } = element;
  
  const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  const angle = -Math.atan2(end.y - start.y, end.x - start.x);
  
  const midX = (start.x + end.x) / 2;
  const midZ = (start.y + end.y) / 2;

  const color = element.paint?.hex || "#e2e8f0";

  return (
    <mesh
      position={[midX * SCALE, (height || WALL_HEIGHT_DEFAULT) * SCALE / 2, midZ * SCALE]}
      rotation={[0, angle, 0]}
    >
      <boxGeometry args={[length * SCALE, (height || WALL_HEIGHT_DEFAULT) * SCALE, thickness * SCALE]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
};

const RoomFloor = ({ room }: { room: Room }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (room.points.length > 0) {
      s.moveTo(room.points[0].x * SCALE, room.points[0].y * SCALE);
      for (let i = 1; i < room.points.length; i++) {
        s.lineTo(room.points[i].x * SCALE, room.points[i].y * SCALE);
      }
      s.lineTo(room.points[0].x * SCALE, room.points[0].y * SCALE); // Close loop
    }
    return s;
  }, [room.points]);

  const floorColor = room.flooring?.hex || room.paint?.hex || "#cbd5e1";

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={floorColor} side={THREE.DoubleSide} />
    </mesh>
  );
};

const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ project, onExit }) => {
  // Find a starting point (center of first room, or 0,0)
  const startPos = useMemo<[number, number, number]>(() => {
    if (project.rooms.length > 0 && project.rooms[0].points.length > 0) {
        const points = project.rooms[0].points;
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        return [centerX * SCALE, PLAYER_HEIGHT, centerY * SCALE];
    }
    return [0, PLAYER_HEIGHT, 0];
  }, [project]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
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

      <Canvas shadows camera={{ position: startPos, fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[100, 100, 100]} intensity={1} castShadow />
        
        <PointerLockControls selector="#canvas-container" />
        <PlayerController />

        <group>
            {/* Ground Plane (Infinite-ish) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[1000, 1000]} />
                <meshStandardMaterial color="#475569" />
            </mesh>

            {/* Project Elements */}
            {project.elements.map((el) => (
                <WallMesh key={el.id} element={el} />
            ))}

            {/* Room Floors */}
            {project.rooms.map((room) => (
                <RoomFloor key={room.id} room={room} />
            ))}
        </group>
      </Canvas>
      <div id="canvas-container" className="absolute inset-0" />
    </div>
  );
};

export default ThreeDViewer;