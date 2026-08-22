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
| 單元測試 | Vitest（`environment: 'node'`，純函式；已接入 `npm run build` 作為部署前 gate） |

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
│   │   ├── dashboard/     # Dashboard 小元件（6 個）
│   │   ├── financials/    # 帳務元件（7 個：月份/帳單/台電/列印/歷史/稅費/年度）
│   │   ├── rooms/         # 建物管理（PropertyTab, PropertyFormModal）
│   │   ├── tenants/       # 租客元件（TenantStatModal, RentSubsidyFields）
│   │   └── meter/         # 抄表元件（2 個）
│   ├── stores/            # Pinia：auth, bill, notification, toast, user
│   ├── services/          # Firestore CRUD：bill, meter, repair, room, tenant,
│   │                      #   announcement, meterGroup, publicMeter, property, propertyCost
│   ├── utils/meter/       # 電費計算純函式 + 單元測試（calc / groups / sections / billing）
│   ├── utils/financials/  # 帳務純函式 + 單元測試（tenantGroups / electricity /
│   │                      #   propertyCosts / incomeTax / annualSummary / reminders）
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
| `rooms` | id, name, status('occupied'\|'vacant'\|'maintenance'), landlordId, floor, rent, deposit, tenantId, tenantName, isPublic?, subGroupId?(電表子群組), **propertyId?(所屬建物)** |
| `property_costs` | id, landlordId, type('房屋稅'\|'地價稅'\|'火災險'), periodStart/periodEnd(所屬期間，與繳款日分開), amount(稅單總額), allocations[{propertyId, amount}](加總須等於 amount), dueDate, paidAt?, docNo?, attachmentUrl?, billIds[](落帳產生的 bills，供同步/回收)　※**無論繳沒繳都存在；只有標記已繳時才依 allocations 落帳到 `bills`**，因帳務頁「本月支出」不看狀態、月內全算，未繳先落帳會讓當月支出提前虛增 |
| `properties` | id, landlordId, name, address?, houseTaxNo?(房屋稅籍), landNos?[](地號，一棟可多筆), fireInsurance?{insurer,policyNo,startDate,endDate,amount}, publicWelfare?[{year,houseTax,landTax,incomeTax,docNo,validFrom,validTo}], seededFromGroupId?(遷移冪等標記)　※**建物＝稅／險／公益出租人的歸屬單位，與 `meter_groups`（台電總表）是兩個獨立維度**：台電按電號寄帳單，一棟可能兩個電號、公共電表也可能跨棟 |
| `tenants` | id, uid, name, email, phone, landlordId, roomId, roomName, boundLandlordCode, status('active'\|'inactive'), moveInDate, paymentFrequency('monthly'\|'quarterly'\|'semiannual'\|'yearly'), **rentSubsidy?{hasSubsidy, from, to, docNo}**（政府租金補貼＝公益出租人資格的**事實來源**，與 `properties.publicWelfare`（稅捐處實際核定年度）分開存，兩者不一致時系統提示落差） |
| `bills` | id, tenantId(租客 uid，手動建立的租客為 null), relatedTenantDocId(tenants 文件 ID), landlordId, target(`姓名 房號` 字串), date(YYYY-MM-DD), type('income'\|'expense'), category('租金收入'\|'電費'\|'公共電費'…), description, amount, status('pending'\|'waiting_confirmation'\|'completed'\|'overdue'), dueDate, paidAt, relatedUsageId?, history[], paymentProofUrl?, ecpayOrderId?, paymentMethod?, paymentGateway?　※**無 tenantName / roomName / month 欄位**，租客資訊須以 relatedTenantDocId / tenantId 反查 `tenants` |
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
| `taipower_bills` | 台電帳單記錄，landlordId, month(迄月), amount, usage, groupId(所屬台電總表) |
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
- Dashboard（財務概覽、月度任務、用電概況、報修摘要、房東 Profile）
- 用電概況卡（2026-08-11，取代壞掉的「電表快速登錄」）：唯讀卡片，顯示本月抄表進度（分母＝在租房間＋公共電表，與抄表頁 `billableEntries` 同定義）、未抄清單、本月用電度數／電費、較上月增減％、用電排行（前 5 名含長條圖，公共表以紫色區分），底部保留前往抄表頁入口。舊的 `MeterQuickEntry.vue` 已刪除，其問題：讀 `rooms.currentMeter`（不存在，上期度數恆為 0）、寫 `meter_readings` 用 `{reading, date, type:'manual_quick'}` 缺 `periodEnd`／`usage`／`cost`（查詢與帳單生成皆讀不到，形同孤兒文件）、回寫 `rooms.currentMeter`／`lastMeterUpdate` 而非 `lastMeterReading`／`lastMeterDate`（基準度數未更新）
- 房間管理（新增/編輯/刪除房間，狀態追蹤）
- 租客清單（新增/管理租客，綁定房間，解除房間綁定，刪除租客）
- 財務管理（帳單建立、收款記錄、台電帳單、統計圖表）
- 電費盈虧分析卡（2026-07-13 接回，Ver1.4 重構時意外斷線；2026-08-21 大改，見下方「稅務與保險整併」）：**逐台電總表各一張卡**，期間錨定該棟台電帳單的迄月而非檢視月份；收入 = 該棟的電費＋公共電費帳單（實收依 isCollected）。位置在類別卡片與交易列表之間
- 繳費通知單列印（2026-07-13，未綁 LINE 租客的紙本過渡方案）：Financials「更多」→「列印帳單」Modal（月份＋房間勾選，預設全勾有帳單的房）；每房一頁 A4：本期項目（含已繳✓）、前期未繳紅字區、尚需繳納總額、電費計算標準區（方案/用電度數/平均每度/calcLog 計算過程）、繳費資訊（bankInfo）；範本 `src/templates/billStatement.html`（內嵌 PAGE 片段標記，前端逐房組頁）＋ functions 副本 `BillStatement` type；本地 printHtmlPdf 優先、伺服端 generatePdf fallback
- 抄表記錄（手動輸入 + Excel 批次匯入）+ 抄表歷史
- 電表群組計費（2026-07-12）：台電總表 → 樓層子群組 → 房間/公共電表三層結構；級距額度以群組內電表總數均分；公共電表電費 ÷ 子群組房數分攤（空房份額房東吸收、每表可設「房東負擔」）；生成帳單時自動產生獨立「公共電費」bill（防重複鍵 = 抄表id_roomId，缺抄表顯示警告）；抄表頁依樓層分區塊＋樓層小計；度數欄 Tab/Enter 直接跳下一欄、聚焦全選；未設群組自動 fallback 舊行為
- 累進電費對齊 Excel（2026-08-11）：`tieredConfig` 新增 4 項參數 —— `cycle`（單月獨立／台電雙月累積）、`cycleAnchor`（帳期第1月為奇/偶數月）、`dayScaling`（`full-month` 完整月不縮放，只有搬入搬出等不滿月才按比例縮小級距；`legacy` = 舊的 days/30；`none` 不縮放）、`minRate`（保底單價，預設 5 元/度，0 停用）。雙月制第 2 月改以「帳期累積度數」跑累進再扣掉第 1 月已收金額（第 1 月度數與金額由 `loadData` 的上月 `meter_readings` 帶入 `MeterEntry.cycleFirstUsage/cycleFirstCost`）。`defaultSettings.tiers` 更新為現行台電費率（夏 1.68/2.45/3.70/5.04/6.24/8.46、非夏 1.68/2.16/3.03/4.14/5.07/6.63）。新增 `normalizeSettings()` 補齊舊 Firestore 設定缺少的欄位（原本 `{...defaultSettings, ...snap.data()}` 淺合併會整包蓋掉 `tieredConfig`）
- 跨季級距拆分修正（2026-08-11）：`season: 'auto'` 且抄表期間橫跨夏月邊界（5/31、9/30）時，原本夏月段與非夏月段各自拿到「整期」的級距額度，等於低價級距被發兩次，金額低到比全用非夏月費率還便宜（100度少收 34%）。`calcPart` 改為接受 `share` 參數，級距用 `scaleFactor * share`，兩段依天數比例分攤額度；不跨季的期間結果不變
- 房間層電費方案「帶入全域設定」（2026-08-11）：房間的 `electricitySettings` 是整份設定的獨立副本，全域改費率不會連動，且畫面上看不出哪些房間過時。`types.ts` 新增共用的 `settingsFingerprint()`（mode/fixedRate/tieredConfig/tiers，欄位順序固定）。房間層設定 Modal 新增 `globalSettings` prop，開啟時比對，不同則顯示琥珀色提示與「帶入全域設定」按鈕（覆蓋 `local` 但不立即寫入，須按儲存），相同則顯示綠色一致提示。抄表列表同步標示：不一致的房間「個別方案」標籤與電費方案按鈕轉為琥珀色＋警告圖示，表格上方另有彙總橫幅列出所有不一致的房號
- 手動新增帳單歸戶修正（2026-08-11）：帳務「新增一筆」選租客時只寫 `target` 字串且格式為「房號 姓名」，而自動生成的是「姓名 房號」，`PrintBillsModal.belongsToRoom` 兩種比對都落空 → 手動帳單不會出現在繳費通知單（本期項目與前期未繳皆是；與 status 無關，該函式不濾 status）。修法：`BillTransactionModal` 選到租客時寫入 `relatedTenantDocId` / `tenantId`（自由輸入或清空時以空值解除綁定，用 `''`／`null` 而非 delete 才能讓 updateDoc 真的清除；以 `openedTarget` 判斷是否真被改動，避免開啟編輯時誤清既有綁定），`tenantsList` 補傳 `uid`；`belongsToRoom` 同時接受兩種 target 字串順序以救回既有資料
- 級距分母排除未分組電表（2026-08-11）：`roomCount` 原為 `meterData.length`（全部電表），未綁定子群組的房源（如測試房、其他物件）也被算進去，分母被灌大導致級距變小、電費高估。改為已建立子群組時只計入 `subGroupId` 在該群組內的電表，未建子群組則 fallback 全部（維持舊行為），並以 `Math.max(1, …)` 防除以 0。抄表頁另加紅色警示橫幅列出未綁定子群組的電表：它們雖已排除在分母外，但仍會套用此群組的累進參數計算（系統目前只支援單一台電總表，`calculateElectricity` 一律取 `meterGroups[0]`）；警示對象限 `billableEntries`（在租房間＋公共表），排除空房（本就不計費）與已改固定費率的房間（提前返回不受影響），確保橫幅只在真的會出錯時出現
- 繳費通知單「分別存檔」（2026-08-11，租客尚未綁 LINE 的替代通知方式）：原本只能合併成一份多頁 PDF（`printHtmlPdf` 一次呼叫 = 一個列印對話框）。新增逐房呼叫伺服端 `generatePdf` 產生獨立檔案（`繳費通知單-{房號}-{月份}.pdf`），逐筆進度顯示、單房失敗不中斷並回報失敗清單。配套：`generatePdf` 新增 `pdfMargin` 參數（未傳沿用原本 10mm），因 billStatement 範本的 `.sheet` 已是滿版 210×297mm，套 10mm 邊界會溢出產生空白頁；`firebase.json` 的 `/generatePdf` rewrite 補上 `"region": "asia-east1"`（函式非部署於預設的 us-central1）
- 編輯租客 Drawer 補回半年繳選項（2026-08-11）：`TenantList.vue` 的編輯 Drawer 繳費方式下拉漏了 `semiannual`（新增租客 Modal 與 ContractForm 都有，後端 `shouldGenerateBill`／`getBillingAmount`／`getBillingDescription` 也早已支援），導致既有租客無法改成半年繳、且原本是半年繳者開啟編輯時下拉顯示空白
- 多台電總表支援 — Phase A 計算層（2026-08-12）：`meter_groups` collection 本來就可存多筆、`public_meters.groupId` 早已存在，主要瓶頸在計算層寫死 `meterGroups[0]`。改動：`MeterGroupDoc` 新增 `officialMetersCount?`（原寫死 1）與 `electricitySettings?`；`MeterEntry` 新增 `groupId`；`types.ts` 新增 `UNGROUPED_ID`。載入時以 `Map<subGroupId, groupId>` 反查房間所屬總表（**rooms 僅存 subGroupId，靠此反查免除 schema 遷移**），公共表優先用自身 `groupId`。級距分母改為每群組獨立計算，未歸屬者自成一組不影響他棟；無任何群組時全部視為一組（維持舊行為）。設定優先序改為 房間個別 > 所屬群組 > 全域（`getRoomSettings`）；`cycleIndex` 由 computed 改為 `getCycleIndex(s)` 以支援各群組不同帳期；`calculateElectricity` 改用 `getRoomGroup(room)`。抄表存檔改記錄該筆實際採用的 `mode`／`cycle`／`cycleIndex`（原本一律寫全域值）並新增 `groupId`。`sections` 改為走訪所有群組的子群組，多群組時標題加上總表名稱。帳單分攤制的總表輸入區原本就是 `v-for="group in meterGroups"`，自動支援多顆。- 多台電總表支援 — Phase C 抄表頁群組頁籤（2026-08-12）：頂部新增總表頁籤（僅在 >1 顆時顯示），每個頁籤帶「已抄/應抄」徽章（綠=完成、橘=未完成），不必逐頁點開就知道哪棟還沒抄。`activeGroupId` 驅動 `scopedData`，`occupiedRooms`／`vacantRooms`／`publicEntries`／`billableEntries`／`totalEstimatedCost`／`sections` 全部限縮至目前總表；`sections` 只走該總表的子群組，標題不再需要總表前綴。統計卡改讀 `activeSettings`（群組層 > 全域），並顯示該組電表數與「專屬方案」標記；表頭與帳單分攤區塊同步改用 `activeSettings`／`activeGroup`。警示橫幅（未分組、個別方案過時）改用 `allBillableEntries` 維持跨總表。**儲存仍為全域**（`pendingSaveRooms` 不限縮），切換頁籤不會遺失已輸入但未儲存的度數
- 多台電總表支援 — Phase B 設定頁（2026-08-12）：`MeterSettingsModal` 群組管理由單一群組改為 N 顆總表，每顆可編輯名稱、`officialMetersCount`、子群組、公共電表，並可新增／刪除總表（刪除時連帶移除其公共電表、解除房間綁定）。新建總表使用暫時 id，儲存時先 `addMeterGroup` 取得真實 id 再以 `idMap` 重寫公共電表的 `groupId`。房間綁定改為跨總表的單一區塊，下拉以 `<optgroup>` 依總表分組。Modal 新增第三種模式：原本只有「全域」與「房間層」（`roomId`），現增加「群組層」（`groupId`，寫入 `meter_groups/{id}.electricitySettings`），`isScoped` / `scopeLabel` 統一兩種 scoped 模式的提示文案、差異比對與「重設為全域設定」。群組卡片的「電費方案」按鈕 emit `edit-group-settings`，由 `MeterReading.vue` 開啟第三個 Modal 實例（新建未儲存的總表會擋下並提示先儲存）
- 帳單分攤制總表資料持久化（2026-08-12）：`buildMeterGroups` 每次 `loadData` 都把 `masterCurrentReading`／`masterBillAmount` 重建為 `undefined`，而 UI 直接 v-model 綁在這個暫存物件上。後果是換月份或任何重載會清空輸入，之後若解鎖某列重新儲存，平均單價變 0 → 該筆電費被靜默歸零。改為沿用既有的 `taipower_bills` collection（`{month, usage, amount}` 正是分攤制所需），新增 `groupId` 欄位區分多顆總表；`getTaipowerBillsByMonth`／`upsertTaipowerBill`（同月同表已存在則更新，避免重複）；純函式 `applyMasterBills` 負責把帳單套進各總表，舊資料無 `groupId` 時僅在單一總表情況下採用，多表時不臆測歸屬。總表欄位改為 `@change` 即時寫回，不依賴「儲存紀錄」按鈕
- 電費計算單元測試與抽取（2026-08-12）：計算邏輯原本困在 `MeterReading.vue` 的 SFC 內、混著 Vue ref 無法測試。抽成 `src/utils/meter/` 三個純模組（`calc` 算錢／`groups` 歸屬與分母／`sections` 分區與彙總），Vue ref 依賴改為明確參數，`MeterReading.vue` 1197 → 920 行只保留注入元件狀態的薄包裝。導入 Vitest 並接入 `npm run build`，測試失敗即擋下部署（`dev.bat` 選項 7 既有的 errorlevel 中止機制自動生效）；另有 `build:nocheck` 逃生門。測試 225 項，含 24 項黃金測資（基隆 7 房 2026-07/08 真實金額，402/503 採系統正確值 701/4863，Excel 該兩格為手動覆寫）。過程中修正 5 個計算錯誤：
  1. `getFullMonthDays` 月底起算溢位（`new Date(2026,1,31)` 被正規化為 3/3），抄表日在月底者 2 月級距被縮小 10%，租客多付
  2. 計費期間日期無效時 NaN 一路外洩成 NaN 帳單金額，且因 `NaN >= minRate` 為 false 而靜默套用保底單價，等於無聲改用 5 元/度出帳
  3. 最高級距上限取自可編輯的 `tier.limit`（99999 只是哨兵值），房東改成 2000 則超過部分完全免費，房東少收
  4. 帳單分攤制總表資料未持久化，重載後清空，重新儲存時電費靜默歸零
  5. `officialMetersCount` 用 `??` 攔不到 0，為 0 時 `scaleFactor` 歸零使所有級距失效，全部用電落到最高費率（300 度 925 → 2538 元）
  另有 1 項政策變更：公共電表不再套用保底單價（保底對象為租客，走廊燈等低用量表會被拉抬數倍）。既有帳目金額全部未受影響。
