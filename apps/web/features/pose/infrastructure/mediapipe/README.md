# MediaPipe adapter ? TODO (Phase 1)

Implement the public PoseEngine port with @mediapipe/tasks-vision.
No model, SDK dependency, camera capture or classifier is installed in Phase 0.
A mediapipe provider selection currently fails explicitly in configuration.

Acquire browser resources only during initialize/start on the client. Release tracks,
RAF callbacks, subscriptions and model resources on stop/dispose. Adapt SDK landmarks
to normalized image coordinates; z is relative depth, not a [0,1] probability.
Do not assume 33 visible landmarks. Report lost/unavailable tracking explicitly.
Use the injected session monotonic clock; measure inference and render separately.
Mirror the viewport only; define left/right as the player's anatomical side.
Keep high-frequency landmarks outside broad React state subscriptions.
