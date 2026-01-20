import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Mesh,
  ShadowGenerator,
} from '@babylonjs/core';
import type { Element } from '../../types';

// Constants
const SCALE = 0.1;
const WINDOW_SILL_HEIGHT = 100 * SCALE; // 100 units from floor
const WINDOW_HEIGHT = 150 * SCALE; // 150 units tall
const DOOR_HEIGHT = 210 * SCALE; // 210 units (7ft)
const FRAME_THICKNESS = 0.3; // Frame width in world units
const FRAME_DEPTH = 0.5; // Frame depth in world units

export function buildOpenings(
  scene: Scene,
  elements: Element[],
  shadowGenerator?: ShadowGenerator
): Mesh[] {
  const meshes: Mesh[] = [];

  // Filter for windows, doors, and openings
  const windows = elements.filter((el) => el.element_type === 'window');
  const doors = elements.filter((el) => el.element_type === 'door');
  const openings = elements.filter((el) => el.element_type === 'opening');

  // Build windows
  windows.forEach((element, index) => {
    const windowMeshes = buildWindow(scene, element, index, shadowGenerator);
    meshes.push(...windowMeshes);
  });

  // Build doors
  doors.forEach((element, index) => {
    const doorMeshes = buildDoor(scene, element, index, shadowGenerator);
    meshes.push(...doorMeshes);
  });

  // Build openings (just trim)
  openings.forEach((element, index) => {
    const openingMeshes = buildOpening(scene, element, index, shadowGenerator);
    meshes.push(...openingMeshes);
  });

  return meshes;
}

function buildWindow(
  scene: Scene,
  element: Element,
  index: number,
  shadowGenerator?: ShadowGenerator
): Mesh[] {
  const meshes: Mesh[] = [];
  const { start, end } = element;

  // Calculate dimensions
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) * SCALE;
  const angle = Math.atan2(dy, dx);
  const midX = ((start.x + end.x) / 2) * SCALE;
  const midZ = ((start.y + end.y) / 2) * SCALE;

  // White frame material
  const frameMaterial = new PBRMaterial(`windowFrameMat_${index}`, scene);
  frameMaterial.albedoColor = Color3.White();
  frameMaterial.roughness = 0.5;
  frameMaterial.metallic = 0;

  // Glass material (semi-transparent)
  const glassMaterial = new PBRMaterial(`windowGlassMat_${index}`, scene);
  glassMaterial.albedoColor = Color3.FromHexString('#87CEEB');
  glassMaterial.alpha = 0.3;
  glassMaterial.roughness = 0.1;
  glassMaterial.metallic = 0.1;

  // Create frame pieces (4 boxes: top, bottom, left, right)
  // Bottom frame
  const bottomFrame = MeshBuilder.CreateBox(
    `windowBottomFrame_${index}`,
    { width: length, height: FRAME_THICKNESS, depth: FRAME_DEPTH },
    scene
  );
  bottomFrame.position.set(midX, WINDOW_SILL_HEIGHT, midZ);
  bottomFrame.rotation.y = -angle;
  bottomFrame.material = frameMaterial;
  meshes.push(bottomFrame);

  // Top frame
  const topFrame = MeshBuilder.CreateBox(
    `windowTopFrame_${index}`,
    { width: length, height: FRAME_THICKNESS, depth: FRAME_DEPTH },
    scene
  );
  topFrame.position.set(midX, WINDOW_SILL_HEIGHT + WINDOW_HEIGHT, midZ);
  topFrame.rotation.y = -angle;
  topFrame.material = frameMaterial;
  meshes.push(topFrame);

  // Left frame
  const leftFrame = MeshBuilder.CreateBox(
    `windowLeftFrame_${index}`,
    { width: FRAME_THICKNESS, height: WINDOW_HEIGHT, depth: FRAME_DEPTH },
    scene
  );
  const leftOffsetX = Math.cos(angle) * (length / 2 - FRAME_THICKNESS / 2);
  const leftOffsetZ = Math.sin(angle) * (length / 2 - FRAME_THICKNESS / 2);
  leftFrame.position.set(
    midX - leftOffsetX,
    WINDOW_SILL_HEIGHT + WINDOW_HEIGHT / 2,
    midZ - leftOffsetZ
  );
  leftFrame.rotation.y = -angle;
  leftFrame.material = frameMaterial;
  meshes.push(leftFrame);

  // Right frame
  const rightFrame = MeshBuilder.CreateBox(
    `windowRightFrame_${index}`,
    { width: FRAME_THICKNESS, height: WINDOW_HEIGHT, depth: FRAME_DEPTH },
    scene
  );
  rightFrame.position.set(
    midX + leftOffsetX,
    WINDOW_SILL_HEIGHT + WINDOW_HEIGHT / 2,
    midZ + leftOffsetZ
  );
  rightFrame.rotation.y = -angle;
  rightFrame.material = frameMaterial;
  meshes.push(rightFrame);

  // Glass pane
  const glass = MeshBuilder.CreatePlane(
    `windowGlass_${index}`,
    { width: length - FRAME_THICKNESS * 2, height: WINDOW_HEIGHT - FRAME_THICKNESS * 2 },
    scene
  );
  glass.position.set(midX, WINDOW_SILL_HEIGHT + WINDOW_HEIGHT / 2, midZ);
  glass.rotation.y = -angle + Math.PI / 2;
  glass.material = glassMaterial;
  meshes.push(glass);

  // Add shadow casters
  if (shadowGenerator) {
    meshes.forEach((mesh) => {
      shadowGenerator.addShadowCaster(mesh);
      mesh.receiveShadows = true;
    });
  }

  return meshes;
}

