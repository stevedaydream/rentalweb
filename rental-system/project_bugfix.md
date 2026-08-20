# Bug 修復紀錄

本文件記錄重要技術 Bug 的根因與解法，避免重蹈覆轍。

---

## BF-001：手機瀏覽器 Google 登入導向 404

- **問題描述**：手機瀏覽器點擊「使用 Google 登入」後，跳轉至 404 頁面，無法完成登入。桌機瀏覽器正常。
- **嘗試過程**：
  1. 改用 `signInWithRedirect` → PWA service worker 攔截 callback，造成無限跳轉至 Login
  2. 加入 `getRedirectResult` → service worker 與 redirect 競態，仍失敗
  3. 改 `authDomain` 為 `web.app` → Google OAuth 未設定該 domain 的 handler，仍失敗
  4. 重建新的 Firebase 專案 → 問題依舊
  5. AI 建議加 FirebaseAuthHandler 路由 + IIFE → 空白畫面，更壞
  6. **加入 `web.app` 到 Google Cloud Console 已授權 JS 來源** → 解決
- **根本原因**：Firebase 新專案自動建立的 Google OAuth 用戶端只有 `firebaseapp.com`，沒有 `web.app`。從 `web.app` 發起的 `signInWithPopup` 被 Google OAuth 拒絕。
- **最終解法**：
  1. Google Cloud Console → APIs & Services → Credentials → Web client (auto created by Google Service) → 編輯
  2. 在「已授權的 JavaScript 來源」新增 `https://rental-system-7675e.web.app`
  3. 前端保持使用 `signInWithPopup`（不改為 redirect）
  4. `vite.config.ts` 加入 `navigateFallbackDenylist: [/^\/__/]`，防止 service worker 攔截 Firebase 內部路由
- **牽扯檔案**：`src/stores/auth.ts`（loginWithGoogle）、`vite.config.ts`

> **新 Firebase 專案部署後必做**：Google Cloud Console → Credentials → 已授權 JS 來源加入 `https://<project>.web.app`

---

## BF-002：本地 LINE Webhook 驗證失敗（Tunnel 指向錯誤 Port）

- **問題描述**：LINE Console Verify 失敗，回傳 domain 無法解析
- **根本原因**：Cloudflare Tunnel 誤設為 `:5173`（Vite 前端），應為 `:5001`（Firebase Functions 模擬器）
- **最終解法**：`cloudflared tunnel --url http://localhost:5001`（明確指定 Functions port）
- **牽扯檔案**：無程式碼修改，操作步驟問題

---

## BF-003：Dashboard 已收款帳單仍顯示未繳，金額全為 NT$0

- **問題描述**：在帳務管理標記帳單「已收款」後，Dashboard 的帳務概況（未繳筆數/金額）與本月工作清單「確認收款」步驟仍顯示未繳。金額概況亦顯示 NT$0。
- **根本原因**：`landlord/Dashboard.vue` 的帳單迴圈有兩個欄位對應錯誤：
  1. **狀態判斷**：只檢查 `data.status === 'paid'`，但帳務管理（`markPaid`、`generateMonthlyBills`）存入的是 `status: 'completed'`，導致已收款帳單落入未繳桶
  2. **金額欄位**：讀取 `data.totalAmount`，但帳單 schema 存的是 `data.amount`，金額全算為 0
- **最終解法**：兩行修正
  ```diff
  - const amount = Number(data.totalAmount) || 0;
  - if (data.status === 'paid') {
  + const amount = Number(data.amount) || 0;
  + if (data.status === 'completed' || data.status === 'paid') {
  ```
- **牽扯檔案**：`src/views/landlord/Dashboard.vue`（`fetchDashboardData` 函式帳務概況區段）

> **注意**：`Financials.vue` 的 `isCollected()` 已正確處理兩種狀態，Dashboard 是獨立讀取，不共用此函式，故需分別修正。

---

## BF-004：房源管理頁面崩潰（TypeError: Cannot read properties of undefined 'toLocaleString'）

