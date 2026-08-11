# 專案總覽

## 專案概述

**租屋管理系統（rental-system）** — 多角色租屋管理 Web 應用（PWA），提供房東、租客、超級管理員三種使用情境。  
部署於 Firebase Hosting，後端運行於 Firebase Cloud Functions（asia-east1）。  
Firebase 專案 ID：`rental-system-7675e`

---

## 技術架構

| 層次 | 技術 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| 狀態管理 | Pinia |
| 路由 | Vue Router 4（history mode，role-based guard） |
| 樣式 | Tailwind CSS 4 |
| 後端 | Firebase Cloud Functions v2（Node.js，asia-east1） |
| 資料庫 | Firebase Firestore |
| 認證 | Firebase Auth（Email/Password + Google）|
| 儲存 | Firebase Storage |
| 部署 | Firebase Hosting（PWA，sw.js + manifest.json） |
| 監控 | Sentry（@sentry/vue） |
| PDF | Puppeteer + @sparticuz/chromium（Cloud Function） |
| LINE Bot | @line/bot-sdk，多房東架構（?lid= 參數） |
| Excel 匯入 | xlsx 套件 |

---

## 目錄結構

```
rental-system/
├── src/
│   ├── views/
│   │   ├── auth/          # Identity, Login, Register, Onboarding
│   │   ├── landlord/      # 房東所有頁面（共 14 頁）
│   │   ├── tenant/        # 租客頁面（共 6 頁）
│   │   ├── admin/         # 管理員頁面（共 5 頁）
│   │   └── explore/       # 公開找房 / 房東 Profile
│   ├── components/
│   │   ├── dashboard/     # Dashboard 小元件（5 個）
│   │   ├── financials/    # 帳單相關 Modal（5 個）
│   │   └── meter/         # 抄表元件（2 個）
│   ├── stores/            # Pinia：auth, bill, notification, toast, user
│   ├── services/          # Firestore CRUD：bill, meter, repair, room, tenant, announcement
│   ├── router/            # 路由設定（含角色守衛）
│   ├── firebase/          # Firebase 初始化與模擬器自動切換
│   ├── layouts/           # LandlordLayout, TenantLayout, SuperAdminLayout
│   └── types/             # TypeScript 型別與 Enum（index.ts）
├── functions/
│   ├── index.js           # 所有 Cloud Functions
│   └── templates/         # HTML 合約 / 收據範本（3 個）
├── public/                # PWA：sw.js, manifest.json, 圖片
├── firestore.rules        # Firestore 安全規則
├── firebase.json          # Firebase 配置
├── .env.development       # 本地開發環境變數
├── .env.production        # 正式環境變數
└── emulator-data/         # 本地模擬器持久化資料
```

---

## 資料庫 Schema（Firestore Collections）

| Collection | 主要欄位 |
|------------|---------|
| `users` | uid, role('landlord'\|'tenant'\|'admin'), landlordId? |
| `rooms` | id, name, status('occupied'\|'vacant'\|'maintenance'), landlordId, floor, rent, deposit, tenantId, tenantName, isPublic?, subGroupId?(電表子群組) |
| `tenants` | id, uid, name, email, phone, landlordId, roomId, roomName, boundLandlordCode, status('active'\|'inactive'), moveInDate, paymentFrequency('monthly'\|'quarterly'\|'semiannual'\|'yearly') |
| `bills` | id, tenantId, tenantName, landlordId, roomId, roomName, amount, status('pending'\|'waiting_confirmation'\|'completed'\|'overdue'), month, dueDate, paidAt, electricityFee, waterFee, managementFee, paymentProofUrl?, ecpayOrderId?, paymentMethod?, paymentGateway? |
| `payment_proofs` | id, billId, tenantId, landlordId, imageUrl, uploadedAt, ocrRaw?(預留), matchResult?(預留), status('pending'\|'approved'\|'rejected') |
| `repair_requests` | id, tenantId, tenantName, landlordId, roomId, type, description, status('pending'\|'processing'\|'resolved'), priority('low'\|'medium'\|'high'), imageUrl |
| `meter_readings` | id, landlordId, roomId, roomName, reading, previousReading, usage, readingDate, meterType?('public'=公共表, roomId=public_meters id), subGroupId?, cycle?('monthly'/'bimonthly'), cycleIndex?(1/2) |
| `meter_groups` | id, landlordId, name(台電總表), subGroups[{id, name(4樓/5樓)}] |
| `public_meters` | id, landlordId, groupId, subGroupId, name, landlordPays, lastMeterReading, lastMeterDate |
| `announcements` | id, landlordId, title, content, pinned |
| `messages` | landlordId, tenantId, content, source('line'\|'web'), ... |
| `contracts` | id, landlordId, tenantId, ... |
| `contract_templates` | doc ID = landlordId，HTML 範本 |
| `signed_contracts` | id, landlordUid, 簽署資料 |
| `line_configs` | doc ID = landlordId，LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN |
| `line_bindings` | 綁定碼，uid, expiry |
| `reviews` | id, landlordId, rating(1-5), isVisible, landlordReply |
| `public_profiles` | doc ID = uid，公開資訊（lineBotId 等） |
| `taipower_bills` | 台電帳單記錄，landlordId |
| `settings` | 全域系統設定（房東可讀寫） |
| `bill_generate_logs` | 帳單生成紀錄，landlordId, month, generatedAt, billCount, items[] |
| `maintenance` | 舊版報修（已被 repair_requests 取代，規則仍保留） |

