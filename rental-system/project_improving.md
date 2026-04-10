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

## 設計原則（本次審查結論）

1. **主色統一**：所有主要 CTA 按鈕使用 gold 色系，次要操作使用 outline 或 ghost 樣式
2. **手機優先**：PWA 系統需確保所有核心資訊在手機上可見，不應用 `hidden md:block` 隱藏
3. **危險操作防護**：影響多筆資料的批次操作必須有自訂確認 Dialog（非原生 confirm()）
4. **空狀態引導**：所有列表頁面的空狀態需提供圖示 + 說明 + 行動按鈕
5. **錯誤訊息人性化**：所有 Firebase/API 錯誤需轉換為用戶可理解的中文說明
