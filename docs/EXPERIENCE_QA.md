# Experience QA and integration handoff

Scope: Dũng's independent experience subphases 1–5. Layout, sample Canvas,
state controls, feedback and optional audio are implemented. Automated checks are
available; real-browser/device checks below remain pending. The team's broader
camera/game/API integration and performance phase is not complete.

## Run locally

```powershell
npm.cmd run dev
```

Open http://localhost:3000/playground. No API, Docker, camera or model is required.
Production builds keep this development route unavailable.

## Preview procedure

1. Check the initial Y-Pose drawing and four answer cards. The initial sample is
   not a detected action. Try keys 1–8, mirroring, upper body and window resize.
2. Choose a mapped pose (keys 1–4 with current fixtures), then drag **Preview hold
   progress**. At 100% the ring stays unconfirmed until a state is explicitly chosen.
3. Select `confirmed`, `submitting`, `submitted` and `error` in **Preview game
   state**. Check labels and status messages, not just colors. Receipt is not scoring.
4. Change pose, lose tracking, change camera state and load another question.
   Progress/candidate/confirmation must reset. Unmapped poses must not select an answer.
5. Try all **Camera preview** and **Tracking preview** choices. Only sample mode
   draws the skeleton. No option opens a real camera or requests permissions.
6. Enable **Sound feedback**, click **Test sound**, then repeat state transitions.
   Expect a short cue for confirmation, receipt and error; repeated rendering and
   enabling while already confirmed must not replay a cue. Mute stops active tones.
7. Reset the preview and change questions. Actual game state must remain READY,
   actual game progress zero, with no confirmation or gateway request.

## Automated coverage

Run `npm.cmd run check` for format, architecture lint, strict types, Vitest and
production build. Tests verify:

- Arbitrary option IDs, mapped/unmapped poses and controlled presentation updates.
- A full manual ring never confirms/submits, and snapshots never call the gateway.
- Reset behavior and keyboard shortcuts ignored in editable controls.
- Geometry with contain/cover, mirror, resize and clipping outside the source frame.
- Empty, partial, non-finite and hidden landmarks; lost/unavailable tracking.
- Canvas device-pixel sizing, redraw coalescing and StrictMode resource cleanup.
- Lazy audio opt-in, scheduled tones, mute/disconnect/close and unsupported audio.
- One cue per transition, no replay on question change, late/overlapping enable
  requests, failure recovery and StrictMode adapter disposal.

Canvas/audio tests use recording contexts and audio doubles. They verify commands
and resource ownership, not browser rasterization, physical playback or FPS.

## Pending browser/device checks

| Check                                              | Expected result                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| 320px, 375px, 768px and 1280px viewport widths     | No horizontal overflow; labels and controls remain readable                      |
| 200% zoom and long question/answer/error text      | Content wraps; controls remain reachable                                         |
| Keyboard Tab/Shift+Tab, Space, arrows              | Visible focus, usable checkboxes/selects/range, no unintended pose shortcuts     |
| NVDA or another screen reader                      | Named controls, one useful status announcement per transition, readable progress |
| Reduced motion and forced colors                   | Confirmation remains clear without animation or color alone                      |
| Desktop/mobile audio                               | Off initially; enable works from the button; mute and navigation stop tones      |
| Browser without usable Web Audio                   | A clear message appears and all visual controls still work                       |
| Repeated mount/unmount and display-density changes | No stale drawing, audio, observers or listeners                                  |

No real-browser screenshots, device QA results or measured rendering FPS are
claimed by this checklist. Contrast and semantic support do not certify overall
accessibility without the manual checks.

## Connect to Anh Huy and Anh Bình

With Anh Huy, agree indexed landmark ordering, source video size, contain/cover,
display mirroring and ownership of camera startup/shutdown. Keep anatomical
left/right unchanged in data. Preserve missing joint positions; avoid compacting
arrays. Replace sample data with real input, then verify skeleton/video alignment.

With Anh Bình, feed candidate/confirmed option IDs, normalized progress, errors and
status from actual game state/events. Map the confirmation event to visual/audio
feedback once. Continuous 1500 ms timing, lost-tracking reset rules, randomization,
submission and duplicate prevention stay in the game application. The simulator
must not be used as a production game state machine.

Remove/disable development snapshot controls in production flow. Verify stale
question handling, real camera failures and real gateway failures during integration.
Measure inference and rendering separately on documented hardware before setting
performance acceptance claims.

## Game session mock integration

The playground now offers two modes. **UI preview** preserves the manual experience
simulator above. **Play game (mock)** runs the game application with randomized
four-action mapping, continuous 1500 ms holds and an in-memory QuizGateway.

In game mode, hold a mapped number key 1–8, or hold an action button with pointer,
Space or Enter. Releasing, losing window focus or hiding the document stops the
simulated pose. A mapped pose confirms and submits once. Unmapped poses never
select an option. Next/restart begins a new attempt with a new mapping.

To exercise frame silence, hold a mapped number key and click **Pause frame
stream** while holding it. The session resets its candidate/progress after more
than 250 ms without a frame. The external 50 ms scheduler invokes checkTimeout;
no browser timer is owned by the application layer. The 250 ms gap and 0.7
confidence threshold are provisional mock settings, to be agreed with Huy.

Session subscriptions drive the shared GameplayScreen and submission feedback.
Switching modes or unmounting removes the scheduler and input listeners and
invalidates pending session work. Submission success means receipt only, not a
correct answer. Real webcam inference, HTTP persistence and retry remain pending.

Automated coverage includes timeout boundaries, delayed frames, in-flight
submission protection, mapping stability, keyboard hold/release, visible mock
receipt and interval cleanup. Manual browser verification confirmed a mapped
Salute hold filled progress and displayed SUBMITTED/Answer sent.
