import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Sentry 錯誤追蹤（僅在設定 VITE_SENTRY_DSN 時啟用）
// 使用方式：在 .env.production 加入 VITE_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.2,       // 20% 效能追蹤
    replaysSessionSampleRate: 0, // 不主動錄製 session
    replaysOnErrorSampleRate: 1, // 發生錯誤時才錄製
    environment: import.meta.env.MODE,
  });
}

// 全域 Vue 錯誤捕捉（元件 lifecycle / render / watchers）
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue Error]', info, err);
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(err, { extra: { info } });
  }
};

// 未捕捉的 Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason);
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.reason);
  }
});

app.mount('#app')
