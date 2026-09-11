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

## ADR-007：部分付款、前期欠款與預收餘額（2026-09-12）

- **背景**：帳單只有「未繳／已繳」兩態，欠 7000 先繳 5000 只能二選一（標已繳就少 2000、不標就一直顯示欠 7000）；帳務頁只看當月帳單，上個月的欠款要切回該月才看得到，生成帳單也不提示；「記一筆」收入一律另開新帳單，不會沖銷原本的欠款；租金出帳只憑「起租月 + 目前繳費方式」推算，改繳費方式後既有的季繳單不會跟著變，且會重複收或空窗。
- **決策**：
  - `bills` 新增 `paidAmount`（已收金額）與 `payments[]`（逐筆收款紀錄），**status 維持原四態**，部分付款只是「未結清但 paidAmount > 0」；剩餘金額一律由 `outstandingOf()` 計算
  - 收款**由最舊的開始沖銷**；「記一筆」手動登記時，所選類別先扣。溢繳存入 `tenants.credit`（預收餘額，另記 `creditLog[]`），下次生成帳單時依「租金 → 電費 → 公共電費」自動沖抵；退租時併入退款
  - 前期欠款**不併入新帳單**，而是在帳務頁、生成確認與摘要、繳費通知單、LINE 提醒裡另外列出
  - 租金出帳改看**涵蓋期間**（`coverFrom`／`coverTo`；舊單由 `getBillingDescription` 產生的固定格式摘要反推）：本月已被涵蓋就不出帳，否則從本月起接續一期；從未出過帳才沿用起租月推算。改繳費方式時，詢問是否把尚未繳清、仍在涵蓋期內的租金單改成新週期的一期
- **理由**：前後端十幾處用 `status in ['pending','overdue']` 撈未繳（LINE 查帳單、催繳、退租結算…），維持原狀態就不必逐處追改查詢；收入仍以帳單為單位，月度統計、年度損益與電費盈虧的口徑不變，只是「已收」改計實收金額。
- **否決方案**：① 新增 `partial` 狀態（上述查詢會全部漏掉繳了一半的帳單）；② 另開 payments collection 做分類帳（等於改掉全系統的收入口徑，年度報表與電費盈虧都得重寫）；③ 把前期欠款滾成新帳單的一行（同一筆欠款出現在兩張單上，收款時對不回原帳單，月度收入也會重複計算）；④ 改繳費方式時順便改起租日來對齊週期（竄改合約事實）

---

## ADR 範本

### ADR-XXX：標題

- **背景**：
- **決策**：
- **理由**：
- **否決方案**：