- **問題描述**：開啟房源管理頁面時直接白畫面，Console 顯示 `TypeError: Cannot read properties of undefined (reading 'toLocaleString')`。
- **嘗試過程**：檢查錯誤 stack trace 指向 `RoomManagement` 的 template computed，定位到 `room.price.toLocaleString()` 與搜尋時的 `room.name.toLowerCase()` / `room.address.toLowerCase()`。
- **根本原因**：Firestore `rooms` collection 中存在欄位不完整的文件（缺少 `price`、`name`、`address` 等欄位），Vue computed 直接對 `undefined` 呼叫方法導致崩潰。不完整文件來源可能為程式碼直接寫入 Firestore（如匯入流程建立房間）時未帶齊所有欄位。
- **最終解法**：
  1. Template：`room.price.toLocaleString()` → `(room.price ?? 0).toLocaleString()`
  2. `filteredRooms` computed：`room.name.toLowerCase()` → `(room.name?.toLowerCase() ?? '')`，`room.address` 同理
  3. `MeterReadingImport.vue` 的 `createRoom` 函式補上所有必要欄位預設值（`price: 0, size: 0, address: '', layout, type, images, coverImage, isPublic`），避免寫入不完整文件
- **牽扯檔案**：`src/views/landlord/RoomManagement.vue`（template 第 103 行、`filteredRooms` computed）、`src/components/meter/MeterReadingImport.vue`（`createRoom` 函式）

> **注意**：凡是程式碼直接寫入 `rooms` collection（非透過 `RoomManagement.vue` 的 `saveRoom` 函式），都必須帶齊所有必要欄位，否則頁面渲染會崩潰。

---

## BF-005：Firebase Storage 上傳 403 Forbidden（storage/unauthorized）

- **問題描述**：房源管理頁面上傳圖片時，Console 顯示 `POST .../o?name=rooms/... 403 (Forbidden)`，`FirebaseError: storage/unauthorized`。
- **嘗試過程**：
  1. 確認 Firestore `_system/quotaControl` 封鎖旗標 → 文件不存在，非此原因
  2. 在 `firebase.json` 補上 `"bucket": "rental-system-7675e.firebasestorage.app"` 明確指定 bucket 後重新部署 → 仍然 403
  3. 移除 Storage Rules 內的 `isStorageBlocked()` 跨服務呼叫 → 解決
- **根本原因**：Storage Rules 內使用 `firestore.get()` 做跨服務讀取（cross-service rules），在正式環境中靜默失敗，導致整條 `allow write` 規則評估結果為拒絕，回傳 403。
- **最終解法**：簡化 `storage.rules`，移除 `isStorageBlocked()` 函式，改為單純驗證登入狀態：
  ```
  allow read: if request.auth != null;
  allow write: if request.auth != null;
  ```
  配額控制邏輯由 Cloud Function 負責，Storage Rules 不做跨服務 Firestore 呼叫。
- **牽扯檔案**：`storage.rules`、`firebase.json`

> **注意**：Storage Rules 內避免使用 `firestore.get()` / `firestore.exists()`，跨服務呼叫在正式環境不穩定且難以偵錯。

---

## BF-006：createTenantAccount / resetTenantPassword CF 拋出 `db is not defined`（500 Internal Server Error）

- **問題描述**：呼叫 `createTenantAccount` Cloud Function 時，前端收到 HTTP 500；Firebase Functions 記錄顯示 `ReferenceError: db is not defined at /workspace/index.js:1283`。`resetTenantPassword` 有相同問題。
- **嘗試過程**：由前端 500 錯誤排查，透過 Firebase Console → Functions → Logs 找到實際錯誤訊息。
- **根本原因**：`index.js` 中所有函式都以**函式體內** `const db = getFirestore()` 各自宣告 `db`（模組頂層沒有全域 `db`）。Cloud Functions v2 每個函式部署為獨立 Cloud Run 容器，模組作用域互相隔離。`createTenantAccount` 與 `resetTenantPassword` 直接使用 `db` 而未在函式體內宣告，在本機模擬器可能碰巧正常（同一 process），部署後必定爆 ReferenceError。
- **最終解法**：在兩個函式的 handler 最頂端各加一行：
  ```js
  const db = getFirestore();
  ```
