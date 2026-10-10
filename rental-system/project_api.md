# API 文件

## 外部 API

### 平台管理與求助（2026-10-10）

| 函式 | 權限 | 用途 |
|------|------|------|
| `adminOperations` | admin | `overview`、`search`、`list`、`detail`、`mutate`、`domain`、`account`、`signedPreview`、`feature`、`lineConfig`、`saveLineConfig`、`deletionJobs` |
| `adminTenantAccount` | admin | 依租客文件查詢帳號、列候選帳號、配對、建立、重設密碼、停用／恢復、產生啟用連結 |
| `adminLifecycle` | admin | `deletePreview`、`deleteExecute`、`billingPreview`、`billingCommit` |
| `platformSupport` | landlord／admin | 案件清單、詳情、開案、留言、狀態及獨立平台 LINE 綁定；租客僅可使用通知讀取／標記已讀 |
| `platformLineWebhook` | 驗證 LINE 簽章 | 消耗一次性綁定碼，其他訊息導回網站；正式設定見 `secret.md` |
| `platformNotificationCreated` | Firestore 觸發 | 站內通知衍生 LINE 推播，穩定 retry key 防重送，失敗保留狀態 |

- 管理修改帶 `operationId`、`version`、`reason`；`mutate` 另帶 `kind`、`key`、`operation`、`patch`／`input`。重要操作原因必填，版本來自 `detail`；同一識別碼不同內容會拒絕。
- `mutate` 支援 `edit`、`collect`、`credit`、`reverse`、`void`、`renew`、`cancelRenewal`、`signLink`、`return`、`confirm`；`domain` 支援 `create`、`signedCreate`、`moveout`。簽署確認另驗證重疊合約預覽版本。
- `list` 以 `after` 分頁，每頁 100 筆，回 `items`／`next`；房東清單預設排除封存，`includeArchived` 可顯示；其他業務可帶 `landlordId` 篩選。
- 整戶刪除須回傳的 `version`、輸入指定 `confirmation` 及原因；開始後保留工作與分頁清單，可在平台維護以原操作識別碼接續。租客 Auth 不刪除，只解除房東關聯。
- 帳號操作由持久工作協調 Auth／Firestore；`status.pending` 提供原操作識別碼、原因及版本供重試。密碼不寫稽核，重試密碼重設時仍需送出相同內容。
- 求助附件限 JPG／PNG／WebP、每張小於 5MB、每次最多 5 張，路徑為 `platform_support/<uid>/<operationId>/<檔名>`；讀取限參與者，不能被一般 Storage 規則放行。
- `platform_accounts`、`admin_audit`、通知、案件及私有設定皆由後端寫入。`platform_*` 工作憑據與 LINE 設定不可由瀏覽器直接讀取。

### Firebase Cloud Functions（asia-east1）

**Base URL（正式）**：`https://asia-east1-rental-system-7675e.cloudfunctions.net`  
**Base URL（本地）**：`http://localhost:5001/rental-system-7675e/asia-east1`

| 函式 | 類型 | 路徑/名稱 | 說明 |
|------|------|----------|------|
| `generatePdf` | HTTP POST | `/generatePdf` | 產生 PDF（需 Authorization: Bearer {idToken}） |
| `lineWebhook` | HTTP POST | `/lineWebhook?lid={landlordId}` | LINE Bot webhook 接收端 |
| `sendLineReply` | Callable | `sendLineReply` | 房東回覆租客 LINE 訊息 |
| `sendLineBillNotifications` | Callable | `sendLineBillNotifications` | 推播帳單通知給租客 |
| `promotePendingRenewal` | Callable | `promotePendingRenewal` | 房東／管理員接續已到期的下一期租約；不發通知 |
| `createContractSignLink` | Callable | `createContractSignLink` | 房東為待租客簽名的合約發（重發）一次性簽署連結 |
| `getContractForSigning` | Callable（免登入） | `getContractForSigning` | 驗證簽署連結；帶證件號碼相符才回合約預覽欄位 |
| `submitContractSignature` | Callable（免登入） | `submitContractSignature` | 租客送出簽名，合約轉待房東確認並 LINE 通知房東 |

