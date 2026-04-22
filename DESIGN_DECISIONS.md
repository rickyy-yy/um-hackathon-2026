# Design Decisions — Iteration 2

This document captures choices where I deviated from verbatim feedback, or where the iteration-2 brief asked me to pick a default but flag the question for product confirmation.

---

## 1. Email retained as an optional profile field

**Feedback said:** Remove email from the login flow.
**What I did:** Removed email as a login credential — the user now signs in with their Malaysian mobile number only. Email is still present on the `users` table as a nullable column, editable from the profile settings UI.

**Why:** The original `Hackathon_Instructions.txt` requires reports to be deliverable by email. Dropping the column entirely would kill that feature. Keeping email as an optional profile field preserves email delivery while still removing it from the critical path of sign-in.

**Question for product:** Is email-based report delivery a keeper, or can we drop it and remove the column entirely? If dropping, also remove `app/services/email_service.py` and the SMTP env vars.

---

## 2. Guest data TTL of 24 hours

**Default chosen:** `GUEST_TTL_HOURS=24`. Guest sessions (and their uploaded data and generated reports) are cleaned up 24 hours after creation.

**Question for product:** Is 24 hours correct, or do we want 7 days (so a guest can return the next day and still sign up)? The brief asked for 24 h as a starting point.

---

## 3. Guest upload rate limit: 3 reports per IP per 24 h

**Default chosen:** `GUEST_REPORTS_PER_IP_PER_DAY=3`.

**Question for product:** Can be ratcheted up or down easily via env. The brief asked for 3; is that right for launch?

---

## 4. SMS provider: console stub for the hackathon

**What I did:** Built an `SmsProvider` abstraction with a single `ConsoleSmsProvider` implementation that logs OTPs to the backend stdout. Selecting a provider is one env var (`SMS_PROVIDER=console`). A future Twilio / Vonage / local-telco implementation is a single new file.

**Question for product:** Which provider should we integrate post-hackathon? Twilio is the quickest off-the-shelf, but Malaysian telcos (Celcom Cloud, Maxis Business) may be cheaper per-message for our volumes.

---

## 5. Default language detection from `Accept-Language`

**What I did:** On first visit the frontend reads `navigator.language` and falls back to English if the browser language is anything other than `ms` or `zh`. Subsequent visits use the user's stored choice (localStorage for guests, `users.preferred_language` column for signed-in users).

**Question for product:** Given the Malaysian target market, should we default to `ms` instead of `en` when the browser language is unknown? I went with "use the browser signal, default to English" because both EN and MS are widely understood in Malaysia and it maximises accessibility for tourists / overseas owners.

---

## 6. Shops always belong to a user; guest flow uses `guest_sessions`

**What I did:** Added both `shops.owner_user_id` (required) and a parallel `guest_sessions` table. All data tables carry nullable `shop_id` and nullable `guest_session_id`, with application-level enforcement that exactly one is set. On sign-up, a "first upload" shop is created for the new user and the guest's data is reassigned in a single transaction.

**Why not:** A guest-as-shop-with-null-owner approach would have been simpler but would silently mix guest and authenticated flows in every shop query. Keeping them on separate tables makes cleanup trivial (`DELETE FROM guest_sessions WHERE expires_at < now()` cascades everything).

---

## 7. Phone normalisation strictness

**What I did:** Accept `0123456789`, `+60123456789`, `60123456789`, `012-345 6789`, `(012) 3456789`. Normalise to `+60XXXXXXXXX` (E.164). Reject anything that doesn't match a Malaysian mobile prefix `01[0-9]` with 8–9 digits after.

**Trade-off:** The regex is lenient inside the `01X` block — it does not enforce the specific ranges reserved by MCMC. A stricter table would reject numbers that actually work today. I went with "accept anything reasonable" and kept the validator small.

---

## 8. Rate limits on auth endpoints

- `/signup` → 5/minute per IP
- `/login/password` → 10/minute per IP
- `/otp/request` → 5/minute per IP, **plus** 3 OTPs / 15 min per phone number
- `/otp/verify` → 10/minute per IP
- `/password/reset` → 5/minute per IP

These are per-IP and in-memory (slowapi). Post-hackathon they should move to Redis so they survive restarts and work across multiple backend replicas.

---

## 9. Alembic baseline only

There is no upgrade path from the old "Kira2 Je" schema. Iteration 1 used `Base.metadata.create_all`; iteration 2 ships a single baseline migration that creates the full schema. Any existing iteration-1 databases must be dropped before running iteration 2.

---

## 10. JWT expiry raised to 24 h access

**Default:** `JWT_EXPIRATION_MINUTES=1440` (24 h).
**Why:** The brief calls for 24 h access tokens with 7-day refresh. Refresh tokens are deferred (see `KNOWN_ISSUES.md`). A 24 h access token keeps the UX smooth without standing up refresh infrastructure for the hackathon demo.
