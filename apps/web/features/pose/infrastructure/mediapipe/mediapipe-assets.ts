export const MEDIAPIPE_ASSET_PATHS = {
  wasmRoot: '/mediapipe/wasm',
  poseLandmarkerModel: '/mediapipe/models/pose_landmarker_lite.task',
} as const;

export const POSE_LANDMARKER_OPTIONS = {
  runningMode: 'VIDEO',
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  outputSegmentationMasks: false,
} as const;

export const LOCAL_MEDIAPIPE_ASSETS = [
  {
    path: 'public/mediapipe/models/pose_landmarker_lite.task',
    bytes: 5_777_746,
    sha256: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a',
  },
  {
    path: 'public/mediapipe/wasm/vision_wasm_internal.js',
    bytes: 334_128,
    sha256: 'f2b9c17131ea79716ec6bf07b117a087b2749a6f8a1e2f1f2e77a9382092db5b',
  },
  {
    path: 'public/mediapipe/wasm/vision_wasm_internal.wasm',
    bytes: 14_603_354,
    sha256: 'f5bd25147ac89d506074293ce2675969b10e827180db95a0d9689c2ed80764ab',
  },
  {
    path: 'public/mediapipe/wasm/vision_wasm_module_internal.js',
    bytes: 334_166,
    sha256: '72fba0ac8a4034ce9d63f68389df1dead52069409ea621688eedf97f01d4362f',
  },
  {
    path: 'public/mediapipe/wasm/vision_wasm_module_internal.wasm',
    bytes: 14_603_372,
    sha256: 'b8927a2eebfe80dd98a426a210a9e820c8215168c06f3bcf5d4d09080f623db5',
  },
] as const;