#### 遠端簽約（createContractSignLink / getContractForSigning / submitContractSignature）

- `createContractSignLink`：請求 `{ contractId, origin }`，須登入且為該合約房東（或管理員）；合約須為 `status: 'awaiting_tenant'` 且有 `tenantId`（證件號碼）。回傳 `{ code, url, expireAt, expireDays }`，同一合約舊的未使用連結會被刪除。
- `getContractForSigning`：請求 `{ code, idNumber? }`。不帶 `idNumber` 回 `{ ok, needIdNumber: true, name }`；相符（不分大小寫、去空白）回 `{ ok, name, contract }`，`contract` 只含預覽欄位（不含 `landlordUid`、`templateHtml`）。
- `submitContractSignature`：請求 `{ code, idNumber, signature }`，`signature` 須為 `data:image/png;base64,` 且 ≤ 600KB。交易內寫入 `signature`、`status: 'awaiting_landlord'`、`tenantSignedAt`、`tenantAcknowledgedAt`，並標記連結 `usedAt`。
- 錯誤碼：`not-found`（連結或合約不存在）、`failed-precondition`（已使用／合約非待租客簽名）、`deadline-exceeded`（過期）、`permission-denied`（證件號碼不符，累計 `failedAttempts`）、`resource-exhausted`（錯 5 次鎖定）、`invalid-argument`。
- 房東生效與退回在前端 `signedContractService` 的 `confirmLandlordSignature`／`returnForResign` 以 batch 寫入。

#### promotePendingRenewal

- 請求：`{ contractId: string }`。須 Firebase 登入；由後端驗證該合約房東或管理員身分。
- 回傳：`{ promoted: false }`（尚未到期、無待接續資料或非有效合約），或 `{ promoted: true, startDate, endDate, rent }`。
- 以台灣日期判定「當期走完且已到新起租日」，交易同步 contracts／tenants／rooms。無法唯一關聯、日期錯誤或租客關聯不一致回傳 `failed-precondition`，保留待接續資料。
- 排程共用同一服務；失敗逐筆記錄，不阻止其他合約接續。

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

租客端。每則回覆都會附上快捷選項（Quick Reply）按鈕，不必打字即可續查。

| 使用者傳送 | Bot 回應 |
|-----------|---------|
| `選單`／`功能`／`說明`／`help`／`menu` | 功能選單 |
| `帳單`／`查帳單`／`繳費` | 未繳帳單 **Flex 卡片**（金額、到期日、前往繳費按鈕） |
| `電費`／`電表`／`抄表` | 本期度數與金額 |
| `合約`／`租約` | 租期、租金、押金 |
| `公告` | 最新社區公告 |
| `報修`／`維修` | 報修單狀態 |
| 綁定碼（6 碼） | 綁定成功/失敗 |

房東本人（`line_configs.ownerLineUserId`）發話則走房東指令：`租客 <房號>`、`欠費`、`到期`、`電費 <房號>`、`報修`、`選單`，同樣附快捷選項。

### LINE 圖文選單（Rich Menu）

| Callable | 用途 |
|----------|------|
| `setupLineRichMenu` | 產生 2500×1686 底圖（puppeteer 截圖）→ 建立 rich menu → 上傳圖片 → 設為預設；舊的一併刪除，id 存於 `line_configs/{uid}.richMenuId` |
| `removeLineRichMenu` | 取消預設並刪除選單 |

六格按鈕（3×2）：查帳單／看電費／報修進度／我的合約／社區公告／線上系統。前五格用 message action 送出既有指令關鍵字（沿用 `handleCommand`，不另開 postback 分支），第六格為 uri action 導向網站帳單頁。房東於「系統設定 → LINE Bot 整合設定 → 圖文選單」一鍵建立。

### 環境變數
| 變數 | 用途 |
|------|------|
| `VITE_API_BASE` | Cloud Functions base URL |
| `functions/.env` → `LINE_CHANNEL_SECRET` | LINE Bot 簽章驗證（本地模擬器用） |
| `functions/.env` → `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot 回覆訊息 |
| `functions/.env` → `LINE_LANDLORD_ID` | 本地測試用房東 UID |
