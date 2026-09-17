#!/bin/bash
set -euo pipefail

BIN_PATH=$(cd "$(dirname "$0")" && pwd)
cd "$BIN_PATH" || exit 1

echo "==> Ensure pi-web is running"
docker compose up -d

echo "==> Copy login helper into container"
docker cp weixin-web-login.mjs pi-web:/tmp/weixin-web-login.mjs

echo "==> Start Weixin QR login page on port 9876"
echo "    浏览器打开: http://192.168.0.108:9876/"
echo "    扫码成功后，回到 pi-web 再执行 /weixin-login"
docker exec -it \
  -e PI_CODING_AGENT_DIR=/home/node/.pi/agent \
  pi-web node /tmp/weixin-web-login.mjs
