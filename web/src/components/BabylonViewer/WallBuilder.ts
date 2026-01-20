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
const WALL_HEIGHT_DEFAULT = 30; // 300 * SCALE

export function buildWalls(
  scene: Scene,
  elements: Element[],
  shadowGenerator?: ShadowGenerator
): Mesh[] {
  const walls: Mesh[] = [];
  const wallElements = elements.filter((el) => el.element_type === 'wall');

  wallElements.forEach((element, index) => {
    const { start, end, thickness, height, paint } = element;

    // Calculate wall dimensions
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Calculate midpoint for positioning
    const midX = (start.x + end.x) / 2;
    const midZ = (start.y + end.y) / 2;

    // Calculate wall height (use element height or default)
    const wallHeight = (height || WALL_HEIGHT_DEFAULT * 10) * SCALE;

    // Create wall mesh
    const wall = MeshBuilder.CreateBox(
      `wall_${index}`,
      {
        width: length * SCALE,
        height: wallHeight,
        depth: thickness * SCALE,
      },
      scene
    );

    // Position wall at midpoint, centered vertically
    wall.position.x = midX * SCALE;
    wall.position.y = wallHeight / 2;
    wall.position.z = midZ * SCALE;

    // Rotate wall to match 2D angle
    wall.rotation.y = -angle;

    // Create PBR material for wall
    const wallMaterial = new PBRMaterial(`wallMat_${index}`, scene);

    // Set color from paint or use default
    const colorHex = paint?.hex || '#e2e8f0';
    wallMaterial.albedoColor = Color3.FromHexString(colorHex);

    // Matte paint finish
    wallMaterial.roughness = 0.85;
    wallMaterial.metallic = 0;

    wall.material = wallMaterial;

    // Enable shadow receiving
    wall.receiveShadows = true;

    // Add to shadow generator if available
    if (shadowGenerator) {
      shadowGenerator.addShadowCaster(wall);
    }

    walls.push(wall);
  });

  return walls;
}
