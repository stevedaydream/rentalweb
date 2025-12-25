<template>
  <div v-if="visible" class="signature-modal">
    <div class="signature-modal-content" :class="{ landscape: isMobile }">
      <Vue3Signature
        ref="signRef"
        :sigOption="{ penColor: 'black' }"
        style="background: #fff; border: 1.5px solid #aaa; width:100%; height: 220px;"
      />
      <div class="btns">
        <button @click="clearSign">清除</button>
        <button @click="onCancel">返回</button>
        <button class="primary" @click="onConfirm">確認簽名</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import Vue3Signature from "vue3-signature"

// props: 控制顯示、簽名結果回傳
const props = defineProps({
  visible: Boolean
})
const emits = defineEmits(['update:visible', 'confirm'])

const signRef = ref(null)

// 手機判斷
const isMobile = ref(false)
onMounted(() => {
  isMobile.value = window.innerWidth < 900
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 900
  })
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
}
.signature-modal-content {
  background: #fff;
  border-radius: 12px;
  width: 98vw;
  max-width: 550px;
  padding: 22px 10px 12px 10px;
  box-shadow: 0 4px 22px #1116;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.btns {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
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
.btns button.primary {
  background: #2767c7;
  color: #fff;
  border-color: #3870dd;
}
.signature-modal-content.landscape {
  /* 強制橫向，給手機滿版 */
  width: 100vw !important;
  height: 100vh !important;
  max-width: unset !important;
  max-height: unset !important;
  border-radius: 0 !important;
  justify-content: center;
}
@media (max-width:900px) {
  .signature-modal-content {
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
    max-width: unset;
    max-height: unset;
    justify-content: center;
  }
}
</style>
