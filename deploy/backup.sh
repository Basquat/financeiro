#!/usr/bin/env bash
# Daily pg_dump of the Neon database + 14-day retention. Needs only docker (pg_dump runs in a postgres image).
#   ./deploy/backup.sh          -> dump into ~/backups/financeiro-YYYYmmdd-HHMM.sql.gz
#   ./deploy/backup.sh test     -> restore the newest dump into a throwaway Postgres and count users
# Cron (as the VM user):  0 3 * * *  cd ~/financeiro && ./deploy/backup.sh >> ~/backups/backup.log 2>&1
# ponytail: dumps stay on the VM disk; copy them off-box (rclone/oci) when losing the VM would hurt.
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-.env.prod}"; [ -f "$ENV_FILE" ] || ENV_FILE=.env
set -a; . "./$ENV_FILE"; set +a
DIR="${BACKUP_DIR:-$HOME/backups}"; mkdir -p "$DIR"
IMG=postgres:17-alpine # must be >= the server's major version (Neon: check the console)

if [ "${1:-}" = "test" ]; then
  LAST=$(ls -t "$DIR"/financeiro-*.sql.gz | head -1)
  docker rm -f pgtest >/dev/null 2>&1 || true
  docker run -d --name pgtest -e POSTGRES_PASSWORD=x "$IMG" >/dev/null
  until docker exec pgtest pg_isready -q; do sleep 1; done
  gunzip -c "$LAST" | docker exec -i pgtest psql -q -U postgres -v ON_ERROR_STOP=0 >/dev/null
  echo "restored $LAST -> users: $(docker exec pgtest psql -U postgres -tAc 'select count(*) from users')"
  docker rm -f pgtest >/dev/null
  exit 0
fi

# jdbc:postgresql://host/db?sslmode=require  ->  postgresql://user@host/db?sslmode=require (password via PGPASSWORD)
URL="postgresql://${DB_USER}@${SPRING_DATASOURCE_URL#jdbc:postgresql://}"
OUT="$DIR/financeiro-$(date +%Y%m%d-%H%M).sql.gz"
docker run --rm -e PGPASSWORD="$DB_PASSWORD" "$IMG" pg_dump --no-owner --no-privileges "$URL" | gzip > "$OUT"
[ "$(stat -c %s "$OUT")" -gt 1000 ] || { echo "backup too small, something failed" >&2; rm -f "$OUT"; exit 1; }
find "$DIR" -name 'financeiro-*.sql.gz' -mtime +14 -delete
echo "ok $OUT"
