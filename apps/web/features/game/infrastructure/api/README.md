# Quiz HTTP adapter ? TODO (Phase 4)

Implement QuizGateway when an API specification is agreed. No endpoint is assumed.
Validate unknown responses with shared Zod schemas, and adapt server DTOs here.
Send selectedOptionId (never ActionId); preserve arbitrary backend IDs.
Handle non-2xx responses, network failures, cancellation and idempotent attempt IDs.
Keep correct answers server-side. UI and Zustand stores must not perform HTTP.
