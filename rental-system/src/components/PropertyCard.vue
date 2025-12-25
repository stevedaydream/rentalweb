<template>
  <div class="flex flex-col gap-3 group cursor-pointer" @click="$emit('click')">
    <div class="relative w-full">
      <div 
        class="w-full bg-center bg-no-repeat aspect-[4/5] bg-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]" 
        :style="{ backgroundImage: `url(${image})` }"
      ></div>
      <button 
        @click.stop="toggleFavorite"
        class="absolute top-2 right-2 flex items-center justify-center size-8 rounded-full bg-black/40 text-white backdrop-blur-sm"
      >
        <span class="material-symbols-outlined !text-[20px]" :class="{ 'fill-1 text-red-500': isFavorite }">
          favorite
        </span>
      </button>
    </div>
    <div>
      <p class="text-text-primary-light dark:text-text-primary-dark text-base font-bold leading-normal">
        NT${{ price.toLocaleString() }}/mo
      </p>
      <p class="text-text-secondary-light dark:text-text-secondary-dark text-sm font-normal leading-normal">
        {{ rooms }} Bed, {{ baths }} Bath
      </p>
      <p class="text-text-secondary-light dark:text-text-secondary-dark text-sm font-normal leading-normal">
        {{ location }}
      </p>
    </div>
  </div>
  </template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  image: String,
  price: Number,
  rooms: Number,
  baths: Number,
  location: String
});

const isFavorite = ref(false);
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value;
  // 這裡之後可以串接 Firebase Update
};
</script>

<style scoped>
.fill-1 { font-variation-settings: 'FILL' 1; }
</style>