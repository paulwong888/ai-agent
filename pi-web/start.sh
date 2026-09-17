#!/bin/bash
BIN_PATH=$(cd "$(dirname "$0")" && pwd)
cd "$BIN_PATH" || exit 1
mkdir -p ./data/agent
docker compose up -d --build
docker compose ps
