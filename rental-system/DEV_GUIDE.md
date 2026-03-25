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

> ⚠️ **多房東架構**：Webhook URL 必須帶 `?lid={房東UID}`，LINE 才知道這是哪位房東的 Bot。

將 LINE Developers Console → Webhook URL 改為：
```
https://xxxx-xxxx-xxxx.trycloudflare.com/rental-8897a/asia-east1/lineWebhook?lid=你的Firebase_UID
```

你的 Firebase UID 可在本地系統登入後，從瀏覽器 DevTools → Console 輸入 `firebase.auth().currentUser.uid` 取得，或到 Emulator UI → Authentication 查看。

> ⚠️ Cloudflare 免費 Tunnel URL 每次重啟都會變，需重新貼到 LINE Console。

### 設定本地 LINE 設定檔

本地模擬器透過 `functions/.env` 讀取 LINE 金鑰（不需要在 Emulator Firestore 手動建文件）：

```env
# functions/.env
LINE_CHANNEL_SECRET=你的_Channel_Secret
LINE_CHANNEL_ACCESS_TOKEN=你的_Channel_Access_Token
LINE_LANDLORD_ID=你的_Firebase_UID
```

> `functions/.env` 已加入 `.gitignore`，不會被提交。

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

> 多房東架構：每位房東的 Webhook URL 結尾需帶 `?lid={landlordId}`。

| 環境 | Webhook URL |
|------|-------------|
| 本地測試 | `https://<cloudflare-tunnel>/rental-8897a/asia-east1/lineWebhook?lid={UID}` |
| 正式雲端 | `https://asia-east1-rental-8897a.cloudfunctions.net/lineWebhook?lid={UID}` |

房東在系統「設定 → LINE Bot」頁面可直接複製帶有自己 UID 的完整 URL。

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
- [ ] `functions/.env` 已填入 `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_LANDLORD_ID`
- [ ] LINE Console → Webhook URL 改為 `https://<tunnel>/rental-8897a/asia-east1/lineWebhook?lid={UID}`
- [ ] LINE Console → Use webhook 已開啟
- [ ] LINE Console → 點 Verify → 回傳 200 OK

### 本地 → 推送正式

- [ ] `firebase deploy --only functions` 部署函式
- [ ] `firebase deploy --only firestore:rules` 部署規則
- [ ] `npm run build` 打包前端
- [ ] `firebase deploy --only hosting` 部署前端
- [ ] LINE Console Webhook URL 改回正式 URL：
      `https://linewebhook-lwja67gasq-de.a.run.app`
- [ ] LINE Console 點 Verify 確認 200 OK

---

## 八、LINE Bot Debug 排查流程

當 LINE Bot 沒有反應或出現錯誤時，依以下順序逐層排查。

---

### Layer 1：Tunnel 是否通？

**症狀**：LINE Console Verify 回傳 "A domain name that can't be resolved"

```bash
# 確認 cloudflared 有在跑，且看到 tunnel URL
cloudflared tunnel --url http://localhost:5001
# 應顯示：https://xxxx.trycloudflare.com

# 用 PowerShell 手動戳健康狀態
Invoke-WebRequest -Uri "https://xxxx.trycloudflare.com/rental-8897a/asia-east1/lineWebhook?lid=UID" -Method POST -Body '{"events":[]}' -ContentType "application/json"
# 正常應回傳：{"status":"ok"}
```

**常見問題**：
- Tunnel URL 重啟後換了 → 重新複製到 LINE Console
- 對到 `:5173`（前端）而不是 `:5001`（Functions）→ 確認 Tunnel 指向 `http://localhost:5001`
- 模擬器沒啟動 → 先跑 `npm start`

---

### Layer 2：Functions 有收到請求嗎？

**症狀**：LINE Console Verify 回傳 "A timeout occurred"

```bash
# 查看模擬器 log（npm start 的終端機輸出）
# 正常驗證 ping 應看到：
# [emulator] LINE webhook verification ping received
```