---

## 已完成功能

### 認證系統
- Email/Password 登入與註冊
- Google OAuth 登入（signInWithPopup，避免 PWA service worker 干擾）
- 角色選擇（Onboarding 流程）
- 路由守衛（依 role 分流）
- Admin 模擬房東身份（impersonation，effectiveUid）

### 房東系統
- Dashboard（財務概覽、月度任務、快速抄表入口、報修摘要、房東 Profile）
- 房間管理（新增/編輯/刪除房間，狀態追蹤）
- 租客清單（新增/管理租客，綁定房間，解除房間綁定，刪除租客）
- 財務管理（帳單建立、收款記錄、台電帳單、統計圖表）
- 電費盈虧分析卡（2026-07-13 接回，Ver1.4 重構時意外斷線）：每月顯示，期間 = 當月＋前月；收入 = 電費＋公共電費帳單（實收依 isCollected）；錨定當月登錄的台電帳單，有 → 盈虧已結算、無 → 顯示「等待帳單」；位置在類別卡片與交易列表之間
- 繳費通知單列印（2026-07-13，未綁 LINE 租客的紙本過渡方案）：Financials「更多」→「列印帳單」Modal（月份＋房間勾選，預設全勾有帳單的房）；每房一頁 A4：本期項目（含已繳✓）、前期未繳紅字區、尚需繳納總額、電費計算標準區（方案/用電度數/平均每度/calcLog 計算過程）、繳費資訊（bankInfo）；範本 `src/templates/billStatement.html`（內嵌 PAGE 片段標記，前端逐房組頁）＋ functions 副本 `BillStatement` type；本地 printHtmlPdf 優先、伺服端 generatePdf fallback
- 抄表記錄（手動輸入 + Excel 批次匯入）+ 抄表歷史
- 電表群組計費（2026-07-12）：台電總表 → 樓層子群組 → 房間/公共電表三層結構；級距額度以群組內電表總數均分；公共電表電費 ÷ 子群組房數分攤（空房份額房東吸收、每表可設「房東負擔」）；生成帳單時自動產生獨立「公共電費」bill（防重複鍵 = 抄表id_roomId，缺抄表顯示警告）；抄表頁依樓層分區塊＋樓層小計；度數欄 Tab/Enter 直接跳下一欄、聚焦全選；未設群組自動 fallback 舊行為
- 累進電費對齊 Excel（2026-08-11）：`tieredConfig` 新增 4 項參數 —— `cycle`（單月獨立／台電雙月累積）、`cycleAnchor`（帳期第1月為奇/偶數月）、`dayScaling`（`full-month` 完整月不縮放，只有搬入搬出等不滿月才按比例縮小級距；`legacy` = 舊的 days/30；`none` 不縮放）、`minRate`（保底單價，預設 5 元/度，0 停用）。雙月制第 2 月改以「帳期累積度數」跑累進再扣掉第 1 月已收金額（第 1 月度數與金額由 `loadData` 的上月 `meter_readings` 帶入 `MeterEntry.cycleFirstUsage/cycleFirstCost`）。`defaultSettings.tiers` 更新為現行台電費率（夏 1.68/2.45/3.70/5.04/6.24/8.46、非夏 1.68/2.16/3.03/4.14/5.07/6.63）。新增 `normalizeSettings()` 補齊舊 Firestore 設定缺少的欄位（原本 `{...defaultSettings, ...snap.data()}` 淺合併會整包蓋掉 `tieredConfig`）
- 跨季級距拆分修正（2026-08-11）：`season: 'auto'` 且抄表期間橫跨夏月邊界（5/31、9/30）時，原本夏月段與非夏月段各自拿到「整期」的級距額度，等於低價級距被發兩次，金額低到比全用非夏月費率還便宜（100度少收 34%）。`calcPart` 改為接受 `share` 參數，級距用 `scaleFactor * share`，兩段依天數比例分攤額度；不跨季的期間結果不變
- 房間層電費方案「帶入全域設定」（2026-08-11）：房間的 `electricitySettings` 是整份設定的獨立副本，全域改費率不會連動，且畫面上看不出哪些房間過時。`types.ts` 新增共用的 `settingsFingerprint()`（mode/fixedRate/tieredConfig/tiers，欄位順序固定）。房間層設定 Modal 新增 `globalSettings` prop，開啟時比對，不同則顯示琥珀色提示與「帶入全域設定」按鈕（覆蓋 `local` 但不立即寫入，須按儲存），相同則顯示綠色一致提示。抄表列表同步標示：不一致的房間「個別方案」標籤與電費方案按鈕轉為琥珀色＋警告圖示，表格上方另有彙總橫幅列出所有不一致的房號
- 報修管理（查看/處理租客報修申請）
- 公告發布
- 合約管理（自訂範本、PDF 匯出、電子簽名、排程續約：續約後目前租期維持到期滿、新租期存 pendingRenewal 到期自動接續+通知租客+導向重簽；房東「標記不續約」註記）
- 收據管理（押金/保證書 PDF）
- 房東設定（LINE Bot 設定、個人資料）
- 訊息中心（LINE 訊息收發）
- 投資報酬計算機
- 大樓資訊
- 評價管理（隱藏/回覆）

