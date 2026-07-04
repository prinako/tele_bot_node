# tele_bot_node

Telegram bot for tracking shared bills and split payments, with PostgreSQL persistence and Docker-based deployment.

Built for group chats (including forum topics) where members need to register recurring bills, assign responsibility, record partial payments, and receive due-date reminders.

---

## Features

- **Bill registration** — Create agenda payments with due date, amount, description, and PIX details via an interactive inline-keyboard flow (`/agenda`).
- **Split tracking** — Dynamic per-user membership; no hard-coded user columns in the database.
- **Payment updates** — Mark individual shares as paid (`/pagou`) and query payment status (`/whopaid`).
- **PIX key management** — Register and reuse PIX keys per user and bank (`/registerpix`).
- **Due-date reminders** — Daily cron job at 09:00 sends notifications 3, 2, and 1 day(s) before, and on the due date.
- **Access control** — Restrict commands to an allowlist of Telegram user IDs.
- **Forum topic support** — Posts to configured chat threads for bills and paid confirmations.

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime      | Node.js 25 (ES modules)             |
| Bot API      | [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) |
| Database     | PostgreSQL 17 via `pg`              |
| Scheduling   | node-cron                           |
| Deployment   | Docker Compose, GitHub Actions → GHCR |

---

## Architecture

```mermaid
flowchart LR
  TG[Telegram] --> Bot[tele-bot-node]
  Bot --> PG[(PostgreSQL)]
  Cron[node-cron 09:00] --> Bot
```

**Database schema** (`src/DB/postgres/schema.sql`):

| Table                    | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `users`                  | Telegram users, admin/allowed flags          |
| `pix_keys`               | PIX keys per user and bank                   |
| `agenda_payments`        | Bills with due date, amount, and PIX info    |
| `agenda_payment_members` | Per-user responsibility and payment state    |

The schema is applied automatically on first PostgreSQL container startup via Docker's `docker-entrypoint-initdb.d` mechanism.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- Telegram user IDs for `ALLOWED_USERS` (and optionally `ADMIN_USERS`)

For local development without Docker, you need Node.js 20+ and a reachable PostgreSQL instance.

---

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values (see [Configuration](#configuration) below).

### 2. Start with Docker Compose

```bash
docker compose up -d --build
docker compose logs -f tele-bot
```

The bot waits for PostgreSQL to pass its health check before starting.

### 3. Verify

Send `/help` to the bot from an allowed Telegram account. You should see the command list.

---

## Configuration

| Variable            | Required | Description |
| ------------------- | -------- | ----------- |
| `BOT_TOKEN`         | Yes      | Telegram bot token from BotFather |
| `POSTGRES_PASSWORD` | Yes      | PostgreSQL password (used by both services) |
| `DATABASE_URL`      | Yes      | Connection string. Default in Compose: `postgres://telebot:${POSTGRES_PASSWORD}@postgres:5432/telebot` |
| `ALLOWED_USERS`     | Yes      | Comma-separated Telegram user IDs allowed to use bot commands |
| `ADMIN_USERS`       | No       | Comma-separated admin user IDs |
| `CHAT_ID`           | Yes      | Target group chat ID |
| `BILLS_THREAD_ID`   | No       | Forum topic ID for pending bills |
| `PAID_THREAD_ID`    | No       | Forum topic ID for paid confirmations |
| `LOG`               | No       | Set to `true` to enable debug logging |

Example `.env`:

```env
BOT_TOKEN=123456:ABC-DEF...
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgres://telebot:${POSTGRES_PASSWORD}@postgres:5432/telebot

ALLOWED_USERS=111111111,222222222
ADMIN_USERS=111111111

CHAT_ID=-1001234567890
BILLS_THREAD_ID=42
PAID_THREAD_ID=43

LOG=false
```

> **Note:** The PostgreSQL data volume in `docker-compose.yml` is mounted at `/Kojo/Docker/tele_bot_node/postgres`. Adjust this path to match your host before deploying.

---

## Bot Commands

| Command        | Access   | Description |
| -------------- | -------- | ----------- |
| `/agenda`      | Allowed  | Register a new pending bill payment |
| `/pagou`       | Allowed  | Record that a member paid their share |
| `/whopaid`     | Allowed  | Show who has paid for a bill |
| `/registerpix` | Allowed  | Register a PIX key for a bank |
| `/delete`      | Allowed  | Remove a registered bill |
| `/cancel`      | Allowed  | Cancel the current interactive flow |
| `/help`        | All      | List available commands |
| `/start`       | All      | Entry point; directs users to `/agenda` |

---

## Local Development

Point `DATABASE_URL` at a local or remote PostgreSQL database, then:

```bash
npm install
npm run dev
```

`npm run dev` runs the server with `--watch` and loads variables from `.env`.

Production start (no file watcher):

```bash
npm start
```

---

## Database Operations

### Backup

```bash
docker exec tele-bot-postgres pg_dump -U telebot -d telebot > telebot-postgres-backup.sql
```

### Reset (destructive)

Stops containers, removes the PostgreSQL data directory, and recreates the database from `schema.sql`:

```bash
docker compose down
sudo rm -rf /Kojo/Docker/tele_bot_node/postgres
docker compose up -d --build
```

---

## Project Structure

```
src/
├── server.js              # Bot entry point, command routing
├── auth/                  # Allowlist-based access control
├── agendas/               # Bill, payment, PIX, and delete flows
├── schedules/             # Daily due-date notification cron
├── DB/
│   ├── connectDB/         # PostgreSQL connection pool
│   ├── postgres/schema.sql
│   └── querys/            # Query layer
└── utilities/             # Keyboards, formatters, constants
```

---

## CI/CD

Pushes to `main`, `dev`, and `test`, plus version tags, trigger a GitHub Actions workflow that builds and pushes a signed image to [GHCR](https://github.com/prinako/tele_bot_node/pkgs/container/tele_bot_node):

```
ghcr.io/prinako/tele_bot_node
```

Pull requests run a build-only check without publishing.

---

## Manual Smoke Test

1. Start the app.
2. Insert one agenda payment via `/agenda`.
3. List unpaid agenda payments.
4. Mark one payment paid with `/pagou`.
5. Register a PIX key with `/registerpix`.
6. Query PIX by sender and bank.
7. Delete an agenda payment with `/delete`.

---

## License

[MIT](LICENSE) © Prince Nyarko