function buildDoor(
  scene: Scene,
  element: Element,
  index: number,
  shadowGenerator?: ShadowGenerator
): Mesh[] {
  const meshes: Mesh[] = [];
  const { start, end } = element;

  // Calculate dimensions
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) * SCALE;
  const angle = Math.atan2(dy, dx);
  const midX = ((start.x + end.x) / 2) * SCALE;
  const midZ = ((start.y + end.y) / 2) * SCALE;

  // Wood frame material
  const frameMaterial = new PBRMaterial(`doorFrameMat_${index}`, scene);
  frameMaterial.albedoColor = Color3.FromHexString('#8B4513'); // Saddle brown
  frameMaterial.roughness = 0.7;
  frameMaterial.metallic = 0;

  // Door panel material
  const panelMaterial = new PBRMaterial(`doorPanelMat_${index}`, scene);
  panelMaterial.albedoColor = Color3.FromHexString('#A0522D'); // Sienna
  panelMaterial.roughness = 0.6;
  panelMaterial.metallic = 0;

  // Top frame
  const topFrame = MeshBuilder.CreateBox(
    `doorTopFrame_${index}`,
    { width: length, height: FRAME_THICKNESS, depth: FRAME_DEPTH },
    scene
  );
  topFrame.position.set(midX, DOOR_HEIGHT, midZ);
  topFrame.rotation.y = -angle;
  topFrame.material = frameMaterial;
  meshes.push(topFrame);

  // Left frame
  const leftFrame = MeshBuilder.CreateBox(
    `doorLeftFrame_${index}`,
    { width: FRAME_THICKNESS, height: DOOR_HEIGHT, depth: FRAME_DEPTH },
    scene
  );
  const leftOffsetX = Math.cos(angle) * (length / 2 - FRAME_THICKNESS / 2);
  const leftOffsetZ = Math.sin(angle) * (length / 2 - FRAME_THICKNESS / 2);
  leftFrame.position.set(midX - leftOffsetX, DOOR_HEIGHT / 2, midZ - leftOffsetZ);
  leftFrame.rotation.y = -angle;
  leftFrame.material = frameMaterial;
  meshes.push(leftFrame);

  // Right frame
  const rightFrame = MeshBuilder.CreateBox(
    `doorRightFrame_${index}`,
    { width: FRAME_THICKNESS, height: DOOR_HEIGHT, depth: FRAME_DEPTH },
    scene
  );
  rightFrame.position.set(midX + leftOffsetX, DOOR_HEIGHT / 2, midZ + leftOffsetZ);
  rightFrame.rotation.y = -angle;
  rightFrame.material = frameMaterial;
  meshes.push(rightFrame);

  // Door panel
  const panel = MeshBuilder.CreateBox(
    `doorPanel_${index}`,
    {
      width: length - FRAME_THICKNESS * 2,
      height: DOOR_HEIGHT - FRAME_THICKNESS,
      depth: FRAME_DEPTH * 0.5,
    },
    scene
  );
  panel.position.set(midX, (DOOR_HEIGHT - FRAME_THICKNESS) / 2, midZ);
  panel.rotation.y = -angle;
  panel.material = panelMaterial;
  meshes.push(panel);

  // Add shadow casters
  if (shadowGenerator) {
    meshes.forEach((mesh) => {
      shadowGenerator.addShadowCaster(mesh);
      mesh.receiveShadows = true;
    });
  }

  return meshes;
}

