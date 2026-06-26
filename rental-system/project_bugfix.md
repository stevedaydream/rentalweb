# Bug 修復紀錄

本文件記錄重要技術 Bug 的根因與解法，避免重蹈覆轍。

---

## BF-001：手機瀏覽器 Google 登入導向 404

- **問題描述**：手機瀏覽器點擊「使用 Google 登入」後，跳轉至 404 頁面，無法完成登入。桌機瀏覽器正常。
- **嘗試過程**：
  1. 改用 `signInWithRedirect` → PWA service worker 攔截 callback，造成無限跳轉至 Login
  2. 加入 `getRedirectResult` → service worker 與 redirect 競態，仍失敗
  3. 改 `authDomain` 為 `web.app` → Google OAuth 未設定該 domain 的 handler，仍失敗
  4. 重建新的 Firebase 專案 → 問題依舊
  5. AI 建議加 FirebaseAuthHandler 路由 + IIFE → 空白畫面，更壞
  6. **加入 `web.app` 到 Google Cloud Console 已授權 JS 來源** → 解決
- **根本原因**：Firebase 新專案自動建立的 Google OAuth 用戶端只有 `firebaseapp.com`，沒有 `web.app`。從 `web.app` 發起的 `signInWithPopup` 被 Google OAuth 拒絕。
- **最終解法**：
  1. Google Cloud Console → APIs & Services → Credentials → Web client (auto created by Google Service) → 編輯
  2. 在「已授權的 JavaScript 來源」新增 `https://rental-system-7675e.web.app`
  3. 前端保持使用 `signInWithPopup`（不改為 redirect）
  4. `vite.config.ts` 加入 `navigateFallbackDenylist: [/^\/__/]`，防止 service worker 攔截 Firebase 內部路由
- **牽扯檔案**：`src/stores/auth.ts`（loginWithGoogle）、`vite.config.ts`

> **新 Firebase 專案部署後必做**：Google Cloud Console → Credentials → 已授權 JS 來源加入 `https://<project>.web.app`

---

## BF-002：本地 LINE Webhook 驗證失敗（Tunnel 指向錯誤 Port）

- **問題描述**：LINE Console Verify 失敗，回傳 domain 無法解析
- **根本原因**：Cloudflare Tunnel 誤設為 `:5173`（Vite 前端），應為 `:5001`（Firebase Functions 模擬器）
- **最終解法**：`cloudflared tunnel --url http://localhost:5001`（明確指定 Functions port）
- **牽扯檔案**：無程式碼修改，操作步驟問題

---

## BF-003：Dashboard 已收款帳單仍顯示未繳，金額全為 NT$0

- **問題描述**：在帳務管理標記帳單「已收款」後，Dashboard 的帳務概況（未繳筆數/金額）與本月工作清單「確認收款」步驟仍顯示未繳。金額概況亦顯示 NT$0。
- **根本原因**：`landlord/Dashboard.vue` 的帳單迴圈有兩個欄位對應錯誤：
  1. **狀態判斷**：只檢查 `data.status === 'paid'`，但帳務管理（`markPaid`、`generateMonthlyBills`）存入的是 `status: 'completed'`，導致已收款帳單落入未繳桶
  2. **金額欄位**：讀取 `data.totalAmount`，但帳單 schema 存的是 `data.amount`，金額全算為 0
- **最終解法**：兩行修正
  ```diff
  - const amount = Number(data.totalAmount) || 0;
  - if (data.status === 'paid') {
  + const amount = Number(data.amount) || 0;
  + if (data.status === 'completed' || data.status === 'paid') {
  ```
- **牽扯檔案**：`src/views/landlord/Dashboard.vue`（`fetchDashboardData` 函式帳務概況區段）

> **注意**：`Financials.vue` 的 `isCollected()` 已正確處理兩種狀態，Dashboard 是獨立讀取，不共用此函式，故需分別修正。

---

## BF-004：房源管理頁面崩潰（TypeError: Cannot read properties of undefined 'toLocaleString'）

- **問題描述**：開啟房源管理頁面時直接白畫面，Console 顯示 `TypeError: Cannot read properties of undefined (reading 'toLocaleString')`。
- **嘗試過程**：檢查錯誤 stack trace 指向 `RoomManagement` 的 template computed，定位到 `room.price.toLocaleString()` 與搜尋時的 `room.name.toLowerCase()` / `room.address.toLowerCase()`。
- **根本原因**：Firestore `rooms` collection 中存在欄位不完整的文件（缺少 `price`、`name`、`address` 等欄位），Vue computed 直接對 `undefined` 呼叫方法導致崩潰。不完整文件來源可能為程式碼直接寫入 Firestore（如匯入流程建立房間）時未帶齊所有欄位。
- **最終解法**：
  1. Template：`room.price.toLocaleString()` → `(room.price ?? 0).toLocaleString()`
  2. `filteredRooms` computed：`room.name.toLowerCase()` → `(room.name?.toLowerCase() ?? '')`，`room.address` 同理
  3. `MeterReadingImport.vue` 的 `createRoom` 函式補上所有必要欄位預設值（`price: 0, size: 0, address: '', layout, type, images, coverImage, isPublic`），避免寫入不完整文件
- **牽扯檔案**：`src/views/landlord/RoomManagement.vue`（template 第 103 行、`filteredRooms` computed）、`src/components/meter/MeterReadingImport.vue`（`createRoom` 函式）

