<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <span class="material-symbols-outlined text-8xl text-gray-300 dark:text-gray-700 mb-4">search_off</span>
    <h1 class="text-6xl font-bold text-gray-800 dark:text-white mb-2">404</h1>
    <p class="text-gray-500 dark:text-gray-400 text-lg mb-8">找不到這個頁面</p>
    <div class="flex gap-3">
      <button
        @click="$router.back()"
        class="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        返回上一頁
      </button>
      <router-link
        to="/"
        class="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        回到首頁
      </router-link>
    </div>
  </div>
</template>
