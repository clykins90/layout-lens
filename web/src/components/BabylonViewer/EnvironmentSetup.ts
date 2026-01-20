import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  Vector3,
  Color3,
  Mesh,
} from '@babylonjs/core';

export interface EnvironmentResult {
  shadowGenerator: ShadowGenerator;
  hemisphericLight: HemisphericLight;
  directionalLight: DirectionalLight;
}

export function setupEnvironment(scene: Scene): EnvironmentResult {
  // Set scene clear color (sky color fallback)
  scene.clearColor = Color3.FromHexString('#87CEEB').toColor4(1);

  // Create default environment with skybox
  scene.createDefaultEnvironment({
    createSkybox: true,
    skyboxSize: 500,
    skyboxColor: Color3.FromHexString('#87CEEB'),
    createGround: false, // We create our own ground
    enableGroundMirror: false,
  });

  // Hemispheric light for soft ambient fill
  const hemisphericLight = new HemisphericLight(
    'hemisphericLight',
    new Vector3(0, 1, 0),
    scene
  );
  hemisphericLight.intensity = 0.5;
  hemisphericLight.groundColor = Color3.FromHexString('#3d3d3d');
  hemisphericLight.diffuse = Color3.FromHexString('#ffffff');
  hemisphericLight.specular = Color3.FromHexString('#ffffff');

  // Directional light for sun simulation
  const directionalLight = new DirectionalLight(
    'directionalLight',
    new Vector3(-1, -2, -1),
    scene
  );
  directionalLight.position = new Vector3(100, 200, 100);
  directionalLight.intensity = 1.2;
  directionalLight.diffuse = Color3.FromHexString('#fffaf0'); // Warm white
  directionalLight.specular = Color3.FromHexString('#ffffff');

  // Create shadow generator with blur exponential shadow map
  const shadowGenerator = new ShadowGenerator(2048, directionalLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;
  shadowGenerator.bias = 0.001;
  shadowGenerator.normalBias = 0.02;
  shadowGenerator.darkness = 0.3; // Soft shadows

  // Enable shadow filtering
  shadowGenerator.filter = ShadowGenerator.FILTER_BLUREXPONENTIALSHADOWMAP;

  return {
    shadowGenerator,
    hemisphericLight,
    directionalLight,
  };
}

export function registerShadowCasters(
  shadowGenerator: ShadowGenerator,
  meshes: Mesh[]
): void {
  meshes.forEach((mesh) => {
    shadowGenerator.addShadowCaster(mesh);
    mesh.receiveShadows = true;
  });
}

export function registerShadowReceivers(meshes: Mesh[]): void {
  meshes.forEach((mesh) => {
    mesh.receiveShadows = true;
  });
}
