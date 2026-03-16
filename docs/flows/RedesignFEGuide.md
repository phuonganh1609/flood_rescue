# FE Redesign Guide: Backend Mission Flow 2.x

## 1) Purpose

This guide explains what Frontend must change after the backend redesign, with focus on:

- Mission planning-first flow
- MissionRequest as the fulfillment unit
- Timeline execution flow for Rescue Team
- Updated validation and error contract
- Related modules: Auth, Request, Notifications

Use this as the migration checklist for FE pages, API service layer, and state management.

---

## 2) High-Level Redesign Summary (What changed)

### Before (legacy mental model)

- Mission assignment was more direct and less structured.
- Timeline and request fulfillment were loosely coupled.
- FE could treat mission as assigned quickly after creation in some flows.

### Now (new model)

- Mission starts in `DRAFT`.
- Coordinator must build plan in 2 steps:
	- Add requests to mission (`MissionRequest` records are created).
	- Add teams to mission (`Timeline` records are created as `PLANNED`).
- Only then mission can be started (`PATCH /api/missions/:id/start`):
	- Mission becomes `PLANNED`
	- Planned timelines become `ASSIGNED`
- Rescue Team executes timeline lifecycle:
	- `ASSIGNED -> EN_ROUTE -> ON_SITE -> COMPLETED/PARTIAL/FAILED/WITHDRAWN`
- Mission final status is synchronized from timeline + mission request outcomes:
	- `IN_PROGRESS`, `PARTIAL`, `COMPLETED`, etc. are backend-derived.

---

## 3) Canonical Statuses FE Must Use

### Mission status

- `DRAFT`
- `PLANNED`
- `IN_PROGRESS`
- `PAUSED`
- `PARTIAL`
- `COMPLETED`
- `ABORTED`

### Timeline status

- `PLANNED`
- `ASSIGNED`
- `EN_ROUTE`
- `ON_SITE`
- `COMPLETED`
- `PARTIAL`
- `FAILED`
- `WITHDRAWN`
- `CANCELLED`

### MissionRequest status

- `PENDING`
- `IN_PROGRESS`
- `PARTIAL`
- `FULFILLED`
- `CLOSED`
- `DROPPED`

### Request status (for citizen/coordinator views)

- `SUBMITTED`
- `VERIFIED`
- `REJECTED`
- `IN_PROGRESS`
- `PARTIALLY_FULFILLED`
- `FULFILLED`
- `CLOSED`
- `CANCELLED`

Important: request status is now strongly affected by mission/timeline progress through MissionRequest synchronization.

---

## 4) OLD -> NEW API Migration Map

This section lists the FE endpoint migrations that matter most for redesign.

### Missions

- Old: `PATCH /api/missions/:id/assign` (single-step assignment)
- New:
	- `POST /api/missions/:id/requests` (add requestIds to mission)
	- `DELETE /api/missions/:id/requests/:requestId` (remove one request link from draft mission)
	- `POST /api/missions/:id/teams` (add teamIds as planned timelines)
	- `DELETE /api/missions/:id/teams/:teamId` (remove one team link from draft mission)
	- `PATCH /api/missions/:id/start` (activate plan)

### Mission details for planning dashboard

- New read endpoint: `GET /api/missions/:id/requests`
	- Use this to render mission-level request fulfillment cards.

### MissionRequest manual operations

- New module endpoint group:
	- `GET /api/mission-requests/:id`
	- `PATCH /api/mission-requests/:id/close`
	- `PATCH /api/mission-requests/:id/drop`

### Timeline completion payload

- Old FE logic may have sent only summary counts.
- New required payload for `PATCH /api/timelines/:id/complete` must include `completions[]` with per-missionRequest rescued counts.

---

## 5) Feature-Flow First Integration

## Flow A: Create Mission -> Plan -> Start

### Step A1. Create mission

- Endpoint: `POST /api/missions`
- Role: Rescue Coordinator / Admin
- Request example:

```json
{
	"name": "Rescue Zone A",
	"description": "Flood rescue in ward A",
	"priority": "High",
	"type": "RESCUE"
}
```

- FE outcome:
	- Save returned mission id/code.
	- Show mission as `DRAFT`.
	- Enable planning actions only (add requests, add teams).

### Step A2. Add requests into mission

- Endpoint: `POST /api/missions/:id/requests`
- Request example:

```json
{
	"requestIds": [
		"66f0c1d8a7d4f4a0bce00001",
		"66f0c1d8a7d4f4a0bce00002"
	],
	"note": "Prioritize children and elderly"
}
```

