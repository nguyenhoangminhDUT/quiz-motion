# Module contracts — v0.1.0

Source of truth: packages/contracts/src/. Contracts are framework/browser independent;
Zod is the only runtime dependency. Treat this package as the team's internal API.

## Actions

ACTION_IDS is a readonly tuple ACT_01 through ACT_08. ActionId is its inferred union.
ACTION_DEFINITIONS ties each record key to the exact definition.id at compile time.
Each definition has id, name, description, instruction and iconKey.
Stable IDs are communication keys; display names and icons are not identifiers.

The pool is Y-Pose, Lean Left, Lean Right, Heart Head, Cross Arms, Salute, Dab, Thinking,
in ID order. Metadata is not an implemented geometry classifier.

## PoseFrameResult

Provided by pose/Huy; consumed through composition by experience and future game use cases.
timestampMs is monotonic milliseconds from the shared session clock, never Date.now().
detectedAction is ActionId or null. confidence is a [0,1] match strength, not a calibrated
statistical probability. Mock confidence=1 means manually supplied input only.

Tracking frames contain exactly 33 readonly landmarks in MediaPipe index order.
x/y use normalized image coordinates, origin at top left, x right, y down, unmirrored.
Out-of-frame points can exceed [0,1]. z is relative depth on the adapter's image scale
and can be negative. Optional visibility/presence are [0,1].

trackingStatus is tracking, lost or unavailable. Tracking may still have null action.
Occluded joints remain at their index and use visibility/presence. Lost/unavailable
require null action, confidence=0 and no landmarks.
poseFrameSchema validates finite values and tracking consistency.
The mock has no skeleton data, even for its simulated tracking state.

## Questions and action configuration

QuizQuestion has id, content and exactly four unique QuizOption {id,text}.
Option IDs are arbitrary nonblank backend strings, including unusual object keys.
They are independent of indices, A/B/C/D and ActionId. Correct answers are not exposed.

QuestionActionConfig contains questionId and a JSON-serializable
Readonly<Record<optionId, ActionId>>. Its keys must match the question's exact option
set and values must be four distinct actions. questionBundleSchema checks the relationship.
The option record validator preserves own keys such as **proto** instead of assigning
them through a prototype setter. Production DTO boundaries must validate unknown input.

Mapping stays stable throughout one question attempt. UI preview caches its fixed
first-four-action fixture mapping. Play game (mock) uses the injected-RNG randomizer;
restart or revisiting a question starts a new attempt and randomizes again.

SubmitAnswerRequest contains questionId, selectedOptionId and optional attemptId.
SubmissionResult contains those IDs and submissionId, plus optional
`evaluation: { isCorrect: boolean; correctOptionId: string }`. MockQuizGateway grades
its 10 practice questions and reveals evaluation only on submission; loaded
QuizQuestion objects contain no answer key. Game Session validates the evaluation
against the current option IDs and submitted selection. Older receipt-only gateways
can omit evaluation and remain supported. There is no HTTP persistence.

## GameState

Fields: status, question, actionConfig, candidateOptionId, confirmedOptionId,
holdProgress, error and evaluation. Evaluation is null until a graded submission
succeeds and resets on every question/attempt change. Progress uses [0,1]. Status vocabulary:
IDLE, READY, DETECTING, HOLDING, SUBMITTING, SUBMITTED, ERROR.

UI preview's fixture store uses IDLE/READY. The game session implements all statuses
with mock frame input and an in-memory QuizGateway.
Detection is input; candidate selection interprets it; confirmation requires a valid
continuous hold; submission is separate I/O and can fail. These must not be conflated.

## Typed events

Every GameEvent has type, timestampMs and payload as a discriminated union.
Only QUESTION_LOADED, QUESTION_CHANGED and POSE_UPDATED are produced in Phase 0.
The remaining events define integration boundaries for future phases.
The game session currently publishes GameState snapshots through subscribe(), not
the complete typed event set below. Composition derives confirmation audio from
confirmedOptionId changes, including when React batches intermediate statuses.

| Type                  | Payload                                 | Future producer → consumer    |
| --------------------- | --------------------------------------- | ----------------------------- |
| QUESTION_LOADED       | question, config                        | game application → UI         |
| POSE_UPDATED          | frame                                   | pose → orchestration/UI       |
| ACTION_DETECTED       | questionId, actionId, confidence        | detection → candidate logic   |
| HOLD_PROGRESS_UPDATED | questionId, optionId, progress          | hold use case → UI            |
| ANSWER_CONFIRMED      | questionId, selectedOptionId            | hold use case → submission    |
| SUBMISSION_SUCCEEDED  | result                                  | submission → game/UI          |
| SUBMISSION_FAILED     | questionId, selectedOptionId, message   | submission → game/UI          |
| QUESTION_CHANGED      | previousQuestionId nullable, questionId | lifecycle → reset consumers   |
| SESSION_RESET         | reason: manual/completed/error          | lifecycle → session consumers |

Progress is normalized. Question-scoped events identify their question. Pose events
are source-level; future async orchestration must attach/check session generations.
No external event transport exists yet; TypeScript types alone are insufficient when
one is introduced, so add runtime validation at that boundary.

## PoseEngine port

Located in pose/application/ports. provider and status are readonly observations.
status: new/ready/running/stopped/disposed.
initialize(): Promise<void>; start(): void; stop(): void;
subscribe(listener): unsubscribe; dispose(): void.

Initialize before start. Stop preserves subscriptions for restart; dispose is terminal,
idempotent and clears listeners. The mock rejects emissions unless running and rejects
use after disposal. It receives its clock through the constructor. No webcam access occurs.

## QuizGateway port

Located in game/application/ports:
loadQuestions(): Promise<readonly QuizQuestion[]>;
submitAnswer(SubmitAnswerRequest): Promise<SubmissionResult>.

The mock returns fresh validated fixtures and rejects unknown questions/options.
Selected option IDs, never action IDs, go through submission. There is no assumed HTTP URL.
The load use case validates question count and unique question IDs independently of adapters.

The camera composition starts a 3000 ms result countdown only after SUBMITTED with
evaluation. Its scheduler advances the question once the deadline is reached;
pose frames do not extend that deadline. Manual question changes and disposal cancel it.

## Versioning and review

Package version 0.1.0 is private. Optional additions are generally compatible.
Removing/renaming fields, changing semantics/units/IDs or adding required fields is breaking.
Do not reassign published ActionIds to new meanings.
All contract PRs need Huy, Dũng and Bình to review payload examples, producer/consumer
changes, migration and tests. Update all consumers and docs in one PR.
During 0.x, increase minor for breaking changes and patch for compatible fixes;
after 1.0 use major for breaking changes.
