<template>
  <!-- 直接渲染合約範本，畫面看到的就是列印出來的內容；已簽合約用簽署當下凍結的範本。
       這裡只顯示不簽名，簽名一律在各頁的簽名欄（房東欄含解鎖）完成，避免同一方有兩個簽名入口 -->
  <iframe
    ref="frame"
    :srcdoc="html"
    sandbox="allow-same-origin"
    title="合約預覽"
    class="block w-full border-0 bg-white rounded-xl"
    :style="{ height: `${height}px` }"
    @load="fit"
  ></iframe>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import contractTemplate from '../templates/contractTemplate.html?raw'
import { applyTemplate } from '../utils/contractRender'
import { buildContractPayload } from '../utils/contractPayload'

const props = defineProps<{ form: Record<string, any> | null }>()

// 範本以 A4 列印為準（大字、寬邊界），螢幕預覽縮小一些才不會在手機上擠成一條
const PREVIEW_STYLE = `<style>
  body { margin: 16px !important; font-size: 15px !important; }
  .page { border-top: 2px dashed #bbb; margin-top: 32px; padding-top: 24px; }
  td, th { padding: 6px !important; }
</style>`

const html = computed(() => {
  const data = props.form || {}
  const template = typeof data.templateHtml === 'string' && data.templateHtml.trim() ? data.templateHtml : contractTemplate
  return applyTemplate(template, buildContractPayload(data)).replace('</head>', `${PREVIEW_STYLE}</head>`)
})

const frame = ref<HTMLIFrameElement | null>(null)
const height = ref(600)

const fit = () => {
  const doc = frame.value?.contentDocument
  if (doc?.documentElement) height.value = doc.documentElement.scrollHeight + 4
}

watch(html, () => nextTick(fit))
onMounted(() => window.addEventListener('resize', fit))
onUnmounted(() => window.removeEventListener('resize', fit))
</script>
