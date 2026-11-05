#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$project_root"
# Only this script's container is removed. No host mounts or existing databases.
container_name="telebot-review-test-$$-$RANDOM"
cleanup() { docker rm -f "$container_name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'exit 130' INT TERM
docker run --rm --detach --name "$container_name" --memory 512m --cpus 1 \
  --tmpfs /var/lib/postgresql/data:rw --publish 127.0.0.1::5432 \
  --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_DB=telebot_disposable_test \
  postgres:17-alpine >/dev/null
for attempt in {1..50}; do
  if docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres -d telebot_disposable_test >/dev/null 2>&1; then break; fi
  sleep 0.2
done
docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres -d telebot_disposable_test >/dev/null
postgres_port=$(docker port "$container_name" 5432/tcp | cut -d: -f2)
export TELEBOT_DISPOSABLE_DATABASE=1
export TEST_DATABASE_URL="postgres://postgres@127.0.0.1:${postgres_port}/telebot_disposable_test"
node --test backend/test/integration/*.test.js