- FE rules:
	- Only allow while mission is `DRAFT`.
	- De-duplicate selected request IDs on client before submit.
	- If server returns invalid request status error, refresh request list and ask user to re-select.

### Step A3. Add teams into mission

- Endpoint: `POST /api/missions/:id/teams`
- Request example:

```json
{
	"teamIds": [
		"66f0c1d8a7d4f4a0bce01001",
		"66f0c1d8a7d4f4a0bce01002"
	],
	"note": "Split by east/west sectors"
}
```

- FE rules:
	- Only allow while mission is `DRAFT`.
	- Timeline rows created here start at `PLANNED`.
	- Show count of planned timelines, this is start precondition.

### Step A3.1 Remove request/team from draft plan

- Remove request endpoint: `DELETE /api/missions/:id/requests/:requestId`
- Remove team endpoint: `DELETE /api/missions/:id/teams/:teamId`

- Backend rules:
	- Mission must still be `DRAFT`.
	- Request link can be removed only when mission-request status is `PENDING`.
	- Team link can be removed when timeline status is `PLANNED` or `ASSIGNED`.
	- If the request/team is not linked to that mission, API returns `404` with clear message.

- FE rules:
	- Show remove buttons in planning board only.
	- Optimistically remove row only after successful API response.
	- On `404`, hard refresh mission requests/timelines to resolve stale UI state.

### Step A4. Start mission

- Endpoint: `PATCH /api/missions/:id/start`
- Preconditions enforced by BE:
	- At least 1 mission request exists.
	- At least 1 planned timeline exists.
- FE behavior:
	- Disable Start button unless local checks pass, but still handle server-side failure.
	- On success:
		- Mission status becomes `PLANNED`
		- Timelines `PLANNED -> ASSIGNED`
	- Re-fetch mission and timeline list after success.

---

## Flow B: Team execution (Rescue Team app/dashboard)

### Step B1. Accept assigned timeline

- Endpoint: `PATCH /api/timelines/:id/accept`
- Allowed actor: Rescue Team belonging to the assigned team only
- Transition: `ASSIGNED -> EN_ROUTE`

### Step B2. Mark arrival

- Endpoint: `PATCH /api/timelines/:id/arrive`
- Transition: `EN_ROUTE -> ON_SITE`

### Step B3. Complete with per-request fulfillment

- Endpoint: `PATCH /api/timelines/:id/complete`
- Request example:

```json
{
	"outcome": "COMPLETED",
	"note": "Evacuation successful",
	"completions": [
		{
			"missionRequestId": "66f0c1d8a7d4f4a0bce02001",
			"rescuedCount": 3
		},
		{
			"missionRequestId": "66f0c1d8a7d4f4a0bce02002",
			"rescuedCount": 2
		}
	]
}
```

- FE must enforce before send:
	- `completions` is non-empty.
	- no duplicate `missionRequestId`.
	- `rescuedCount` is integer >= 0.
- Outcome values:
	- `COMPLETED`
	- `PARTIAL`

### Step B4. Failure / withdraw branches

- Fail: `PATCH /api/timelines/:id/fail` with `failureReason`
- Withdraw: `PATCH /api/timelines/:id/withdraw` with `withdrawalReason`
- Coordinator cancel: `PATCH /api/timelines/:id/cancel`

---

## Flow C: MissionRequest manual closure/drop

Use when coordinator wants to end a mission-request item without waiting for timeline completion logic.

- Close endpoint: `PATCH /api/mission-requests/:id/close`
- Drop endpoint: `PATCH /api/mission-requests/:id/drop`
- Payload:

```json
{
	"note": "No longer actionable"
}
```

FE notes:

- Treat `FULFILLED`, `CLOSED`, `DROPPED` as terminal states in UI.
- Disable close/drop actions for terminal records.
- After close/drop success, refresh:
	- mission details
	- request status display
	- mission progress widgets

---

## 6) Required FE State Mapping

### Coordinator Mission Board

- Mission card should display:
	- mission status
	- number of mission requests by status
	- number of timelines by status
- Action visibility recommendation:
	- `DRAFT`: allow edit/add-requests/add-teams/start/delete
	- `PLANNED`: allow pause/abort
	- `IN_PROGRESS`: allow pause/abort
	- `PAUSED`: allow resume/abort
	- `PARTIAL`: read-only + follow-up action prompts
	- `COMPLETED`/`ABORTED`: read-only

### Rescue Team Task Board

- Show only own timelines (BE filters by user team when role is Rescue Team).
- Timeline action buttons by status:
	- `ASSIGNED`: Accept, Withdraw
	- `EN_ROUTE`: Arrive
	- `ON_SITE`: Complete, Fail
	- terminal statuses: no action

