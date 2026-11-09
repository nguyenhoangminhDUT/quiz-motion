# MediaPipe pose infrastructure

The browser adapter uses `@mediapipe/tasks-vision@1.2.2` with same-origin runtime
assets under `/mediapipe/`. It must not fetch a model or Wasm loader from a CDN at
runtime.

`mediapipe-assets.ts` is the source of truth for runtime paths, initial Pose
Landmarker configuration, file sizes and SHA-256 checksums. `ASSETS.md` records the
upstream sources and licenses.

The detector adapter is implemented in Part 8. The complete browser `PoseEngine`
lifecycle is implemented in Part 9.
