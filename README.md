# tele_bot_node

Telegram bot for managing shared bills, backed by PostgreSQL.

## PostgreSQL Setup

The app uses PostgreSQL through the `pg` package. Docker Compose starts both the bot and a PostgreSQL 17 container, then initializes the schema from `src/DB/postgres/schema.sql` on first database creation.

The schema stores Telegram users in `users`, PIX keys in `pix_keys`, bills in `agenda_payments`, and per-user responsibility/payment state in `agenda_payment_members`. Payment members are dynamic; the database does not use hard-coded user columns.

Create your environment file:

```bash
cp .env.example .env
nano .env
```

Required environment variables:

```env
BOT_TOKEN=
POSTGRES_PASSWORD=
DATABASE_URL=postgres://telebot:${POSTGRES_PASSWORD}@postgres:5432/telebot

ALLOWED_USERS=
ADMIN_USERS=

BILLS_THREAD_ID=
PAID_THREAD_ID=
CHAT_ID=

LOG=false
```

## Start

```bash
docker compose up -d --build
docker compose logs -f tele-bot
```

For local Node.js development, set `DATABASE_URL` to a reachable PostgreSQL database and run:

```bash
npm install
npm run dev
```

## Database Reset

This removes the Docker PostgreSQL data directory and recreates the database from `schema.sql`.

```bash
docker compose down
sudo rm -rf /Kojo/Docker/tele_bot_node/postgres
docker compose up -d --build
```

## PostgreSQL Backup

```bash
docker exec tele-bot-postgres pg_dump -U telebot -d telebot > telebot-postgres-backup.sql
```

## Manual Smoke Test

- Start app.
- Insert one agenda payment.
- List unpaid agenda payments.
- Mark one payment paid.
- Register PIX.
- Query PIX by sender and bank.
- Delete agenda payment.
