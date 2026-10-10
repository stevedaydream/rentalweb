<template>
  <section class="ops-panel">
    <h2>合約查閱與簽署</h2>
    <div class="ops-toolbar mb-5">
      <button v-if="contract.contractSource !== 'paper'" @click="showDocument = !showDocument">
        {{ showDocument ? '收起合約' : '查閱完整合約' }}</button
      ><button v-if="contract.templateHtml" @click="printDocument">列印或另存 PDF</button>
    </div>
    <Preview v-if="showDocument" :form="contract" />
    <p v-if="error" class="ops-error">{{ error }}</p>
    <p v-if="contract.signature" class="ops-muted">租客簽名</p>
    <img
      v-if="contract.signature"
      :src="contract.signature"
      alt="租客於本份合約的簽名"
      class="max-h-32 my-4 bg-white"
    /><label>操作原因（必填）<textarea v-model="reason" required maxlength="1000" /></label>
    <div class="ops-toolbar mt-5">
      <button
        v-if="contract.status === 'awaiting_tenant'"
        :disabled="busy"
        @click="run('signLink')"
      >
        產生或重發簽署連結</button
      ><button
        v-if="contract.status === 'awaiting_landlord'"
        :disabled="busy"
        @click="run('return')"
      >
        退回租客重簽</button
      ><button v-if="contract.status === 'awaiting_landlord'" :disabled="busy" @click="preview">
        核對並確認簽名
      </button>
      <a
        v-if="
          contract.contractSource === 'paper' &&
          /^https:\/\/firebasestorage\.googleapis\.com\//.test(contract.attachmentUrl || '')
        "
        class="ops-button"
        :href="contract.attachmentUrl"
        target="_blank"
        rel="noopener"
        >查閱紙本合約附件 ↗</a
      >
    </div>
    <div v-if="overlaps" class="grid gap-4 mt-5">
      <p class="ops-muted">確認後合約生效，以下重疊合約將標記為已被取代：</p>
      <p v-for="c in overlaps.items" :key="c.id">
        {{ c.tenant }} · {{ c.startDate }}～{{ c.endDate }}
      </p>
      <p v-if="!overlaps.items.length" class="ops-muted">沒有需取代的合約。</p>
      <LandlordSignatureField
        v-model="signature"
        :landlord-id="contract.landlordUid"
        :allow-save="false"
      /><button
        class="ops-primary"
        :disabled="busy || !signature || !reason.trim()"
        @click="run('confirm')"
      >
        確認房東簽名並生效
      </button>
    </div>
    <p v-if="url" class="ops-context mt-4 break-all">
      簽署連結（7 天、限用一次）：<a :href="url" target="_blank" rel="noopener">{{ url }}</a>
    </p>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import LandlordSignatureField from './LandlordSignatureField.vue'
import Preview from './Preview.vue'
import { printHtmlPdf } from '../utils/contractRender'
import { buildContractPayload } from '../utils/contractPayload'
import { adminCall, type AdminRow } from '../services/adminService'
const props = defineProps<{ contract: AdminRow }>()
const emit = defineEmits<{ changed: [] }>()
const reason = ref('')
const signature = ref('')
const error = ref('')
const busy = ref(false)
const overlaps = ref<any>()
const url = ref('')
const showDocument = ref(false)
async function printDocument() {
  try {
    await printHtmlPdf(
      props.contract.templateHtml,
      buildContractPayload(props.contract),
      `租賃合約_${props.contract.tenant}_${props.contract.startDate}`
    )
  } catch (e: any) {
    error.value = e.message || '無法開啟列印視窗'
  }
}
async function preview() {
  busy.value = true
  error.value = ''
  try {
    overlaps.value = await adminCall({ action: 'signedPreview', key: props.contract.id })
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function run(operation: string) {
  busy.value = true
  error.value = ''
  try {
    const r = await adminCall({
      action: 'mutate',
      kind: 'signed_contracts',
      key: props.contract.id,
      version: props.contract.version,
      operation,
      operationId: crypto.randomUUID(),
      reason: reason.value,
      input: {
        signature: signature.value,
        overlapVersion: overlaps.value?.version,
        origin: location.origin,
      },
    })
    url.value = r.url || ''
    overlaps.value = undefined
    signature.value = ''
    emit('changed')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
