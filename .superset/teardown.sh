#!/usr/bin/env bash
# workspace 刪除時執行：setup 本身不啟動任何服務，這裡只清掉殘留的 dev server。
set -uo pipefail

PORT_FILE=".next/superset-dev-port"
[ -f "$PORT_FILE" ] || exit 0

PORT="$(cat "$PORT_FILE")"
PIDS="$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null || true)"
for pid in $PIDS; do
  # 只殺 cwd 在本 workspace 內的程序，避免誤殺別的 workspace 後來佔用同 port 的 server
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
  case "$cwd" in
    "$PWD"*) kill "$pid" 2>/dev/null && echo "已停止 dev server (pid $pid, port $PORT)" ;;
  esac
done
exit 0
