# API access

Requests and responses use JSON unless a route returns 204. The request-body limit is 32 KiB.

## Authentication endpoints

| Method | Path | Access and result |
| --- | --- | --- |
| GET | `/health` | Public liveness; `{ "status": "ok" }` |
| POST | `/api/auth/login` | Allowed Origin, `{ "password": "..." }`; sets session cookie and returns admin role |
| GET | `/api/auth/me` | Authenticated admin session or allowed delegated bot user; returns role and Telegram ID |
| POST | `/api/auth/logout` | Browser admin session and allowed Origin; revokes cookie, returns 204 |

Browser code uses `credentials: "include"`. Do not expose the bot credential in frontend configuration. For bot integrations use the service Bearer token and the actual verified update sender in `X-Telegram-User-Id`. A missing or invalid service token returns 401.

## Business endpoints

| Route family | Access |
| --- | --- |
| `/api/admin/stats`, `/api/admin/pix`, `/api/admin/agenda` | Admin |
| `GET /api/users`, `/api/users/allowed`, `/api/users-ids/:telegramIds` | Admin |
| `GET /api/users/:telegramId` | Own profile or admin |
| `PATCH /api/users/:telegramId` | Admin, including `isAdmin`/`isAllowed` |
| `GET /api/users/:telegramUserId/bot-installations` | Own installations or admin |
| `GET /api/banks`, `/api/banks/:id` | Allowed user or admin |
| `POST/PATCH /api/banks[/:id]` | Admin |
| `GET /api/bot-installations` | Admin |
| `GET /api/bot-installations/:chatId[/users or /topics]` | Recorded member of that installation or admin |
| `PATCH /api/bot-installations/:chatId/topic-settings` | Admin |
| `POST /api/users/upsert` | Trusted bot registration or admin |
| `POST /api/bot-installations/upsert`, `/topics/upsert`, `/users/upsert` | Trusted bot registration or admin; suffixes relative to `/api/bot-installations` |
| `GET /api/pix?senderId=...&bank=...` | Own keys or admin |
| `POST /api/pix`, `PATCH /api/pix/:id` | Own key or admin |
| `POST /api/agenda` | Allowed user with recorded membership in selected group, or admin |
| `GET /api/agenda` | Pending bills; scheduler service without actor or admin |
| `GET /api/agenda/user/:telegramId` | Own created/responsible pending bills or admin |
| `GET /api/agenda/:id[/members]` | Creator, recorded group member, or admin |
| `PATCH/DELETE /api/agenda/:id` | Creator or admin; member PATCH restricted to own payment status |
| `PATCH /api/agenda/:id/members/:telegramId/paid` | Creator, target responsible member, or admin |
| `PATCH /api/agenda/:id/members/:telegramId/unpaid` | Same policy as paid |

Ordinary members using bill PATCH must specify their own target Telegram ID, provide `isPaid`, and supply no bill-edit fields. Creator/admin PATCH without a target can update all responsible members' payment flags. Updates of amounts/shares retain current business behavior; see [known issues](development.md).

## Status codes

- `401`: missing/invalid credentials or expired session; browser should show login.
- `403`: authenticated but blocked/not authorized, or invalid browser Origin.
- `404`: route/resource not found where supported.
- `429`: login throttle; wait for the `Retry-After` window.
- `400`/`413`: malformed/oversized request or validation failure.
- `500`: unexpected server failure; response omits internal error details.

Some legacy repositories swallow database errors and return `false`, which controllers can report as 400/404. This remains a known limitation; do not use 404 alone to conclude that a database operation succeeded or failed for business reasons.
