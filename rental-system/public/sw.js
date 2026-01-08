// 監聽 install 事件
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
});

// 必須包含 fetch 事件，瀏覽器才會判定為可安裝
self.addEventListener('fetch', (event) => {
  // 這裡可以留空，或者處理快取邏輯
});