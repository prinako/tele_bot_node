# tele_bot_node

Telegram bill-management bot split into two apps:

```text
Telegram <-> tele_bot <-> HTTP API <-> backend <-> PostgreSQL
```

`tele_bot` owns Telegram polling, command flows, in-memory state, keyboards, and messages. `backend` owns PostgreSQL access, business rules, users, PIX keys, agenda payments, and dynamic payment members.

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
```

## Backend API

- `GET /health`
- `POST /api/users/upsert`
- `GET /api/users/allowed`
- `GET /api/users/:telegramId`
- `POST /api/pix`
- `GET /api/pix?senderId=<telegramId>&bank=<bank>`
- `PATCH /api/pix/:id`
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

The PostgreSQL schema lives at `backend/src/db/schema.sql` and keeps the dynamic design:

- `users`
- `pix_keys`
- `agenda_payments`
- `agenda_payment_members`

New agenda payments use explicit responsible users when provided. Otherwise, backend selects all users with `is_allowed = TRUE`. If none exist yet, it falls back to the creator only.

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
```

## Docker

```bash
docker compose build
docker compose up -d postgres backend
curl http://localhost:3000/health
docker compose up -d tele_bot
docker compose logs -f backend tele_bot
```

The PostgreSQL data volume is mounted at `/Kojo/Docker/tele_bot_node/postgres`.

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

## Notes

`tele_bot` communicates with `backend` only through `tele_bot/src/api/backendClient.js`. It does not import backend database or repository modules.
