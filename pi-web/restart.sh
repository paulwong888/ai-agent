#!/bin/bash
BIN_PATH=$(cd "$(dirname "$0")" && pwd)
cd "$BIN_PATH" || exit 1
"$BIN_PATH/shutdown.sh"
"$BIN_PATH/start.sh"
