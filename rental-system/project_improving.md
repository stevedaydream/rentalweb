# UX 優化建議與實作紀錄

本文件記錄 2026-04-11 UX 全面審查所提出的改善項目，並追蹤實作狀態。

---

## 已完成（2026-04-11）

### 認證流程
- ✅ **忘記密碼入口**：`Login.vue` 新增「忘記密碼？」連結，呼叫 Firebase `sendPasswordResetEmail`
- ✅ **登入錯誤訊息友善化**：將 Firebase error code 映射為中文說明（`auth/wrong-password`、`auth/user-not-found`、`auth/too-many-requests` 等）
- ✅ **Onboarding 按鈕主色統一**：確認按鈕由 `bg-blue-600` 改為 `bg-gold-500`，與系統主色一致

### Dashboard
- ✅ **問候語動態化**：`landlord/Dashboard.vue`、`tenant/Dashboard.vue` 依時段自動切換「早安 / 午安 / 晚安」
- ✅ **租客手機端繳費日可見**：移除 `hidden md:block`，手機也能看到下個繳費日

### 帳務管理
- ✅ **「一鍵生成帳單」改為自訂確認 Modal**：取代原生 `confirm()`，顯示月份與受影響人數預覽
- ✅ **Header 按鈕整理**：次要操作（LINE 通知、台電帳單）收入「更多」下拉選單，減少視覺噪音

### 報修系統
- ✅ **租客報修加入緊急程度**：新增「緊急程度」選擇（一般 / 緊急 / 非常緊急），對應 priority `low/medium/high`
- ✅ **報修卡片可展開詳情**：點擊卡片展開/收合完整說明與申請資訊
- ✅ **改善空狀態**：空狀態加入圖示、引導文字與「立即新增報修」按鈕

---

## 待實作（未來 sprint）

### 導覽架構（中複雜度）
- ✅ **租客底部 Tab Bar（手機）**：TenantLayout 在 `< lg` 改為底部固定導覽列（6 個頁籤，含 active 指示條），取代漢堡選單
- ✅ **租客通知數字 badge**：帳單顯示未繳筆數（Firestore 即時訂閱），聯繫房東顯示未讀回覆數
- ✅ **Sidebar 次要功能群組折疊**：房東 Sidebar 分為「主要功能（7）」+ 可折疊「工具（7）」+「系統設定」固定底部；進入工具頁時自動展開

### 租客帳單（中複雜度）
- ✅ **帳單手機版改卡片佈局**：`tenant/Bills.vue` 手機顯示卡片（含逾期紅字標示），桌面保留表格；用電記錄手機版改三格數據卡
- ✅ **繳費確認 Modal**：「前往繳費」改為自訂確認 Dialog，顯示項目與金額，取代原生 confirm()
- ⬜ **報修詳情顯示房東回覆**：展開報修卡片時，顯示房東備註與處理日期（已有 req.notes 欄位，待房東端填寫）

### 訊息中心（高複雜度）
- ⬜ **改為對話串介面**：訊息中心改為左側租客清單 + 右側對話記錄的雙欄 UI

### 其他小優化
- ✅ **Dashboard「新增房源」帶 query param**：Dashboard 按鈕帶 `?action=new`，RoomManagement `onMounted` 偵測自動開 modal
- ✅ **帳務刪除二次確認**：`Financials.vue` 刪除改為自訂確認 Dialog，顯示警告提示
- ⬜ **新用戶 Welcome Tour**：房東首次進入加入 checklist 引導（高複雜度，列入後續）

---

## 退租與續約系統（2026-04-11 設計，實作中）

### Phase A：退租 Wizard（優先）
- ✅ **MoveOutWizard.vue**：三步驟 Modal（退租資訊→費用結清→確認執行）
  - Step 2 含電費結清（依房東現行計算模式）、水費（手動）、押金退還計算
  - 執行後：合約 terminated、房間 vacant、建立 moveOutRecords、保留歷史租客文件
  - 觸發：TenantList Drawer「辦理退租」按鈕

### Phase D：續約提醒與回覆（第二優先）
- ✅ **scheduledReminderDaily 擴充**：90/60/30 天 LINE 提醒，首次提醒時設 `renewalStatus: 'pending'`
- ✅ **submitRenewalResponse Cloud Function**：租客回覆後更新合約，LINE 通知房東
- ✅ **租客 Dashboard 續約卡片**：距到期 90 天內顯示，按鈕回覆是否續租，支援備註
- ✅ **房東 TenantList 續約狀態**：Drawer 顯示 renewalStatus badge，新增「待確認續約」與「歷史租客」篩選

