import {
  Scene,
  PBRMaterial,
  Color3,
  Mesh,
  Vector2,
  PolygonMeshBuilder,
} from '@babylonjs/core';
import earcut from 'earcut';
import type { Room } from '../../types';

export function buildFloors(scene: Scene, rooms: Room[], scale: number): Mesh[] {
  const floors: Mesh[] = [];

  rooms.forEach((room, index) => {
    // Skip rooms with less than 3 points (can't form a polygon)
    if (room.points.length < 3) {
      console.warn(`Room "${room.name}" has less than 3 points, skipping floor render`);
      return;
    }

    // Skip invalid rooms
    if (room.isValid === false) {
      return;
    }

    // Convert room points to Vector2 array for PolygonMeshBuilder
    const corners = room.points.map(
      (p) => new Vector2(p.x * scale, p.y * scale)
    );

    // Create polygon mesh for floor
    const polygonBuilder = new PolygonMeshBuilder(
      `floorPolygon_${index}`,
      corners,
      scene,
      earcut
    );
    const floor = polygonBuilder.build(false); // false = don't backface cull

    // Position floor slightly above 0 to prevent z-fighting
    floor.position.y = 0.05;

    // Rotate to horizontal plane (PolygonMeshBuilder creates in XZ by default in newer versions)
    // But for older versions, it might be in XY, so we rotate
    floor.rotation.x = -Math.PI / 2;

    // Create PBR material for floor
    const floorMaterial = new PBRMaterial(`floorMat_${index}`, scene);

    // Get color from flooring or paint
    const colorHex = room.flooring?.hex || room.paint?.hex || '#cbd5e1';
    floorMaterial.albedoColor = Color3.FromHexString(colorHex);

    // Semi-polished floor finish
    floorMaterial.roughness = 0.6;
    floorMaterial.metallic = 0;

    floor.material = floorMaterial;
    floor.receiveShadows = true;

    floors.push(floor);
  });

  return floors;
}