**如果 log 完全沒有輸出**：
- Tunnel 沒有通（回 Layer 1）
- Functions 模擬器沒啟動（確認 port 5001 有開）

**如果看到錯誤 log**：
```
LINE config error: 請在 functions/.env 填入...
```
→ `functions/.env` 未設定，參考第二節填寫

---

### Layer 3：簽章驗證通過了嗎？

**症狀**：LINE Console Verify 成功（200），但傳訊息沒回應

```bash
# 模擬器 log 應看到：
# Invalid LINE signature — possible spoofed request   ← 簽章錯誤
# LINE message saved   ← 成功處理
```

**簽章失敗原因**：
- `LINE_CHANNEL_SECRET` 填錯（注意：是 Channel **Secret** 不是 Channel ID）
- `rawBody` 被中介層改寫 → 目前已用 `req.rawBody || Buffer.from(JSON.stringify(req.body))` 處理

---

### Layer 4：?lid= 參數有帶嗎？

**症狀**：log 顯示 `missing ?lid= query param`，回傳 400

```bash
# 確認 Webhook URL 格式（注意 ?lid= 是必要的）
https://xxxx.trycloudflare.com/rental-8897a/asia-east1/lineWebhook?lid=YOUR_UID
```

**取得你的 Firebase UID**：
- Emulator UI → `http://localhost:4000` → Authentication → 找你的帳號
- 或：瀏覽器 Console → `firebase.auth().currentUser?.uid`

---

### Layer 5：訊息有存入 Firestore 嗎？

**症狀**：LINE Bot 沒有回覆指令，也沒收到一般訊息

```bash
# 模擬器 log 看有沒有 "LINE message saved"
# 到 Emulator UI → Firestore → messages collection 確認有沒有新文件
```

| log 內容 | 意義 |
|----------|------|
| `handleCommand: 帳單` | 指令被處理，不存入 messages |
| `LINE message saved` | 一般訊息已存入 Firestore |
| `Cannot get LINE profile` | LINE API 拿不到使用者資料（正常，不影響功能）|
| `Error looking up tenant by lineUserId` | 查租客資料失敗（可能是 Firestore 規則問題）|

---

### Layer 6：LINE API 回覆有成功嗎？

**症狀**：指令有被辨識但 LINE 沒收到回訊

```bash
# 模擬器 log 看有沒有 LINE SDK 錯誤
# 常見：
# "The access token is invalid"  → LINE_CHANNEL_ACCESS_TOKEN 填錯
# "Invalid reply token"          → replyToken 已過期（超過 30 秒）
# "The bot can't send messages"  → Channel 沒有啟用 Messaging API
```

**replyToken 過期**：本地開發時偶爾會因為中斷點或 log 太多導致處理超時。直接在 LINE App 再傳一次訊息。

---

### 快速排查清單

```
LINE Bot 沒反應？依序確認：

[ ] 1. cloudflared 在跑，且 URL 是最新的
[ ] 2. npm start 模擬器有跑（port 5001 開著）
[ ] 3. LINE Console Webhook URL 有帶 ?lid=UID
[ ] 4. LINE Console → Verify 回傳 200 OK
[ ] 5. functions/.env 三個欄位都填了（SECRET / TOKEN / LANDLORD_ID）
[ ] 6. 傳訊息後，模擬器終端機有出現 log
[ ] 7. Emulator UI → Firestore → messages 有新增資料
```

---

### 測試各功能的快速驗證方法

| 功能 | 測試方式 | 預期結果 |
|------|----------|----------|
| Webhook 連線 | LINE Console → Verify | 200 OK |
| 一般訊息 | 傳任意文字 | Emulator messages collection 新增一筆 |
| 選單指令 | 傳「選單」 | Bot 回覆功能選單 |
| 帳單查詢 | 傳「帳單」| Bot 回覆帳單（需先綁定）|
| 綁定流程 | 系統產生綁定碼 → 傳到 LINE | Bot 回覆「綁定成功」|
| 房東回覆 | 訊息頁面點回覆 | 租客 LINE 收到推播 |
| 帳單推播 | 新增一筆 income bill | 租客 LINE 收到帳單通知 |

