# Project review implementation

Branch: `fix/project-review-tasks`. Scope: six findings from the project review.

Work proceeds in numeric order. Reproduce the relevant defect with an isolated
test, implement the fix, run focused tests and the affected package suite, and
record the result before starting the next task. Report unit, integration and
build results separately. Never use production data, live polling or real Telegram
messages for validation. No deployment or image publication is included.

## Progress

| Task | Change | Status |
| --- | --- | --- |
| 1 | Propagate bill-creation connection failures | Complete; 19 backend tests pass |
| 2 | Keep amount/member edits and shares consistent | Complete; PostgreSQL and package gates passed |
| 3 | Use exact cents and display the agreed rounding surplus | Complete; database, bot and build gates passed |
| 4 | Isolate bot conversations and reject stale callbacks | Complete; lifecycle and bot package gates passed |
| 5 | Correct reminder date boundaries and timezone | Complete; reminder and bot package gates passed |
| 6 | Preserve configured bank ordering at startup | Complete; PostgreSQL regression passed |

## Payment decisions required for tasks 2–3

AGENTS.md requires explicit product decisions before implementing payment changes.
The user selected equal shares rounded upward: `10.00 / 3` gives `3.34` to every
member. This explicitly supersedes the earlier exact-sum requirement: the shares
can total more than the entered bill amount. Do not allocate a residual cent to
just one member under this policy.

Approved replacement rules:

- Keep the entered total (`10.00`) and display the rounding surplus separately
  (`0.02` for three shares of `3.34`).
- Reject inputs with more than two decimal places; do not round entered totals.
- Block amount or responsible-member edits while any member has a recorded
  payment. Payments must be explicitly marked unpaid in a separate operation first.
- Use exact integer cents. Task 2 introduces the shared money helper needed to
  recalculate edits correctly; task 3 applies it to creation and presentation.

Required examples: `10.00 / 3`, a total smaller than the member count in cents,
an amount-only edit, a member-only edit, both edits together, and edits after a
member pays. No automatic historic-data rewrite or schema migration is planned.

## Task 1 — Propagate connection failures

Sources: `backend/src/services/agenda.service.js` and
`backend/src/repositories/agenda.repository.js`.

The service wraps a callback in a resolve-only promise but drops the repository's
promise. A rejection from connection acquisition can therefore leave the service
pending and become unhandled. Return/await that promise while retaining existing
success and failure response shapes. Preserve rollback and client release behavior.

Implemented: the service returns the repository promise directly, using its
existing callback to retain the result. Connection failures now reach the
controller's existing error handler. No schema or API shape changed.

Acceptance: failed acquisition settles through Express error handling; successful
creation still returns the created bill; transaction failures roll back and release
the checked-out client. Tests must not connect to a configured database.

## Task 2 — Keep edits consistent

Source: `backend/src/repositories/agenda.repository.js`.

Calculate shares from the new total and effective responsible-member set in one
transaction. Cover amount-only, member-only and simultaneous edits. Apply the
approved treatment of paid shares. Serialize related edits/payment updates and
verify rollback and concurrent behavior with an isolated disposable database.

The exact-money rules are shared with task 3; task 2 cannot silently introduce an
interim rounding or paid-share policy. Document any shared prerequisites explicitly.

## Task 3 — Allocate exact cents

Sources: agenda repository and money parsing utilities.

Use exact amounts, enforce the agreed input precision and round every equal share
upward to a whole cent, as selected by the user. Cover `10.00 / 3` → three `3.34`
shares and the agreed handling of the difference from the entered total.
Exercise both creation and edits and preserve API amount shapes. Do not silently
rewrite historic bills. Document compatibility and any explicit repair strategy.

## Task 4 — Isolate bot flows

Sources: `tele_bot/src/server.js`, `state/memoryState.js`, message handling and
interaction classes in `agendas/`.

Identify a flow by actor, chat and topic. Validate the active flow, step and keyboard
message before accepting callbacks. Completion, replacement, cancellation and expiry
must invalidate callbacks and clean up keyboards/listeners. Acknowledge callbacks.
Test concurrent users, one user in different chats/topics, repeated/stale callbacks,
replacement and cancellation in each flow, using mocked Telegram and HTTP.

## Task 5 — Correct reminders

Source: `tele_bot/src/schedules/schedules_everyday.js`.

Use `America/Belem` for cron and calendar calculations. Compare full date-only
values across month/year boundaries and leap days. Preserve the current 3/2/1/0
day lead times and pending-bill query. Test paid filtering, send failures and
duplicate/restart behavior. Do not invent a new durable notification/deduplication
policy without agreement; describe current restart limitations explicitly.

## Task 6 — Preserve bank ordering

Source: `backend/src/db/schema.sql`.

Seed missing default banks while retaining existing bank ordering and other
administrator settings. Verify fresh initialization and repeated startup against
an isolated disposable database. Preserve all existing rows and identifiers.
Document deployment compatibility and recovery; no volume reset is permitted.

## Validation log

No task is complete until its focused checks and relevant package suite pass.
Record skipped/unavailable checks explicitly; mocks are not real PostgreSQL tests.

### Task 1

- Regression before the fix: `node backend/test/agenda-creation.test.js` failed
  on connection acquisition; the success and rollback cases passed.
- Focused unit/controller checks after the fix: all three passed. They use the real
  repository, service and controller with a mocked database boundary.
