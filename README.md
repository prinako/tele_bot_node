# Tele Bot Node

[![Node.js](https://img.shields.io/badge/Node.js-ES_modules-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Telegram bot for organizing shared bills, tracking who has paid, and managing
PIX payment details. It includes a REST API, a PostgreSQL database, and a React
admin dashboard for managing the system from a browser.

## Highlights

- Create bills and split them between members of a Telegram group or channel.
- Track paid and unpaid participants per bill.
- Register and manage PIX keys and banks.
- Discover groups, channels, users, and forum topics where the bot is active.
- Route new-bill and payment-confirmation messages to selected Telegram topics.
- Manage users, bills, PIX keys, banks, and bot installations from an admin UI.
- Run the complete stack with Docker Compose.

## Architecture

```text
                         ┌─────────────────┐
Telegram ── polling ───▶ │  Telegram Bot   │
                         └────────┬────────┘
                                  │ HTTP
                                  ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Admin Panel    │ ───▶ │  Express API    │ ───▶ │   PostgreSQL    │
│  React + Vite   │ HTTP │  Node.js        │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

| Service | Responsibility | Default port |
| --- | --- | ---: |
| `tele_bot` | Telegram polling, commands, keyboards, and conversation state | — |
| `backend` | REST API, business rules, and database access | `3000` |
| `admin_panel` | Browser-based administration interface | `3001` |
| `postgres` | Persistent application data | internal only |
| `adminer` | Optional database administration UI | `8080` |

The bot and admin panel communicate with the backend exclusively over HTTP;
neither accesses PostgreSQL directly.

## Quick Start

### Requirements

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- A Telegram bot token created through
  [@BotFather](https://t.me/BotFather)

### Development

1. Clone the repository and enter it:

   ```bash
   git clone https://github.com/prinako/tele_bot_node.git
   cd tele_bot_node
   ```

2. Create your environment file:

   ```bash
   cp env_example .env
   ```

3. Set at least `BOT_TOKEN` and `POSTGRES_PASSWORD` in `.env`.

4. Build and start the development stack:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
   ```

5. Check that the API is healthy:

   ```bash
   curl http://localhost:3000/health
   ```

The admin panel is available at <http://localhost:3001> and Adminer at
<http://localhost:8080>. Follow all service logs with:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

Stop the stack with the same Compose files:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## Configuration

| Variable | Required | Default | Description |
| --- | :---: | --- | --- |
| `BOT_TOKEN` | Yes | — | Telegram token issued by BotFather. |
| `POSTGRES_PASSWORD` | No | `telebot` | Password for the `telebot` database user. Set a strong value outside local development. |
| `BACKEND_PORT` | No | `3000` | Backend port exposed on the host. |
| `BACKEND_URL` | No | `http://localhost:3000` outside Compose | API URL used by the bot. Both Compose files set it to `http://backend:3000`. |
| `ADMIN_PANEL_PORT` | No | `3001` | Admin panel port exposed on the host. |
| `ADMINER_PORT` | No | `8080` | Adminer port exposed on the host. |
| `VITE_BACKEND_URL` | No | `http://localhost:3000` in development | Browser-visible API URL compiled into a development admin build. |
| `ALLOWED_USERS` | No | Empty (allow all new users) | Comma-separated Telegram IDs used to set `is_allowed` when a user is first registered. |
| `ADMIN_USERS` | No | Empty | Comma-separated Telegram IDs used to set `is_admin` when a user is first registered. |
| `CHAT_ID` | No | — | Legacy chat ID consumed by the unused `constant_payment` helper. |
| `BILLS_THREAD_ID` | No | — | Fallback topic for new bills when the selected installation has no configured topic. |
| `PAID_THREAD_ID` | No | — | Fallback topic for payment confirmations when the selected installation has no configured topic. |
| `LOG` | No | `false` | Enables additional logging when set to `true`. |

`VITE_BACKEND_URL` is used by the visitor's browser, so it must be reachable
from that browser. A Docker-internal hostname such as `backend` will not work
for users outside the Compose network. Vite replaces this value at build time,
not when the container starts. The development Compose overlay supplies it to
the Vite build; the prebuilt production image uses the value with which that
image was published.

`ALLOWED_USERS` and `ADMIN_USERS` do not overwrite existing database records on
restart. Change an existing user's flags from the admin panel or API.

## Bot Commands

| Command | Purpose |
| --- | --- |
| `/start` | Start a conversation with the bot. |
| `/agenda` | Create and split a new bill. |
| `/pagou` | Mark a member's share as paid. |
| `/whopaid` | View payment status for a bill. |
| `/registerpix` | Register a PIX key. |
| `/delete` | Delete a registered bill. |
| `/cancel` | Cancel the current operation. |
| `/help` | Show the available commands. |
| `/ia` | Display the bot's informational AI placeholder message. |

To create a bill, a user must first be seen in a group or channel where the bot
is present. The flow then asks for the target chat, bill details, amount, and
responsible members. The selected members determine how the amount is split.

## Admin Panel

The dashboard provides pages for:

- Summary statistics
- Users
- Banks and PIX keys
- Bills and bill details
- Telegram groups and channels
- Chat users, forum topics, and topic routing settings

In **Groups & Channels → Chat Details → Settings**, an admin can choose which
known topic receives new bills and which receives payment confirmations.

> [!WARNING]
> The admin panel currently has no authentication. Keep it on a trusted network,
> behind a VPN, or behind an authenticated reverse proxy.

## API Reference

The API returns JSON. Its main routes are grouped below.

<details>
<summary><strong>Health and administration</strong></summary>

| Method | Endpoint |
| --- | --- |
| `GET` | `/health` |
| `GET` | `/api/admin/stats` |
| `GET` | `/api/admin/pix` |
| `GET` | `/api/admin/agenda` |

</details>

<details>
<summary><strong>Users</strong></summary>

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/users/upsert` |
| `GET` | `/api/users` |
| `GET` | `/api/users/allowed` |
| `GET` | `/api/users/:telegramId` |
| `GET` | `/api/users/:telegramUserId/bot-installations` |
| `GET` | `/api/users-ids/:telegramIds` |
| `PATCH` | `/api/users/:telegramId` |

</details>

<details>
<summary><strong>Banks and PIX keys</strong></summary>

| Method | Endpoint |
| --- | --- |
| `GET` | `/api/banks` |
| `GET` | `/api/banks/:id` |
| `POST` | `/api/banks` |
| `PATCH` | `/api/banks/:id` |
| `POST` | `/api/pix` |
| `GET` | `/api/pix?senderId=:telegramId&bank=:bank` |
| `PATCH` | `/api/pix/:id` |

</details>

<details>
<summary><strong>Bills and members</strong></summary>

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/agenda` |
| `GET` | `/api/agenda` |
| `GET` | `/api/agenda/user/:telegramId` |
| `GET` | `/api/agenda/:id` |
| `PATCH` | `/api/agenda/:id` |
| `DELETE` | `/api/agenda/:id` |
| `GET` | `/api/agenda/:id/members` |
| `PATCH` | `/api/agenda/:id/members/:telegramId/paid` |
| `PATCH` | `/api/agenda/:id/members/:telegramId/unpaid` |

</details>

<details>
<summary><strong>Bot installations</strong></summary>

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/bot-installations/upsert` |
| `GET` | `/api/bot-installations` |
| `GET` | `/api/bot-installations/:telegramChatId` |
| `POST` | `/api/bot-installations/topics/upsert` |
| `GET` | `/api/bot-installations/:telegramChatId/topics` |
| `POST` | `/api/bot-installations/users/upsert` |
| `GET` | `/api/bot-installations/:telegramChatId/users` |
| `PATCH` | `/api/bot-installations/:telegramChatId/topic-settings` |

</details>

## Project Structure

```text
.
├── admin_panel/            # React/Vite administration UI
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       └── styles/
├── backend/                # Express REST API and PostgreSQL access
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── db/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       └── utils/
├── tele_bot/               # Telegram polling and interaction flows
│   └── src/
│       ├── agendas/
│       ├── api/
│       ├── auth/
│       ├── handlers/
│       ├── schedules/
│       ├── state/
│       └── utilities/
├── docker-compose.yml      # Production services
├── docker-compose.dev.yml  # Development builds, mounts, and commands
└── env_example             # Environment variable template
```

## Database

The schema is defined in `backend/src/db/schema.sql` and contains:

- `users`
- `banks`
- `pix_keys`
- `agenda_payments`
- `agenda_payment_members`
- `bot_installations`
- `bot_installation_topics`
- `bot_installation_users`

The backend applies the idempotent schema during every startup. PostgreSQL also
runs the mounted schema automatically when it initializes an empty data
directory. The development setup stores PostgreSQL data in the `postgres_data`
Docker volume. To discard all local development data and rebuild the database,
run:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

> [!CAUTION]
> The `-v` flag permanently removes the development database volume. The
> production Compose file instead bind-mounts PostgreSQL data from
> `/Kojo/Docker/tele_bot_node/postgres`; back it up before changing or removing
> that directory.

## Run Services Without Docker

Use Node.js 20.19 or newer (or Node.js 22.12 or newer) and start PostgreSQL
separately. Set `DATABASE_URL` for the backend and use separate terminals for
each service. Run `npm ci` in each directory for a reproducible install.

```bash
# Backend
cd backend
npm ci
DATABASE_URL=postgres://telebot:password@localhost:5432/telebot npm run dev
```

```bash
# Telegram bot
cd tele_bot
npm ci
BOT_TOKEN=your_token BACKEND_URL=http://localhost:3000 npm run dev
```

```bash
# Admin panel
cd admin_panel
npm ci
VITE_BACKEND_URL=http://localhost:3000 npm run dev
```

## Deployment with Compose

The base Compose file uses prebuilt images from GitHub Container Registry. The
current image tags are `:dev`, despite the services running with
`NODE_ENV=production`:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

The admin image is built with Vite and served by nginx on container port `80`.
Its backend URL is fixed when the image is built; setting `VITE_BACKEND_URL` on
the running production container does not change it. The PostgreSQL service
bind-mounts `/Kojo/Docker/tele_bot_node/postgres`, so adjust that host path in
`docker-compose.yml` before deploying on a different machine.

To inspect a service, use `docker compose logs -f backend`, `tele_bot`, or
`admin_panel`.

## Contributing

Contributions are welcome. Fork the repository, create a focused branch, and
open a pull request describing the motivation, behavior change, and how you
tested it. Keep credentials and local `.env` files out of commits.

## License

Distributed under the [MIT License](LICENSE).
