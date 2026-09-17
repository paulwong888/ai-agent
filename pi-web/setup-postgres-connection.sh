#!/bin/bash
set -euo pipefail

BIN_PATH=$(cd "$(dirname "$0")" && pwd)
cd "$BIN_PATH" || exit 1

CONN_NAME=${PG_CONN_NAME:-paul-db}

echo "==> Ensure pi-web is running"
docker compose up -d

echo "==> Configure pi-psql connection: ${CONN_NAME}"
docker cp setup-postgres-connection.js pi-web:/tmp/setup-postgres-connection.js
docker exec \
  -e PG_CONN_NAME="${CONN_NAME}" \
  -e PG_HOST="${PG_HOST:-host.docker.internal}" \
  -e PG_PORT="${PG_PORT:-5432}" \
  -e PG_DATABASE="${PG_DATABASE:-paul_db}" \
  -e PG_USER="${PG_USER:-paul}" \
  -e PG_PASSWORD="${PG_PASSWORD:-n8n_pass_!}" \
  pi-web node /tmp/setup-postgres-connection.js

echo "==> Test connection"
docker exec pi-web sh -c "cd /home/node/.pi/agent/npm/node_modules/pi-psql && node cli.js test ${CONN_NAME}"
docker exec pi-web sh -c "cd /home/node/.pi/agent/npm/node_modules/pi-psql && node cli.js query \"SELECT current_database() AS db, current_user AS usr\" -c ${CONN_NAME}"

echo "==> Done"
