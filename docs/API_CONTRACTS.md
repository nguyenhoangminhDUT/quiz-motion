# HTTP API contracts

Phase 0 exposes only operational endpoints; no question/session/answer/scoring API exists.

| Endpoint           | Success                                         | Failure                                             |
| ------------------ | ----------------------------------------------- | --------------------------------------------------- |
| GET /api/v1/health | 200 {"status":"ok","service":"Action Quiz API"} | Process must be reachable                           |
| GET /api/v1/ready  | 200 {"status":"ready","database":"up"}          | 503 {"status":"not_ready","database":"unavailable"} |
| GET /docs          | Swagger UI                                      | —                                                   |
| GET /openapi.json  | OpenAPI 3.1 document                            | —                                                   |

Liveness never connects to PostgreSQL. Readiness runs SELECT 1 with a bounded timeout.
Readiness currently checks connectivity, not business schema/migration compatibility.
Client responses never contain connection strings, passwords or driver tracebacks.

Pydantic response models live in apps/api/app/presentation/schemas. TypeScript/Zod
runtime validation lives in the frontend infrastructure health adapter. Python does
not import packages/contracts or duplicate browser-specific PoseFrameResult types.
This tiny health schema is local to the adapter; future business API types should
be generated from FastAPI OpenAPI rather than maintained by hand in two languages.

## Future synchronization workflow

1. Agree the HTTP DTO and compatibility behavior with frontend/backend owners.
2. Change Pydantic schemas and export /openapi.json.
3. Introduce a pinned OpenAPI-to-TypeScript generation tool and generated package when
   real business endpoints exist; add drift detection to CI at that point.
4. Continue validating unknown network responses at runtime with Zod.
5. Review breaking changes, migrate consumers and version the API explicitly.

Browser CV is separate: ActionId identifies a pose; optionId identifies an answer.
The browser maps action to the current question's actual option ID.
Future submission sends selectedOptionId, questionId and any agreed attempt/session ID.
The API must never assume ActionId is a quiz answer. Correct answers stay server-side.

## Frontend connection

Set NEXT_PUBLIC_API_URL=http://localhost:8000 in apps/web/.env.local and restart Next.
The development-only playground mounts ApiHealthIndicator. It calls
shared/infrastructure/api-health-client.ts, validates status/service, bounds requests
to three seconds and cancels on unmount. Missing config makes no request; network,
HTTP or schema failures show an unavailable message while mock controls still work.

The indicator checks liveness only. No API URL is required for npm tests/builds.
Public URLs are build-time values; no server credential belongs in NEXT_PUBLIC_*.
CORS permits explicit configured origins and GET only, without credentials or wildcard
origin allowances. CORS is not authentication; authentication remains outside Phase 0.
