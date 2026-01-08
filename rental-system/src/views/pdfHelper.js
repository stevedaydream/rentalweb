// src/utils/pdfHelper.js

/**
 * [修改] 處理後端回傳的 Blob (二進位資料) 並觸發下載
 * 原本的 JSON 轉換邏輯已移除，因為後端現在回傳正確的 PDF 流
 * * @param {Blob} blobData - 後端回傳的 Blob 物件
 * @param {String} fileName - 下載後的檔案名稱
 */
export function downloadPdfFromBlob(blobData, fileName = 'download.pdf') { // [修改] 函式名稱變更以符合語意
  try {
    // [修改開始] 簡化後的下載邏輯
    // 1. 檢查資料有效性 (確保是 Blob)
    if (!(blobData instanceof Blob)) {
        throw new Error('資料格式錯誤：接收到的不是 Blob 物件');
    }

    // 2. 建立暫時的下載連結
    const downloadUrl = window.URL.createObjectURL(blobData);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);

    // 3. 觸發點擊
    document.body.appendChild(link);
    link.click();
    
    // 4. 清理 DOM 和記憶體
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    console.log(`[PDF Helper] 成功下載檔案: ${fileName}`);
    // [修改結束]

  } catch (error) {
    console.error('[PDF Helper] 下載失敗:', error);
    alert('PDF 下載失敗，請檢查控制台錯誤訊息');
  }
}