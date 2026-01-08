<template>
  <div class="pdf-downloader">
    <h3>PDF 下載測試</h3>
    <p>點擊下方按鈕測試將 JSON 還原為 PDF</p>
    
    <button 
      @click="handleFetchAndDownload" 
      :disabled="isLoading"
      class="download-btn"
    >
      {{ isLoading ? '處理中...' : '下載 PDF' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { downloadPdfFromJson } from '@/utils/pdfHelper'; // 引入剛剛寫好的函式

const isLoading = ref(false);

// 模擬後端回傳的異常 JSON 資料 (擷取自您提供的片段)
const mockApiData = {
  "0":37,"1":80,"2":68,"3":70,"4":45,"5":49,"6":46,"7":52,"8":10,
  "9":37,"10":211,"11":235,"12":233,"13":225,"14":10,"15":49,
  "16":32,"17":48,"18":32,"19":111,"20":98,"21":106,"22":10,"23":60
  // ... 實際情況這裡會有完整的檔案內容
};

const handleFetchAndDownload = async () => {
  isLoading.value = true;
  
  try {
    // 模擬 API 請求延遲
    await new Promise(resolve => setTimeout(resolve, 500));

    // 假設 response.data 就是那個 mockApiData
    // 在實際專案中，這裡會是 const res = await axios.get(...)
    const responseData = mockApiData;

    // 呼叫工具函式進行轉換與下載
    downloadPdfFromJson(responseData, 'restored_report.pdf');

  } catch (error) {
    console.error('下載流程錯誤:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.pdf-downloader {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  max-width: 400px;
}

.download-btn {
  background-color: #4CAF50; /* Green */
  border: none;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
}

.download-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>