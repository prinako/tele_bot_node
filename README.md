# tele_bot_node

Telegram bill-management bot split into three apps:

```text
Telegram <-> tele_bot <-> HTTP API <-> backend <-> PostgreSQL
                         ^
                         |
                  admin_panel
```

`tele_bot` owns Telegram polling, command flows, in-memory state, keyboards, and
messages. `backend` owns PostgreSQL access, business rules, users, PIX keys,
agenda payments, and dynamic payment members. `admin_panel` is a browser admin
interface that talks to `backend` through HTTP only.

## Structure

```text
backend/
  src/server.js
  src/app.js
  src/db/
  src/routes/
  src/controllers/
  src/repositories/
  src/services/
  src/utils/

tele_bot/
  src/server.js
  src/bot.js
  src/api/backendClient.js
  src/agendas/
  src/auth/
  src/schedules/
  src/utilities/
  src/commands/
  src/handlers/
  src/keyboards/
  src/messages/
  src/state/

admin_panel/
  src/main.js
  src/api/backendClient.js
  src/components/
  src/pages/
  src/styles/
```

## Backend API

- `GET /health`
- `POST /api/users/upsert`
- `GET /api/users`
- `GET /api/users/allowed`
- `GET /api/users/:telegramId`
- `PATCH /api/users/:telegramId`
- `GET /api/banks`
- `GET /api/banks/:id`
- `POST /api/banks`
- `PATCH /api/banks/:id`
- `POST /api/pix`
- `GET /api/pix?senderId=<telegramId>&bank=<bank>`
- `PATCH /api/pix/:id`
- `GET /api/admin/stats`
- `GET /api/admin/pix`
- `GET /api/admin/agenda`
- `POST /api/bot-installations/upsert`
- `GET /api/bot-installations`
- `GET /api/bot-installations/:telegramChatId`
- `POST /api/bot-installations/topics/upsert`
- `GET /api/bot-installations/:telegramChatId/topics`
- `POST /api/bot-installations/users/upsert`
- `GET /api/bot-installations/:telegramChatId/users`
- `POST /api/agenda`
- `GET /api/agenda`
- `GET /api/agenda/user/:telegramId`
- `GET /api/agenda/:id`
- `PATCH /api/agenda/:id`
- `DELETE /api/agenda/:id`
- `GET /api/agenda/:id/members`
- `PATCH /api/agenda/:id/members/:telegramId/paid`
- `PATCH /api/agenda/:id/members/:telegramId/unpaid`

## Database

The PostgreSQL schema lives at `backend/src/db/schema.sql` and keeps the dynamic
design:

- `users`
- `banks`
- `pix_keys`
- `agenda_payments`
- `agenda_payment_members`
- `bot_installations`
- `bot_installation_topics`
- `bot_installation_users`

Banks are stored in the backend PostgreSQL `banks` table and exposed through
`GET /api/banks`. The Telegram bot uses this endpoint to build the bank
keyboard.

PIX keys reference banks through `pix_keys.bank_id`. API responses still include
`bank` as the bank name for Telegram callback compatibility.

New agenda payments use explicit responsible users when provided. Otherwise,
backend selects all users with `is_allowed = TRUE`. If none exist yet, it falls
back to the creator only.

`bot_installations` stores Telegram private chats, groups, supergroups, and
channels where the bot is present. `users` stores people who use the bot.
`bot_installation_users` links users to the chat where they were seen and tracks
first seen, last seen, and message count. `bot_installation_topics` stores forum
topics/message threads inside groups, supergroups, and channels.

The schema is not in production yet. `schema.sql` is the single source of truth
and runs automatically only on a **new** PostgreSQL data directory. After schema
changes during development, reset the database:

```bash
docker compose down
sudo rm -rf /Kojo/Docker/tele_bot_node/postgres
docker compose up -d postgres
```

## Environment

```bash
cp .env.example .env
```

```env
BOT_TOKEN=
POSTGRES_PASSWORD=

BACKEND_PORT=3000
BACKEND_URL=http://backend:3000

ALLOWED_USERS=
ADMIN_USERS=

BILLS_THREAD_ID=
PAID_THREAD_ID=
CHAT_ID=

LOG=false

ADMIN_PANEL_PORT=3001
VITE_BACKEND_URL=http://localhost:3000
```

## Docker

```bash
docker compose build
docker compose up -d postgres backend
curl http://localhost:3000/health
docker compose up -d admin_panel
docker compose up -d tele_bot
docker compose logs -f backend admin_panel tele_bot
```

The PostgreSQL data volume is mounted at `/Kojo/Docker/tele_bot_node/postgres`.

## Admin Panel

The admin panel runs on `http://localhost:3001` by default. It communicates with
the backend through HTTP API calls from `admin_panel/src/api/backendClient.js`
and does not connect to PostgreSQL directly.

Pages:

- Dashboard
- Users
- Banks
- PIX Keys
- Agenda
- Agenda Details
- Groups & Channels
- Chat Details

For Docker, `VITE_BACKEND_URL` is a browser-side URL baked into the Vite build.
The default is `http://localhost:3000`, so the backend port must be exposed to
the browser.

The admin panel includes a Groups & Channels page showing Telegram private
chats, groups, supergroups, and channels where the bot is active, plus users and
topics registered under each chat.

Do not expose the admin panel publicly until authentication is added. Use it
only on LAN/VPN or behind a protected reverse proxy.

## Bot Commands

- `/agenda`
- `/pagou`
- `/whopaid`
- `/registerpix`
- `/delete`
- `/cancel`
- `/help`

## Local Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Bot:

```bash
cd tele_bot
npm install
BACKEND_URL=http://localhost:3000 npm run dev
```

Admin panel:

```bash
cd admin_panel
npm install
VITE_BACKEND_URL=http://localhost:3000 npm run dev
```

## Notes

`tele_bot` communicates with `backend` only through
`tele_bot/src/api/backendClient.js`. It does not import backend database or
repository modules.

`admin_panel` communicates with `backend` only through
`admin_panel/src/api/backendClient.js`. It does not import backend database or
repository modules.
