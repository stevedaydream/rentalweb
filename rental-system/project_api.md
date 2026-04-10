# API 文件

## 外部 API

### Firebase Cloud Functions（asia-east1）

**Base URL（正式）**：`https://asia-east1-rental-system-7675e.cloudfunctions.net`  
**Base URL（本地）**：`http://localhost:5001/rental-system-7675e/asia-east1`

| 函式 | 類型 | 路徑/名稱 | 說明 |
|------|------|----------|------|
| `generatePdf` | HTTP POST | `/generatePdf` | 產生 PDF（需 Authorization: Bearer {idToken}） |
| `lineWebhook` | HTTP POST | `/lineWebhook?lid={landlordId}` | LINE Bot webhook 接收端 |
| `sendLineReply` | Callable | `sendLineReply` | 房東回覆租客 LINE 訊息 |
| `sendLineBillNotifications` | Callable | `sendLineBillNotifications` | 推播帳單通知給租客 |

#### generatePdf 請求格式
```json
POST /generatePdf
Authorization: Bearer {Firebase ID Token}
Content-Type: application/json

{
  "html": "<html>...</html>",
  "filename": "contract.pdf"
}
```

#### sendLineReply Callable 參數
```ts
{
  landlordId: string,
  tenantId: string,
  message: string
}
```

#### sendLineBillNotifications Callable 參數
```ts
{
  landlordId: string,
  billIds: string[]
}
```

---

### LINE Messaging API

- 使用 `@line/bot-sdk`
- 每位房東有獨立的 `channelSecret` 和 `channelAccessToken`，存於 Firestore `line_configs/{landlordId}`
- Webhook URL 格式：`https://...cloudfunctions.net/lineWebhook?lid={landlordId}`

---

### Firebase Services

| 服務 | 用途 |
|------|------|
| Firebase Auth | Email/Password + Google OAuth 登入 |
| Firestore | 主資料庫 |
| Firebase Storage | 圖片上傳（報修照片、簽名） |
| Firebase Hosting | 前端靜態資源部署 |

---

## 內部介面

### Pinia Stores

#### `useAuthStore()`（`src/stores/auth.ts`）
```ts
user: Ref<User | null>
userProfile: Ref<any>           // Firestore users/{uid} 資料
effectiveUid: ComputedRef<string> // Admin 模擬時為被模擬房東 UID
impersonatingLandlord: Ref<{ uid, name, landlordCode } | null>
isInitialized: Ref<boolean>

init(): Promise<void>
loginWithGoogle(): Promise<void>
loginEmail(email, pass): Promise<void>
registerEmail(email, pass): Promise<void>
logout(): Promise<void>
startImpersonation(landlord): void
stopImpersonation(): void
```

#### `useToastStore()`（`src/stores/toast.ts`）
```ts
toasts: Ref<Toast[]>
success(message: string): void   // 3500ms
error(message: string): void     // 5000ms
warning(message: string): void   // 3500ms
info(message: string): void      // 3500ms
remove(id: number): void
```

---

### Services 層

#### `billService`（`src/services/billService.ts`）
Firestore collection：`bills`

#### `meterService`（`src/services/meterService.ts`）
Firestore collection：`meter_readings`

#### `repairService`（`src/services/repairService.ts`）
Firestore collection：`repair_requests`

#### `roomService`（`src/services/roomService.ts`）
Firestore collection：`rooms`

#### `tenantService`（`src/services/tenantService.ts`）
Firestore collection：`tenants`

#### `announcementService`（`src/services/announcementService.ts`）
Firestore collection：`announcements`

---

## 資料格式備忘

### 列舉值

```ts
RoomStatus: 'occupied' | 'vacant' | 'maintenance'
BillStatus: 'pending' | 'completed' | 'overdue'
RepairStatus: 'pending' | 'processing' | 'resolved'
RepairPriority: 'low' | 'medium' | 'high'
UserRole: 'landlord' | 'tenant' | 'admin'
TenantStatus: 'active' | 'inactive'
```

### LINE Bot 指令關鍵字（繁體中文）
| 使用者傳送 | Bot 回應 |
|-----------|---------|
| `選單` | 功能選單 |
| `帳單` | 當月帳單（需先綁定） |
| 綁定碼（6 碼） | 綁定成功/失敗 |

### 環境變數
| 變數 | 用途 |
|------|------|
| `VITE_API_BASE` | Cloud Functions base URL |
| `functions/.env` → `LINE_CHANNEL_SECRET` | LINE Bot 簽章驗證（本地模擬器用） |
| `functions/.env` → `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot 回覆訊息 |
| `functions/.env` → `LINE_LANDLORD_ID` | 本地測試用房東 UID |