- 出帳規則統一與測試（2026-08-12）：公共電費分攤原有兩份獨立實作 —— `sections.ts`（抄表頁預估）先加總再除、`Financials.vue`（實際出帳）逐表各自除，多顆公共表時每房差 ±1 元，房東看到的預估與實際帳單對不上。抽出 `src/utils/meter/billing.ts` 讓兩邊呼叫同一份 `publicMeterShare`／`sumPublicShares`，**統一採出帳側的逐表制**（不動任何已出帳金額、不動去重鍵 `readingId_roomId`、帳單維持每表一筆以保留明細）。同時把 `shouldGenerateBill`／`getBillingAmount`／`getBillingDescription` 三個租金週期函式從 `Financials.vue` 移入並補測試。測試 40 項，含一條跨層不變量：抄表頁顯示的分攤金額必須等於各表帳單金額之和
- 稅務與保險整併（2026-08-21～22，分六階段完成）：房屋稅按稅籍課、地價稅按地號課、火險按標的物保、公益出租人按門牌認定，而系統原本只有 `rooms` 平表，這四者的歸屬單位一個都不存在。新增 `properties`（建物）＋ `rooms.propertyId`，與 `meter_groups`（台電總表）刻意保持為**兩個獨立維度**——台電按電號寄帳單，一棟可能有兩個電號、公共電表也可能跨棟，硬綁遲早對不起來。
  - **建物管理**：房源管理加「建物」分頁（地址／房屋稅籍／多筆地號／火險保單／公益出租人逐年度分稅目核定、房間指派、未指派清單與 badge）。遷移由 `meter_groups` 自動種子＋房間經 `subGroupId → groupId` 回填，以 `seededFromGroupId` 保證冪等、不覆寫手動指派過的房間
  - **費用登錄**：`property_costs` 主檔（**所屬期間與繳款日分開**；跨棟稅單以 `allocations` 手動分攤並即時校驗加總，因地價稅按縣市合併開單可能涵蓋多棟的地）。入口在帳務管理「更多」→「稅費與保險」。**雙寫只在標記已繳時發生**——`stats.expense` 不看狀態、月內全算，未繳的稅單若先落帳會讓當月支出提前虛增；落帳依分攤一棟一筆（分棟損益才算得出來），取消已繳或刪除費用時依 `billIds` 回收
  - **年度損益**：帳務管理加「年度」分頁，年度 × 棟別的收支明細、各棟損益比較、綜所稅試算。年度帳單**另發查詢**（沿用既有 `(landlordId, date ASC)` 索引），不用月度那份 `limit(200)` 的監聽以免整年被截斷；歸棟優先取 `bills.propertyId`，舊帳單退回 `租客 → 房號 → rooms.propertyId` 回溯，斷鏈者集中於「未指定建物」不被吞掉
  - **提醒**：Dashboard `TaxReminderCard`（開徵未登錄／即將到期／逾期／火險到期／補貼到期／資格落差）＋ LINE 走既有 `scheduledReminderDaily`。房東端**只在里程碑日推**：稅費 14/7/3/1/0 天前、逾期每 7 天且最多兩個月、火險與補貼 30/14/7/1/0 天前——每日排程若逐日推，一個 14 天的窗會連轟 14 次、逾期更會無限期推下去
  - **公益出租人**：資格跟**門牌**走，**整個門牌每月共用一個 15,000 元免稅額**（不因分租多間而變成多份）。`tenants.rentSubsidy` 為資格的事實來源、`properties.publicWelfare` 為稅捐處實際核定的年度，兩者不一致時提示落差（有補貼租客但未登錄 → 可申請；已登錄但無補貼租客 → 待確認）
  - **綜所稅試算**：免稅額**先扣**、餘額再扣 43% 必要費用（順序影響甚鉅：收入 1,008,000、免稅額 180,000 時先扣得 471,960、後扣得 394,560）。電費是否計入租賃收入做成可切換（實報實銷代收代付 vs 定額收取），預設不計入
  - 規則全數抽為 `src/utils/financials/` 純函式並補測試：`electricity`(23)／`propertyCosts`(22)／`incomeTax`(18)／`annualSummary`(15)／`reminders`(34)，另 `propertyService.planRoomAssignments`(8)。全案測試 351 → 451 項
  - 順帶修正三處既有缺陷：①電費盈虧未依台電總表分棟（拿甲棟的帳單對全棟的電費收入，`taipower_bills.groupId` 早已存在但帳務頁從未寫入）②`RoomManagement.subGroupOptions` 只讀 `groups[0]` 的子群組（非第一棟的房間選不到自己的子群組，電費分攤與建物歸屬都會跟著錯）③稅率表在 `InvestmentCalculator` 與新模組各一份，改為共用 `incomeTax.ts`
