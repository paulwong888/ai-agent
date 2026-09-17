#!/bin/bash
BIN_PATH=$(cd "$(dirname "$0")" && pwd)
cd "$BIN_PATH" || exit 1
docker compose logs -f
