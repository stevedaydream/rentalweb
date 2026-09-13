<template>
  <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
    <div class="hidden md:grid grid-cols-[7rem_5.5rem_minmax(0,1.6fr)_minmax(0,1.2fr)_7rem_9rem_2rem] gap-4 px-5 py-3 text-xs font-bold text-text-secondary-light bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
      <span>房號</span>
      <span>狀態</span>
      <span>租客／租期</span>
      <span>租金・坪數・格局</span>
      <span>刊登／照片</span>
      <span class="text-right">操作</span>
      <span></span>
    </div>

    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="room in rooms" :key="room.id">
        <div
          role="button"
          tabindex="0"
          :aria-expanded="expandedId === room.id"
          class="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[7rem_5.5rem_minmax(0,1.6fr)_minmax(0,1.2fr)_7rem_9rem_2rem] gap-x-4 gap-y-1 items-center px-5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500"
          :class="{ 'bg-gray-50 dark:bg-gray-800/40': expandedId === room.id }"
          @click="toggle(room.id)"
          @keydown.enter.prevent="toggle(room.id)"
          @keydown.space.prevent="toggle(room.id)"
        >
          <div class="min-w-0">
            <p class="font-bold text-text-primary-light dark:text-text-primary-dark truncate">{{ room.name }}</p>
            <p class="text-xs text-text-secondary-light truncate">{{ room.type }}</p>
          </div>

          <div class="flex items-center gap-2 md:block">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap" :class="statusColors[room.status]">
              {{ statusLabels[room.status] }}
            </span>
            <span class="material-symbols-outlined text-gray-400 transition-transform md:hidden" :class="{ 'rotate-180': expandedId === room.id }" aria-hidden="true">expand_more</span>
          </div>

          <div class="col-span-2 md:col-span-1 min-w-0">
            <template v-if="room.status === 'occupied'">
              <p class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">{{ room.tenantName || '—' }}</p>
              <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span class="text-xs text-text-secondary-light">至 {{ room.leaseEnd || '待確認' }}</span>
                <span v-if="room.lease.label" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full" :class="leaseBadgeClass(room.lease.urgency)">
                  {{ room.lease.label }}
                </span>
              </div>
            </template>
            <span v-else class="text-sm text-text-secondary-light">目前無租客</span>
          </div>

          <div class="hidden md:block text-sm text-text-primary-light dark:text-text-primary-dark">
            <p class="font-semibold">NT$ {{ (room.price ?? 0).toLocaleString() }}</p>
            <p class="text-xs text-text-secondary-light">{{ room.size }} 坪・{{ room.layout }}</p>
          </div>

          <div class="hidden md:flex items-center gap-2 text-xs text-text-secondary-light">
            <span v-if="room.isPublic" class="material-symbols-outlined text-[16px] text-emerald-600" title="公開刊登" aria-label="公開刊登">public</span>
            <span class="flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[16px]" aria-hidden="true">photo_library</span>{{ roomImages(room).length }}
            </span>
          </div>

          <div class="hidden md:flex justify-end gap-2">
            <button type="button" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-xs font-medium transition-colors" @click.stop="emit('edit', room)">編輯</button>
            <button type="button" class="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-xs font-medium transition-colors" @click.stop="emit('view', room)">詳情</button>
          </div>

          <span class="hidden md:block material-symbols-outlined text-gray-400 transition-transform" :class="{ 'rotate-180': expandedId === room.id }" aria-hidden="true">expand_more</span>
        </div>

        <div v-if="expandedId === room.id" class="px-5 pb-4 pt-1 bg-gray-50 dark:bg-gray-800/40 space-y-3">
          <div class="md:hidden flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary-light">
            <span class="font-semibold text-text-primary-light dark:text-text-primary-dark">NT$ {{ (room.price ?? 0).toLocaleString() }}</span>
            <span>{{ room.size }} 坪・{{ room.layout }}</span>
            <span v-if="room.isPublic" class="text-emerald-600">公開刊登</span>
          </div>

          <div v-if="roomImages(room).length" class="flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="(img, i) in roomImages(room)"
              :key="`${i}-${img}`"
              type="button"
              class="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              :class="img === room.coverImage ? 'border-yellow-400' : 'border-transparent hover:border-blue-400'"
              :aria-label="`放大第 ${i + 1} 張照片`"
              @click="openLightbox(room, i)"
            >
              <img :src="img" class="w-full h-full object-cover" alt="" loading="lazy">
              <span v-if="img === room.coverImage" class="absolute top-1 left-1 bg-yellow-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">封面</span>
            </button>
          </div>
          <p v-else class="text-sm text-text-secondary-light">尚未上傳照片</p>

          <div class="md:hidden flex gap-2">
            <button type="button" class="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium" @click="emit('edit', room)">編輯</button>
            <button type="button" class="flex-1 py-2 rounded-lg bg-gold-500 text-white text-sm font-medium" @click="emit('view', room)">詳情</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="lightbox"
        class="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        :aria-label="`${lightbox.name} 照片`"
        @click.self="closeLightbox"
      >
        <button type="button" aria-label="關閉" class="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors" @click="closeLightbox">
          <span class="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
        </button>
        <div class="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {{ lightbox.name }}・{{ lightboxIndex + 1 }} / {{ lightbox.images.length }}
        </div>

        <img :src="lightbox.images[lightboxIndex]" class="max-w-[calc(100%-2rem)] max-h-[75vh] object-contain rounded-lg select-none" alt="房間照片放大">

        <button v-if="lightboxIndex > 0" type="button" aria-label="上一張" class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors" @click="lightboxIndex--">
          <span class="material-symbols-outlined text-[28px]" aria-hidden="true">chevron_left</span>
        </button>
        <button v-if="lightboxIndex < lightbox.images.length - 1" type="button" aria-label="下一張" class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors" @click="lightboxIndex++">
          <span class="material-symbols-outlined text-[28px]" aria-hidden="true">chevron_right</span>
        </button>

        <div v-if="lightbox.images.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
          <button
            v-for="(img, i) in lightbox.images"
            :key="`${i}-${img}`"
            type="button"
            :aria-label="`第 ${i + 1} 張照片`"
            :aria-pressed="i === lightboxIndex"
            class="shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all"
            :class="i === lightboxIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-75'"
            @click="lightboxIndex = i"
          >
            <img :src="img" class="w-full h-full object-cover" alt="">
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import type { ManagedRoom, RoomLeaseSummary } from '../../types';

