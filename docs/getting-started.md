# Getting started

## Prerequisites

Use Git, Node.js/npm compatible with the package dependencies (the service images use Node 26), Docker Compose, and a Telegram bot token from BotFather. The three packages have independent npm lockfiles. PostgreSQL 17 is the database used by Compose.

## Credentials

From the repository root:

```bash
cp env_example .env
chmod 600 .env
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Save the generated value as `BOT_API_TOKEN` in `.env`. This is independent of `BOT_TOKEN`.

Generate an admin password hash without putting the password in shell history or a process argument:

```bash
read -r -s -p 'Admin password (12+ characters): ' telebot_password
printf '\n'
printf '%s' "$telebot_password" | node backend/scripts/hash-password.js
unset telebot_password
```

Save the output as `ADMIN_PASSWORD_HASH`. Do not save the raw password. The hash is sensitive and must not be committed. Set `BOT_TOKEN`, a strong `POSTGRES_PASSWORD`, and your Telegram ID in `ADMIN_USERS` and `ALLOWED_USERS` before first registration. New users outside those lists start blocked; allow them in the admin panel after they contact the bot.

The lists seed new users only. Existing database flags are preserved, so review them in the admin panel during an upgrade.

## Local development with Compose

The example has `COOKIE_SECURE=false` and localhost origins for HTTP development. Set `VITE_BACKEND_URL=http://localhost:3000` for a browser on the Docker host. If accessing from another machine, replace localhost and configure its exact panel origin in `CORS_ORIGINS`.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
curl http://localhost:3000/health
```

Open `http://localhost:3001` and enter the admin password. The backend is on port 3000. Adminer is on port 8080 and uses database credentials, not the panel password.

The development overlay replaces the production PostgreSQL bind mount at the same container target with the named `postgres_data` volume. Keep development and production deployments separate, and inspect effective mounts privately if you add more overrides. Never use an existing production database for tests.

## Home-lab production

Set `COOKIE_SECURE=true` and `CORS_ORIGINS` to your exact HTTPS panel origin, for example `https://telebot.home.example.com`. Production refuses HTTP origins or insecure cookies. Serve the admin panel through your HTTPS reverse proxy. Its nginx proxies `/api/` to the backend inside Compose, so browser requests use the panel origin and do not require a public API hostname. An alternative direct API URL must be compiled into the frontend and remain on the same site for the Strict cookie.

The production Compose file consumes GHCR `:dev` images. After this change is reviewed, merged and images are published:

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
```

The deployment commands are operational instructions; they are not run by the test suite. Preserve `/Kojo/Docker/tele_bot_node/postgres` and your existing network/proxy configuration. Limit host access to backend and Adminer ports using the host firewall or a Compose override; the base file retains existing port bindings.

## Upgrade from the unauthenticated version

1. Back up PostgreSQL and the existing configuration. Do not delete volumes.
2. Configure the new service token, admin hash, HTTPS origin and secure-cookie setting.
3. Upgrade backend, bot and admin images together; the old bot has no service credential and will receive 401 responses.
4. Log into the panel. Review existing `is_allowed` and `is_admin` flags; environment lists do not change existing users.
5. Verify an allowed user's commands and confirm blocked users cannot modify bills.

There is no database schema change for authentication. Sessions live in backend memory: restarting it signs out browser admins. Rotating the bot credential requires updating/restarting both backend and bot. See [security](security.md) for the remaining trust boundaries.
