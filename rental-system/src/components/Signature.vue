<template>
  <div v-if="visible" class="signature-modal" role="dialog" aria-modal="true" aria-label="電子簽名">
    <div class="signature-modal-content">
      <div class="pad">
        <Vue3Signature
          ref="signRef"
          :sigOption="{ penColor: 'black' }"
          w="100%"
          h="100%"
          aria-label="簽名區域，請用滑鼠或手指繪製您的簽名"
          style="background: #fff; border: 1.5px solid #aaa;"
        />
      </div>
      <div class="btns">
        <button @click="clearSign">清除</button>
        <button @click="onCancel">返回</button>
        <button class="primary" @click="onConfirm">確認簽名</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import Vue3Signature from "vue3-signature"

// props: 控制顯示、簽名結果回傳
const props = defineProps({
  visible: Boolean
})
const emits = defineEmits(['update:visible', 'confirm'])

const signRef = ref(null)

// vue3-signature 只在自己 onMounted 與 window resize 時量父層尺寸。
// 畫布改用 100% 撐滿彈性高度後，掛載當下父層可能還沒完成佈局，
// 量到的高度會偏小，畫布就填不滿版面；開啟後補送一次 resize 讓它重量。
watch(() => props.visible, async (v) => {
  if (!v) return
  await nextTick()
  window.dispatchEvent(new Event('resize'))
})

const clearSign = () => {
  signRef.value.clear()
}

const onCancel = () => {
  emits('update:visible', false)
}
const onConfirm = () => {
  // 回傳 base64 圖片
  const data = signRef.value.save()
  if (data.length < 200) {
    alert('請簽名')
    return
  }
  emits('confirm', data)
  emits('update:visible', false)
}
</script>

<style scoped>
.signature-modal {
  position: fixed;
  z-index: 9000;
  inset: 0;
  background: rgba(33,40,60,0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  /* 手機瀏覽器的 100vh 含網址列高度，實際可視高度較小；
     用 dvh 才不會把按鈕列推到看不見的地方（不支援 dvh 的瀏覽器沿用 vh） */
  height: 100vh;
  height: 100dvh;
}
.signature-modal-content {
  background: #fff;
  border-radius: 12px;
  width: 98vw;
  max-width: 550px;
  height: 420px;
  max-height: 90dvh;
  padding: 22px 10px 12px 10px;
  box-shadow: 0 4px 22px #1116;
  display: flex;
  flex-direction: column;
}
/* 畫布吃掉剩餘空間，按鈕列固定不被擠出畫面 */
.pad {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
}
.btns {
  flex: 0 0 auto;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-self: center;
  width: 92%;
}
.btns button {
  border: 1.5px solid #aaa;
  background: #fff;
  color: #222;
  border-radius: 7px;
  font-size: 1.08em;
  padding: 7px 22px;
  margin: 0 4px;
  cursor: pointer;
  transition: background .16s;
}
.btns button:focus-visible {
  outline: 2px solid #2767c7;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .btns button { transition: none; }
}
.btns button.primary {
  background: #2767c7;
  color: #fff;
  border-color: #3870dd;
}
@media (max-width: 900px) {
  /* 手機滿版：高度用 dvh，底部留出 home indicator 的安全區 */
  .signature-modal-content {
    width: 100vw;
    max-width: none;
    height: 100vh;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
    padding: 12px 10px calc(12px + env(safe-area-inset-bottom, 0px)) 10px;
  }
}
</style>