### 租客系統
- Dashboard（帳單摘要、公告、報修狀態）
- 帳單查看與繳費記錄
- 公告瀏覽
- 報修申請（含圖片上傳）
- 聯絡房東
- 大樓資訊

### 管理員系統
- 房東管理（列表、詳情）
- 租客管理
- 資料庫管理
- 系統模擬器（模擬任意房東身份）
- 管理員 Dashboard

### 公開功能
- 找房頁（可不登入瀏覽空置房間）
- 房東 Profile 公開頁
- 評價系統

### LINE Bot
- 多房東架構（webhook URL 帶 ?lid={landlordId}）
- 租客綁定流程（綁定碼）
- 帳單查詢指令
- 房東推播帳單通知
- 房東回覆租客訊息
- 系統事件通知（帳單建立、公告）

### Cloud Functions
| 函式 | 說明 |
|------|------|
| `generatePdf` | 使用 Puppeteer 產生合約/收據 PDF，需 Auth Token；可選 `templateHtml`（重組時帶入凍結骨架，否則讀目前部署範本檔） |
| `getContractTemplate` | onRequest（需 Auth Token）：回傳目前部署的範本骨架 raw HTML + 版本，供前端簽署當下凍結進 `signed_contracts.templateHtml` |
| `lineWebhook` | LINE Bot webhook（多房東） |
| `sendLineReply` | Callable：房東回覆租客 LINE 訊息 |
| `sendLineBillNotifications` | Callable：推播帳單通知給租客 |
| `createTenantAccount` | Callable（房東/Admin）：以手機+身分證建立租客 Firebase Auth 帳號 |
| `resetTenantPassword` | Callable（Admin）：重設租客登入密碼 |
| `submitRenewalResponse` | Callable（租客）：回覆是否續租，同步 LINE 通知房東 |
| `notifyTenantRenewal` | Callable（房東）：一鍵續約後 LINE 通知租客新租期 |
| `lineWebhook`（房東指令） | webhook 內 `handleLandlordCommand`：房東本人（`lineUserId===ownerLineUserId`）可查租客/欠費/到期/電費/報修 |
| `notifyBillCreated` | Firestore 觸發：帳單建立時推播 LINE |
| `notifyAnnouncementCreated` | Firestore 觸發：公告建立時推播 |
| `scheduledReminderDaily` | 定時：每日繳費提醒 |
| `onReviewCreated` | Firestore 觸發：評價建立後處理 |
| `trackStorageOnUpload/Delete` | Storage 觸發：追蹤用量 |
| `budgetAlert` | PubSub：預算警告 |
| `dailyUsageCheck` | 定時：每日用量檢查 |

---

## 已知問題

- 手機 Google 登入（歷史 Bug，已解決）：須在 Google Cloud Console 手動加入 `web.app` 到已授權 JS 來源，詳見 DEV_GUIDE.md 第九節
- Cloudflare Tunnel URL 每次重啟後變更，需手動更新 LINE Console Webhook URL