### Phase B：歷史租客管理
- ✅ **TenantList 歷史租客分頁**：isHistorical=true 的租客，顯示退租摘要（opacity-55 + "已退租" badge；Drawer 顯示退租摘要區塊含退租日、原因、押金退還）

### Phase C：打包下載 & 雲端精簡
- ✅ **打包下載（Excel + PDF）**：歷史租客 Drawer 觸發；xlsx 4-Sheet Excel + 退租結清單 PDF（`MoveOutSummary` Cloud Function 模板）+ 合約備份 PDF（從 `signed_contracts` 重建）
- ✅ **清除電表歷史**：自訂確認 Modal，batch delete 該租客租期間 meter_readings（400-op 分批），最後電表度數已存於 rooms.lastMeterReading 作為下一租客基準

---

## 電費群組計費 + 抄表輸入優化（2026-07-12 設計定案，同日實作完成）

> 背景：台電計費電表只有 1 顆，底下 9 顆子電表（7 房 + 2 公共表），現行程式級距拆分分母只算房間數且無公共電表概念；抄表輸入 Tab 動線被日期欄與按鈕打斷。

### 計算模型
- ✅ **級距均分制**：級距額度以「台電總表群組內電表總數」均分（案例 = 9），每表獨立累進；天數比例（×天數/30）與夏月/非夏月邏輯照舊；空房電表計入分母
- ✅ **群組階層**：台電計費電表（最上層）→ 子群組（4樓、5樓）→ 房間/公共電表。級距分母看最上層，公共分攤看子群組
- ✅ **公共電表計費**：同房間拿 1/9 額度獨立累進 → 金額除以所屬子群組「全部」房間數分攤；空房份額房東吸收；每顆表獨立「房東負擔」開關（勾選＝只記錄不出帳）

### 資料模型
- ✅ 新增 `meter_groups`、`public_meters` collections；`rooms` 加 `subGroupId`；補 firestore.rules（indexes 不需新增，查詢皆單欄位條件）
- ✅ 公共表抄表寫入現有 `meter_readings`（roomId = 公共表 id，`meterType: 'public'`），沿用歷史頁管線

### 帳單
- ✅ 生成帳單時每房多一張獨立 `category: '公共電費'` bill（新類別含 filter/顏色），描述寫「總額 ÷ 房數」明細
- ✅ 防重複鍵 = 公共表抄表 id + roomId；每份四捨五入、尾差房東吸收；公共表當月缺抄表 → 跳過並在帳務頁顯示警告 Banner
- ✅ 帳務統計「公共電費」獨立類別卡片＋篩選 tab（註：ElectricityStatsCard 為未掛載的 dead code，實際統計走 categoryStats）

### UI 與輸入
- ✅ 抄表頁依子群組分區塊，公共表帶「公共」badge 排該樓末尾，樓層標題列含用量/電費小計與公共分攤預覽
- ✅ 鍵盤動線：度數欄 `Tab`/`Enter` 跳下一個度數欄、`Shift+Tab` 跳回；順序 = 畫面順序（4樓→4樓公共→5樓→…→空房）；跳過已鎖定列；聚焦全選內容；最後一欄跳「儲存紀錄」按鈕
- ✅ MeterSettingsModal 加「電表群組」區塊：子群組 CRUD、房間綁定下拉、公共表管理（名稱＋房東負擔開關＋起始度數/日期）
- ✅ RoomManagement 房間編輯表單加「所屬電表群組」下拉（寫 `rooms.subGroupId`）
- ✅ 租客帳單頁免改：查詢無類別過濾，公共電費帳單自動顯示

### 相容性（純增量，可回退）
- ✅ 未設群組的房東自動 fallback 現行單群組行為（零設定、行為不變）
- ✅ 歷史 `meter_readings` 不重算；公共表歷史不匯入（需要時用補登模式逐月補）

**牽動檔案**：`meter/types.ts`、`MeterReading.vue`、`MeterSettingsModal.vue`、`RoomManagement.vue`、`Financials.vue`、`ElectricityStatsCard.vue`、tenant `Bills.vue`、新 service（meterGroupService / publicMeterService）、`firestore.rules`、`firestore.indexes.json`

---

## 設計原則（本次審查結論）

1. **主色統一**：所有主要 CTA 按鈕使用 gold 色系，次要操作使用 outline 或 ghost 樣式
2. **手機優先**：PWA 系統需確保所有核心資訊在手機上可見，不應用 `hidden md:block` 隱藏
3. **危險操作防護**：影響多筆資料的批次操作必須有自訂確認 Dialog（非原生 confirm()）
4. **空狀態引導**：所有列表頁面的空狀態需提供圖示 + 說明 + 行動按鈕
5. **錯誤訊息人性化**：所有 Firebase/API 錯誤需轉換為用戶可理解的中文說明
