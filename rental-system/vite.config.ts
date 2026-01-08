import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 將 node_modules 中的套件拆分到 vendor 檔案
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    // 如果您確定檔案大一點沒關係，可以放寬警告限制
    chunkSizeWarningLimit: 1000, 
  },
  server: {
    host: '0.0.0.0', // [關鍵] 允許透過 IP (如 127.0.0.1) 訪問
    port: 5173,      // 確保 Port 固定 (可選)
  }
})