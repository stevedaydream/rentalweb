# 程式碼慣例

## 技術棧快速索引

| 需求 | 工具 |
|------|------|
| 路由跳轉 | `useRouter()` from `vue-router` |
| 狀態管理 | `defineStore()` from `pinia` |
| Firestore | `db` from `src/firebase/config.ts` |
| 當前使用者 UID | `authStore.effectiveUid`（Admin 模擬時自動切換） |
| Toast 通知 | `useToastStore()` from `src/stores/toast.ts` |
| 圖示 | `lucide-vue-next` |

---

## 檔案結構慣例

- **頁面（View）**：`src/views/{role}/{PageName}.vue`
- **可重用元件**：`src/components/{feature}/{ComponentName}.vue`
- **Pinia Store**：`src/stores/{name}.ts`，用 Setup Store 語法（`defineStore('id', () => { ... })`）
- **Firestore 操作**：集中在 `src/services/{entity}Service.ts`，不在 View 內直接操作 `db`
- **型別定義**：全部集中在 `src/types/index.ts`
- **Layout**：`src/layouts/{Role}Layout.vue`，由路由 `component` 掛載，子頁面用 `<router-view />`

---

## 資料庫操作慣例

- 所有 Firestore CRUD 封裝在對應 `service` 檔：`billService`, `meterService`, `repairService`, `roomService`, `tenantService`, `announcementService`
- 讀取時用 `landlordId` 過濾，避免讀取他人資料
- Admin 模擬房東時，使用 `authStore.effectiveUid` 作為 `landlordId`，而非 `authStore.user.uid`
- Firestore 時間欄位使用 `serverTimestamp()` 寫入，讀取時注意可能為 `null`（新建後立即讀取時）

---

## Toast 慣例

```ts
const toast = useToastStore()
toast.success('操作成功')   // 綠色，3500ms 自動消失
toast.error('發生錯誤')     // 紅色，5000ms 自動消失
toast.warning('注意事項')   // 黃色，3500ms
toast.info('一般資訊')      // 藍色，3500ms
```

- 所有使用者操作反饋都透過 Toast，不用 `alert()`
- 錯誤 Toast 持續 5000ms（比一般長）

---

## Composable 慣例

- Store 使用 Vue 3 Setup Store 語法（Composition API 風格）
- `auth store` 的 `effectiveUid` 計算屬性：Admin 模擬房東時回傳被模擬者的 UID，否則回傳自己的 UID
- 元件內使用 `const authStore = useAuthStore()` 取得當前使用者資訊

---

## 樣式慣例

- 使用 Tailwind CSS 4 utility classes
- 全域樣式在 `src/style.css`
- 不使用 scoped CSS（除非有明確必要）
- 響應式優先設計（手機 / 桌機均需正常顯示，系統為 PWA）

---

## 平台注意事項

- **PWA**：`public/sw.js` 為 service worker，`vite.config.ts` 設有 `navigateFallbackDenylist: [/^\/__/]` 防止攔截 Firebase 內部路由
- **Firebase Auth 初始化**：路由守衛使用 `auth.authStateReady()` 確保狀態就緒，再執行跳轉邏輯
- **Google 登入**：強制使用 `signInWithPopup`，不使用 `signInWithRedirect`（PWA service worker 會干擾 redirect 回調）
- **Cloud Functions 區域**：`asia-east1`（台灣/亞洲用戶低延遲）
- **模擬器自動切換**：`import.meta.env.DEV === true` 時自動連接本地模擬器，build 後連雲端
- **LINE Bot**：多房東架構，Webhook URL 必須帶 `?lid={landlordId}`；每位房東有獨立的 `line_configs` 文件
- **PDF 產生**：透過 `generatePdf` Cloud Function（Puppeteer），需要有效的 Firebase ID Token