function buildOpening(
  scene: Scene,
  element: Element,
  index: number,
  shadowGenerator?: ShadowGenerator
): Mesh[] {
  const meshes: Mesh[] = [];
  const { start, end, height } = element;

  // Calculate dimensions
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) * SCALE;
  const angle = Math.atan2(dy, dx);
  const midX = ((start.x + end.x) / 2) * SCALE;
  const midZ = ((start.y + end.y) / 2) * SCALE;
  const openingHeight = (height || 300) * SCALE;

  // Trim material (light gray)
  const trimMaterial = new PBRMaterial(`openingTrimMat_${index}`, scene);
  trimMaterial.albedoColor = Color3.FromHexString('#d1d5db');
  trimMaterial.roughness = 0.5;
  trimMaterial.metallic = 0;

  // Top trim
  const topTrim = MeshBuilder.CreateBox(
    `openingTopTrim_${index}`,
    { width: length, height: FRAME_THICKNESS * 0.5, depth: FRAME_DEPTH * 0.5 },
    scene
  );
  topTrim.position.set(midX, openingHeight, midZ);
  topTrim.rotation.y = -angle;
  topTrim.material = trimMaterial;
  meshes.push(topTrim);

  // Left trim
  const leftTrim = MeshBuilder.CreateBox(
    `openingLeftTrim_${index}`,
    { width: FRAME_THICKNESS * 0.5, height: openingHeight, depth: FRAME_DEPTH * 0.5 },
    scene
  );
  const offsetX = Math.cos(angle) * (length / 2);
  const offsetZ = Math.sin(angle) * (length / 2);
  leftTrim.position.set(midX - offsetX, openingHeight / 2, midZ - offsetZ);
  leftTrim.rotation.y = -angle;
  leftTrim.material = trimMaterial;
  meshes.push(leftTrim);

  // Right trim
  const rightTrim = MeshBuilder.CreateBox(
    `openingRightTrim_${index}`,
    { width: FRAME_THICKNESS * 0.5, height: openingHeight, depth: FRAME_DEPTH * 0.5 },
    scene
  );
  rightTrim.position.set(midX + offsetX, openingHeight / 2, midZ + offsetZ);
  rightTrim.rotation.y = -angle;
  rightTrim.material = trimMaterial;
  meshes.push(rightTrim);

  // Add shadow casters
  if (shadowGenerator) {
    meshes.forEach((mesh) => {
      shadowGenerator.addShadowCaster(mesh);
      mesh.receiveShadows = true;
    });
  }

  return meshes;
}
