import { defineConfig } from 'vitest/config'

// 獨立於 vite.config.ts：測試對象皆為純函式，不需要 vue plugin 與 PWA，
// 省下每次執行的插件初始化時間。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 明確 import describe/it/expect，不用全域注入，tsconfig 無須額外設定 types
    globals: false,
    // 找不到測試檔要視為失敗：build 會跑 vitest，靜默通過等於失去防護
    passWithNoTests: false,
  },
})
