# 開發環境 / 正式部署 切換指南

## 架構總覽

```
本地開發                          正式雲端
─────────────────                ─────────────────────────────
Vite Dev Server :5173  ←→  瀏覽器  →  Firebase Hosting (靜態)
Firebase Emulator :5001           →  Firebase Functions (asia-east1)
Firebase Emulator :8080           →  Firestore 雲端資料庫
Firebase Emulator :9099           →  Firebase Auth 雲端
cloudflared Tunnel                →  LINE Platform Webhook
```

---

## 一、本地開發（日常使用）

### 啟動步驟

```bash
# 一個指令同時啟動模擬器 + 前端
npm start
```

- 🔵 `[emulator]` — Firebase 模擬器（Firestore / Auth / Functions / Hosting）
- 🟢 `[vite]` — 前端開發伺服器

按 `Ctrl+C` 一次關閉所有 process，模擬器資料自動存回 `./emulator-data`。

瀏覽器開啟 `http://localhost:5173`

> 需要個別啟動時，也可以分開執行：
> ```bash
> # 終端機 1：模擬器
> npm run dev:emulator
>
> # 終端機 2：前端
> npm run dev
> ```

### 自動切換機制

`src/firebase/config.ts` 已設定好，Vite 開發模式（`import.meta.env.DEV === true`）會自動連線到模擬器：

| 服務 | 本地位址 | 說明 |
|------|----------|------|
| Auth | localhost:9099 | 帳號登入 |
| Firestore | localhost:8080 | 資料庫 |
| Functions | localhost:5001 | 後端函式 |
| Storage | localhost:9199 | 檔案儲存 |
| Emulator UI | localhost:4000 | 資料庫管理介面 |

> **注意**：本地資料與雲端資料完全分離，互不影響。

---

## 二、本地測試 LINE Bot（使用 Cloudflare Tunnel）

LINE 平台需要公開 HTTPS URL 才能傳送 Webhook，本地需要 Cloudflare Tunnel 建立臨時通道。

### 安裝 cloudflared（一次性）

```bash
# Windows（用 winget）
winget install Cloudflare.cloudflared

# 或從官網下載：https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
```

### 啟動流程

```bash
# 終端機 1：模擬器 + 前端
npm start

# 終端機 2：建立 Cloudflare Tunnel（暴露模擬器 functions port）
cloudflared tunnel --url http://localhost:5001
```

Tunnel 啟動後會看到類似：
```
https://xxxx-xxxx-xxxx.trycloudflare.com
```

### 設定 LINE Webhook（本地測試用）

將 LINE Developers Console → Webhook URL 改為：
```
https://xxxx-xxxx-xxxx.trycloudflare.com/rental-8897a/asia-east1/lineWebhook
```

> ⚠️ Cloudflare 免費 Tunnel URL 每次重啟都會變，需重新貼到 LINE Console。

### 設定本地 LINE 設定檔

模擬器的 Firestore 是空的，需手動建立 LINE 設定文件。

開啟 `http://localhost:4000`（Emulator UI）→ Firestore → 新增：
- Collection：`settings`
- Document ID：`line`
- 欄位：
  ```
  channelSecret      → 你的 Channel Secret
  channelAccessToken → 你的 Channel Access Token
  landlordId         → 你的 Firebase UID
  ```

> 或直接登入本地系統，到「設定 → LINE Bot」儲存即可。

---

## 三、正式部署

### 部署 Firebase Functions

```bash
cd functions
firebase deploy --only functions
```

### 部署前端到 Firebase Hosting

```bash
# Build（使用 .env.production）
npm run build

# 部署到 Firebase Hosting
firebase deploy --only hosting
```

### 部署 Firestore 規則

```bash
firebase deploy --only firestore:rules
```

### 一鍵全部部署

```bash
npm run build && firebase deploy --only functions,firestore:rules,hosting
```

---

## 四、環境變數對照

| 檔案 | 用途 | VITE_API_BASE |
|------|------|---------------|
| `.env.development` | 本地開發 | `http://localhost:5001/rental-8897a/asia-east1` |
| `.env.production` | 正式部署 | `https://asia-east1-rental-8897a.cloudfunctions.net` |

Vite 依據 `npm run dev`（DEV）或 `npm run build`（PROD）自動選擇。

---

## 五、LINE Webhook URL 對照

| 環境 | Webhook URL |
|------|-------------|
| 本地測試 | `https://<cloudflare-tunnel>/rental-8897a/asia-east1/lineWebhook` |
| 正式雲端 | `https://linewebhook-lwja67gasq-de.a.run.app` |

---

## 六、安全性規則說明

### Firestore 存取規則

| 集合 | 讀取 | 寫入 |
|------|------|------|
| `users` | 任何登入者 | 本人 / 房東 / Admin |
| `rooms` | 任何登入者 | 房東（自己的房間）/ Admin |
| `meter_readings` | 任何登入者 | 房東（自己的紀錄）/ Admin |
| `settings` | 房東 / Admin | 房東 / Admin |
| `tenants` | 房東 / 本人 / Admin | 房東 / Admin |
| `bills` | 房東 / 租客（自己的）/ Admin | 房東 / Admin |
| `repair_requests` | 房東 / 租客（自己的）/ Admin | 房東 / 租客（自己報修）|
| `announcements` | 任何登入者 | 房東（自己發的）|

### generatePdf 需要 Auth Token

`generatePdf` Cloud Function 要求 Firebase ID Token，前端呼叫時會自動附加，無需手動處理。若出現 401 錯誤，確認使用者已登入。

---

## 七、環境切換快速清單

### 本地 → 測試 LINE Bot

- [ ] `npm start` 已啟動（或 `npm run dev:emulator` + `npm run dev`）
- [ ] `cloudflared tunnel --url http://localhost:5001` 已啟動
- [ ] LINE Console Webhook URL 改為 Tunnel URL
- [ ] Emulator Firestore `settings/line` 文件已建立
- [ ] LINE Console → Use webhook 已開啟

### 本地 → 推送正式

- [ ] `firebase deploy --only functions` 部署函式
- [ ] `firebase deploy --only firestore:rules` 部署規則
- [ ] `npm run build` 打包前端
- [ ] `firebase deploy --only hosting` 部署前端
- [ ] LINE Console Webhook URL 改回正式 URL：
      `https://linewebhook-lwja67gasq-de.a.run.app`
- [ ] LINE Console 點 Verify 確認 200 OK

---

## 八、常見問題

### Q: 本地 LINE Webhook 驗證失敗
確認 Tunnel 有對應到 `localhost:5001`（不是 5173），且模擬器已啟動。

### Q: 本地 Firestore 資料與雲端不同步
這是正常的，本地模擬器是獨立沙盒。若需要雲端資料，要先 `export` 再 `import`：
```bash
# 匯出雲端資料到本地
firebase emulators:export ./emulator-data

# 下次啟動時載入（npm start 已內建此參數）
firebase emulators:start --import=./emulator-data
```

### Q: 部署後 Functions 出現 403
LINE Webhook function 需要 `invoker: 'public'`，已在 `functions/index.js` 設定。

### Q: npm run build 後前端 API 打到本地
確認 `.env.production` 的 `VITE_API_BASE` 為雲端 URL，不是 localhost。

### Q: generatePdf 回傳 401
確認使用者已登入，`auth.currentUser` 不為 null。若在模擬器測試，確認 Auth Emulator 已啟動（port 9099）。
