# Known Issues — Iteration 2

Things that are explicitly not done, not polished, or not verified.

## Not verified end-to-end

I authored iteration 2 without being able to run `docker compose up --build` against the real stack, so the Section-10 pre-push checklist from the iteration-2 brief has **not** been manually executed against a running instance. Before demo:

- [ ] Stand up the stack (`docker compose up --build`)
- [ ] Run the seeder (`docker compose run --rm seeder`)
- [ ] Walk through the full checklist in Section 10 of the iteration-2 brief

## Refresh tokens deferred

Auth uses a 24 h access token and no refresh token. After 24 h of inactivity the session cookie expires silently and the user is bounced back to `/login`. The iteration-2 brief asked for a 7-day refresh; shipping that cleanly needs a refresh-token table, rotation on use, and an `/api/auth/refresh` endpoint. Deferred.

## Dashboard copy not fully trilingual

The landing, login, signup, forgot-password, welcome-shop, and upload pages route every user-facing string through the i18n `t()` function. The **dashboard and report pages** still contain hard-coded English labels in table headers and section titles. The AI-generated narrative itself follows the user's preferred language, but the surrounding chrome does not. This is tractable — the strings are all in those two files — but out of scope for this iteration in the interest of shipping.

## Guest cleanup job

Guest data expires via the `expires_at` column but there is no scheduled job that deletes expired rows. Over time the `guest_sessions` table will grow. A nightly cron hitting `DELETE FROM guest_sessions WHERE expires_at < now()` is sufficient — deferred.

## Chat streaming not implemented

`ChatPanel` has a cursor-blink class and `msg.streaming` prop wired up, but the current `/api/chat/message` and `/api/chat/strategy/{report_id}` endpoints return the full response in one shot. Real token-by-token streaming needs SSE or WebSocket on the backend; deferred.

## Report export/email/WhatsApp only for authed users

The iteration-2 brief explicitly calls for this, so it's not strictly a bug — but worth noting that guest users attempting `/api/reports/{id}/export/*` will receive `401 ERR_NOT_AUTHENTICATED`. The frontend hides those buttons for guests and shows the sign-up prompt instead.

## SMS provider stubbed

`SMS_PROVIDER=console` is the only implementation. There is no real SMS integration yet. Production blocker.

## Rate limits in-memory

slowapi's default store is in-process memory. A multi-replica deploy would let a user brute-force an OTP by cycling requests across replicas. Move to Redis before scaling past one backend instance.

## Streamlit charts may break for guests

The dashboard iframe uses `/api/dashboard/token`, which is authed-only. Guests don't have a dashboard (they only get the generated-report view), so this isn't a regression — just noting that Streamlit was not reworked for guest flows.

## Test coverage: zero

No unit or integration tests ship with iteration 2. Test scaffolding (`pytest`, `httpx` for API tests, a `FakeSmsProvider`) would be the next PR after this one.

## Frontend bundle size

Adding `react-markdown` + `remark-gfm` adds ~45 KB gzipped to the client bundle. For a hackathon this is fine; for production-scale pages we'd dynamically import the chat panel on the few routes that need it.