- Package gate: `npm test --prefix backend` passed all 19 tests, including existing
  isolated HTTP authentication/authorization tests. Localhost listeners required
  execution outside the restricted sandbox. No real database was used.
- `git diff --check` passed. Frontend build and real PostgreSQL integration were
  not needed for this promise-propagation change.
- Regression file: `backend/test/agenda-creation.test.js`.

### Task 2

- Five real PostgreSQL regression tests: amount/member/combined edits, paid-share
  blocking, invalid-edit rollback, simultaneous confirmations and an edit waiting
  for an in-flight payment all passed using `bash scripts/test-postgres.sh`.
- `npm test --prefix backend`: 21 passed; five database tests intentionally skip
  without the disposable-database flag (they were executed separately above).
- Shared task 3 prerequisite implemented: strict integer-cent parser and equal
  upward rounding. Two money unit tests cover precision and small totals.
- All writers through updateAgendaPayment lock the bill row first. No schema
  changes; edits use the current/new total and member set in one transaction.

### Task 3

- Seven disposable PostgreSQL tests passed (task 2 regressions plus rounded
  creation and precision rejection with no partial writes).
- Backend package gate: 21 passed, seven database tests skip in the default run.
- Bot package checks passed, including preview and formatted surplus checks.
- Frontend production build passed with temporary output; no services started.
- New response fields: allocatedAmount is the sum of current responsible shares;
  surplusAmount is the nonnegative difference above the original total. Historic
  shares are read as stored, never recalculated on read. No automatic data repair.
- Compatibility: no DDL change; deploy backend/bot/admin images together. Back up
  existing data before deployment. Rollback application images to recover old
  behavior; it does not undo bills already created/edited under the new policy.

### Task 4

- Six mocked Telegram/HTTP lifecycle tests passed: complete agenda, PIX, payment
  and member-confirmation flows; cross-actor/chat/topic rejection; concurrent
  callbacks; replacement; cancellation; expiry; and callback-error cleanup.
- Bot package gate passed. No live bot or Telegram messages were started/sent.
- One active flow per actor/chat/topic; a new command replaces that conversation's
  previous flow. The lifecycle limit is a fixed 15 minutes from flow start.
- Each keyboard revision gets opaque short-lived tokens, bound to the current
  step and message. Old pre-upgrade keyboards expire after the bot restarts.
- Cancellation/revocation/expiry remove keyboards and timers. Already accepted
  in-flight backend writes cannot be reversed by cancellation; updates for the
  same conversation are serialized. No per-flow Telegram listeners are installed.
- /delete remains the existing unimplemented placeholder; no deletion business
  flow was introduced as part of this isolation fix.

### Task 5

- Five mocked scheduler tests passed: 09:00 America/Belem cron, month/year/leap-day
  boundaries, UTC/Belem calendar differences and all four lead times, paid/invalid
  filtering, one failed delivery continuing to other bills, and repeat/restart
  behavior. Bot package gate passed; no real Telegram messages were sent.
- The first regression harness exposed the old constructor's unconditional timer
  startup; it was stopped and timer/HTTP imports were mocked before rerunning.
- Reminder history remains non-durable: calling a run twice or restarting and
  running again can send duplicates. No new notification policy or migration.
- Removed an unused recurring-payment method; it had no call sites and was not
  part of the daily scheduler. No recurring-payment notification feature is added.

### Task 6

- Reproduced startup resetting a saved bank order before the fix. All eight real
  PostgreSQL tests passed after changing the seed to ON CONFLICT DO NOTHING.
- The startup test verifies fresh default seeds, unchanged saved order/active flag/
  timestamps/IDs/custom banks, and no duplicate bank names on repeated schema use.
- Added a CI job for `bash scripts/test-postgres.sh`; default unit tests still do
  not require Docker. The disposable container is automatically removed on exit.

## Upgrade and recovery

No tables, columns, types or versioned migration runner are introduced. The only
schema.sql change is the seed conflict clause; fresh and existing databases use
that same idempotent file. There is no standalone upgrade SQL to execute.

Before deploying, take the normal database backup and record administrator bank
ordering. Deploy backend, bot and panel images together so the new allocation
fields and bot preview agree. Restarting the backend applies the safe seed clause;
no data volume needs to be reset or moved. Previously rounded or edited bills are
not repaired automatically. Review them explicitly, mark current shares unpaid,
and submit an approved edit to recalculate where appropriate.

Bank orders overwritten by older startups cannot be reconstructed from current
rows alone. Restore the chosen values from a backup or through the bank editor.
Rolling back to an older backend also restores its seed-reset behavior, so retain
this seed fix or preserve/reapply the recorded bank settings during recovery.

## Final verification

All six tasks passed their focused gates in numeric order. Final checks:

- Backend default suite: 21 passing tests, nine PostgreSQL cases skipped by design.
- PostgreSQL suite (`bash scripts/test-postgres.sh`): all nine passed against a new
  disposable database, including a database-constraint rollback after member
  writes and controller 400/409 responses. Test containers are removed on exit.
- Bot suite: package command passed all four test files; direct file runs confirmed
  17 individual checks across auth, conversation, money and reminders.
- Frontend production build passed using a temporary output directory.
- Backend/bot JavaScript syntax, both Compose configurations (quiet), and
  `git diff --check` passed. No live Telegram smoke test or browser visual test.
- No deployment, push, image publication, production schema application or
  historic-data rewrite was performed. Changes remain on this branch for review.
