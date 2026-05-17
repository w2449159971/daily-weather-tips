#!/bin/bash
# 在 Mac 上运行，供 iPhone（同一 WiFi）访问「出门小提示」
set -e
ROOT="$(dirname "$0")"
cd "$ROOT/www"
PORT="${PORT:-8765}"

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
echo ""
echo "=========================================="
echo "  出门小提示 · iPhone 访问"
echo "=========================================="
echo ""
if [ -n "$IP" ]; then
  echo "1) iPhone 连上与 Mac 相同的 WiFi"
  echo "2) Safari 打开: http://${IP}:${PORT}"
  echo ""
  echo "注意: 局域网 HTTP 下 iPhone 不能自动定位，请用手动录入。"
  echo "      需要自动定位请运行: ./start-iphone.sh --https"
else
  echo "未检测到 WiFi IP，请确认已连接 WiFi。"
fi
echo ""
echo "3) Safari 底部「分享」→「添加到主屏幕」"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=========================================="
echo ""

if [ "$1" = "--https" ]; then
  if ! command -v npx >/dev/null 2>&1; then
    echo "需要 Node.js/npx。安装后重试，或仅用 http://${IP}:${PORT}"
    exit 1
  fi
  python3 -m http.server "$PORT" --bind 0.0.0.0 &
  PID=$!
  trap "kill $PID 2>/dev/null" EXIT
  echo "正在创建 HTTPS 隧道（首次可能较慢）…"
  npx --yes localtunnel --port "$PORT"
else
  exec python3 -m http.server "$PORT" --bind 0.0.0.0
fi
