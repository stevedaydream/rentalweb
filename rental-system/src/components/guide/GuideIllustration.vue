<template>
  <figure class="rounded-2xl border border-ink-100 dark:border-ink-700 bg-surface-light dark:bg-surface-dark overflow-hidden">
    <div class="flex items-center gap-1.5 px-3 py-2 border-b border-ink-100 dark:border-ink-700 bg-white/70 dark:bg-ink-800/70" aria-hidden="true">
      <span class="w-2.5 h-2.5 rounded-full bg-red-300"></span>
      <span class="w-2.5 h-2.5 rounded-full bg-amber-300"></span>
      <span class="w-2.5 h-2.5 rounded-full bg-green-300"></span>
      <span class="ml-2 text-[11px] text-text-secondary-light truncate">{{ caption }}</span>
    </div>

    <div role="img" :aria-label="`${caption}示意圖，編號對應左側步驟`" class="p-4 text-[11px] leading-snug text-text-primary-light dark:text-text-primary-dark select-none">
      <div aria-hidden="true">

        <!-- ───────── 房東 ───────── -->
        <div v-if="name === 'landlord-settings'" class="space-y-2.5">
          <div :class="card" class="relative">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <p class="font-bold mb-1.5">基本資料</p>
            <div class="grid grid-cols-2 gap-1.5"><span :class="field">王大明</span><span :class="field">0912-345-678</span></div>
          </div>
          <div :class="card" class="relative">
            <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
            <p class="font-bold mb-1.5">預設收款帳戶</p>
            <div class="grid grid-cols-3 gap-1.5"><span :class="field">822</span><span :class="field" class="col-span-2">1234-5678-9012</span></div>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div :class="card" class="relative">
              <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
              <p class="font-bold mb-1">帳單週期</p>
              <p>每月 <span :class="chip">5</span> 號發送</p>
              <p class="mt-1">每月 <span :class="chip">10</span> 號前繳</p>
            </div>
            <div :class="card" class="relative">
              <b :class="[mk, 'absolute -top-2 -left-2']">4</b>
              <p class="font-bold mb-1">我的簽名</p>
              <svg viewBox="0 0 120 36" class="w-full h-8 text-ink-600 dark:text-ink-200"><path d="M6 26c10-18 18-18 20-6s8 10 16-4 12-10 14 2 10 8 20-6 14-6 38 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg>
              <p class="text-green-600 flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">lock</span>已加密儲存</p>
            </div>
          </div>
        </div>

        <div v-else-if="name === 'landlord-rooms'" class="space-y-2">
          <div class="flex items-center gap-2">
            <span :class="btnGhost">租約狀態：全部</span>
            <span class="ml-auto relative inline-flex gap-0.5 p-0.5 rounded-lg bg-ink-100 dark:bg-ink-700">
              <b :class="[mk, 'absolute -top-2.5 -left-3']">2</b>
              <span class="material-symbols-outlined text-[15px] px-1 text-text-secondary-light">grid_view</span>
              <span class="material-symbols-outlined text-[15px] px-1 rounded bg-white dark:bg-card-dark shadow">view_list</span>
            </span>
            <span :class="btnGold" class="relative"><b :class="[mk, 'absolute -top-2.5 -right-2']">1</b>＋ 新增房源</span>
          </div>
          <div :class="cardFlush" class="divide-y divide-ink-100 dark:divide-ink-700">
            <div class="relative flex items-center gap-2 px-3 py-2 rounded-t-xl bg-ink-50 dark:bg-ink-700/40">
              <b :class="[mk, 'absolute -left-2 top-1.5']">3</b>
              <span class="font-bold w-8">401</span>
              <span :class="[pill, 'bg-green-100 text-green-700']">出租中</span>
              <span class="truncate">葉○恩・至 2027-03-30</span>
              <span class="ml-auto font-bold">NT$7,000</span>
              <span class="material-symbols-outlined text-[14px] rotate-180 text-text-secondary-light">expand_more</span>
            </div>
            <div class="flex gap-1.5 px-3 py-2 bg-ink-50 dark:bg-ink-700/40">
              <span class="relative w-12 h-10 rounded-md border-2 border-yellow-400 bg-gradient-to-br from-amber-200 to-orange-300"><span class="absolute top-0 left-0 bg-yellow-400 text-white text-[8px] px-1 rounded-br">封面</span></span>
              <span class="w-12 h-10 rounded-md bg-gradient-to-br from-sky-200 to-blue-300"></span>
              <span class="w-12 h-10 rounded-md bg-gradient-to-br from-emerald-200 to-teal-300"></span>
            </div>
            <div class="relative flex items-center gap-2 px-3 py-2">
              <b :class="[mk, 'absolute -left-2 top-1.5']">4</b>
              <span class="font-bold w-8">503</span>
              <span :class="[pill, 'bg-green-100 text-green-700']">出租中</span>
              <span class="truncate">馬○露・至 2026-12-31</span>
              <span :class="[pill, 'bg-orange-100 text-orange-700']">60 天內到期</span>
            </div>
            <div class="flex items-center gap-2 px-3 py-2">
              <span class="font-bold w-8">502</span>
              <span :class="[pill, 'bg-blue-100 text-blue-700']">待租</span>
              <span class="text-text-secondary-light">目前無租客</span>
            </div>
          </div>
        </div>

        <div v-else-if="name === 'landlord-onboarding'" class="space-y-3">
          <div class="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white px-3 py-2.5 relative">
            <b :class="[mkDark, 'absolute -top-2 -left-2']">1</b>
            <span class="font-bold">新租客上線</span>
            <span class="flex gap-1.5"><span class="px-2 py-1 rounded-lg bg-white/20">邀請填資料</span><span class="px-2 py-1 rounded-lg bg-white text-gold-600 font-bold">開始 →</span></span>
          </div>
          <ol class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <li v-for="(s, i) in onboardingSteps" :key="s.label" class="relative flex flex-col items-center gap-1 rounded-xl p-2 text-center" :class="i === 0 ? 'bg-gold-100 dark:bg-gold-900/30 ring-2 ring-gold-400' : 'bg-white dark:bg-card-dark border border-ink-100 dark:border-ink-700'">
              <b :class="[mk, 'absolute -top-2 -right-1.5']">{{ Math.min(i + 2, 4) }}</b>
              <span class="material-symbols-outlined text-[18px]" :class="i === 0 ? 'text-gold-600' : 'text-text-secondary-light'">{{ s.icon }}</span>
              <span class="font-bold">{{ s.label }}</span>
              <span class="text-[9px]" :class="i === 0 ? 'text-gold-700' : 'text-text-secondary-light'">{{ i === 0 ? '必填' : '可跳過' }}</span>
            </li>
          </ol>
          <div :class="card" class="space-y-1.5">
            <div class="grid grid-cols-2 gap-1.5"><span :class="field">姓名</span><span :class="field">手機號碼</span></div>
            <div class="grid grid-cols-2 gap-1.5"><span :class="field">證件號碼</span><span :class="field">房源：401 ▾</span></div>
            <div class="flex justify-end gap-1.5"><span :class="btnGhost">跳過</span><span :class="btnGold">下一步</span></div>
          </div>
        </div>

        <div v-else-if="name === 'landlord-contract'" class="space-y-2">
          <div class="flex gap-1 p-0.5 rounded-lg bg-ink-100 dark:bg-ink-700 w-fit">
            <span class="px-2 py-1 rounded-md bg-white dark:bg-card-dark shadow font-bold relative"><b :class="[mk, 'absolute -top-2.5 -left-2.5']">1</b>新建合約</span>
            <span class="px-2 py-1 text-text-secondary-light">上傳紙本</span>
            <span class="px-2 py-1 text-text-secondary-light relative"><b :class="[mk, 'absolute -top-2.5 -right-2']">4</b>合約記錄</span>
          </div>
          <div class="grid grid-cols-2 gap-2 relative">
            <b :class="[mk, 'absolute -top-2 -left-2 z-10']">2</b>
            <div :class="card"><p class="text-[9px] text-text-secondary-light">出租人</p><svg viewBox="0 0 80 24" class="h-6 w-full text-ink-600 dark:text-ink-200"><path d="M4 18c8-14 14-12 16-2s10 4 16-6 14 8 40-2" fill="none" stroke="currentColor" stroke-width="2" /></svg></div>
            <div :class="card"><p class="text-[9px] text-text-secondary-light">承租人</p><svg viewBox="0 0 80 24" class="h-6 w-full text-ink-600 dark:text-ink-200"><path d="M4 14c10 6 16-12 24-4s12 8 20-2 12 6 28-2" fill="none" stroke="currentColor" stroke-width="2" /></svg></div>
          </div>
          <div class="relative rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-2.5 text-amber-800 dark:text-amber-300">
            <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
            <p class="font-bold">此承租人已有租期重疊的合約</p>
            <p class="mt-0.5">401・2026-03-31 ～ 2027-03-30（電子）</p>
            <p class="mt-1.5 flex justify-end gap-1.5"><span class="px-2 py-0.5 rounded">取消</span><span class="px-2 py-0.5 rounded bg-amber-600 text-white font-bold">確認取代並簽署</span></p>
          </div>
          <div :class="cardFlush" class="divide-y divide-ink-100 dark:divide-ink-700">
            <p v-for="r in contractRows" :key="r.label" class="flex items-center gap-2 px-3 py-1.5">
              <span class="font-bold">{{ r.who }}</span><span class="text-text-secondary-light">{{ r.term }}</span>
              <span :class="[pill, r.cls, 'ml-auto']">{{ r.label }}</span>
            </p>
          </div>
        </div>

        <div v-else-if="name === 'landlord-inspection'" class="space-y-3">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 items-stretch">
            <div v-for="(s, i) in inspectionSteps" :key="s.label" class="relative flex flex-col items-center text-center gap-1 rounded-xl p-2 bg-white dark:bg-card-dark border border-ink-100 dark:border-ink-700">
              <b :class="[mk, 'absolute -top-2 -left-1.5']">{{ i + 1 }}</b>
              <span class="material-symbols-outlined text-[20px]" :class="s.color">{{ s.icon }}</span>
              <span class="font-bold">{{ s.label }}</span>
              <span class="text-[9px] text-text-secondary-light">{{ s.who }}</span>
            </div>
          </div>
          <div :class="card" class="space-y-1.5">
            <p v-for="it in inspectionItems" :key="it.name" class="flex items-center gap-2">
              <span class="w-7 h-6 rounded bg-gradient-to-br" :class="it.photo"></span>
              <span class="font-medium">{{ it.name }}</span>
              <span class="ml-auto" :class="[pill, it.cls]">{{ it.state }}</span>
            </p>
          </div>
          <p class="flex items-center justify-center gap-2 text-text-secondary-light">
            <span class="material-symbols-outlined text-[16px]">smartphone</span>房東 → 租客 → 房東（PIN）<span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
          </p>
        </div>

        <div v-else-if="name === 'landlord-meter'" class="space-y-2">
          <div class="flex items-center gap-2">
            <span :class="btnGhost" class="relative"><b :class="[mk, 'absolute -top-2.5 -left-2']">1</b>抄表月份：2026-09 ▾</span>
            <span :class="btnGhost" class="ml-auto">計算參數設定</span>
          </div>
          <div class="relative rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-2.5 grid grid-cols-3 gap-1.5 items-end">
            <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
            <span><span class="block text-[9px] text-text-secondary-light">本期總度數</span><span :class="field">1,820</span></span>
            <span><span class="block text-[9px] text-text-secondary-light">本期總帳單($)</span><span :class="field">6,915</span></span>
            <span class="text-blue-700 dark:text-blue-300 font-bold text-center">3.80 元/度</span>
          </div>
          <div :class="cardFlush" class="relative">
            <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
            <p class="grid grid-cols-4 gap-2 px-3 py-1.5 text-[9px] text-text-secondary-light border-b border-ink-100 dark:border-ink-700"><span>房號</span><span class="text-right">上期</span><span class="text-center">本期讀數</span><span class="text-right">電費</span></p>
            <p v-for="m in meterRows" :key="m.room" class="grid grid-cols-4 gap-2 items-center px-3 py-1">
              <span class="font-bold">{{ m.room }}</span><span class="text-right text-text-secondary-light">{{ m.prev }}</span>
              <span class="text-center"><span class="inline-block w-14 rounded border px-1 py-0.5" :class="m.focus ? 'border-gold-500 ring-2 ring-gold-300' : 'border-ink-200 dark:border-ink-600'">{{ m.cur }}</span></span>
              <span class="text-right">{{ m.cost }}</span>
            </p>
          </div>
          <p class="flex justify-end gap-1.5"><span :class="btnGhost" class="relative"><b :class="[mk, 'absolute -top-2.5 -left-2']">4</b>儲存紀錄</span><span :class="btnGold">前往帳務管理，生成帳單</span></p>
        </div>

        <div v-else-if="name === 'landlord-billing'" class="space-y-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span :class="btnGhost">2026-09 ▾</span>
            <span class="relative px-2 py-1 rounded-lg bg-ink-700 text-white font-bold"><b :class="[mk, 'absolute -top-2.5 -left-2']">1</b>一鍵生成帳單</span>
            <span :class="btnGhost" class="relative"><b :class="[mk, 'absolute -top-2.5 -right-2']">2</b>… 更多</span>
            <span :class="btnGold" class="ml-auto">記一筆</span>
          </div>
          <div :class="card" class="flex gap-4">
            <span><span class="block text-[9px] text-text-secondary-light">本月已出帳</span><b>14 筆</b></span>
            <span><span class="block text-[9px] text-text-secondary-light">待收</span><b class="text-orange-600">NT$ 21,300</b></span>
            <span class="relative"><b :class="[mk, 'absolute -top-2 -right-4']">3</b><span class="block text-[9px] text-text-secondary-light">待確認</span><b class="text-amber-600">1 筆</b></span>
          </div>
          <div :class="cardFlush" class="divide-y divide-ink-100 dark:divide-ink-700">
            <p v-for="t in billingRows" :key="t.who" class="relative flex items-center gap-2 px-3 py-2">
              <b v-if="t.mark" :class="[mk, 'absolute -left-2 top-2']">4</b>
              <span class="font-bold">{{ t.who }}</span>
              <span class="text-text-secondary-light">{{ t.count }}</span>
              <span v-if="t.badge" :class="[pill, t.badgeCls]">{{ t.badge }}</span>
              <span class="ml-auto font-bold" :class="t.amountCls">{{ t.amount }}</span>
              <span v-if="t.action" class="px-2 py-0.5 rounded-md bg-green-600 text-white font-bold">收款</span>
            </p>
          </div>
        </div>

        <div v-else-if="name === 'landlord-tenants'" class="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div class="sm:col-span-2 grid grid-cols-3 sm:grid-cols-1 gap-1.5 content-start">
            <p v-for="t in tenantRows" :key="t.name" class="rounded-lg px-2 py-1.5 border" :class="t.active ? 'border-gold-400 bg-gold-50 dark:bg-gold-900/20' : 'border-ink-100 dark:border-ink-700 bg-white dark:bg-card-dark'">
              <span class="font-bold block">{{ t.name }}</span>
              <span class="text-[9px] text-text-secondary-light">{{ t.meta }}</span>
            </p>
          </div>
          <div class="sm:col-span-3 rounded-xl bg-white dark:bg-card-dark border border-ink-100 dark:border-ink-700 p-2 space-y-1.5 shadow-lg">
            <p class="font-bold">葉○恩・401</p>
            <p class="relative rounded-lg border border-purple-200 text-purple-600 dark:text-purple-300 px-2 py-1 text-center"><b :class="[mk, 'absolute -top-1.5 -left-2.5']">1</b>建立租客登入帳號</p>
            <p class="relative rounded-lg border border-gold-200 text-gold-700 dark:text-gold-300 px-2 py-1 text-center"><b :class="[mk, 'absolute -top-1.5 -left-2.5']">2</b>產生啟用連結</p>
            <p class="relative grid grid-cols-2 gap-1"><b :class="[mk, 'absolute -top-1.5 -left-2.5']">3</b><span class="rounded-lg bg-gold-500 text-white font-bold text-center py-1">一鍵續約</span><span class="rounded-lg border border-red-200 text-red-600 text-center py-1">標記不續約</span></p>
            <p class="relative grid grid-cols-2 gap-1"><b :class="[mk, 'absolute -top-1.5 -left-2.5']">4</b><span class="rounded-lg border border-red-200 text-red-600 text-center py-1">退租點交</span><span class="rounded-lg border border-red-200 text-red-600 text-center py-1">辦理退租</span></p>
          </div>
        </div>

        <div v-else-if="name === 'landlord-comms'" class="space-y-2">
          <div :class="card" class="relative flex items-center gap-2">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <span class="material-symbols-outlined text-[18px] text-orange-500">build</span>
            <span class="flex-1"><b class="block">浴室蓮蓬頭漏水</b><span class="text-text-secondary-light">503・水電設備</span></span>
            <span :class="[pill, 'bg-red-100 text-red-600']">緊急</span>
            <span class="px-2 py-0.5 rounded-md border border-ink-200 dark:border-ink-600">處理中 ▾</span>
          </div>
          <div :class="card" class="relative">
            <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
            <p class="flex items-center gap-1.5"><span :class="[pill, 'bg-red-100 text-red-600']">置頂</span><b>10/1 停水通知</b></p>
            <p class="text-text-secondary-light mt-0.5">發布後推播給已綁定 LINE 的租客</p>
          </div>
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
            <p class="flex"><span class="max-w-[70%] rounded-xl rounded-bl-sm bg-ink-100 dark:bg-ink-700 px-2 py-1">請問這個月電費怎麼算？</span></p>
            <p class="flex justify-end"><span class="max-w-[70%] rounded-xl rounded-br-sm bg-[#06C755] text-white px-2 py-1">帳單明細有列出度數喔！</span></p>
          </div>
        </div>

        <!-- ───────── 租客 ───────── -->
        <div v-else-if="name === 'tenant-login'" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <p class="font-bold text-center">帳號啟用</p>
            <p class="text-center text-text-secondary-light">請輸入證件號碼確認身分</p>
            <span :class="field">A1234*****</span>
            <span :class="btnGold" class="block text-center relative"><b :class="[mk, 'absolute -top-2 -right-2']">2</b>確認</span>
          </div>
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
            <p class="flex gap-1 p-0.5 rounded-lg bg-ink-100 dark:bg-ink-700"><span class="flex-1 text-center rounded-md bg-white dark:bg-card-dark shadow py-0.5 font-bold">身分證登入</span><span class="flex-1 text-center py-0.5 text-text-secondary-light">Email</span></p>
            <span :class="field">0912345678</span>
            <span :class="field">A123456789</span>
            <span class="relative block text-center rounded-lg border border-ink-200 dark:border-ink-600 py-1"><b :class="[mk, 'absolute -top-2 -right-2']">4</b>使用 Google 登入</span>
          </div>
        </div>

        <div v-else-if="name === 'tenant-home'" class="space-y-2">
          <div :class="card" class="relative">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <p class="text-text-secondary-light">您的租屋處</p>
            <p class="font-bold text-sm">401 室</p>
            <p class="flex justify-between mt-1"><span class="text-text-secondary-light">租賃期間</span><span>2026-03-31 ~ 2027-03-30</span></p>
          </div>
          <div class="rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white p-2.5 relative flex items-end justify-between">
            <b :class="[mkDark, 'absolute -top-2 -left-2']">2</b>
            <span><span class="block text-gold-100">本月應繳總金額</span><b class="text-base">NT$ 8,245</b></span>
            <span class="px-2 py-1 rounded-lg bg-white text-gold-600 font-bold">前往繳費</span>
          </div>
          <div class="relative rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-2.5 flex items-center gap-2">
            <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
            <span class="flex-1 text-amber-800 dark:text-amber-300">租約將到期，是否續租？</span>
            <span class="px-2 py-0.5 rounded-md bg-green-600 text-white font-bold">我要續租</span>
            <span class="px-2 py-0.5 rounded-md border border-ink-200 dark:border-ink-600">不續租</span>
          </div>
          <div class="grid grid-cols-2 gap-2 relative">
            <b :class="[mk, 'absolute -top-2 -left-2 z-10']">4</b>
            <span :class="card" class="text-center"><span class="material-symbols-outlined text-[18px] text-orange-500 block">build_circle</span>我要報修</span>
            <span :class="card" class="text-center"><span class="material-symbols-outlined text-[18px] text-blue-500 block">support_agent</span>聯繫房東</span>
          </div>
        </div>

        <div v-else-if="name === 'tenant-bills'" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <p class="font-bold">帳單詳情</p>
            <p class="flex justify-between"><span>租金</span><span>7,000</span></p>
            <p class="flex justify-between"><span>電費 325 度</span><span>1,245</span></p>
            <div class="rounded-lg bg-ink-50 dark:bg-ink-700/50 p-1.5">
              <p class="font-bold">匯款資訊</p>
              <p class="text-text-secondary-light">822・1234-5678-9012</p>
            </div>
            <span :class="btnGold" class="block text-center relative"><b :class="[mk, 'absolute -top-2 -right-2']">2</b>前往繳費</span>
          </div>
          <div class="space-y-2">
            <div :class="card" class="relative space-y-1.5">
              <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
              <p class="font-bold">上傳繳費截圖</p>
              <p class="rounded-lg border-2 border-dashed border-ink-200 dark:border-ink-600 py-3 text-center text-text-secondary-light"><span class="material-symbols-outlined text-[18px] block">add_photo_alternate</span>選擇圖片</p>
              <span :class="btnGold" class="block text-center">送出截圖</span>
            </div>
            <div class="relative rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 text-amber-700 dark:text-amber-300 font-bold">
              <b :class="[mk, 'absolute -top-2 -left-2']">4</b>
              截圖已上傳，等待房東確認
            </div>
          </div>
        </div>

        <div v-else-if="name === 'tenant-contract'" class="space-y-2">
          <div class="rounded-xl border-2 border-amber-400 bg-white dark:bg-card-dark overflow-hidden">
            <p class="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">pending_actions</span>需要您確認合約內容</p>
            <div class="p-3 space-y-2">
              <p class="flex items-center gap-1.5"><b>401 租賃合約</b><span :class="[pill, 'bg-blue-100 text-blue-700']">電子合約</span><span :class="[pill, 'bg-green-100 text-green-700']">生效中</span></p>
              <span :class="btnGhost" class="relative inline-block"><b :class="[mk, 'absolute -top-2.5 -left-2']">1</b>查閱合約</span>
              <p class="relative flex items-start gap-1.5 pt-2 border-t border-ink-100 dark:border-ink-700">
                <b :class="[mk, 'absolute right-0 top-1.5']">2</b>
                <span class="w-3.5 h-3.5 mt-px rounded bg-gold-500 text-white text-[10px] leading-none flex items-center justify-center">✓</span>
                我已詳閱此租賃合約，確認內容無誤
              </p>
              <span :class="btnGold" class="relative inline-block"><b :class="[mk, 'absolute -top-2.5 -right-2']">3</b>確認已收到此合約</span>
            </div>
          </div>
          <p class="flex flex-wrap gap-1.5 justify-center">
            <span :class="[pill, 'bg-blue-100 text-blue-700']">待生效</span><span :class="[pill, 'bg-green-100 text-green-700']">生效中</span><span :class="[pill, 'bg-ink-100 text-ink-500']">已被取代</span><span :class="[pill, 'bg-ink-100 text-ink-500']">已到期</span>
          </p>
        </div>

        <div v-else-if="name === 'tenant-line'" class="space-y-2">
          <div :class="card" class="relative flex items-center gap-3">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <span class="grid grid-cols-5 gap-px w-14 h-14 p-1 rounded-lg border border-[#06C755]/40 bg-white">
              <span v-for="n in 25" :key="n" :class="qrPattern.includes(n) ? 'bg-ink-800' : 'bg-white'"></span>
            </span>
            <span class="flex-1"><b class="block">掃碼加入 LINE Bot</b><span class="text-text-secondary-light">或按下方按鈕</span></span>
            <span class="px-2 py-1 rounded-lg bg-[#06C755] text-white font-bold">加入 LINE Bot</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div :class="card" class="relative text-center space-y-1">
              <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
              <p class="text-text-secondary-light">請將綁定碼傳給 Bot</p>
              <p class="font-mono font-bold text-lg tracking-[0.2em]">482 915</p>
              <p class="text-green-600">剩餘 4:52</p>
            </div>
            <div class="relative rounded-xl bg-[#8CABD9]/30 dark:bg-ink-700 p-2 space-y-1.5">
              <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
              <p class="flex justify-end"><span class="rounded-xl rounded-br-sm bg-[#06C755] text-white px-2 py-0.5 font-mono">482915</span></p>
              <p class="flex"><span class="rounded-xl rounded-bl-sm bg-white dark:bg-card-dark px-2 py-0.5">✅ 綁定成功！</span></p>
            </div>
          </div>
        </div>

        <div v-else-if="name === 'tenant-repair'" class="space-y-2">
          <span :class="btnGold" class="relative inline-block"><b :class="[mk, 'absolute -top-2.5 -left-2']">1</b>＋ 立即新增報修</span>
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
            <p class="font-bold">填寫報修單</p>
            <span :class="field">設備類別：水電設備 ▾</span>
            <span :class="field">浴室蓮蓬頭漏水</span>
            <p class="flex gap-1"><span class="flex-1 text-center rounded-md border border-ink-200 dark:border-ink-600 py-0.5">一般</span><span class="flex-1 text-center rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-600 py-0.5 font-bold">一般緊急</span><span class="flex-1 text-center rounded-md border border-ink-200 dark:border-ink-600 py-0.5">緊急</span></p>
          </div>
          <div :class="card" class="relative flex items-center gap-2">
            <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
            <span class="flex-1"><b class="block">浴室蓮蓬頭漏水</b><span class="text-text-secondary-light">房東回覆：週三下午師傅到府</span></span>
            <span :class="[pill, 'bg-blue-100 text-blue-700']">處理中</span>
          </div>
        </div>

        <div v-else-if="name === 'tenant-profile'" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <p class="font-bold">入住點交</p>
            <p v-for="it in inspectionItems.slice(0, 3)" :key="it.name" class="flex items-center gap-1.5"><span class="w-5 h-4 rounded bg-gradient-to-br" :class="it.photo"></span>{{ it.name }}<span class="ml-auto" :class="[pill, it.cls]">{{ it.state }}</span></p>
            <p class="text-right text-text-secondary-light">✍︎ 雙方已簽名・列印 PDF</p>
          </div>
          <div class="space-y-2">
            <div class="relative rounded-xl bg-ink-800 text-white px-2.5 py-2 flex items-center justify-between">
              <span class="font-bold">租客版</span>
              <span class="relative"><b :class="[mk, 'absolute -top-2 -right-3']">2</b><span class="material-symbols-outlined text-[18px] text-gold-300">account_circle</span></span>
            </div>
            <div :class="card" class="relative space-y-1.5">
              <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
              <p class="font-bold">我的資料</p>
              <span :class="field">電話 0912-345-678</span>
              <span :class="field">緊急聯絡人</span>
              <span :class="btnGhost" class="block text-center">變更登入密碼</span>
            </div>
          </div>
        </div>

        <!-- ───────── 訪客 ───────── -->
        <div v-else-if="name === 'visitor-explore'" class="space-y-2">
          <p class="relative flex gap-1.5"><b :class="[mk, 'absolute -top-2 -left-2']">1</b><span :class="field">全部格局 ▾</span><span :class="field">全部價格 ▾</span></p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div v-for="(r, i) in exploreRooms" :key="r.name" class="rounded-xl overflow-hidden border border-ink-100 dark:border-ink-700 bg-white dark:bg-card-dark">
              <div class="relative h-14 bg-gradient-to-br" :class="r.photo">
                <b v-if="i === 0" :class="[mk, 'absolute bottom-1 right-9']">2</b><span class="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-white flex items-center gap-0.5"><span class="material-symbols-outlined text-[11px]">photo_library</span>{{ r.photos }}</span>
              </div>
              <div class="p-1.5 relative">
                <b v-if="i === 0" :class="[mk, 'absolute -top-1 -right-1']">3</b>
                <p class="flex justify-between"><b>{{ r.name }}</b><b class="text-primary">NT${{ r.price }}</b></p>
                <p class="text-text-secondary-light">{{ r.meta }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="name === 'visitor-landlord'" class="space-y-2">
          <div :class="card" class="relative flex items-center gap-2">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <span class="w-9 h-9 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center font-bold">王</span>
            <span class="flex-1"><b class="block">王房東</b><span class="text-amber-500">★★★★★</span> <span class="text-text-secondary-light">4.8（12）</span></span>
            <span class="relative px-2 py-1 rounded-lg bg-[#06C755] text-white font-bold"><b :class="[mk, 'absolute -top-2.5 -right-2']">2</b>透過 LINE 詢問</span>
          </div>
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
            <p class="font-bold">租客評價</p>
            <p><span class="text-amber-500">★★★★★</span> 房東回覆快，房間乾淨。</p>
            <p class="ml-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-2 py-1"><span class="text-blue-600 font-medium">房東回覆</span>　謝謝您！</p>
            <span :class="btnGhost" class="inline-block">留下評價</span>
          </div>
        </div>

        <div v-else-if="name === 'visitor-join'" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <p class="font-bold">租客資料填寫</p>
            <span :class="field">姓名 *</span>
            <span :class="field">聯絡電話 *</span>
            <span :class="field">證件號碼（選填）</span>
            <span :class="btnGold" class="block text-center">送出</span>
          </div>
          <div class="space-y-2">
            <div :class="card" class="relative text-center space-y-1">
              <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
              <p class="text-text-secondary-light">已和房東談好了嗎？</p>
              <span :class="btnGold" class="block">輸入房東代碼，完成租客註冊</span>
            </div>
            <div class="relative rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 text-green-700 dark:text-green-300">
              <b :class="[mk, 'absolute -top-2 -left-2']">3</b>
              <span class="material-symbols-outlined text-[14px] align-middle">link</span> 房東建檔後傳送啟用連結
            </div>
          </div>
        </div>

        <!-- ───────── 管理員 ───────── -->
        <div v-else-if="name === 'admin-overview'" class="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div class="sm:col-span-2 rounded-xl bg-gray-900 text-gray-300 p-2 space-y-1 relative">
            <b :class="[mk, 'absolute -top-2 -right-2']">3</b>
            <span class="block w-fit px-1.5 rounded-full bg-red-600 text-white text-[9px] font-bold mb-1">系統核心管理</span>
            <p v-for="(m, i) in adminMenu" :key="m" class="px-1.5 py-1 rounded" :class="i === 0 ? 'bg-red-600 text-white' : ''">{{ m }}</p>
          </div>
          <div class="sm:col-span-3 space-y-2">
            <div :class="card" class="relative text-center">
              <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
              <p class="font-bold">系統管理員登入</p>
              <p class="text-text-secondary-light">/admin/login</p>
            </div>
            <div class="grid grid-cols-2 gap-1.5 relative">
              <b :class="[mk, 'absolute -top-2 -left-2 z-10']">2</b>
              <span :class="card" class="text-center"><b class="block text-sm">18</b>房東</span>
              <span :class="card" class="text-center"><b class="block text-sm">126</b>租客</span>
            </div>
          </div>
        </div>

        <div v-else-if="name === 'admin-impersonate'" class="space-y-2">
          <div :class="card" class="relative flex items-center gap-2">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <span class="flex-1"><b class="block">王房東</b><span class="text-text-secondary-light">代碼 LD-2048・7 間房</span></span>
            <span class="material-symbols-outlined text-[18px] rounded-lg border border-ink-200 dark:border-ink-600 p-1">manage_accounts</span>
          </div>
          <div class="relative rounded-xl bg-amber-400 text-amber-900 px-3 py-2 flex items-center gap-2 font-medium">
            <b :class="[mkDark, 'absolute -top-2 -left-2']">2</b>
            <span class="material-symbols-outlined text-[15px]">manage_accounts</span>
            <span class="flex-1">正在模擬房東：<b>王房東</b></span>
            <span class="relative px-2 py-0.5 rounded-lg bg-amber-900/20"><b :class="[mkDark, 'absolute -top-2.5 -right-2']">3</b>結束模擬</span>
          </div>
          <div :class="card" class="opacity-70"><p class="font-bold">房東後台（與房東看到的畫面相同）</p><p class="text-text-secondary-light">儀表板・房源管理・租客列表…</p></div>
        </div>

        <div v-else-if="name === 'admin-pairing'" class="space-y-2">
          <div class="grid grid-cols-3 gap-1.5">
            <span :class="card" class="text-center"><b class="block text-sm">126</b>總租客數</span>
            <span :class="card" class="text-center"><b class="block text-sm">121</b>已配對</span>
            <span :class="card" class="relative text-center text-red-600 font-bold"><b :class="[mk, 'absolute -top-2 -left-2']">1</b><b class="block text-sm">5</b>未歸屬</span>
          </div>
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
            <p class="font-bold">配對房東</p>
            <p class="text-text-secondary-light">目標租客：陳○○</p>
            <span :class="field">選擇房東：王房東 ▾</span>
            <span :class="btnGold" class="relative block text-center"><b :class="[mk, 'absolute -top-2 -right-2']">3</b>確認配對</span>
          </div>
        </div>

        <div v-else-if="name === 'admin-flags'" class="space-y-2">
          <div :class="card" class="relative space-y-1.5">
            <b :class="[mk, 'absolute -top-2 -left-2']">1</b>
            <p class="font-bold">房東功能</p>
            <p v-for="f in flagRows" :key="f.label" class="flex items-center justify-between">
              <span>{{ f.label }}</span>
              <span class="w-8 h-4 rounded-full relative" :class="f.on ? 'bg-emerald-500' : 'bg-ink-300 dark:bg-ink-600'"><span class="absolute top-0.5 w-3 h-3 rounded-full bg-white" :class="f.on ? 'right-0.5' : 'left-0.5'"></span></span>
            </p>
          </div>
          <div class="relative rounded-xl border border-dashed border-ink-300 dark:border-ink-600 p-2.5 text-center">
            <b :class="[mk, 'absolute -top-2 -left-2']">2</b>
            <span class="material-symbols-outlined text-[20px] text-amber-500 block">construction</span>
            <b>電表登錄 維修中</b>
            <p class="text-text-secondary-light">請稍後再試</p>
          </div>
        </div>

      </div>
    </div>
  </figure>
</template>

<script setup lang="ts">
defineProps<{ name: string; caption: string }>();

const mk = 'inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-gold-500 text-white text-[10px] font-bold not-italic ring-2 ring-white dark:ring-ink-800 shadow';
const mkDark = mk.replace('bg-gold-500', 'bg-ink-800');
const card = 'block rounded-xl bg-white dark:bg-card-dark border border-ink-100 dark:border-ink-700 p-2.5';
const cardFlush = card.replace(' p-2.5', '');
const field = 'block rounded-md border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 px-1.5 py-1 text-text-secondary-light truncate';
const chip = 'inline-block px-1.5 rounded bg-ink-100 dark:bg-ink-700 font-bold';
const pill = 'shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold';
const btnGold = 'px-2 py-1 rounded-lg bg-gold-500 text-white font-bold';
const btnGhost = 'px-2 py-1 rounded-lg border border-ink-200 dark:border-ink-600 bg-white dark:bg-card-dark';

const onboardingSteps = [
  { label: '建檔', icon: 'badge' },
  { label: '簽約', icon: 'draw' },
  { label: '收押金', icon: 'receipt_long' },
  { label: '點交', icon: 'checklist' },
];

const contractRows = [
  { who: '葉○恩', term: '2026-09-14 起', label: '生效中', cls: 'bg-green-100 text-green-700' },
  { who: '葉○恩', term: '2026-03-31 起', label: '已被取代', cls: 'bg-ink-100 text-ink-500' },
  { who: '馬○露', term: '2027-01-01 起', label: '待生效', cls: 'bg-blue-100 text-blue-700' },
];

const inspectionSteps = [
  { label: '選項目', who: '房東', icon: 'checklist', color: 'text-gold-600' },
  { label: '逐項確認', who: '租客', icon: 'photo_camera', color: 'text-blue-500' },
  { label: 'PIN 交還', who: '房東', icon: 'pin', color: 'text-gold-600' },
  { label: '協調簽名', who: '雙方', icon: 'draw', color: 'text-green-600' },
];

const inspectionItems = [
  { name: '冷氣', state: '良好', cls: 'bg-green-100 text-green-700', photo: 'from-sky-200 to-blue-300' },
  { name: '床墊', state: '輕微', cls: 'bg-amber-100 text-amber-700', photo: 'from-amber-200 to-orange-300' },
  { name: '牆面', state: '良好', cls: 'bg-green-100 text-green-700', photo: 'from-stone-200 to-stone-300' },
];

const meterRows = [
  { room: '401', prev: '11,158', cur: '11,483', cost: '1,245', focus: false },
  { room: '402', prev: '8,902', cur: '9_', cost: '—', focus: true },
  { room: '403', prev: '10,210', cur: '', cost: '—', focus: false },
];

const billingRows = [
  { who: '葉○恩 401', count: '2 筆', amount: '8,245', amountCls: 'text-orange-600', badge: '待確認', badgeCls: 'bg-amber-100 text-amber-700', action: true, mark: true },
  { who: '沈○佳 403', count: '3 筆', amount: '12,480', amountCls: 'text-orange-600', badge: '前期欠', badgeCls: 'bg-red-100 text-red-600', action: true, mark: false },
  { who: '林○霖 504', count: '2 筆', amount: '已收', amountCls: 'text-green-600', badge: '', badgeCls: '', action: false, mark: false },
];

const tenantRows = [
  { name: '葉○恩', meta: '401・入住中', active: true },
  { name: '沈○佳', meta: '403・剩餘 45 日', active: false },
  { name: '林○霖', meta: '504・待點交', active: false },
];

const qrPattern = [1, 2, 4, 5, 6, 8, 10, 12, 13, 14, 16, 19, 20, 21, 22, 24, 25];

const exploreRooms = [
  { name: '幸福公寓 A-201', price: '8,500', meta: '8 坪・獨立套房', photos: 5, photo: 'from-amber-200 to-rose-300' },
  { name: '河濱雅房 3F', price: '6,200', meta: '5 坪・雅房', photos: 3, photo: 'from-sky-200 to-indigo-300' },
];

const adminMenu = ['系統總覽', '房東管理', '租客與配對', '資料庫操作', '功能開關', '系統模擬器'];

const flagRows = [
  { label: '房源管理', on: true },
  { label: '帳務管理', on: true },
  { label: '電表登錄', on: false },
];
</script>
