#!/usr/bin/env bash
# 啟動 dev server；從 3000 起找第一個空閒 port，讓平行 workspace 不會撞 port。
set -euo pipefail

PORT="$(node -e '
const net = require("node:net");
const tryPort = (p) => {
  const s = net.createServer();
  s.once("error", () => tryPort(p + 1));
  s.listen(p, () => s.close(() => console.log(p)));
};
tryPort(Number(process.env.PORT_START || 3000));
')"

mkdir -p .next
echo "$PORT" > .next/superset-dev-port
echo "Dev server → http://localhost:$PORT"
exec pnpm dev --port "$PORT"