type ListRoom = ManagedRoom & { lease: RoomLeaseSummary };

defineProps<{
  rooms: ListRoom[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}>();
const emit = defineEmits<{ edit: [room: ListRoom]; view: [room: ListRoom] }>();

const expandedId = ref<string | null>(null);
const toggle = (id: string) => { expandedId.value = expandedId.value === id ? null : id; };

const roomImages = (room: ManagedRoom) => room.images?.length ? room.images : room.coverImage ? [room.coverImage] : [];

const leaseBadgeClass = (urgency: RoomLeaseSummary['urgency']) => urgency === 'critical'
  ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300'
  : urgency === 'warning'
    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';

const lightbox = ref<{ name: string; images: string[] } | null>(null);
const lightboxIndex = ref(0);

const onLightboxKey = (e: KeyboardEvent) => {
  if (!lightbox.value) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft' && lightboxIndex.value > 0) lightboxIndex.value--;
  else if (e.key === 'ArrowRight' && lightboxIndex.value < lightbox.value.images.length - 1) lightboxIndex.value++;
};

const openLightbox = (room: ManagedRoom, index: number) => {
  lightbox.value = { name: room.name, images: roomImages(room) };
  lightboxIndex.value = index;
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', onLightboxKey);
};

const closeLightbox = () => {
  lightbox.value = null;
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onLightboxKey);
};

onUnmounted(() => { if (lightbox.value) closeLightbox(); });
</script>
