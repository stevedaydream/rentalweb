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

## BF 範本

### BF-XXX：標題

- **問題描述**：
- **嘗試過程**：
- **根本原因**：
- **最終解法**：
- **牽扯檔案**：
