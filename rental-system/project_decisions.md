# 技術決策紀錄（ADR）

本文件記錄重要的架構與技術決策，避免重複討論已決定的方案。

---

## ADR-001：Google 登入使用 signInWithPopup 而非 signInWithRedirect

- **背景**：行動裝置瀏覽器 Google 登入導向 404，且 redirect 模式與 PWA service worker 衝突
- **決策**：全平台統一使用 `signInWithPopup`
- **理由**：`signInWithRedirect` 在 PWA 模式下，service worker 會攔截 OAuth callback，造成無限重導或空白頁；popup 模式不受影響
- **否決方案**：`signInWithRedirect` + `getRedirectResult`（導致 service worker 競態，仍失敗）

---

## ADR-002：LINE Bot 採多房東架構（?lid= 參數）

- **背景**：系統需支援多位房東，每位房東有獨立的 LINE Official Account
- **決策**：單一 `lineWebhook` Cloud Function，透過 URL query param `?lid={landlordId}` 識別房東，各房東的 Channel Secret/Token 存於 Firestore `line_configs/{landlordId}`
- **理由**：不需為每位房東部署獨立 Function，管理成本低；房東可自行在設定頁設定 LINE Bot
- **否決方案**：每位房東部署獨立 Function（維護複雜度過高）

---

## ADR-003：Admin 模擬房東使用 effectiveUid

- **背景**：Admin 需要以房東身份測試系統，查看房東資料
- **決策**：`authStore.impersonatingLandlord` 儲存被模擬的房東資訊，`effectiveUid` computed property 自動回傳有效 UID；所有 service 呼叫改用 `effectiveUid` 而非 `user.uid`
- **理由**：對 service 層透明，不需要傳遞額外參數
- **否決方案**：直接傳入 landlordId 參數（容易遺漏，維護麻煩）

---

## ADR-004：PDF 產生透過 Cloud Function（Puppeteer）

- **背景**：前端無法可靠地產生帶中文字型的 PDF
- **決策**：使用 `generatePdf` Cloud Function，以 Puppeteer + @sparticuz/chromium 將 HTML 渲染為 PDF
- **理由**：服務端渲染確保字型一致（Noto Serif TC），前端只需傳入 HTML 字串
- **否決方案**：html2canvas + jsPDF（中文字型支援不穩定）；雖然 `html2canvas` 仍有安裝供截圖用

---

## ADR-005：Firebase Emulator 用於本地開發

- **背景**：需要本地開發不影響正式資料
- **決策**：`npm start` 同時啟動 Firebase Emulator（Auth/Firestore/Functions/Storage）與 Vite dev server；`src/firebase/config.ts` 依 `import.meta.env.DEV` 自動切換連線目標
- **理由**：本地沙盒與雲端完全隔離，模擬器資料持久化於 `emulator-data/`
- **否決方案**：直接連雲端開發（有污染正式資料風險）

---

## ADR-006：租客上線流程（全螢幕模式 + 兩條建檔路徑 + 生命週期燈號）

- **背景**：簽約相關動作（建檔 / 簽約 / 收押金 / 入住點交）原本散落在 `tenants`、`contract`、`receipts` 等獨立分頁，彼此不串接、需各自重選租客，房東沒有「現在開始簽約」的明確入口與進度追蹤。
- **決策**：
  - 新增**全螢幕獨立模式** `OnboardingMode`（路由 `/landlord/onboarding/:tenantId?`，換掉後台 chrome：左側步驟導覽 / 頂欄進度 / 底部操作），裝整條上線：①建檔(必) → ②簽約 → ③收押金 → ④入住點交（後三步可略過）。
  - **建檔兩條路徑**：房東現場建（模式內①），或遠端**邀請連結 + 房東綁定碼**讓租客自填（待確認後核可，可選註冊並走 LINE 綁定）。
  - **可退出 / 暫存**：完成的步驟本身已落地為真資料（tenants / signed_contracts / receipts / moveInInspection）；進行中存 `tenants/{id}.onboarding = { status, step, skipped[], draft, updatedAt }`，「繼續上線」跳回原步帶回草稿。
  - **生命週期燈號** `tenantLifecycle()`（`utils/onboarding.ts`）：由現有欄位衍生 `上線中 / 待簽約 / 待點交 / 入住中 / 已退租`，顯示於 TenantList、Dashboard。入口為 Dashboard 顯眼處的「開始簽約」。
  - **②簽約**採「抽出共用 `ContractForm.vue` 真內嵌」（Contract 頁與精靈共用），非深連結。
- **理由**：多步驟流程用獨立全螢幕模式比 modal 清楚；URL/狀態對應步驟天生支援分次辦理與續做；建檔與在場動作本質不同（可遠端非同步 vs 雙方在場），拆開才符合實務。
- **否決方案**：① modal 精靈（多步驟空間不足、無 URL 續做）；② 只加 Dashboard 待辦深連結（仍跳頁、未解決重選租客）；③ 簽約步用深連結到現有 Contract 頁（非真一條龍，狀態不連續）。
- **落地分期**：Phase 1 資料模型 + 燈號 + Dashboard 入口 + 全螢幕骨架 + ①建檔 + 退出/暫存/繼續（已完成）；Phase 2 抽 `ContractForm` 接②、③、④；Phase 3 邀請連結 + 公開填寫頁 + 可選註冊/LINE 綁定。

---

## ADR 範本

### ADR-XXX：標題

- **背景**：
- **決策**：
- **理由**：
- **否決方案**：
