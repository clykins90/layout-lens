import { Scene, UniversalCamera, Vector3 } from '@babylonjs/core';

// Constants
const PLAYER_HEIGHT = 17; // 170cm * 0.1 scale
const MOVEMENT_SPEED = 5; // Units per second
const MOUSE_SENSITIVITY = 0.002;

export function setupFirstPersonController(
  scene: Scene,
  startPosition: Vector3
): UniversalCamera {
  // Create UniversalCamera with first-person perspective
  const camera = new UniversalCamera('firstPersonCamera', startPosition, scene);
  camera.fov = (75 * Math.PI) / 180; // 75 degrees FOV
  camera.minZ = 0.1;
  camera.maxZ = 1000;

  // Set initial rotation to look forward (along positive Z)
  camera.rotation = new Vector3(0, Math.PI, 0);

  // Attach camera to canvas for input
  camera.attachControl(scene.getEngine().getRenderingCanvas(), true);

  // Configure keyboard controls (WASD + Arrows)
  camera.keysUp = [87, 38]; // W, ArrowUp
  camera.keysDown = [83, 40]; // S, ArrowDown
  camera.keysLeft = [65, 37]; // A, ArrowLeft
  camera.keysRight = [68, 39]; // D, ArrowRight
  camera.speed = MOVEMENT_SPEED;
  camera.angularSensibility = 1 / MOUSE_SENSITIVITY;

  // Lock player height on every frame
  scene.registerBeforeRender(() => {
    camera.position.y = PLAYER_HEIGHT;
  });

  // Set up pointer lock on click
  const canvas = scene.getEngine().getRenderingCanvas();
  if (canvas) {
    canvas.addEventListener('click', () => {
      canvas.requestPointerLock();
    });
  }

  // Listen for pointer lock changes
  const onPointerLockChange = () => {
    const isLocked = document.pointerLockElement === canvas;
    if (isLocked) {
      // Enable camera inputs when pointer is locked
      camera.inputs.attached.mouse.attachControl();
    }
  };
  document.addEventListener('pointerlockchange', onPointerLockChange);

  // Store cleanup function on scene for later disposal
  scene.onDisposeObservable.addOnce(() => {
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  });

  return camera;
}
