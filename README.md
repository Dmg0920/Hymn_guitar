# 詩歌吉他點歌

IG 詩歌吉他帳的點歌網站。觀眾用詩歌本／補充本號碼或歌名點歌；你上傳後貼上 IG 連結，首頁會顯示最新 5 首。

- **技術**：Next.js 16（App Router）+ Supabase（Auth、Postgres + RLS、Storage），部署到 Vercel
- **登入**：帳號密碼（不需 email，IG 內建瀏覽器可用），或 Email 6 位數驗證碼

## 功能

| 頁面 | 說明 |
| --- | --- |
| `/` | 最新上傳 5 首，最新一首標 NEW。不用登入 |
| `/request` | 點歌：詩歌本號碼（1–780、附1–6）、補充本號碼、或用歌名搜尋「其他」。已上傳的歌直接顯示縮圖連結 |
| `/me` | 我的點歌與狀態，可以取消 |
| `/feedback` | 意見箱：登入且有暱稱的使用者留言給站長（500 字內，每人 24 小時最多 5 則） |
| `/admin` | 你的後台：依點播數排序的待處理清單、改狀態、貼連結、上傳縮圖、補歌名、看誰點了什麼、幫使用者重設密碼 |
| `/admin/feedback` | 意見箱後台：看誰留了什麼、標已讀 / 未讀、刪除。`/admin` 右上角的按鈕會顯示未讀數 |

同一首歌被多人點會合併計數，不會重複列出。每人每天最多點 10 首（`request_song()` 裡的 `c_daily_limit`）。

## 第一次設定

### 1. 建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 建立免費專案
2. **SQL Editor** 依序執行：
   1. `supabase/migrations/` 裡的每個檔案，依檔名順序（`0001_init.sql`、`0002_...`）
   2. `supabase/seed.sql`（1,299 首詩歌目錄）

   之後新增的 migration 只要執行新的那一個檔案即可。

### 2. 環境變數

```bash
cp .env.example .env.local
```

到 **Project Settings → API Keys** 把三個值填進 `.env.local`。`SUPABASE_SECRET_KEY` 只能放在伺服器端。

### 3. Supabase Auth 設定（Email 驗證碼要用）

如果只用帳號密碼登入，可以先跳過這一步。

- **Authentication → Emails → SMTP Settings**：設定自己的 SMTP，例如 Gmail 應用程式密碼（`smtp.gmail.com`、port `587`）。Supabase 內建的寄信服務只能寄給專案團隊成員，對外一定要自己設定。
- **Authentication → Emails → Templates**：在「Magic Link」和「Confirm signup」兩個範本中加入 `{{ .Token }}`，信裡才會有 6 位數驗證碼。例如：
  ```html
  <h2>你的登入驗證碼</h2>
  <p style="font-size:24px;letter-spacing:4px"><b>{{ .Token }}</b></p>
  ```
- **Authentication → Sign In / Providers → Email**：保持「Confirm email」開啟。
- **Authentication → URL Configuration**：Site URL 設成正式網址。

### 4. 本機執行並設定自己為管理員

```bash
pnpm install
```

```bash
pnpm dev
```

打開 http://localhost:3000/login，用「註冊帳號」建立你自己的帳號。接著在 Supabase SQL Editor 執行（把 `你的帳號` 換掉）：

```sql
update public.profiles set is_admin = true where username = '你的帳號';
```

重新整理後，右上角會出現「後台」。

### 5. 部署到 Vercel

在 Vercel 匯入這個 repo，把 `.env.local` 的三個變數加到 **Environment Variables**，然後部署。最後把網址設成 Supabase 的 Site URL，並放到 IG 個人檔案的連結。

## 日常使用（後台）

1. 「待處理」分頁：依點播數排序
2. 開始練習時，狀態改成「練習中」，點歌的人會在「我的點歌」看到
3. 上傳後：貼 IG 連結、上傳縮圖（建議直接截 IG 貼文的正方形圖）、詩歌本補上歌名，狀態改成「已上傳」，然後儲存
4. 沒人點過、但你主動上傳的歌：用最上面的搜尋框找出來，用同樣方式編輯
5. 意見箱：`/admin` 右上角進入。意見會顯示留言者暱稱，要回覆就私訊對方（需先執行 `supabase/migrations/0004_feedback.sql`，沒執行的話使用者送出會失敗）

## 詩歌目錄

- 原始資料在 `data/raw/`：`hymns.txt`（詩歌本，**只有分類沒有歌名**）、`supplement.txt`（補充本，有歌名）
- 修改後執行 `pnpm catalog:build` 重新產生 `supabase/seed.sql`，再到 SQL Editor 執行一次。重複執行是安全的，不會覆蓋你在後台補上的歌名。
- 如果拿到詩歌本歌名清單，可以擴充 `scripts/catalog.mjs`，把歌名一起匯入。

## 開發

```bash
pnpm test
```

```bash
pnpm test:db
```

```bash
pnpm lint && pnpm typecheck
```

- `pnpm test`：目錄解析、輸入驗證的單元測試
- `pnpm test:db`：用 PGlite（WASM Postgres）跑 migration + seed，驗證 RLS、`request_song()`、`register_signup_attempt()`、constraint
- 帳號密碼註冊的帳號，在 Supabase Auth 裡是 `帳號@users.hymn-guitar.invalid` 這種內部 email（不會寄信），網域可以用 `USERNAME_EMAIL_DOMAIN` 改。

## 已知限制

- **註冊只有頻率限制，沒有 captcha**：帳號密碼註冊走 admin API，會略過 Supabase 內建限制，所以由 `register_signup_attempt()`（`0005_signup_rate_limit.sql`）依 IP 每小時 10 次、全站每小時 200 次計數（只存 IP 的 HMAC）。這擋得住單一腳本，擋不住大量不同 IP 的分散式攻擊；真的被濫用時再加 Cloudflare Turnstile。需要先在 SQL Editor 執行 0005，否則註冊會一律失敗。
- **Email 驗證碼的寄信額度是全站共用的**：所有請求都從伺服器發出，Supabase 會把它們當成同一個來源計算頻率限制。
- **詩歌本沒有歌名**：目前顯示分類，歌名在後台補上。
- 帳號密碼註冊使用 `.invalid` 網域的內部 email。這只在本機用 PGlite 測過，還沒在真的 Supabase 上驗證。第一次部署後請先實際註冊一個帳號試試看。

