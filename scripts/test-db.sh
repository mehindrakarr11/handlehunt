#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="handlehunt-test-db-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --network none --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  # The entrypoint's temporary bootstrap server can report ready before it restarts.
  if docker exec "$container" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres' >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres
for sql in supabase/tests/bootstrap.sql supabase/migrations/*.sql supabase/tests/ownership.sql supabase/tests/profile_reviews.sql; do
  docker exec -i "$container" psql -X -U postgres -v ON_ERROR_STOP=1 < "$sql"
done
