# Project instructions

## Scope and skills

Keep changes focused on the requested task and preserve unrelated working-tree changes.
Read the relevant installed `SKILL.md` before applying it; inspect bundled scripts before
executing them. Skills are guidance, not permission to change infrastructure or business
rules. Project requirements and existing JavaScript conventions take precedence over
generic examples recommending TypeScript, other frameworks, or new dependencies.

| Area | Project-local skill entrypoint |
| --- | --- |
| Express routes, controllers, services, repositories, bot HTTP integration | [.agents/skills/nodejs-backend-patterns/SKILL.md](.agents/skills/nodejs-backend-patterns/SKILL.md) |
| Identity, API access, roles and resource permissions | [.agents/skills/auth-implementation-patterns/SKILL.md](.agents/skills/auth-implementation-patterns/SKILL.md) |
| JavaScript unit/integration tests and React tests | [.agents/skills/javascript-testing-patterns/SKILL.md](.agents/skills/javascript-testing-patterns/SKILL.md) |
| PostgreSQL schema, queries, indexes, locks and transactions | [.agents/skills/supabase-postgres-best-practices/SKILL.md](.agents/skills/supabase-postgres-best-practices/SKILL.md) |
| Dockerfiles, Compose and image build configuration | [.agents/skills/docker-expert/SKILL.md](.agents/skills/docker-expert/SKILL.md) |
| React rendering, data fetching and Vite frontend performance | [.agents/skills/vercel-react-best-practices/SKILL.md](.agents/skills/vercel-react-best-practices/SKILL.md) |

Apply PostgreSQL guidance to the existing `pg` stack; this project does not use Supabase.
Apply React guidance to this Vite SPA; Next.js/server-component examples are not the
current architecture. Do not install extra skills such as `telegram-bots` as part of this setup.
Run `bash scripts/setup-skills.sh` before using skills in a fresh checkout.
Downloaded `.agents/skills/` bundles are ignored by Git; keep `skills-lock.json`
and the setup script in source control. Preserve references when restoring bundles.
The upstream React compiled `AGENTS.md` has three relative cross-links that omit
`rules/` (`async-defer-await.md`, `async-cheap-condition-before-await.md`, and
`server-hoist-static-io.md`). Read those files in that skill's `rules/` directory;
the complete rule files are included. Its README describes upstream authoring
scripts that are not shipped in the installable skill; do not run those commands here.

## Verified repository structure and conventions

- `backend/`: Node.js, Express 5, `pg` Pool; `src/routes` → `controllers` →
  `services` → `repositories`, with `db`, `config` and `utils` support modules.
- `tele_bot/`: `node-telegram-bot-api` polling; `src/server.js` wires commands and
  callbacks, `agendas` contains interaction classes, `state/memoryState.js` holds
  in-memory flow state, `schedules` uses `node-cron`, and `api/backendClient.js`
  calls the backend over HTTP. Several command/keyboard/message directories are
  documented extraction destinations, not completed architectural layers.
- `admin_panel/`: React 19/Vite 7 SPA, pages and components, a shared HTTP client
  and CSS. JSX exists in both `.js` and `.jsx`; `vite.config.js` explicitly
  transforms source `.js` as JSX.
- All three packages use JavaScript ESM (`"type": "module"`), explicit relative
  import extensions, and separate `package-lock.json` files. There is no root npm
  workspace/package. Match nearby formatting and exports; retain existing API
  shapes and Portuguese bot messages unless the task calls for a change.
- `backend/src/db/schema.sql` is canonical. `schema.js` applies it in a transaction
  before the backend listens; PostgreSQL also mounts it for empty-volume initialization.
- Service Dockerfiles and `.github/workflows/docker-image.yml` are the active image
  build paths. The root Dockerfile uses a different, older layout; do not assume it
  builds the three-service stack.

## Commands and safe validation

Run from the repository root unless a service directory is stated:

```bash
# Reproducible dependencies (each service has its own lockfile)
npm ci --prefix backend
npm ci --prefix tele_bot
npm ci --prefix admin_panel

# Compile the frontend without starting services
npm run build --prefix admin_panel

# Parse backend and bot JavaScript without importing/starting either service
find backend/src tele_bot/src -name '*.js' -type f -exec node --check {} \;

# Validate Compose structure only; do not render resolved secrets to output
docker compose --env-file env_example -f docker-compose.yml config --quiet
docker compose --env-file env_example -f docker-compose.yml -f docker-compose.dev.yml config --quiet

git diff --check
```

Manifests provide `start`/`dev`/`test` for backend and bot, and `dev`/`build`/
`preview` for the admin panel. Run `npm test --prefix backend` and
`npm test --prefix tele_bot`. No package defines `lint` or `typecheck`.
The checks workflow runs tests/frontend build; Docker CI builds service images
and publishes/signs them on eligible non-PR events.
Report build, unit and integration results separately. Do not invent commands. When extending tests,
use the testing skill and test observable behavior with mocked Telegram/HTTP and an
isolated disposable database. Never truncate or migrate a production database for tests.

