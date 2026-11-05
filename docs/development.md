# Development and validation

Read [../AGENTS.md](../AGENTS.md) for conventions. Restore the six project skills with `bash scripts/setup-skills.sh`. Downloaded skill bundles are ignored by Git; the script and `skills-lock.json` are tracked.

```bash
npm ci --prefix backend
npm ci --prefix tele_bot
npm ci --prefix admin_panel
npm test --prefix backend
npm test --prefix tele_bot
npm run build --prefix admin_panel
bash scripts/test-postgres.sh
find backend/src tele_bot/src -name '*.js' -type f -exec node --check {} \;
git diff --check
```

The security tests exercise real HTTP requests through authentication/authorization middleware using a fake repository boundary. They cover session expiry/revocation/rotation, Origin checks, login throttling, credential spoofing, blocked users, ownership and payment targeting. Bot tests verify concurrent identity isolation, registration-before-authorization, denial and backend outages. They do not start live polling or connect to a real database.

The checks workflow runs backend/bot tests, the frontend build and disposable PostgreSQL regressions. The database test script creates a memory-backed PostgreSQL 17 container on a random localhost port and removes only that container on exit. It never mounts home-lab data. Default npm tests skip database cases unless this script supplies the isolated database flag and URL. The existing Docker workflow builds images and publishes on its configured branch/tag events. Passing an image build is not a database or live Telegram integration test.

## Local processes without Docker

Export the variables in [configuration](configuration.md) into each service's environment (or use a private service-local `.env`). Point `DATABASE_URL` to an isolated development PostgreSQL instance. Start the backend with `npm run dev --prefix backend`, the bot with `npm run dev --prefix tele_bot`, and the panel with `npm run dev --prefix admin_panel`. The local Vite origin is normally `http://localhost:5173`; configure CORS and the frontend API URL accordingly.

Backend startup applies database DDL. Bot startup starts live polling and scheduled notifications. Do not start either against production merely to check syntax.

## Current backlog

- Durable interaction persistence and reminder delivery history. Flows currently expire
  after 15 minutes and restart invalidates keyboards; reminder reruns can duplicate messages.
- `/delete` Telegram command remains a placeholder; authorized deletion is available through the admin panel/API.
- Recorded membership removal and bot installation status updates from Telegram membership events.
- Broader real PostgreSQL authorization integration coverage and live Telegram smoke checks in a disposable environment. Payment/write/schema regressions now run against disposable PostgreSQL.
- Repository error propagation, input schemas and business audit events.

No database schema migration is required by the authentication or review fixes. The bank seed now preserves existing administrator settings. Multi-user profile lookup was corrected to return a list, and a user's pending-bill listing now includes bills for which they are responsible so self-payment is reachable.

## Review fixes

See [project-review-implementation.md](project-review-implementation.md) for the six
ordered tasks, approved payment policy, regression tests and compatibility notes.
Shares round up equally; the original bill total remains unchanged and the surplus
is displayed separately. Amount/member edits require all current shares to be unpaid.