- 帳務管理「依租客」檢視（2026-08-12）：收款時關心的是「這位租客繳了沒」，但清單是逐筆帳單（7 房 × 租金＋電費 = 14 列，加公共電費 21 列），要用眼睛找同一租客的兩筆。分頁列右側新增切換鈕（**預設開啟**，逐筆清單留給稽核時手動切換），依租客摺疊：一列顯示筆數／合計／待收，並提供一鍵收款批次標記該租客全部未收帳單；點擊展開看明細，仍可逐筆標記。待收的租客排前面、「其他（支出・台電帳單）」置底。分組僅為顯示層，收款狀態仍逐筆儲存於各自的 bills 文件。歸戶鍵優先 `relatedTenantDocId`，退回 `tenantId`、再退回 `target` 字串（早期手動帳單只有這個）。邏輯抽於 `src/utils/financials/tenantGroups.ts`（26 項測試，含「每筆帳單恰好出現在一組」「各組合計相加等於總收支」等不變量），`isCollected` 一併移入共用
- 簽約流程房源租金未帶入修正（2026-08-12）：`OnboardingMode.vue` 載入可選房源時讀 `r.rent`，但 `rooms` 文件的月租金欄位是 **`price`**（`RoomManagement` 表單以此建檔，模擬器實測三筆房源皆只有 `price`、無 `rent`），故選了房源租金恆為 0、押金也連帶算不出來。`TenantList` 用的是正確的 `r.price`，只有簽約流程寫錯。共用型別 `Room` 更是宣告了不存在的 `rent?` 卻沒有 `price`，等於在誤導後續開發。修法：新增 `src/utils/room.ts` 的 `roomMonthlyRent()` 作為唯一取值入口（依序嘗試 `price` → `rent`，以「正的有限數」為有效；新增房源時 `price` 預設 0 代表尚未設定而非租金為零，故不可用 `??` 判斷是否退回舊欄位），`OnboardingMode` 與 `TenantList` 兩處皆改走此函式；`Room` 型別補上 `price` 並將 `rent` 標為 `@deprecated`。測試 11 項
- 精靈模式合約地址未帶入修正（2026-08-12）：`OnboardingMode` 的 `contractPrefill` 只帶 tenant／roomNo／rentfee／startDate／duration，缺 `address`，故精靈模式簽出的合約地址欄位為空（獨立簽約頁的 `ContractForm.onRoomSelect` 有正確帶入，`ContractForm` 的 prefill 也接得住，只有精靈模式漏傳）。根因與租金同源：`availableRooms` 當初只撈 `{ name, rent }`。修法：`availableRooms` 補 `address`，新增 `selectedRoom` computed 供 `onRoomSelect` 與 `contractPrefill` 共用，並讓營運用的 `contracts` 文件一併存入 `address`
- 房東簽名加密保險箱（2026-08-12）：原本簽名以明文 dataURL 存於 `settings/{landlordId}.signatureImage`，且合約／押金收據頁只能提示「未設定，將留白（設定 → 我的簽名）」，無法當場簽。改動：
  - `src/utils/signatureVault.ts`：以 PIN 派生金鑰加密（WebCrypto PBKDF2-SHA256 210k 迭代 + AES-GCM），每次加密使用新的 salt／iv；PIN 錯誤或密文遭竄改皆由 GCM 驗證標籤攔下並統一轉為 `WrongPinError`。29 項測試
  - `src/composables/useSignatureVault.ts`：工作階段解鎖，明文存 `sessionStorage`（關分頁／登出即失效），提供 `lock()` 供交手機給租客前手動鎖回
  - `src/components/LandlordSignatureField.vue`：共用簽名欄位，可當場手寫；未設定過者簽完詢問「儲存我的簽名」，勾選才要求設 PIN，不勾則僅用於該份文件不入庫。已加密者顯示「解鎖簽名」按鈕
  - 套用於合約表單與押金收據表單；設定頁改為加密儲存並顯示「已加密儲存」狀態
  - **安全界線**：PIN 保護的是「簽名被再利用」（下載原圖、蓋到其他單據、資料庫外洩），**不是「被看見」** —— 租客簽署時該份文件上本來就會顯示房東簽名
