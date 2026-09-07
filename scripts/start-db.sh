#!/usr/bin/env bash
# Starts the user-owned MariaDB instance used by LeGrand (no sudo needed).
# Safe to run multiple times: exits early if the server is already running.
set -u

# Pick up MYSQL_* settings from .env when run from the project root.
if [ -f .env ]; then set -a; . ./.env 2>/dev/null; set +a; fi

DB_DIR="$HOME/legrand-db"
SOCK="$DB_DIR/mysqld.sock"

# Already running?
if mysqladmin --socket="$SOCK" -u root ping >/dev/null 2>&1; then
  echo "✅ MariaDB already running (socket: $SOCK)"
  exit 0
fi

mkdir -p "$DB_DIR"

# First run only: initialize the data directory.
if [ ! -d "$DB_DIR/mysql" ]; then
  echo "▶  Initializing MariaDB data directory (first run only)…"
  mariadb-install-db --basedir=/usr --datadir="$DB_DIR/data" \
    --auth-root-authentication-method=normal --skip-test-db >/dev/null
fi

echo "▶  Starting MariaDB…"
setsid -f mariadbd --no-defaults --basedir=/usr \
  --datadir="$DB_DIR/data" \
  --socket="$SOCK" \
  --port="${MYSQL_PORT:-3306}" \
  --bind-address=127.0.0.1 \
  --pid-file="$DB_DIR/mysqld.pid" \
  --skip-name-resolve >> "$DB_DIR/mysqld.log" 2>&1 < /dev/null

for _ in $(seq 1 30); do
  if mysqladmin --socket="$SOCK" -u root ping >/dev/null 2>&1; then
    echo "✅ MariaDB is alive (socket: $SOCK, port: ${MYSQL_PORT:-3306})"
    exit 0
  fi
  sleep 0.5
done

echo "✖  MariaDB failed to start — see $DB_DIR/mysqld.log"
exit 1
