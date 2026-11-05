# Telegram SDK v2 migration

This integration targets the locked `node-telegram-bot-api` version **2.3.0**;
the existing dependency range remains `^2.3.0`. No environment variables were
added or renamed. `BOT_TOKEN`, `BOT_API_TOKEN`, `BACKEND_URL`, the thread settings
and the existing production Compose contracts remain in effect.

## Verified sources

Official tag `v2.3.0` resolves to commit
`466bc50ec8e8c91eff527d8089058e8ca8fa12fb`:

- [README](https://github.com/yagop/node-telegram-bot-api/blob/v2.3.0/README.md)
- [Changelog and v1 → v2 migration table](https://github.com/yagop/node-telegram-bot-api/blob/v2.3.0/CHANGELOG.md)
- [API reference](https://github.com/yagop/node-telegram-bot-api/blob/v2.3.0/doc/api.md)
- [Polling example](https://github.com/yagop/node-telegram-bot-api/blob/v2.3.0/examples/01-polling-bot.ts)
- [Keyboard/callback example](https://github.com/yagop/node-telegram-bot-api/blob/v2.3.0/examples/06-keyboards.ts)

These were checked against the installed package's exports, bundled README,
`dist/core` declarations/implementation and `dist/node` runner/signal helpers.
Use the installed implementation when newer master documentation differs.

## Boundary conventions

- Import the named `Bot`; construction does not poll. `createBot()` returns this
  actual SDK object. `createTelegramIntegration()` builds it and registers handlers.
- Commands use `bot.command(name, handler)` before the generic message handler.
  A matched command is terminal. Filter misses call the SDK's next middleware;
  middleware intended to wrap subsequent handlers must return/await `next()`.
  `/start-extra` does not match `/start`; addressed commands for another bot fall
  through without invoking our command handler.
- The SDK calls handlers with a context. Commands/messages normalize `ctx.message`
  and `ctx.from`; callbacks normalize `ctx.callbackQuery` and `ctx.from`. The bot
  author of a keyboard message is never used as the human callback actor.
- `createUserGuard` still registers observations, reads current backend permissions
  and wraps work in AsyncLocalStorage. No SDK session system is installed. The
  existing actor/chat/topic flow registry, callback tokens, stages and replay
  rejection remain the conversation authority.
- Existing interaction classes use a small **project transport facade**, not the
  SDK's removed positional methods. `createTelegramClient(bot.api)` adapts sends,
  text edits, keyboard edits and acknowledgements to single parameter objects.
  Scheduled reminders receive the same facade.
- The facade preserves target chats, thread IDs, edit message IDs and formatting.
  It removes the unsupported `message_id` field from sends (it is not a reply
  instruction) and normalizes old mixed `inline_keyboard`/`remove_keyboard`
  objects into one valid markup shape. Empty inline markup clears buttons.

## Startup and shutdown

`npm start --prefix tele_bot` runs `src/server.js`. Its main-module check makes
imports safe for tests. CLI startup validates the existing token configuration,
registers all handlers, and explicitly runs polling. SDK initialization learns
the bot identity with `getMe`; only explicit runtime startup attaches the scheduler
lifecycle plugin. The daily task still runs at 09:00 in `America/Belem`.

`runBot()` uses the SDK's `startPolling`, `stop` and local `close` lifecycle. It
owns SIGINT/SIGTERM listeners and removes them in finally. On exit it destroys
the cron task and invalidates local flow tokens/timers without sending new
cleanup messages. The SDK handles draining/confirming accepted polling updates;
`bot.api.close()` is never used for process cleanup.

Recoverable poll errors retain SDK retry behavior and get sanitized diagnostics.
Fatal polling/startup/teardown errors propagate to the CLI, which sets exit code
1 for Docker supervision. Unexpected normal polling completion is also fatal.
Update-level failures have an explicit sanitized `bot.catch` boundary; expected
permission/service failures continue through the existing user guard.

The project owns this small runner rather than calling the Node `run()` helper,
whose fatal diagnostic stringifies the complete error. Logs here contain only
structured error names/codes/status and update IDs, never SDK messages or stacks
that may include request URLs or credentials.

## Verification

```bash
npm ci --prefix tele_bot
npm run test:sdk --prefix tele_bot
npm test --prefix tele_bot
npm test --prefix backend
npm run build --prefix admin_panel
find backend/src tele_bot/src -name '*.js' -type f -exec node --check {} \;
git diff --check
```

The SDK gate constructs the real installed Bot and feeds synthetic updates through
handleUpdate, with injected Telegram fetch and mocked backend HTTP. It checks
command ordering, API form parameters, callback actors, service credentials,
blocked users, concurrent actor/chat/topic isolation, expiry/replacement/replays,
cancellation, acknowledgements, payment confirmation, agenda completion and
reminder formatting/thread targets. Lifecycle tests cover both signals, resource
cleanup, a real fatal SDK response, and the CLI's nonzero exit with redacted output.

No test uses live Telegram credentials or messages. CI runs this gate explicitly
so an incompatible SDK import/constructor cannot be hidden by interaction mocks.
No backend/database/admin code or payment policy is changed by this migration.

## Remaining limitations

There was no live Telegram smoke test or deployment. Conversations still live in
one process and are lost on restart; their old buttons are rejected afterwards.
Reminder delivery history remains non-durable. The `/delete` placeholder remains
unchanged. Test transports verify the installed SDK boundary, not Telegram's
remote server validation or production connectivity.

## Migration verification results

- `npm ci --prefix tele_bot` completed from the unchanged lockfile; installed SDK
  is 2.3.0 and the dependency range is still `^2.3.0`.
- Explicit SDK/lifecycle gate: 13 passed. Full bot suite: 32 passed.
- Backend default suite: 21 passed; nine disposable PostgreSQL tests skipped by
  design (no backend/schema code changed in this migration).
- Frontend production build passed using temporary output. JavaScript syntax,
  both quiet Compose validations and `git diff --check` passed.
- No real Telegram traffic, production database access, deployment or image
  publication was performed. Lifecycle subprocess tests required execution outside
  the restricted sandbox so child-process diagnostics could be captured normally.
