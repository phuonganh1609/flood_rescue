# Timeline Phase 1 Manual Test Matrix

## Preconditions

- At least 1 `Request` in `VERIFIED` status.
- At least 1 `Mission` in `PLANNED` status.
- At least 1 `Team` with leader account (`Rescue Team` role).
- Valid JWTs for `Rescue Coordinator`, `Rescue Team`, and `Admin`.

## Cases

1. Happy path full completion
- `PATCH /api/missions/{id}/assign`
- `PATCH /api/timelines/{id}/accept`
- `PATCH /api/timelines/{id}/arrive`
- `PATCH /api/timelines/{id}/complete` with `{ "outcome": "COMPLETED", "rescuedCount": <peopleCount> }`
- Verify:
  - Timeline -> `COMPLETED`
  - Request -> `FULFILLED`
  - Mission -> `COMPLETED` (if all related requests fulfilled/closed)
  - Team -> `AVAILABLE` (if no other active timeline)

2. Partial completion
- Complete with `{ "outcome": "PARTIAL", "rescuedCount": 1 }`
- Verify:
  - Timeline -> `PARTIAL`
  - Request -> `PARTIALLY_FULFILLED`
  - Mission -> `PARTIAL`

3. Failure flow
- `accept` -> `arrive` -> `fail` with `{ "failureReason": "blocked road" }`
- Verify:
  - Timeline -> `FAILED`
  - Request -> `PARTIALLY_FULFILLED`
  - Mission -> `PARTIAL`
  - Notification event `MISSION_FAILED` emitted

4. Withdraw before accept
- `assign` -> `withdraw`
- Verify:
  - Timeline -> `WITHDRAWN`
  - Request -> `VERIFIED`
  - Can assign a new timeline for same request

5. Cancel assigned timeline (Coordinator)
- `assign` -> `PATCH /api/timelines/{id}/cancel`
- Verify:
  - Timeline -> `CANCELLED`
  - Request -> `VERIFIED` if no execution yet, else derived status by history

6. Invalid transitions
- Try `ASSIGNED -> complete`
- Try `ON_SITE -> accept`
- Try terminal -> any action
- Verify all return `400` or `409` with clear message

7. Authorization boundaries
- Team A token update timeline of Team B
- Verify `403`
- Coordinator can cancel assigned timeline
- Team cannot call `/cancel`

8. Concurrency
- Send 2 simultaneous `accept` on same timeline
- Verify one success, one `409`

9. Mission guard
- Set mission `ABORTED`/`COMPLETED`, then call `assign`
- Verify `400`

10. Notification smoke
- Verify events observed by recipient roles:
  - `MISSION_ASSIGNED`
  - `MISSION_ACCEPTED`
  - `MISSION_APPROACHING`
  - `MISSION_COMPLETED`
  - `MISSION_FAILED`