- **牽扯檔案**：`functions/index.js`（`createTenantAccount` 第 1280 行、`resetTenantPassword` 第 1325 行）

> **注意**：`index.js` 新增任何使用 `db` / `getAuth()` 的 onCall 函式時，務必在 handler 內部自行宣告 `const db = getFirestore()`，不可假設模組頂層有全域變數。

---

## BF-007：續約後舊租期消失（一鍵續約立即覆寫合約租期）

- **問題描述**：在租約到期前按「一鍵續約」，續約手續完成後，合約內容立刻變成新的合約期間；舊的、尚未走完的租期不再顯示。
- **根本原因**：`TenantList.vue` 的 `confirmRenew` 採「原地覆寫」——直接 `updateDoc` 同一份 `contracts` 文件的 `startDate/endDate/rent`，並同步覆寫 `tenants.leaseStart/leaseEnd`。因此一按續約，畫面即把「下一期」當成「目前這期」，舊到期日只被存成 `previousEndDate` 字串、不再呈現。資料模型只能容納單一租期，是設計層面的缺陷而非單行 Bug。
- **最終解法**：改為「排程續約（pending next-term）」模型：
  1. 續約時**不動**目前租期，新租期存入 `contracts.pendingRenewal: { startDate, endDate, rent }`，並清除房東不續約註記與租客回覆狀態。
  2. 到期自動接續（兩道、皆冪等，gate＝「目前租期已走完 **且** 已到新起租日」，升級後清除 `pendingRenewal`）：
     - 前端惰性接續：`TenantList.startListeners` 載入合約時呼叫 `maybePromotePendingRenewal`，到期即升為正式租期並寫回 `tenants`。
     - 伺服端備援：`scheduledReminderDaily` 每日掃描 `where('pendingRenewal','!=',null)`，房東未開 App 時也能讓租客端正確切換。
  3. `Contract.vue` 的 `prefillFromRenewal` 改優先讀 `pendingRenewal`，重簽帶入的是新租期。
- **牽扯檔案**：`src/views/landlord/TenantList.vue`（`confirmRenew`、`maybePromotePendingRenewal`、`startListeners` 合約載入、`setLandlordRenewalDecision`、抽屜 UI）、`src/views/landlord/Contract.vue`（`prefillFromRenewal`）、`functions/index.js`（`scheduledReminderDaily` 排程接續備援）

> **注意**：續約相關功能切勿原地覆寫 `contracts` 的當期 `startDate/endDate`；新一期一律走 `pendingRenewal`，由「目前租期走完」的 gate 觸發接續。伺服端備援需重新部署 Functions 才生效。

---

## BF-008：電表群組被存成兩筆完全相同的文件，抄表頁區塊重複出現

- **問題描述**：抄表頁只有 2 個電表，卻顯示 4 個區塊（「台電總表 · 四樓」「台電總表 · 5樓」各出現兩次），每間房重複列出。但「已填寫 2/2 表」與電費合計皆正確 —— 純顯示層重複，計算沒受影響。
- **根本原因**：`meter_groups` 存在兩筆 `name` 與 `subGroups`（連 `id`）完全相同的文件。來自舊版 `MeterSettingsModal.saveGroupData`：
  ```js
  let groupId = existingGroup.value?.id;
  if (!groupId) {
    const refDoc = await addMeterGroup(...);
    groupId = refDoc.id;   // 只寫進區域變數，沒回寫 existingGroup.value
  }
  ```
  同一次開啟中若儲存兩次，第二次 `existingGroup.value` 仍是 `null` 而再新增一筆；local state 未變，故子群組 `id` 一模一樣。多總表改版後 `sections` 走訪所有群組的子群組，重複的子群組就被渲染兩次。
