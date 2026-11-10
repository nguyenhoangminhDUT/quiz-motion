# Visual experience

Owner: Dũng. This feature presents the player experience; pose inference and game
decisions are supplied by the other features through composition.

## Subphase 1: gameplay layout

The `/play` route now supplies real camera video, MediaPipe landmarks and Game
Session feedback through `composition/camera-game-client.tsx`. It uses mock quiz
data and in-memory submissions, runs with `npm run dev`, and does not depend on
`/pose-debug`. The playground described below remains a separate simulation.
`GameplayScreen` accepts `mode="camera"` and a `cameraLabel` to display live-game
copy without changing the preview defaults.

Camera mode now uses a compact 2×2 answer grid, a viewport-height-aware camera,
and a smaller mobile camera beside the hold progress. Optional `evaluation` and
`nextQuestionInSeconds` props show correctness, the correct answer, and a result
countdown. Correct answers have a green border and label; an incorrect selection
has a red border and label. The camera runtime advances after 3 seconds; the
presentation owns no countdown timer or grading logic.

Implemented: responsive camera placeholder, question and four answer cards,
action-specific illustrations and instructions, question counter, and the existing
progress display. Player presentation appears before the simulation controls and
event inspector. Answer cards display pose mappings; they do not submit answers.

From the repository root:

```powershell
npm.cmd run dev
```

Open http://localhost:3000/playground. Try keys 1–8 or the simulation buttons, then
load the next mock question. Tracking loss clears the simulated pose highlight.
This development-only route requires no camera, Python, Docker or API server.

## Subphase 2: Canvas skeleton with sample landmarks

Implemented: Canvas joints/connections, eight hand-authored pose samples, display
mirroring, an upper-body-only fixture, tracking-loss clearing and responsive sizing.
The initial Y-Pose is a drawing example, not a detected action. Keys 1–8 update both
the mock inspector and the drawing sample; the mock engine itself still emits no
landmarks. Loading another question restores the initial drawing example.

Try **Mirror preview**, **Upper body only**, and **Simulate tracking loss**. Choose
another pose to restore the drawing. Resize the browser to check the sample frame;
the 640×480 source area uses centered `contain` sizing on every viewport.

`SkeletonOverlay` accepts normalized landmarks and a tracking status. Its optional
props are `mirrored`, `sourceWidth`, `sourceHeight`, `fit` (`contain` or `cover`),
`minVisibility` (default `0.5`) and an accessible `label`. Match source dimensions,
fit and mirroring to the actual video when integrating; defaults are 640×480,
`contain`, unmirrored. `z` is not used for 2D projection.

The renderer uses the [MediaPipe landmark index convention](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker).
It tolerates empty and truncated arrays. Do not compact internal missing joints:
retain their index and mark visibility/presence below the display threshold. This
indexing assumption must be agreed with Anh Huy before connecting a real adapter;
the shared contract has not been changed. Invalid coordinates and joints with low
visibility/presence are skipped along with their incident connections. Out-of-frame coordinates
are clipped rather than moved to the viewport boundary.

Drawing uses refs and coalesced `requestAnimationFrame` callbacks, scheduled only
when input, element size or display density changes. `ResizeObserver` and density
listeners keep the Canvas backing resolution aligned with CSS size and device
pixels. Unmount disconnects observers/listeners and cancels pending drawing.

## Presentation inputs

Import `GameplayScreen` and `GameplayScreenProps` from the feature's `index.ts`.

| Prop                                                            | Meaning                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `question`                                                      | Current `QuizQuestion`; validated upstream                                    |
| `actionConfig`                                                  | Matching `QuestionActionConfig`; option IDs map to action IDs                 |
| `questionNumber`, `questionCount`                               | Display position in the question set                                          |
| `holdProgress`                                                  | External normalized progress, `0` to `1`                                      |
| `detectedAction`                                                | Optional simulated action highlight; does not confirm an answer               |
| `cameraOverlay`                                                 | Optional overlay slot for the camera viewport                                 |
| `cameraPreview`                                                 | Optional complete viewport and local controls; overrides the default viewport |
| `feedback`                                                      | Status, candidate/confirmed option IDs and an optional error message          |
| `soundEnabled`, `soundPending`, `soundMessage`, `onToggleSound` | Optional audio controls supplied by composition                               |
| `onNextQuestion`                                                | Composition callback for switching mock questions                             |