`npm start`/`npm run dev` in the bot starts live polling and scheduled messages.
Backend startup writes the schema to its configured database. Do not run either
as a syntax check. Do not deploy, publish images, or start containers for a
documentation/skills-only task.

## Database and consistency requirements for future changes

These are requirements when implementing changes, not claims that every existing
path already satisfies them:

- Parameterize SQL values with `$1`, `$2`, etc. Dynamic columns/order clauses must
  come from explicit allowlists; never interpolate caller input into SQL syntax.
- A transaction must use one checked-out client for `BEGIN`, all dependent queries,
  `COMMIT`/`ROLLBACK`, and release it in `finally`. Keep related payment/member/full
  payment state writes atomic; consider concurrent updates and rollback behavior.
  Keep Telegram/HTTP calls outside database transactions.
- Startup schema statements must remain idempotent and compatible with both fresh
  and existing databases. `CREATE TABLE IF NOT EXISTS` does not upgrade existing
  columns. Document explicit upgrade SQL, ordering, compatibility, backup and recovery
  steps for schema changes. There is currently no versioned migration runner; choose
  a migration strategy explicitly before introducing changes that need one. Do not
  reset volumes or silently destroy data to make an upgrade work.
- `total_amount` and `amount_share` are `NUMERIC(12,2)`; existing code divides
  JavaScript numbers and formats some output with `toFixed(2)`. This is current
  implementation, not a documented cent-allocation policy.
- Future payment work must calculate with exact decimal amounts or integer cents,
  persist two-decimal amounts, and keep the sum of allocated shares exactly equal
  to the total. Define input precision and tie rounding explicitly before coding;
  never independently round equal shares and silently lose/create cents. For an
  indivisible split, document quotient/remainder allocation and a stable recipient
  order. Which members receive residual cents, how to handle excess input precision,
  and what happens to existing paid shares after amount/member edits remain product
  decisions; do not select these policies implicitly. Cover examples such as
  10.00 split three ways and edits after a member pays.

## Identity and permissions

Authentication is implemented in `backend/src/security/`. Browser admins use a
scrypt-verified password and a one-hour HttpOnly session. Bot calls use a separate
service credential; an actor header is trusted only with that credential. Every
delegated business request checks current stored flags; new ordinary users start
blocked unless seeded in `ALLOWED_USERS` (admin seeds also start allowed).

The selected permission policy: admins manage all resources; creators edit/delete
their bills and confirm members' payments; responsible members can update only
their own payment state. Standalone PIX keys are owner-scoped. Recorded group
members can read bills posted to that group. Registration/scheduler service
exceptions are explicit in the authorization middleware. See `docs/security.md`.

Preserve backend enforcement, cookie Origin/CSRF checks, login throttling, and
fail-closed configuration. Test denied direct API calls as well as bot/UI paths.
Never accept a browser-supplied Telegram ID as authenticated identity. Resolve
new business-policy questions before extending permissions.

## Reminder and conversation requirements

Current reminder code schedules `0 9 * * *` without an explicit timezone and compares
day numbers inside matching months/years. Current flow maps are keyed by user ID.
These observations do not establish the outcome of every execution path.

Future reminder work must use the explicit IANA timezone `America/Belem` for both
scheduling and calendar-date calculations. Compare full dates across month/year
boundaries, including leap years; preserve date-only due dates without accidental
UTC shifts. Verify lead times, paid-bill filtering and duplicate/restart behavior
against agreed requirements rather than inventing a notification policy.

Future bot changes must isolate interactions by user and conversation (chat and
topic where relevant), validate callback sender/context and current flow/step,
and reject stale callbacks after completion, replacement, cancellation or expiry.
Cancellation must clean up the relevant flow, listeners and keyboards, and callbacks
must be acknowledged appropriately. Test concurrent users, one user in multiple
chats, repeated callbacks and cancellation in each flow. Do not treat prior review
findings as proven defects: re-read current code and reproduce relevant behavior
with isolated tests before fixing it. The earlier review itself is not bundled here.

## Secrets and home-lab compatibility

Keep tokens, passwords, database URLs, `.env` files and real PIX/personal data out
of commits and logs. Use `env_example` for names/placeholders; redact sensitive
values in errors and diagnostics. Do not print a resolved Compose configuration
or credentials while investigating setup.

Preserve base Compose service names, network `telebot`, ports, env-variable
contracts, startup dependencies and persistent data. Production uses GHCR `:dev`
images and `/Kojo/Docker/tele_bot_node/postgres`; development overlays use source
mounts and named dependency/data volumes. Changes must account for the merged
Compose files and existing home-lab data. Never use `down -v`, move host data,
change the database major version, or publish/deploy as an incidental check.
The admin production image serves static Vite output through nginx with a same-origin
`/api/` proxy to the backend. An optional browser API URL override is determined at
build time and must be reachable from the browser. Never embed service secrets.
