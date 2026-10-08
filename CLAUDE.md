# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 專案概要

IG 詩歌吉他帳的點歌網站（Next.js 16 App Router + Supabase Auth/Postgres/Storage，部署於 Vercel）。UI 與文件以繁體中文撰寫；setup 與日常後台流程見 `README.md`。

## 指令

套件管理用 pnpm。

```bash
pnpm dev                # 本機開發
pnpm lint
pnpm typecheck          # next typegen && tsc --noEmit
pnpm test               # node --test：scripts/**/*.test.mjs 與 src/**/*.test.ts
pnpm test:db            # 用 PGlite 跑 migration + seed，驗證 RLS、request_song()、constraint
pnpm catalog:build      # data/raw/*.txt → 重新產生 supabase/seed.sql
```

跑單一測試檔：`node --test src/lib/validation.test.ts`（測試不用 Jest/Vitest，是 Node 內建 test runner）。

環境變數見 `.env.example`；`SUPABASE_SECRET_KEY` 只能在伺服器端使用。

## 架構

**資料與權限都在資料庫層。** `supabase/migrations/`（依檔名順序套用；已上線的 migration 不要改，修正請加新檔）是 schema 來源：資料表（`profiles`、`songs`、`requests`、`request_log`、`feedback`、`favorite_songs`）、RLS policy、thumbnail storage bucket，以及 `request_song()` RPC。點歌的驗證（登入、暱稱、每日 10 首上限 `c_daily_limit`、已上傳/拒絕狀態、同歌合併計數）全在這個 RPC 內，並以 `raise exception '<code>'` 回傳錯誤代碼；`src/app/request/actions.ts` 的 `RPC_ERRORS` 把代碼對應成中文訊息，新增 RPC 錯誤代碼時兩邊要同步。改 migration 或 RLS 後要跑 `pnpm test:db`（它用最小的 Supabase auth/storage stub，不是真的 Supabase）。

**個人檔案（0006）預設私人。** `profiles` 新增 `bio`、`avatar_path`、`ig_handle`、`is_public`。公開檔案**只能**透過 `public_profiles` view 讀取（以擁有者權限執行、只選安全欄位，不含 `username` / `is_admin`，點歌只給總數）；不要為了公開檔案放寬 `profiles` 的 RLS 或 column grant。最愛詩歌只能經 `set_favorites()` 寫入；RPC 錯誤代碼對應在 `src/app/me/edit/actions.ts` 的 `FAVORITE_ERRORS`。頭像存在公開 bucket `avatars`，路徑一律是 `<user id>/<時間戳>.<ext>`（DB constraint 與 storage policy 都強制）；瀏覽器端先裁切縮小，Server Action 再用 magic bytes（`src/lib/avatar-type.ts`）驗證並上傳，換頭像時刪舊檔。徽章不入庫，由 `src/lib/badges.ts` 依統計即時計算。刪除帳號走 admin API `deleteUser`，靠 `on delete cascade` 清資料。

**Supabase client 有三種，不要混用**（`src/lib/supabase/`）：
- `server.ts`：以使用者 cookie 帶 session 的 server client，受 RLS 約束，Server Component / Server Action 預設用這個。
- `client.ts`：瀏覽器端。
- `admin.ts`：用 secret key、**會略過 RLS**，僅限帳號密碼註冊、管理員重設密碼與使用者刪除自己的帳號。

**Session 刷新在 `src/proxy.ts`**（Next 16 的 middleware 改名為 proxy）：每次導覽呼叫 `getClaims()` 並把 cookie 寫回。`createServerClient` 與 `getClaims` 之間不可插入其他邏輯。

**授權流程在 `src/lib/auth.ts`**：`getViewer()`（以 `cache` 做 request 內去重）→ `requireViewer(nextPath)`（未登入導 `/login`、無暱稱導 `/onboarding`）→ `requireAdmin()`（非管理員回 404，不透露後台存在）。頁面與 Server Action 都應在入口呼叫，不要只靠 UI 隱藏。

**登入方式有兩種**：帳號密碼（無需 email，為了 IG 內建瀏覽器）與 Email 6 位數 OTP。帳號密碼使用者在 Supabase Auth 中是假 email `帳號@<USERNAME_EMAIL_DOMAIN>`（預設 `users.hymn-guitar.invalid`，`usernameToEmail()` 產生）；上線後不可改該網域。

**頁面結構**（`src/app/`）：`/`（最新 5 首）、`/request`、`/me`（含 `/me/edit`、`/me/settings`）、`/admin`、公開檔案 `/u/[id]` 皆採「`page.tsx` + 同資料夾 `actions.ts`（Server Actions）+ client form 元件」。Action 統一回傳 `FormState`（`src/lib/form-state.ts`），輸入驗證集中在 `src/lib/validation.ts`。

**視覺語彙：「教會詩歌號碼板」＋「吉他六弦」。** 設計 token、`@utility`（`btn-primary`、`input`、`card`、`board`、`eyebrow`、`numeral`、`wrap*`…）與 keyframes 都在 `src/app/globals.css`；改色彩只動 `:root` 與暗色那一組變數。幾個慣例：
- 深色「號碼板」（`.board`）在亮暗兩個主題都維持深色；號碼、拉丁字用 `numeral`（Fraunces），中文標題用 `font-serif`（Noto Serif TC）。
- 表單控制項邊框用 `--field`（對底色 ≥ 3:1），裝飾分隔線才用 `--line` / `--line-strong`。改 token 後請重算對比度（文字 ≥ 4.5:1）。
- 動效只用 CSS 與原生 API，不引入動畫套件；一律尊重 `prefers-reduced-motion`。捲動進場用 `Reveal`（首屏與 SSR 永遠可見），弦的互動在 `GuitarStrings`。
- 日期一律走 `src/lib/format.ts`（固定台北時區），避免 server / client 時區不同造成 hydration 不一致。
**詩歌目錄是產生出來的。** `data/raw/hymns.txt`（詩歌本，只有分類沒有歌名）與 `supplement.txt`（補充本）經 `scripts/catalog.mjs` 解析、`scripts/build-seed.mjs` 輸出 `supabase/seed.sql`。seed 可重複執行且不覆蓋後台補上的歌名。不要手改 `seed.sql`，改 raw 資料後重新 `pnpm catalog:build`。

## 注意

- 帳號密碼註冊走 admin API，會略過 Supabase 內建限制，所以 `signUpWithPassword` 在 `createUser` 前先過 `passSignupGate()`（`register_signup_attempt()` RPC，依 IP／全站計數，只有 service_role 可呼叫；失敗一律拒絕）。目前沒有 captcha，且 `.invalid` 內部 email 流程尚未在真實 Supabase 驗證過（README「已知限制」）。
