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

## BF 範本

### BF-XXX：標題

- **問題描述**：
- **嘗試過程**：
- **根本原因**：
- **最終解法**：
- **牽扯檔案**：