The screen has no store subscription, timer, HTTP request or camera acquisition.
Action illustrations are static SVG guides, not model output or classifier rules.
CSS Modules scope the gameplay layout; it uses the app's existing color tokens.
On wide screens the camera and question sit side by side. At 900px and below the
layout stacks; answer cards use two columns where space permits and one on phones.

## Subphase 3: independent state simulation

The **Experience simulation** fieldset controls camera and tracking states,
presentation status and a manual 0–100% progress slider. Choose one of the four
mapped poses first to enable answer-related states. The other four poses can be
drawn but do not select an option for the current fixture question.

Try camera `loading`, `denied`, `unavailable` and `error`, or tracking `lost` and
`unavailable`. Selecting a pose restores sample mode. Progress and confirmation
reset on pose, tracking, camera or question changes; **Reset experience preview**
also clears the inspector. Mirror/upper-body display preferences remain local.

The simulator lives in composition and never writes to the game store or gateway.
The inspector shows actual game state separately from preview state. A full ring
remains `holding`: explicitly choose `confirmed`, `submitting`, `submitted` or
`error` to inspect those snapshots. There is no timer or automatic submission.

## Subphase 4: visual and audio feedback

The progress ring and native progress element receive external progress. Answer
cards show candidate/confirmed labels and confirmation styling; a status panel
explains detection, holding, confirmation, sending, receipt and errors. Confirmation
and receipt are not correctness or scoring results.

**Sound feedback** defaults off. Clicking it lazily creates/resumes Web Audio;
**Test sound** plays a short cue after enable. Confirmation, receipt and error
transitions each play one cue. Ordinary renders, changing questions, or enabling
sound on an existing terminal state do not replay it. Muting, resetting or changing
the question stops pending tones. Audio failures leave visual feedback available.
Unmount stops/disconnects voices, closes the context and ignores late enable results.

The pure `FeedbackAudio` port is in application; the browser implementation is in
infrastructure. Composition owns its lifecycle. Browser audio is never initialized
during rendering and has no microphone or network dependency.

## Subphase 5: verification and integration handoff

Implemented: labeled native controls, keyboard-operable inputs, unique question
heading IDs, status/alert announcements, text alternatives to color/audio,
reduced-motion styles, forced-color support and wrapping for long content. Progress
changes do not flood live regions; the debug inspector is not a live region.

Automated checks cover manual snapshots, resets, disabled controls, no game-store
writes/submission, geometry, Canvas cleanup, audio opt-in, one cue per transition,
mute/dispose, StrictMode and late/overlapping audio enable requests.
See [QA and integration checklist](../../../../docs/EXPERIENCE_QA.md) for the test
procedure and checks that still require a real browser/device. Automated jsdom tests
do not establish pixel layout, audibility, screen-reader behavior or measured FPS.

Agree video ownership and landmark indexing with Anh Huy before camera integration.
Use Anh Bình's game state for continuous 1500 ms hold, reset and confirmation.
The current mock runtime remains READY with zero hold progress. Real video
alignment, camera access, automatic confirmation and submission remain future work.

Run `npm.cmd run check` before handing off changes. Component tests cover arbitrary
option IDs, action mapping and props updates; existing playground tests cover mock
input, question changes and lifecycle cleanup. Geometry and recording-context tests
cover projection, missing/invalid joints, tracking loss, display density, resize,
coalescing and StrictMode cleanup. These tests do not rasterize pixels or establish
rendering performance. Real-browser visual verification and camera alignment are
still required before integrating a real pose adapter.
