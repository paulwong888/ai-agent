#!/bin/sh
set -e

PI_DATA_ROOT="${PI_WEB_DATA_DIR:-/my-data}"
WEIXIN_DIR="${PI_WEB_WEIXIN_DIR:-${PI_DATA_ROOT}/weixin-bot}"
TODAY=$(date +%Y%m%d)
PI_CWD_NAME="pi-cwd-${TODAY}"
PI_CWD_TARGET="${PI_DATA_ROOT}/${PI_CWD_NAME}"
PI_CWD_LINK="/home/node/${PI_CWD_NAME}"

mkdir -p "$PI_CWD_TARGET" "$WEIXIN_DIR"

if [ -L "$PI_CWD_LINK" ]; then
  CURRENT=$(readlink "$PI_CWD_LINK")
  if [ "$CURRENT" != "$PI_CWD_TARGET" ]; then
    rm "$PI_CWD_LINK"
  fi
elif [ -e "$PI_CWD_LINK" ]; then
  rm -rf "$PI_CWD_LINK"
fi

if [ ! -e "$PI_CWD_LINK" ]; then
  ln -s "$PI_CWD_TARGET" "$PI_CWD_LINK"
fi

(
  PORT="${PORT:-30141}"
  HOST="${PI_WEB_INIT_HOST:-192.168.0.108}"
  PASS="${PI_WEB_PASSWORD:-}"
  AUTH=""
  if [ -n "$PASS" ]; then
    AUTH="-u pi:${PASS}"
  fi
  for DIR in "$PI_CWD_TARGET" "$WEIXIN_DIR"; do
    for _ in $(seq 1 30); do
      if curl -sf $AUTH -H "Host: ${HOST}" \
        -X POST -H "Content-Type: application/json" \
        -d "{\"cwd\":\"${DIR}\"}" \
        "http://127.0.0.1:${PORT}/api/cwd/validate" >/dev/null 2>&1; then
        break
      fi
      sleep 2
    done
  done
) &

exec pi-web --no-open "$@"