- **最終解法**（三處，缺一不可）：
  1. `MeterReading.vue` `sections`：以 `seenSubGroups` Set 去重，同一子群組 id 只渲染一次
  2. `MeterReading.vue` `loadData`：`subGroupToGroup` 反查表改為 first-wins（`if (!map.has(id))`），避免電表歸屬因文件順序跳動
  3. `MeterSettingsModal.vue` `removeGroup` / `groupPublicMeters`：刪除重複總表時，子群組 id 若仍存在於其他總表就**不可**解除房間綁定或刪除公共電表；公共電表歸屬以 `groupId` 為主，僅當該 groupId 已不存在時才用 `subGroupId` 認領
- **牽扯檔案**：`src/views/landlord/MeterReading.vue`（`sections`、`loadData`）、`src/components/meter/MeterSettingsModal.vue`（`removeGroup`、`groupPublicMeters`、`saveGroupData`）

> **除錯技巧**：dev 連的是 Firestore 模擬器（`src/firebase/config.ts` 的 `connectFirestoreEmulator(db, 'localhost', 8085)`），可用 `Authorization: Bearer owner` 繞過安全規則直接查資料，不需 ADC 憑證：
> ```
> curl -H "Authorization: Bearer owner" \
>   "http://localhost:8085/v1/projects/rental-system-7675e/databases/(default)/documents/meter_groups"
> ```

---

## BF-009：JavaScript 語言陷阱造成的三個電費計算錯誤

- **問題描述**：三個獨立的電費計算錯誤，根因都是 JS 的語言行為而非邏輯設計失誤。皆由單元測試發現，肉眼審閱時全部看起來正確。
- **根本原因與解法**：

  **① `new Date(y, m, d)` 的月份溢位**
  ```js
  new Date(2026, 1, 31)   // 想表達 2/31 → 實際得到 3/3，不是夾到 2/28
  ```
  `getFullMonthDays('2026-01-31')` 因此算出 31 天（正解 28 天）。抄表日固定在月底者，2 月那期天數比例變成 0.903、級距被縮小 10%，租客多付。
  解法：先用 `new Date(y, m + 1, 0).getDate()` 取得目標月份最後一天，把「日」夾進去再相減。

  **② `??` 攔不到 `0`**
  ```js
  officialMetersCount: g.officialMetersCount ?? 1   // 0 會原樣通過
  ```
  為 0 時 `scaleFactor` 歸零 → 所有級距上限失效 → 全部用電落到最高費率（300 度從 925 元變成 2538 元）。同一物件相鄰那行的 `roomCount` 早有 `Math.max(1, …)` 保護，此處漏了。
  解法：數值防呆用 `Math.max(1, Number(x) || 1)`，不要用 `??`。**`??` 只擋 null/undefined，`||` 才擋 0**——需求是「排除無效數值」時應選後者。

  **③ 與 `NaN` 的比較恆為 false，會靜默走進 else 分支**
  ```js
  const avg = res.raw / usage          // 日期無效 → NaN
  if (avg >= minRate) return res       // NaN >= 5 為 false → 往下走
  return { cost: Math.round(usage * minRate) }   // 靜默改用 5 元/度出帳
  ```
  日期一壞不會報錯，而是無聲改用保底單價出帳。
  解法：在進入累進計算前先 `Number.isFinite(days)` 驗證，無效時回傳 0 並在 `calcLog` 明示原因，不讓 NaN 流入後續比較。

- **牽扯檔案**：`src/utils/meter/calc.ts`（`getFullMonthDays`、`calculateElectricity`）、`src/utils/meter/groups.ts`（`buildMeterGroups`）

> **通用避坑**：
> 1. 用 `new Date(y, m, d)` 做「加一個月」時，`d` 必須先夾到目標月份天數
> 2. 數值防呆分清楚 `??`（只擋 null/undefined）與 `||`（也擋 0）
> 3. 任何除法結果進入比較前先驗證 `Number.isFinite`；`NaN` 的比較永遠 false，會安靜地選錯分支
> 4. 這三個都是肉眼審閱看不出來的錯誤，計算類邏輯應以單元測試涵蓋邊界值

