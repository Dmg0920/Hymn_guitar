#!/usr/bin/env bash
# 新 workspace 建立時執行：複製未追蹤的 env 檔、安裝依賴。需可重複執行。
set -euo pipefail

if [ -z "${SUPERSET_ROOT_PATH:-}" ]; then
  echo "SUPERSET_ROOT_PATH 未設定，略過 env 複製" >&2
else
  # .env* 被 gitignore，不會跟著 worktree 出現；.env.example 已被追蹤，不複製
  for f in "$SUPERSET_ROOT_PATH"/.env "$SUPERSET_ROOT_PATH"/.env.*; do
    [ -f "$f" ] || continue
    name="$(basename "$f")"
    [ "$name" = ".env.example" ] && continue
    if [ -e "$name" ]; then
      echo "已存在 $name，不覆蓋"
    else
      cp "$f" "$name"
      echo "已複製 $name"
    fi
  done
  if [ ! -f .env.local ] && [ ! -f .env ]; then
    echo "提醒：主 repo 沒有 .env / .env.local，請依 .env.example 建立（Supabase 金鑰）" >&2
  fi
fi

pnpm install --frozen-lockfile