---

## 九、Firebase 手機 Google 登入 Debug 紀錄

> 紀錄日期：2026-03-25｜專案遷移至 `rental-system-7675e` 時發生

### 問題描述

手機瀏覽器點擊「使用 Google 登入」後，跳轉至 404 頁面，無法完成登入。桌機瀏覽器正常。

### 根本原因

**Google Cloud Console 的「已授權的 JavaScript 來源」缺少 `web.app` 網域。**

Firebase 專案同時擁有兩個 Hosting 域名：
- `rental-system-7675e.firebaseapp.com`（Firebase 預設）
- `rental-system-7675e.web.app`（主要使用）

Firebase 自動建立的 OAuth 用戶端只加入了 `firebaseapp.com`，沒有加入 `web.app`。當 `signInWithPopup` 從 `web.app` 發起時，Google OAuth 拒絕了這個來源，導致 404。

### 修復步驟

Google Cloud Console → APIs & Services → Credentials → Web client (auto created by Google Service) → 編輯：

**已授權的 JavaScript 來源** 新增：
```
https://rental-system-7675e.web.app
```

儲存後等待 5 分鐘生效。

### 排查過程中走的彎路

| 嘗試 | 結果 |
|------|------|
| 改用 `signInWithRedirect` | 反而因 PWA service worker 攔截 callback 造成導向 Login 的無限迴圈 |
| 加入 `getRedirectResult` | service worker 與 redirect 流程競態，仍舊失敗 |
| 改 `authDomain` 為 `web.app` | Google OAuth 未設定該 domain 的 handler，仍失敗 |
| 重建新的 Firebase 專案 | 問題依舊，確認非舊專案資料問題 |
| AI 建議加 `FirebaseAuthHandler` 路由 + IIFE | 導致空白畫面，反而更壞 |
| **加入 `web.app` 到授權 JS 來源** | ✅ 解決 |

### 正確架構說明

```
signInWithPopup 流程（桌機 + 手機均使用）：

web.app（使用者頁面）
  ↓ 點擊 Google 登入
  ↓ Firebase 開啟 popup 到 firebaseapp.com/__/auth/handler
  ↓ 使用者在 popup 選擇 Google 帳號
  ↓ popup 關閉，signInWithPopup Promise resolve
  ↓ handleAuthSuccess() 讀取 Firestore profile
  ↓ 依 role 導向對應 Dashboard
```

**關鍵設定**：
- 使用 `signInWithPopup`（不用 `signInWithRedirect`），避免 PWA service worker 干擾
- `vite.config.ts` 加入 `navigateFallbackDenylist: [/^\/__/]`，讓 service worker 不攔截 Firebase 內部路由
- `auth.authStateReady()` 確保 Firebase Auth 初始化完成才執行路由守衛

### 新專案部署後必做清單

- [ ] Firebase Console → Authentication → Google Sign-in → 啟用，填入 Support Email
- [ ] Google Cloud Console → Credentials → Web client → 已授權 JS 來源加入 `https://<project>.web.app`
- [ ] Google Cloud Console → OAuth consent screen → 確認狀態（Testing 需加測試帳號，或 Publish）
- [ ] Firebase Console → Authentication → Settings → 授權網域確認有 `<project>.web.app`

---

## 十、常見問題

### Q: 手機 Google 登入導向 404
新 Firebase 專案的 Google Cloud OAuth 用戶端預設只有 `firebaseapp.com` 來源，需手動加入 `web.app`。詳見第九節。

### Q: 本地 LINE Webhook 驗證失敗
確認 Tunnel 有對應到 `localhost:5001`（不是 5173），且模擬器已啟動。URL 需帶 `?lid=UID`，詳細排查見第八節。

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