### Citizen Request Tracking

- Expect request status changes triggered by mission progress, not only request module actions.
- Real-time + polling hybrid recommended:
	- listen socket events
	- re-fetch request detail on critical events

---

## 7) Auth Module Notes For FE

Auth endpoints remain stable but FE must keep cookie + token behavior correct.

- `POST /api/auth/login`
	- Response data includes `accessToken` + user
	- Refresh token is in HTTP-only cookie (`refreshToken`)
- `POST /api/auth/refresh`
	- Requires sending cookies (`credentials: include`)
- `POST /api/auth/logout`
	- Requires cookie to clear server-side session

FE checklist:

- For browser fetch/axios, enable credentials for auth requests needing cookie.
- Keep access token in memory or secure storage policy used by your app.
- On 401 with expired token, run refresh flow once, then retry failed call.

---

## 8) Request Module Notes For FE

Important request business rules to reflect in forms/buttons:

- Citizen can create only one active request at a time.
- Cancel is only for `SUBMITTED` requests.
- Priority update is only for `VERIFIED` and non-duplicate requests.
- Duplicate marking allowed only on `SUBMITTED`/`VERIFIED`.

Also remember: request status may be auto-synced by mission/timeline engine into:

- `IN_PROGRESS`
- `FULFILLED`
- and then coordinator may move to `CLOSED`.

---

## 9) Notifications and Realtime Notes For FE

### REST notification APIs

- `GET /api/notifications/me`
- `GET /api/notifications/:userId`
- `GET /api/notifications/detail/:notificationId`
- `PATCH /api/notifications/read/:notificationId`

### Socket event names to subscribe

- `NEW_NOTIFICATION`
- `UNREAD_COUNT_UPDATE`
- Mission lifecycle events:
	- `MISSION_ASSIGNED`
	- `MISSION_ACCEPTED`
	- `MISSION_APPROACHING`
	- `MISSION_COMPLETED`
	- `MISSION_FAILED`
	- `MISSION_ABORTED`
	- `MISSION_WITHDRAWN`

FE recommendation:

- On any mission lifecycle socket event:
	- update toast/notification center
	- invalidate and re-fetch relevant mission/request queries
- Keep unread badge sourced from `UNREAD_COUNT_UPDATE` plus fallback periodic sync.

---

## 10) Error Contract (Must implement exactly)

Standard error response shape:

```json
{
	"success": false,
	"message": "Validation summary or business error message",
	"data": null,
	"error": {
		"code": "VALIDATION_ERROR",
		"details": [
			{
				"field": "completions.0.missionRequestId",
				"message": "missionRequestId must be a valid ObjectId",
				"type": "string.pattern.base"
			}
		]
	}
}
```

FE handling rules:

- Always show top-level `message`.
- If `error.details` exists, map each item to field-level form errors.
- Handle conflict-like timeline errors (status changed by another actor) by forcing refresh and re-open action panel.

---

## 11) FE Migration Checklist

1. Replace any legacy mission assign call with 3-step planning flow.
2. Add MissionRequest API client module (`getById`, `close`, `drop`).
3. Update timeline complete form to submit `completions[]`.
4. Add UI state guards using new status enums (`DRAFT`, `PLANNED`, `PARTIAL`, etc.).
5. Update notification socket subscriptions for mission lifecycle events.
6. Update form validation error parsing to use `error.details[{ field, message, type }]`.
7. Re-test end-to-end flows by role:
	 - Coordinator planning/start/pause/resume/abort
	 - Rescue Team accept/arrive/complete/fail/withdraw
	 - Citizen request status + notification updates

---

## 12) QA Scenarios FE Should Re-run

1. Start mission without requests -> expect `400` with `NO_MISSION_REQUESTS`.
2. Start mission without planned timelines -> expect `400` with `NO_PLANNED_TIMELINES`.
3. Add requests/teams when mission not `DRAFT` -> expect invalid mission status error.
4. Complete timeline with duplicate missionRequestId in `completions` -> validation error.
5. Team user acting on another team timeline -> expect `403` unauthorized team access.
6. Concurrent timeline action conflict -> expect conflict error, then FE refreshes and reflects latest status.

---

## 13) Final Recommendation

For FE architecture, split API + state by bounded context:

- `missionsApi`
- `missionRequestsApi`
- `timelinesApi`
- `requestsApi`
- `notificationsApi`

Then orchestrate cross-module refresh using a centralized event invalidation map keyed by mission id and request id. This matches the redesigned backend where mission/request/timeline statuses are synchronized across modules.
