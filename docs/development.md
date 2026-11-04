# Development and validation

Read [../AGENTS.md](../AGENTS.md) for conventions. Restore the six project skills with `bash scripts/setup-skills.sh`. Downloaded skill bundles are ignored by Git; the script and `skills-lock.json` are tracked.

```bash
npm ci --prefix backend
npm ci --prefix tele_bot
npm ci --prefix admin_panel
npm test --prefix backend
npm test --prefix tele_bot
npm run build --prefix admin_panel
find backend/src tele_bot/src -name '*.js' -type f -exec node --check {} \;
git diff --check
```

The security tests exercise real HTTP requests through authentication/authorization middleware using a fake repository boundary. They cover session expiry/revocation/rotation, Origin checks, login throttling, credential spoofing, blocked users, ownership and payment targeting. Bot tests verify concurrent identity isolation, registration-before-authorization, denial and backend outages. They do not start live polling or connect to a real database.

The checks workflow runs backend/bot tests and the frontend build. The existing Docker workflow builds images and publishes on its configured branch/tag events. Passing an image build is not a database or live Telegram integration test.

## Local processes without Docker

Export the variables in [configuration](configuration.md) into each service's environment (or use a private service-local `.env`). Point `DATABASE_URL` to an isolated development PostgreSQL instance. Start the backend with `npm run dev --prefix backend`, the bot with `npm run dev --prefix tele_bot`, and the panel with `npm run dev --prefix admin_panel`. The local Vite origin is normally `http://localhost:5173`; configure CORS and the frontend API URL accordingly.

Backend startup applies database DDL. Bot startup starts live polling and scheduled notifications. Do not start either against production merely to check syntax.

## Current backlog

- Payment-share recalculation when a total or member list changes; select exact cent-allocation and paid-share edit policies before implementation.
- Reminder timezone and full-calendar-date handling across month/year boundaries.
- Persistent interaction state, per-chat/topic flow isolation, callback nonce/step validation, replay protection and expiry. `/cancel` now clears all five user flow maps, but this is not complete replay protection.
- `/delete` Telegram command remains a placeholder; authorized deletion is available through the admin panel/API.
- Recorded membership removal and bot installation status updates from Telegram membership events.
- Real PostgreSQL authorization/write integration tests and live Telegram smoke checks in a disposable environment.
- Repository error propagation, input schemas and business audit events.

No database schema migration is required by this authentication change. Multi-user profile lookup was corrected to return a list, and a user's pending-bill listing now includes bills for which they are responsible so self-payment is reachable.
