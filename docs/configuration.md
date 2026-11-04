# Configuration

Compose reads `.env` for interpolation. Outside Compose, each Node process uses its environment and dotenv relative to its working directory. Never commit real credentials or print resolved Compose output into a shared log.

| Variable | Consumer | Meaning |
| --- | --- | --- |
| `BOT_TOKEN` | Bot | Telegram polling credential from BotFather |
| `BOT_API_TOKEN` | Backend and bot | Independent shared service secret, at least 32 characters; use 32 random bytes encoded as hex |
| `ADMIN_PASSWORD_HASH` | Backend | `salt:hash` from `backend/scripts/hash-password.js`, using scrypt; required |
| `CORS_ORIGINS` | Backend | Comma-separated exact browser origins, no paths, wildcard, or trailing slash; required |
| `COOKIE_SECURE` | Backend | Defaults to `true`; `false` is accepted only outside production |
| `NODE_ENV` | Services | Backend production enforces HTTPS origins and Secure cookies |
| `DATABASE_URL` | Backend | PostgreSQL connection URL; Compose builds it from its database settings |
| `POSTGRES_PASSWORD` | Compose/database | Existing default is `telebot`; override with a strong password |
| `PORT` | Backend | Internal HTTP port, default 3000 |
| `BACKEND_URL` | Bot | Backend URL; Compose sets `http://backend:3000` |
| `BACKEND_PORT` | Compose | Host backend port, default 3000 |
| `ADMIN_PANEL_PORT` | Compose | Host panel port, default 3001 |
| `ADMINER_PORT` | Compose | Host Adminer port, default 8080 |
| `VITE_BACKEND_URL` | Frontend build/dev server | Browser API base URL; blank means same origin. Never place secrets here |
| `ALLOWED_USERS` | Backend | Telegram IDs initially allowed when first registered; empty means new ordinary users are blocked |
| `ADMIN_USERS` | Backend | Telegram IDs initially marked admin and allowed when first registered |
| `BILLS_THREAD_ID` | Bot | Legacy fallback for new-bill topic when no installation setting exists |
| `PAID_THREAD_ID` | Bot | Legacy fallback for payment-confirmation topic |
| `CHAT_ID` | Bot | Legacy constant-payment helper value |
| `LOG` | Services | Extra diagnostics only when exactly `true`; do not log user payloads |

The panel's admin password is separate from Telegram admin flags. `ADMIN_USERS` grants backend administration to authenticated bot-delegated Telegram identities; it does not create a browser password. The browser session has a fixed one-hour lifetime.

## Cookies and proxies

Use the same hostname for browser UI and API through nginx `/api/` whenever possible. Cookies are HttpOnly and SameSite=Strict. Arbitrary cross-site UI/API deployments are intentionally unsupported. With a separate API subdomain on the same site, allow the exact UI origin in `CORS_ORIGINS` and compile the API URL into the panel. The production image defaults to same-origin API requests; runtime `VITE_BACKEND_URL` does not modify static assets.

The backend does not trust forwarded client IP headers. Login throttling uses the direct peer address; behind a reverse proxy the limit can be shared by users. Apply additional throttling at your proxy if needed.