---

## 開發階段歷程

| 版本 | 說明 |
|------|------|
| Ver 1.5 | 修復 LINE Bot |
| Ver 1.6 | 暫行版 |
| Ver 2.0 | 修復 Google 登入 |
| Ver 2.4 | 再次修復 Google 登入問題 |
| 最新 | 設定與環境設定更新、Firestore 規則與 Storage 管理加強 |
| 2026-04-11 | UX 全面優化：忘記密碼、錯誤訊息友善化、問候語動態化、Onboarding 主色統一、帳務 header 整理、生成帳單確認 Modal、租客報修緊急程度與展開詳情、空狀態改善 |
| 2026-04-11 | 導覽架構優化：租客手機端改為底部 Tab Bar（含數字 badge）、房東 Sidebar 工具群組折疊 |
| 2026-04-11 | 租客帳單手機卡片佈局、用電記錄數據卡、繳費/刪除自訂確認 Modal、Dashboard 新增房源帶 query param 自動開啟 |
| 2026-04-11 | 租客帳號系統：手機+身分證登入、房東建立帳號、Gmail 綁定提示、Admin 重設密碼 |
| 2026-04-11 | 退租系統設計：MoveOutWizard（A）、續約提醒+回覆（D）、歷史租客（B）、打包下載（C）（實作中） |
| 2026-04-13 | 繳費驗證規劃：短期截圖上傳+房東確認，中長期串接綠界金流；bills 新增 waiting_confirmation 狀態；新增 payment_proofs collection（含 OCR/比對預留欄位）；預留 ecpayOrderId / paymentGateway 欄位 |
| 2026-04-11 | 新 Firestore collection：moveOutRecords（退租摘要永久保留） |
| 2026-04-11 | rooms 新增欄位：lastMeterReading、lastMeterReadingDate（退租時寫入，下個租客電費基準） |
| 2026-04-11 | contracts 新增欄位：renewalStatus（pending/confirmed/declined）、renewalNote、renewalRespondedAt |
| 2026-04-11 | tenants 新增欄位：isHistorical（bool）、moveOutSummary（object） |
| 2026-06-04 | 全站 web-design-guidelines 審查與修正（P0–P3）：ToastContainer 補 aria-live、10 個 Modal 補 role="dialog"、全站 RouterLink 替換導航按鈕、div/tr 互動元素語意化、confirm() 改 inline 確認、icon aria-hidden/aria-label 補齊、autocomplete 補齊、label for/id 綁定、focus-visible:ring 替換 outline-none、`…` 省略號統一、Intl.DateTimeFormat 替換硬編碼日期 |
| 2026-06-04 | auth/Identity.vue + auth/Onboarding.vue 全面重新設計（frontend-design skill）：Identity 採「業主証件」深黑 Editorial 風格雙卡片，Onboarding 採羊皮紙底色合約文件風格底線輸入欄 |
| 2026-06-05 | 繳費方式功能（paymentFrequency）：支援月繳/季繳/半年繳/年繳，入口於 TenantList Drawer 編輯、新增 Modal、Contract Step 1；帳單生成自動依週期跳月、金額乘倍數；Preview.vue 第三條條款反映頻率 |
| 2026-06-05 | Financials 帳單生成摘要：生成後顯示本次明細卡片（含各租客應收合計），切換月份自動隱藏 |
| 2026-06-05 | Financials 生成紀錄持久化：每次生成寫入 bill_generate_logs collection；按鈕顯示本月生成次數 badge；歷史 icon 可開 Modal 查看每次明細與各租客應收 |
| 2026-06-23 | 修正 TenantList 繳費狀態誤判：原 `refreshBillStatuses` 將 `dueDate < today` 判斷置於 `completed` 之前，導致已繳清帳單只要過截止日即被標逾期（全部租客誤顯示逾期）。改為先判斷 `completed`，與 Dashboard / Financials 一致 |
| 2026-06-23 | 統一收款日期欄位：所有收款路徑（Financials markPaid、TenantList markDrawerBillPaid）以 `paidAt` 為準；確認租客截圖時 `paidAt` 取租客 `paymentDate`。新增遲繳顯示（方案 A）：帳務頁已收款列與租客抽屜帳單，當 `(paidAt‖paymentDate) > dueDate` 顯示「遲繳 N 天」橘色標籤（純推算、未存欄位） |
| 2026-06-23 | 房東一鍵續約：TenantList 抽屜「一鍵續約」按鈕 + 確認 Modal（新起租日自動帶、續約年限、新到期日/租金可調）→ 更新 contracts/tenants 租期與租金、清除 renewalStatus、寫入 `previousEndDate`/`lastRenewedAt` → callable `notifyTenantRenewal` 推 LINE 通知租客 → 導向 Contract.vue（`?renew=contractId` 預填租客/房源/新租期/租金）完成重簽 |
| 2026-06-24 | LINE 房東查詢指令：維持「每房東一頻道（?lid=）」架構，webhook 加 `handleLandlordCommand`，房東本人發話（`lineUserId===config.ownerLineUserId`）走房東處理器。指令：`租客 <房號>`（綜合卡：繳費/到期/電表/報修）、`欠費`、`到期`(90天)、`電費 <房號>`、`報修`、`選單`。模擬器以 `LINE_OWNER_USER_ID` env 啟用 |
| 2026-06-24 | TenantList 手機表格優化：`<table>` 加 `min-w-[760px] whitespace-nowrap`，窄螢幕改水平捲動，欄位內容不再逐字斷行成直行 |
| 2026-06-24 | 同上手機表格優化套用至 Financials（交易明細表 `min-w-[880px]`）與 MeterReading（主抄表表 `min-w-[820px]`）|
| 2026-06-24 | 手機「直行」全站排查：所有資料表加 `min-w-[…] whitespace-nowrap`（Messages、RepairRequests、MeterReadingHistory×2、Announcements、InvestmentCalculator、admin TenantManagement/LandlordManagement）；tenant/Bills 表為 `hidden md:block`（手機用卡片）故略過 |
| 2026-06-27 | 合約範本凍結（真快照）：原本 `signed_contracts` 只凍資料，重組（`redownloadContract`→`generatePdf`）時法律條文骨架仍讀「目前部署」的 `functions/templates/contractTemplate.html`，骨架改版會讓舊約走樣。新增 callable `getContractTemplate` 回傳 raw 骨架+版本；簽署當下將整份骨架凍進 `signed_contracts.templateHtml`（+`templateVersion`，約 15KB）；`generatePdf` 改為優先用傳入的 `templateHtml`、否則 fallback 讀檔（向後相容舊約與其他範本類型）。為日後「搬手機本地重組」鋪路：快照自帶骨架，可零伺服器渲染 |
| 2026-06-27 | 續約改為「排程續約」：修正原本 confirmRenew 立即覆寫合約租期、導致舊租期未走完即消失的問題。改為新租期存入 `contracts.pendingRenewal`，目前租期維持顯示，到期後由前端惰性接續（TenantList 載入時）＋ `scheduledReminderDaily` 伺服端備援自動升為正式租期（皆冪等，gate 為「目前租期已走完且已到新起租日」）。Contract.vue `prefillFromRenewal` 改優先讀 `pendingRenewal`。新增房東「標記不續約」（`contracts.landlordRenewalDecision='not_renewing'`，可取消），抽屜顯示下一期與不續約紅標；contracts 新增欄位 `pendingRenewal`、`landlordRenewalDecision` |
| 2026-07-07 | TenantList 統計卡可點擊：在租人數/即將到期/逾期欠費三卡改為按鈕，點擊開啟 `TenantStatModal`（新元件 `components/tenants/`），列出該條件租客（到期卡顯示剩餘天數與已續約標記），點租客直接開抽屜；`stats` 重構為由 `statTenants` computed 派生，到期判斷統一走 `isExpiringSoon` |
| 2026-07-07 | TenantList 合約到期顯示優化：「即將到期」badge 改顯示剩餘天數（`剩餘N日`）；已排程續約（`pendingRenewal`）時 badge 轉綠並標「（已續約）」，租期欄多顯示一行綠色「續: 新租期起迄」；抽屜到期 badge 同步此邏輯 |
| 2026-07-07 | Dashboard 帳務概況卡可點擊：未繳費/已繳費/逾期欠費三卡改為按鈕，點擊開啟 `BillStatusModal`（新元件），依租客分組顯示該條件下帳單明細與小計，底部連往帳務管理；明細於 fetchDashboardData 掃 bills 時一併收集，無額外查詢 |
| 2026-06-24 | 真正根因修正：手機「直行」其實出自統計卡而非表格——MeterReading「統一抄表日」卡用 `flex justify-between` 把中文字與 date input 並排，手機卡片過窄將中文擠成一字一行。改為 `flex-col sm:flex-row` 手機堆疊 + 文字容器 `min-w-0` + 標籤 `whitespace-nowrap` |