---

## BF-010：手機上簽約精靈跳過合約、直接列印押金收據

- **問題描述**：手機瀏覽器操作簽約精靈，在「確認簽署並產生合約」後畫面直接跳到 ③ 收押金，合約 PDF 從未出現；接著印出來的是押金收據。桌面瀏覽器完全正常。
- **根本原因**：`printHtmlPdf` 呼叫 `win.print()` 後函式即結束，Promise 立刻 resolve。
  ```js
  win.focus()
  win.print()
  }          // ← Promise 在此 resolve
  ```
  **`window.print()` 在桌面會阻塞至列印對話框關閉，行動瀏覽器則立即返回**（列印面板為非同步開啟）。於是在手機上：
  1. `printHtmlPdf` 立刻 resolve
  2. `ContractForm.submitContract` 繼續往下：寫入 `signed_contracts` → `emit('saved')`
  3. `OnboardingMode.onContractSaved` → `next()` → 畫面切到 ③ 收押金
  4. 手機列印面板此時才要出現，但頁面已被換掉

  桌面測不出來，因為 `print()` 會擋住整個流程。
- **最終解法**：`printHtmlPdf` 改為等列印真正結束才 resolve，依序監聽三種訊號：
  1. `afterprint`（桌面；iframe 與父視窗都掛）
  2. 頁面重新取得焦點 / `visibilitychange` 轉為 visible（行動瀏覽器多半不觸發 `afterprint`）—— 延後 1.2 秒掛載，避免捕捉到 `win.focus()` 自身造成的焦點變化而立即結束
  3. 30 秒最後防線，避免三種訊號皆未出現時呼叫端永久卡住

  清理（還原 `document.title`、移除 iframe）與 resolve 綁在同一個 `finish()`，不再各自計時。
- **牽扯檔案**：`src/utils/contractRender.ts`（`printHtmlPdf`）。共 8 處呼叫端一體受惠：合約、押金收據、退租結清單／點交清單、繳費通知單、收據。

### 連帶問題：預設檔名被前一次列印的清理蓋掉

同一根因造成的第二個症狀：`printHtmlPdf` 以 `document.title` 提供「另存為 PDF」的預設檔名，而清理時無條件還原。手機上合約那次的 60 秒安全網計時器，會在使用者**已經在列印押金收據**時觸發，把 `document.title` 還原成網站標題，收據檔名於是變成「租賃管家 | 專業房源管理系統」。

補強兩處：
1. `cleanup()` 只在 `document.title` 仍等於本次設定的檔名時才還原，避免蓋掉後續列印的檔名
2. 行動端的「回到頁面即視為列印結束」判定，改為必須先偵測到 `blur` 或 `visibilitychange → hidden`（確實離開過）才生效；否則單純點一下頁面就會提早還原 title，檔名同樣跑掉。監聽器統一以 `AbortController` 在 `finish()` 時移除

> **通用避坑**：
> 1. `window.print()` 的阻塞行為在桌面與行動端不同，**不可假設它返回時列印已完成**。任何「列印後接著切換畫面／導頁」的流程都必須等 `afterprint`（並為行動端補上 focus／visibilitychange 備援）
> 2. 以 `document.title` 控制列印檔名時，它是**全域單一資源**：還原前必須確認自己仍是最後的設定者，否則會與並行的列印互相覆蓋
> 3. 這類跨平台差異在桌面開發時完全測不出來

---

## BF-011：`firebase deploy --only functions` 失敗 `Cannot determine backend specification. Timeout after 10000`