- 解除房間綁定後無法直接刪除租客修正（2026-08-12）：`drawerTenant` 是開啟抽屜當下的淺複本（`{ ...tenant }`），`unbindRoom` 的註解「drawerTenant 會透過 onSnapshot 自動更新」與事實不符 —— 沒有任何程式碼在同步它。解除綁定後 Firestore 的 `room` 已清空、列表也更新，抽屜內卻仍是舊房號，`:disabled="!!drawerTenant?.room"` 與 `deleteTenant` 的早退判斷雙雙成立，必須關閉抽屜再開才刪得掉。修法：新增 `watch(tenants)` 以 id 對回最新資料同步 `drawerTenant`（置於其宣告之後，避免日後加 `immediate` 觸發 TDZ）
- 精靈租客可建立登入帳號（2026-08-12）：`createTenantAccount` 原本只有兩個呼叫點 —— `TenantList.saveTenant`（且限 `!isEditing`，即只在手動新增當下）與 Excel 匯入。精靈的 `saveProfile` 完全沒有呼叫，且租客清單沒有「為既有租客補建帳號」入口，導致精靈產生的租客**永遠無法登入**，唯一辦法是刪除重建（連帶失去合約、收據、點交紀錄）。諷刺的是精靈 `:441` 強制要求填證件號碼，那正是建帳號所需欄位。修法：(a) 精靈建檔新增租客時一併呼叫 `createTenantAccount`，失敗僅警告不阻斷上線流程；(b) 租客抽屜新增「建立租客登入帳號」按鈕，條件為 `!uid && phone && idNumber`，用於補救既有資料。憑證提示 Modal 抽為共用元件 `TenantCredentialModal.vue`，兩處共用
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
- eslint 設定未宣告瀏覽器全域（`console`／`document`／`window`／`crypto`／`sessionStorage` 等一律報 `no-undef`），導致 lint 幾乎每個檔案都有錯誤、實質失去把關作用。修正方向：在 `eslint.config.js` 補上 browser globals
- ~~公共電費分攤有兩份獨立實作~~（2026-08-12 已解決，見「出帳規則統一」）
- `property_costs` → `bills` 為**單向同步**：若直接從帳務頁刪除自動落帳的支出，主檔仍顯示「已繳」。要清乾淨請用「稅費與保險」的「取消已繳」
- 公益出租人免稅額一律以 12 個月計；年度中途取得或失去資格時，試算金額會偏高
- 綜所稅試算未比較「43% 標準扣除 vs 列舉實額」，亦未含折舊與房貸利息等系統沒有的必要費用。房屋稅、地價稅、火險本身即為可列舉項目，列舉實額若高於 43% 改採列舉更有利
- 綜所稅「免稅額先扣、再扣 43%」的順序未經稅務專業確認，僅依常識推定（「免納所得稅」意謂該部分不計入所得）。報稅前建議向會計師或國稅局查證

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
| 2026-08-14 | 修正 Dashboard 帳務概況 `BillStatusModal` 全部顯示「未知租客」：`bills` 文件實際不存 `tenantName`/`roomName`/`month`（只有 `target`、`relatedTenantDocId`、`tenantId`、`date`），Dashboard 直讀 `data.tenantName` 必為 undefined，且分組鍵 `tenantId ‖ tenantName` 讓所有無 uid 的手動租客帳單併成同一組。改為以已抓取的 `tenantsSnap` 建 docId／uid 對照表反查姓名房號（fallback 拆 `target`），分組鍵改 `relatedTenantDocId ‖ tenantId ‖ target`，`month` 由 `date` 前七碼推導；`unpaidTenantCount` 同步改用新分組鍵，不再漏算無 uid 租客 |
| 2026-06-24 | 真正根因修正：手機「直行」其實出自統計卡而非表格——MeterReading「統一抄表日」卡用 `flex justify-between` 把中文字與 date input 並排，手機卡片過窄將中文擠成一字一行。改為 `flex-col sm:flex-row` 手機堆疊 + 文字容器 `min-w-0` + 標籤 `whitespace-nowrap` |
| 2026-08-21 | MeterReadingHistory 月份篩選改以「計費月份」歸月：原本用 `createdAt`（建立日期）切月，補登／匯入的歷史抄表全落在匯入當天，選任何過去月份都查無資料、也看不到個別房間度數。新增 `monthOf()` 取 `periodEnd.slice(0,7)`（缺 `periodEnd` 的舊資料才退回 `createdAt`），下拉選單與篩選共用，格式與「缺漏追蹤」分頁一致（`YYYY-MM`）|
| 2026-08-21 | Financials「依租客」檢視手機版修正：分組列與展開明細列原為固定寬度單列（`w-24`／`w-32`／收款鈕），且該區塊無水平捲動（外層 `overflow-visible`），手機上租客姓名被壓到看不見、右側收款鈕被擠出螢幕又無法左右滑。改為 `flex-wrap`：手機時金額／狀態／收款鈕整組 `w-full` 換到第二行靠右，姓名獨佔第一行；`sm:` 以上維持原本單列固定寬度版面 |
| 2026-08-21 | 修正 `firebase deploy --only functions` 偶發失敗 `Cannot determine backend specification. Timeout after 10000`：非程式碼問題，而是 firebase-tools 對 functions discovery 寫死 10 秒逾時，在 Windows 冷啟動＋Defender 掃描（緊接 `npm run build` 之後）下不夠用。dev.bat 開頭加 `set FUNCTIONS_DISCOVERY_TIMEOUT=120`（單位秒，僅為上限不影響正常速度），詳見 BF-011 |
| 2026-08-21 | 修正電費盈虧分析漏掉已登錄的台電帳單：原本收入側取「檢視月份＋前一月」兩個月，支出側卻只認 `taipowerBills.find(b => b.month === 當月)`。台電為雙月結算、迄月固定落在單月或雙月，因此在非迄月的那個月檢視時，卡片標題已寫出區間（如 `2026-07 ~ 2026-08`）、收入也照該區間算了，登錄在 07 迄月的帳單卻找不到，右下角恆顯示「等待帳單」。改為**錨定台電帳單迄月**：取「迄月 ≤ 檢視月份」中最近一張，區間＝（迄月-1 ~ 迄月），收入側照同一區間統計，非當月時 periodStr 標註「（最近一期）」。同一期從迄月或次月檢視得到相同數字，不會提前計入下一期電費、也不會把同一個月結算兩次；尚無帳單時退回檢視月份維持原「等待帳單」行為 |
| 2026-08-21 | **稅務／保險整併 階段 0**：修正電費盈虧的「建物盲」。`taipower_bills.groupId` 欄位早已存在（`meter/groups.ts` 的 `applyMasterBills` 會用），但 `TaipowerModal` 沒有選棟欄位、`saveTaipowerBill` 也沒寫入，於是多棟房東看到的是「甲棟的台電帳單 vs 全棟的電費收入」。改動：Modal 多棟時顯示總表選擇器；`saveTaipowerBill` 雙寫皆帶 `groupId`（描述加註棟名）；生成帳單時電費寫 `roomGroupId(reading.roomId)`、公共電費寫 `pm.groupId`；卡片改為逐總表各一張。規則抽至 `src/utils/financials/electricity.ts`（23 項測試），涵蓋錨定迄月、逐棟結算、舊資料經 `租客→房號→subGroupId→總表` 回溯、單一總表時無 groupId 視為屬於它、無總表時單卡、groupId 指向已刪總表時退回而非消失 |
| 2026-08-22 | **稅務／保險整併 階段 1**：新增 `properties`（建物）實體。房屋稅按稅籍、地價稅按地號、火險按標的物、公益出租人按門牌 —— 這些的歸屬單位系統原本都不存在（只有 `rooms` 平表）。新增 `properties` collection＋`rooms.propertyId`（一層反查，「哪一棟賺多少」才算得出來），與 `meter_groups` 刻意保持獨立維度（台電按電號寄帳單，一棟可能兩個電號、公共電表可能跨棟）。房源管理加「建物」分頁：建物 CRUD（地址／稅籍／多筆地號／火險保單／公益出租人逐年度分稅目核定）、房間指派、未指派房間清單與計數 badge。遷移採「從 meter_groups 自動種子」：每個總表建一筆建物，房間經 `subGroupId → groupId` 回填；以 `seededFromGroupId` 保證冪等，已手動指派過的房間不覆寫。決策邏輯抽為 `planRoomAssignments` 純函式（8 項測試）。**順帶修正** `RoomManagement.vue` 的 `subGroupOptions` 原本只讀 `groups[0]` 的子群組，多棟房東的非第一棟房間根本選不到自己的子群組（電費與建物歸屬都會跟著錯）；改為列出全部總表並在多棟時冠上總表名稱 |
| 2026-08-22 | **稅務／保險整併 階段 2**：新增 `property_costs`（建物年度費用主檔）與「稅費與保險」登錄介面（帳務管理「更多」→ 開 `PropertyCostsModal`，列表與表單同一個 Modal 內切換，避免巢狀彈窗）。**雙寫時機定在「標記已繳」**：`stats.expense` 不看狀態、月內全算，未繳的稅單若先落帳會讓當月支出提前虛增，故 `bills` 只承載真正現金流；標記已繳時依 allocations **一棟一筆**落帳（分棟損益才算得出來），取消已繳或刪除費用時一併回收 `billIds`，編輯已繳費用會重新落帳讓 bills 跟上。期間預設由種類推導（房屋稅 前一年7/1~當年6/30、5/31 截止；地價稅 曆年制、11/30 截止；火災險依保單起訖，**僅單棟有保單時才自動帶入**，多棟時留白以免安靜產生錯誤期間）。跨棟稅單以手動金額分攤＋加總校驗，附「平均分攤」（餘數給第一棟，加總分毫不差）。憑證上傳走 storage 既有 catch-all 規則。規則抽為 `src/utils/financials/propertyCosts.ts`（22 項測試，含分攤加總不變量）；`expenseCategories` 與 `categoryBadge` 補三個新類別 |
| 2026-08-22 | **稅務／保險整併 階段 3a**：帳務管理加「年度」分頁（`AnnualSummary.vue`）。年度 × 棟別的收支明細、各棟損益比較，以及公益出租人免稅額與綜所稅試算。年度帳單**另發查詢**（`landlordId` + `date` 範圍，沿用既有 `(landlordId, date ASC)` 索引），不沿用月度那份 `limit(200)` 的即時監聽以免整年被截斷。歸棟優先取 `bills.propertyId`（階段 2 落帳時寫入），租金與電費等既有帳單退回 `relatedTenantDocId → 房號 → rooms.propertyId` 回溯，斷鏈者集中於「未指定建物」不被吞掉。淨利採實收減實付（待收另列），與月度統計口徑一致。稅務試算依先前確認的順序**免稅額先扣、餘額再扣 43%**；免稅額以「屋」為單位、每屋每月 15,000 且不超過該屋實際租金收入。電費是否計入租賃收入設為可切換（代收代付 vs 定額收取），預設不計入。規則抽為 `incomeTax.ts`（18 項測試）與 `annualSummary.ts`（15 項測試，含各棟相加等於總計的不變量）。順帶把 `InvestmentCalculator` 的稅率表與 `progressiveTax`／`getMarginalRate` 改為 import `incomeTax.ts`，避免兩份會走鐘的稅率表（行為不變） |
| 2026-08-22 | **稅務／保險整併 階段 3b**：稅費與火險提醒。規則抽為 `src/utils/financials/reminders.ts`（20 項測試）：①開徵期到了但該年度尚未登錄稅單（房屋稅 5 月、地價稅 11 月，開徵前 7 天起至月底）②已登錄未繳，期限 14 天內（剩 3 天內升為最高等級）③逾期 ④火險保單迄日前 30 天（剩 7 天內升級）⑤火險已過期。Dashboard 新增 `TaxReminderCard`（跨滿版置頂，有 danger 時轉紅），載入獨立於主流程、失敗只是少一張卡。LINE 走既有 `scheduledReminderDaily`，新增房東端推播（`line_configs.ownerLineUserId`）：**只在里程碑日推**（稅費 14/7/3/1/0 天前，火險 30/14/7/1/0 天前），逾期每 7 天一次且**最多兩個月**——每日排程若逐日推，一個 14 天的窗會連轟 14 次、逾期更會無限期推下去。以腳本模擬 400 天驗證：單張稅單共 13 次（5 次到期 + 8 次逾期）、火險 5 次 |
| 2026-08-22 | **稅務／保險整併 階段 3c（完結）**：租金補貼追蹤與公益出租人資格落差提示。`tenants.rentSubsidy` 新欄位，UI 抽為 `components/tenants/RentSubsidyFields.vue` 供桌機與抽屜兩份表單共用（TenantList 有兩套重複表單，直接內嵌會變成第三份重複標記）。`reminders.ts` 擴充三種規則：①補貼到期前 30 天（剩 7 天內升級）②有補貼中租客但該門牌未登錄當年度核定 → 提示可申請 ③已登錄核定但無補貼中租客 → 提示資格待確認。落差判斷逐棟獨立、租客經房號歸戶，房號未歸建物者不誤判；**完全沒有租客資料時不做落差判斷**以免誤報。LINE 補上補貼到期推播（30/14/7/1/0 天前）；資格落差屬常態狀態不推播，只在 Dashboard 顯示。測試 34 項 |
