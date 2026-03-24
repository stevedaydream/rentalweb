import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '租賃管家系統',
        short_name: '租賃管家',
        theme_color: '#2563EB',
        icons: [
          {
            src: 'pwa-192x192.png', // 檔案需放在 public/ 下
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    // Bundle 分析（僅在 npm run analyze 時啟用）
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
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
    port: 5174,      // 確保 Port 固定 (可選)
  }
})