> **注意**：凡是程式碼直接寫入 `rooms` collection（非透過 `RoomManagement.vue` 的 `saveRoom` 函式），都必須帶齊所有必要欄位，否則頁面渲染會崩潰。

---

## BF-005：Firebase Storage 上傳 403 Forbidden（storage/unauthorized）

- **問題描述**：房源管理頁面上傳圖片時，Console 顯示 `POST .../o?name=rooms/... 403 (Forbidden)`，`FirebaseError: storage/unauthorized`。
- **嘗試過程**：
  1. 確認 Firestore `_system/quotaControl` 封鎖旗標 → 文件不存在，非此原因
  2. 在 `firebase.json` 補上 `"bucket": "rental-system-7675e.firebasestorage.app"` 明確指定 bucket 後重新部署 → 仍然 403
  3. 移除 Storage Rules 內的 `isStorageBlocked()` 跨服務呼叫 → 解決
- **根本原因**：Storage Rules 內使用 `firestore.get()` 做跨服務讀取（cross-service rules），在正式環境中靜默失敗，導致整條 `allow write` 規則評估結果為拒絕，回傳 403。
- **最終解法**：簡化 `storage.rules`，移除 `isStorageBlocked()` 函式，改為單純驗證登入狀態：
  ```
  allow read: if request.auth != null;
  allow write: if request.auth != null;
  ```
  配額控制邏輯由 Cloud Function 負責，Storage Rules 不做跨服務 Firestore 呼叫。
- **牽扯檔案**：`storage.rules`、`firebase.json`

> **注意**：Storage Rules 內避免使用 `firestore.get()` / `firestore.exists()`，跨服務呼叫在正式環境不穩定且難以偵錯。

---

## BF-006：createTenantAccount / resetTenantPassword CF 拋出 `db is not defined`（500 Internal Server Error）

- **問題描述**：呼叫 `createTenantAccount` Cloud Function 時，前端收到 HTTP 500；Firebase Functions 記錄顯示 `ReferenceError: db is not defined at /workspace/index.js:1283`。`resetTenantPassword` 有相同問題。
- **嘗試過程**：由前端 500 錯誤排查，透過 Firebase Console → Functions → Logs 找到實際錯誤訊息。
- **根本原因**：`index.js` 中所有函式都以**函式體內** `const db = getFirestore()` 各自宣告 `db`（模組頂層沒有全域 `db`）。Cloud Functions v2 每個函式部署為獨立 Cloud Run 容器，模組作用域互相隔離。`createTenantAccount` 與 `resetTenantPassword` 直接使用 `db` 而未在函式體內宣告，在本機模擬器可能碰巧正常（同一 process），部署後必定爆 ReferenceError。
- **最終解法**：在兩個函式的 handler 最頂端各加一行：
  ```js
  const db = getFirestore();
  ```
- **牽扯檔案**：`functions/index.js`（`createTenantAccount` 第 1280 行、`resetTenantPassword` 第 1325 行）

> **注意**：`index.js` 新增任何使用 `db` / `getAuth()` 的 onCall 函式時，務必在 handler 內部自行宣告 `const db = getFirestore()`，不可假設模組頂層有全域變數。

---

## BF-007：續約後舊租期消失（一鍵續約立即覆寫合約租期）

- **問題描述**：在租約到期前按「一鍵續約」，續約手續完成後，合約內容立刻變成新的合約期間；舊的、尚未走完的租期不再顯示。
- **根本原因**：`TenantList.vue` 的 `confirmRenew` 採「原地覆寫」——直接 `updateDoc` 同一份 `contracts` 文件的 `startDate/endDate/rent`，並同步覆寫 `tenants.leaseStart/leaseEnd`。因此一按續約，畫面即把「下一期」當成「目前這期」，舊到期日只被存成 `previousEndDate` 字串、不再呈現。資料模型只能容納單一租期，是設計層面的缺陷而非單行 Bug。
- **最終解法**：改為「排程續約（pending next-term）」模型：
  1. 續約時**不動**目前租期，新租期存入 `contracts.pendingRenewal: { startDate, endDate, rent }`，並清除房東不續約註記與租客回覆狀態。
  2. 到期自動接續（兩道、皆冪等，gate＝「目前租期已走完 **且** 已到新起租日」，升級後清除 `pendingRenewal`）：
     - 前端惰性接續：`TenantList.startListeners` 載入合約時呼叫 `maybePromotePendingRenewal`，到期即升為正式租期並寫回 `tenants`。
     - 伺服端備援：`scheduledReminderDaily` 每日掃描 `where('pendingRenewal','!=',null)`，房東未開 App 時也能讓租客端正確切換。
  3. `Contract.vue` 的 `prefillFromRenewal` 改優先讀 `pendingRenewal`，重簽帶入的是新租期。
- **牽扯檔案**：`src/views/landlord/TenantList.vue`（`confirmRenew`、`maybePromotePendingRenewal`、`startListeners` 合約載入、`setLandlordRenewalDecision`、抽屜 UI）、`src/views/landlord/Contract.vue`（`prefillFromRenewal`）、`functions/index.js`（`scheduledReminderDaily` 排程接續備援）

> **注意**：續約相關功能切勿原地覆寫 `contracts` 的當期 `startDate/endDate`；新一期一律走 `pendingRenewal`，由「目前租期走完」的 gate 觸發接續。伺服端備援需重新部署 Functions 才生效。

---

## BF 範本

### BF-XXX：標題

- **問題描述**：
- **嘗試過程**：
- **根本原因**：
- **最終解法**：
- **牽扯檔案**：