- **問題描述**：dev.bat「[8] Deploy all」的 Step 2/2 部署 functions 時中斷。log 已印出 `Serving at port 8129`，隨即拋 `User code failed to load. Cannot determine backend specification. Timeout after 10000`。訊息看起來像 `functions/index.js` 有語法錯或頂層卡住，實際上程式碼完全正常。
- **嘗試過程**：逐項排除「使用者程式碼」的可能性 ——
  1. 逐一 `require()` 各依賴計時：`firebase-functions` 243ms、`puppeteer-core` 139ms、`@line/bot-sdk` 149ms、`@sparticuz/chromium` 12ms，合計 544ms
  2. 補上 `FIREBASE_CONFIG` / `GCLOUD_PROJECT` 後整份 `index.js` 載入僅 **764ms**，且 `process._getActiveHandles()` 為空（沒有殘留 timer／socket 卡住 event loop）
  3. 直接跑 discovery：`FUNCTIONS_MANIFEST_OUTPUT_PATH=... node node_modules/firebase-functions/lib/bin/firebase-functions.js .` → 秒回，**18 個 endpoint** 全數解析成功
  4. 手動起 discovery server 再 curl `http://127.0.0.1:PORT/__/functions.yaml` → **HTTP 200、4ms、6628 bytes**

  四項都證明程式碼健康，問題不在 `index.js`。
- **根本原因**：`firebase deploy` 是 fork 一個子行程載入 `functions/index.js`、起 HTTP server，再由 CLI 去 GET `/__/functions.yaml`，而這個等待**寫死 10 秒**（`firebase-tools/lib/deploy/functions/runtimes/discovery/index.js`，`detectFromPort(..., timeout = 10000)`）。

  在 Windows 上這 10 秒並不寬裕：dev.bat 的 `npm run build` 剛寫完整個 `dist/`，Defender 正在忙著即時掃描；緊接著要冷啟動 node、冷讀 `functions/node_modules`（含 `puppeteer-core`、`@sparticuz/chromium` 這類大套件）。暖快取下 764ms 的載入，冷啟動＋防毒掃描＋磁碟競爭下衝破 10 秒是完全合理的。**這是環境時序問題，不是程式碼問題**，所以它會時好時壞。
- **最終解法**：`firebase-tools` 有官方逃生門 `FUNCTIONS_DISCOVERY_TIMEOUT`（**單位為秒**，內部 `× 1000`；為 0／未設定時才回退預設 10000ms）。在 dev.bat 開頭 `cd /d "%~dp0"` 之後統一設定，所有 deploy 分支共用：

  ```bat
  set FUNCTIONS_DISCOVERY_TIMEOUT=120
  ```

  這只是**上限而非固定等待** —— discovery 一準備好就立刻返回，正常情況下完全不會變慢。以 `firebase deploy --only functions --dry-run` 驗證通過（discovery 成功、打包 41.76 KB）。
- **牽扯檔案**：`dev.bat`（新增 `set FUNCTIONS_DISCOVERY_TIMEOUT=120`）。`functions/index.js` **未修改**。

> **通用避坑**：
> 1. `Cannot determine backend specification` 的字面意思是「你的程式碼載不起來」，但它同樣會由**單純的逾時**觸發。判斷前先看有沒有印出 `Serving at port N` —— 有印出就代表子行程活著、程式碼跑得動，該懷疑的是時間而非語法
> 2. 要獨立驗證 functions 程式碼是否健康，用 `FUNCTIONS_MANIFEST_OUTPUT_PATH=<path> node functions/node_modules/firebase-functions/lib/bin/firebase-functions.js .`，可完全繞開 HTTP discovery 直接產出 manifest
> 3. 本機手動測 `index.js` 載入時，記得補 `FIREBASE_CONFIG` 與 `GCLOUD_PROJECT`，否則會被 `onObjectFinalized` 的 `Missing bucket name` 擋下，誤判成真的有 bug
> 4. Windows ＋ 防毒即時掃描會讓所有「短逾時」的工具鏈變得脆弱，尤其是在剛寫完大量檔案（build）之後緊接著執行的步驟

---

## BF 範本

### BF-XXX：標題

- **問題描述**：
- **嘗試過程**：
- **根本原因**：
- **最終解法**：
- **牽扯檔案**：
