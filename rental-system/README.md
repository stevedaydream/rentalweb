# 租屋管理系統 (Rental System)

一套為台灣小型房東設計的租屋管理平台，整合帳務、電表、報修、合約、LINE Bot 通知，並提供公開找房頁讓訪客瀏覽空置房源。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| 樣式 | Tailwind CSS |
| 狀態管理 | Pinia |
| 路由 | Vue Router 4 |
| 後端/資料庫 | Firebase (Firestore, Auth, Storage, Functions) |
| 部署 | Firebase Hosting (前端) + Cloud Functions v2 (asia-east1) |
| PDF 產生 | Puppeteer + @sparticuz/chromium (Cloud Function) |
| 通知 | LINE Messaging API |

---

## 系統角色

| 角色 | 入口 | 功能摘要 |
|------|------|---------|
| **訪客** | `/explore` | 無需登入，瀏覽公開房源、查看房東評價 |
| **房東** | `/landlord/` | 管理房源、租客、帳務、電表、報修、合約、LINE Bot |
| **租客** | `/tenant/` | 查看帳單、報修、公告、聯繫房東 |
| **管理員** | `/admin/` | 管理所有房東/租客、模擬登入、資料庫操作 |

---

## 本地開發

### 環境需求

- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)
- Java 11+（Firebase Emulator 需要）

### 啟動

```bash
# 安裝依賴
npm install
cd functions && npm install && cd ..

# 一鍵啟動（模擬器 + 前端）
npm start
```

| 服務 | 位址 |
|------|------|
| 前端 (Vite) | http://localhost:5173 |
| Firebase Emulator UI | http://localhost:4000 |
| Functions | http://localhost:5001 |
| Firestore | http://localhost:8080 |
| Auth | http://localhost:9099 |
| Storage | http://localhost:9199 |

### LINE Bot 本地測試

```bash
# 安裝 cloudflared（一次性）
winget install Cloudflare.cloudflared

# 建立公開 tunnel
cloudflared tunnel --url http://localhost:5001
```

在 LINE Developers Console 將 Webhook URL 設為：
```
https://<tunnel>.trycloudflare.com/rental-8897a/asia-east1/lineWebhook?lid={你的UID}
```

在 `functions/.env` 填入：
```env
LINE_CHANNEL_SECRET=xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_LANDLORD_ID=xxx
```

---

## 正式部署

```bash
# 部署全部
npm run build && firebase deploy --only functions,firestore:rules,hosting

# 分項部署
firebase deploy --only functions       # Cloud Functions
firebase deploy --only hosting         # 前端靜態
firebase deploy --only firestore:rules # Firestore 安全規則
```

正式環境 LINE Webhook URL：
```
https://asia-east1-rental-8897a.cloudfunctions.net/lineWebhook?lid={UID}
```

---

## 專案結構

```
rental-system/
├── src/
│   ├── assets/            # 圖片、SVG
│   ├── components/        # 共用元件
│   │   ├── dashboard/     # 儀表板元件
│   │   ├── financials/    # 帳務元件
│   │   ├── meter/         # 電表元件
│   │   ├── ToastContainer.vue
│   │   └── ...
│   ├── firebase/
│   │   └── config.ts      # Firebase 初始化（dev 自動連 emulator）
│   ├── layouts/
│   │   ├── LandlordLayout.vue
│   │   ├── TenantLayout.vue
│   │   └── SuperAdminLayout.vue
│   ├── router/
│   │   └── index.ts       # 路由 + 角色守衛
│   ├── services/          # Firebase 操作封裝
│   ├── stores/            # Pinia stores
│   │   ├── auth.ts        # 認證、模擬登入
│   │   ├── bill.ts        # 帳單訂閱
│   │   ├── notification.ts# 徽章通知
│   │   ├── toast.ts       # Toast 提示
│   │   └── user.ts        # 用戶資料快取
│   ├── types/             # TypeScript 型別定義
│   └── views/
│       ├── auth/          # Identity, Login, Register, Onboarding
│       ├── landlord/      # 15 個頁面
│       ├── tenant/        # 6 個頁面
│       ├── admin/         # 6 個頁面
│       ├── explore/       # RoomExplore, LandlordProfile
│       └── NotFound.vue
├── functions/
│   └── index.js           # Cloud Functions (PDF, LINE, 通知, 排程)
├── firestore.rules        # Firestore 安全規則
├── storage.rules          # Storage 安全規則
├── firebase.json          # Firebase 設定
├── DEV_GUIDE.md           # 開發環境詳細說明
├── rule_UX.md             # UX 設計規範
└── package.json
```

---

## Cloud Functions

| 函式 | 觸發方式 | 功能 |
|------|---------|------|
| `generatePdf` | HTTP (需 Auth Token) | 產生租約/收據 PDF |
| `lineWebhook` | HTTP (public) | LINE Bot Webhook 接收訊息 |
| `sendLineReply` | Callable | 房東回覆租客 LINE 訊息 |
| `sendLineBillNotifications` | Callable | 推播帳單通知給租客 |
| `notifyBillCreated` | Firestore trigger (bills) | 帳單建立時自動推播 LINE |
| `notifyAnnouncementCreated` | Firestore trigger (announcements) | 公告建立時推播 LINE |
| `onReviewCreated` | Firestore trigger (reviews) | 評價建立時更新 public_profiles 評分 |
| `scheduledReminderDaily` | Cron (每日 09:00 台灣時間) | 帳單逾期 + 合約到期提醒 |

---

## Firestore 資料結構

```
users/{uid}                  # 用戶基本資料（role, name, phone...）
public_profiles/{uid}        # 房東公開資料（公開可讀，供找房頁使用）
rooms/{roomId}               # 房間資料
tenants/{tenantDocId}        # 租客租約資料
bills/{billId}               # 帳單
meter_readings/{id}          # 電表讀數
repair_requests/{ticketId}   # 報修單
announcements/{id}           # 公告
messages/{messageId}         # 站內訊息
contracts/{contractId}       # 合約
signed_contracts/{id}        # 已簽署合約
reviews/{reviewId}           # 房東評價
line_configs/{landlordId}    # LINE Bot 金鑰（僅房東本人可讀）
line_bindings/{code}         # LINE 綁定碼
settings/{docId}             # 系統設定
```

---

## 環境變數

| 檔案 | 用途 | VITE_API_BASE |
|------|------|---------------|
| `.env.development` | 本地開發 | `http://localhost:5001/rental-8897a/asia-east1` |
| `.env.production` | 正式部署 | `https://asia-east1-rental-8897a.cloudfunctions.net` |

---

## 相關文件

- [DEV_GUIDE.md](./DEV_GUIDE.md) — 開發環境設定、LINE Bot 測試、部署流程、Debug 排查
- [rule_UX.md](./rule_UX.md) — UX 設計規範、各角色操作流程、共用規則
