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
| `rooms` | id, name, status('occupied'\|'vacant'\|'maintenance'), landlordId, floor, rent, deposit, tenantId, tenantName, isPublic? |
| `tenants` | id, uid, name, email, phone, landlordId, roomId, roomName, boundLandlordCode, status('active'\|'inactive'), moveInDate |
| `bills` | id, tenantId, tenantName, landlordId, roomId, roomName, amount, status('pending'\|'completed'\|'overdue'), month, dueDate, paidAt, electricityFee, waterFee, managementFee |
| `repair_requests` | id, tenantId, tenantName, landlordId, roomId, type, description, status('pending'\|'processing'\|'resolved'), priority('low'\|'medium'\|'high'), imageUrl |
| `meter_readings` | id, landlordId, roomId, roomName, reading, previousReading, usage, readingDate |
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
- 抄表記錄（手動輸入 + Excel 批次匯入）+ 抄表歷史
- 報修管理（查看/處理租客報修申請）
- 公告發布
- 合約管理（自訂範本、PDF 匯出、電子簽名）
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
| `generatePdf` | 使用 Puppeteer 產生合約/收據 PDF，需 Auth Token |
| `lineWebhook` | LINE Bot webhook（多房東） |
| `sendLineReply` | Callable：房東回覆租客 LINE 訊息 |
| `sendLineBillNotifications` | Callable：推播帳單通知給租客 |
| `createTenantAccount` | Callable（房東/Admin）：以手機+身分證建立租客 Firebase Auth 帳號 |
| `resetTenantPassword` | Callable（Admin）：重設租客登入密碼 |
| `submitRenewalResponse` | Callable（租客）：回覆是否續租，同步 LINE 通知房東 |
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
| 2026-04-11 | 新 Firestore collection：moveOutRecords（退租摘要永久保留） |
| 2026-04-11 | rooms 新增欄位：lastMeterReading、lastMeterReadingDate（退租時寫入，下個租客電費基準） |
| 2026-04-11 | contracts 新增欄位：renewalStatus（pending/confirmed/declined）、renewalNote、renewalRespondedAt |
| 2026-04-11 | tenants 新增欄位：isHistorical（bool）、moveOutSummary（object） |
