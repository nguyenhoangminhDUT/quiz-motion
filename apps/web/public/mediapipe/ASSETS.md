# Local MediaPipe assets

These files are served by the application from the same origin. Runtime code must not
replace these paths with CDN URLs.

## MediaPipe Tasks Vision Wasm

- Package: `@mediapipe/tasks-vision@1.2.2`
- Package source:
  `https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-1.2.2.tgz`
- Project: `https://github.com/google-ai-edge/mediapipe`
- License: Apache License 2.0

| File                               | Bytes      | SHA-256                                                            |
| ---------------------------------- | ---------- | ------------------------------------------------------------------ |
| `vision_wasm_internal.js`          | 334,128    | `f2b9c17131ea79716ec6bf07b117a087b2749a6f8a1e2f1f2e77a9382092db5b` |
| `vision_wasm_internal.wasm`        | 14,603,354 | `f5bd25147ac89d506074293ce2675969b10e827180db95a0d9689c2ed80764ab` |
| `vision_wasm_module_internal.js`   | 334,166    | `72fba0ac8a4034ce9d63f68389df1dead52069409ea621688eedf97f01d4362f` |
| `vision_wasm_module_internal.wasm` | 14,603,372 | `b8927a2eebfe80dd98a426a210a9e820c8215168c06f3bcf5d4d09080f623db5` |

## Pose Landmarker Lite model

- Model: Pose Landmarker Lite, float16, version 1
- Source:
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`
- MediaPipe model documentation:
  `https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker`
- License: Apache License 2.0

| File                        | Bytes     | SHA-256                                                            |
| --------------------------- | --------- | ------------------------------------------------------------------ |
| `pose_landmarker_lite.task` | 5,777,746 | `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a` |

Checksums are verified by `mediapipe-assets.test.ts`.
