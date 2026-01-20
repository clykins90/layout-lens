import {
  Scene,
  Camera,
  DefaultRenderingPipeline,
  SSAO2RenderingPipeline,
  ImageProcessingConfiguration,
  Color4,
} from '@babylonjs/core';

export interface PostProcessingResult {
  defaultPipeline: DefaultRenderingPipeline;
  ssaoPipeline: SSAO2RenderingPipeline;
}

export function setupPostProcessing(
  scene: Scene,
  camera: Camera
): PostProcessingResult {
  // Default Rendering Pipeline with HDR
  const defaultPipeline = new DefaultRenderingPipeline(
    'defaultPipeline',
    true, // HDR enabled
    scene,
    [camera]
  );

  // Enable tone mapping (ACES Filmic)
  defaultPipeline.imageProcessing.toneMappingEnabled = true;
  defaultPipeline.imageProcessing.toneMappingType =
    ImageProcessingConfiguration.TONEMAPPING_ACES;

  // Subtle bloom effect
  defaultPipeline.bloomEnabled = true;
  defaultPipeline.bloomThreshold = 0.9;
  defaultPipeline.bloomWeight = 0.2;
  defaultPipeline.bloomKernel = 64;
  defaultPipeline.bloomScale = 0.5;

  // FXAA antialiasing
  defaultPipeline.fxaaEnabled = true;

  // Slight vignette for cinematic look
  defaultPipeline.imageProcessing.vignetteEnabled = true;
  defaultPipeline.imageProcessing.vignetteWeight = 1.0;
  defaultPipeline.imageProcessing.vignetteStretch = 0;
  defaultPipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);

  // Contrast and exposure adjustments
  defaultPipeline.imageProcessing.contrast = 1.1;
  defaultPipeline.imageProcessing.exposure = 1.0;

  // SSAO2 for ambient occlusion in corners
  const ssaoPipeline = new SSAO2RenderingPipeline(
    'ssaoPipeline',
    scene,
    {
      ssaoRatio: 0.5, // Half resolution for performance
      blurRatio: 1,
    },
    [camera]
  );

  // Configure SSAO settings
  ssaoPipeline.radius = 2;
  ssaoPipeline.totalStrength = 1.0;
  ssaoPipeline.base = 0.5;
  ssaoPipeline.samples = 16;
  ssaoPipeline.maxZ = 100;
  ssaoPipeline.minZAspect = 0.5;

  return {
    defaultPipeline,
    ssaoPipeline,
  };
}

export function disposePostProcessing(result: PostProcessingResult): void {
  result.defaultPipeline.dispose();
  result.ssaoPipeline.dispose();
}
