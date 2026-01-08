// src/components/PdfDownloader.vue 中的 script setup 部分

const generateAndDownloadPdf = async () => {
  // [修改開始] 包含 templateType 的完整請求邏輯
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    // 準備要填入合約的測試資料
    const contractData = {
      templateType: 'Contract', // [新增] 必填：告訴後端要使用哪一個模板 ('Contract', 'Deposit', 'Guarantee')
      roomNo: "A-101",
      address: "台北市信義區測試路123號",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      tenant: "王小明",
      landlord: "李大房",
      deposit: "20000",
      rentfee: "10000",
      duration: "1"
    };

    console.log('正在發送請求至:', API_URL); // [新增] 除錯 Log

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contractData)
    });

    if (!response.ok) {
      // 嘗試讀取後端回傳的錯誤訊息 (例如 "未知的模板類型")
      const errorText = await response.text(); 
      throw new Error(`伺服器錯誤 (${response.status}): ${errorText}`);
    }

    // 關鍵：將回應轉為 Blob (二進位大型物件)
    const blob = await response.blob();

    // 呼叫工具函式下載
    downloadPdfFromBlob(blob, `Contract-${Date.now()}.pdf`);
    
  } catch (error) {
    console.error('下載流程錯誤:', error);
    errorMessage.value = '下載失敗: ' + error.message;
  } finally {
    isLoading.value = false;
  }
  // [修改結束]
};