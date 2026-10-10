# rental-system — 多角色租屋管理 PWA

## 技術棧
- Vue 3、TypeScript、Pinia、Vite、Tailwind；Firebase Auth／Firestore／Storage／Cloud Functions。
- 後端位於 `functions/`，CommonJS 搭配共用出帳規則 ESM，Node.js 22。

## 常用指令與驗證方式
- 開發：`npm run dev`；完整建置：`npm run build`（測試、型別檢查、PWA 建置）。
- 管理員與規則：`npm run test:admin:emulator`。
- 出帳：`npm run test:billing:emulator`；續約：`npm run test:renewal:emulator`。
- UI 修改須實際啟動，以 390px／1440px 檢查主流程及深淺色；無法檢查須明確回報。
- 整合測試使用獨立 demo 模擬器；不得匯入或修改正式資料。

## 專案禁忌
- 開始先讀 `project.md`；修改前先讀檔，完成後更新對應章節。
- 管理員業務異動走伺服端交易與稽核；收款、沖正、退租及補帳需保留重試識別碼。
- 收款規則共用 `functions/billing/payments.mjs`，出帳沿用 `functions/billing/`。
- 已簽原件保留；修正以作廢／重建處理。整戶刪除保留租客 Auth 並解除房東關聯。
- 測試資料與清空工具僅限本機模擬器；平台客服 Bot 與房東 Bot 分開綁定。
- 金鑰、私密網址、帳密見 `secret.md`，不得寫進專案文件或提交。
- Windows 模擬器結束後若埠仍占用，先核對程序命令列為本次 demo 測試，再停止該程序。

## Git 設定
- Git 根目錄在本專案上一層；儲存庫 rentalweb，remote 為 origin，預設分支 main。
- 新功能使用 `feature/<名稱>`；合併 main 需使用者同意，僅於使用者要求時推送。
- 驗證通過後自動 commit，格式 `type(scope): 中文描述`；不得略過 hooks。
