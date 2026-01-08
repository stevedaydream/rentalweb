// ==========================================
// 檔案路徑: src/utils/pdfHelper.js
// ==========================================

/**
 * 將後端回傳的 Byte JSON 物件轉換為 PDF 並觸發下載
 * @param {Object} jsonByteData - 後端回傳的 JSON，如 {"0":37, "1":80...}
 * @param {String} fileName - 下載後的檔案名稱，預設為 'download.pdf'
 */
export function downloadPdfFromJson(jsonByteData, fileName = 'download.pdf') {
  try {
    // 1. 檢查資料有效性
    if (!jsonByteData || typeof jsonByteData !== 'object') {
      throw new Error('資料格式錯誤：接收到的不是物件');
    }

    // 2. 將 JSON 物件的值取出轉為陣列
    // Object.values 在現代瀏覽器中，對於整數型的 Key ("0", "1"...) 會自動按順序排列
    const byteNumbers = Object.values(jsonByteData);

    // 3. 轉換為 Uint8Array (無號 8 位元整數陣列)
    const byteArray = new Uint8Array(byteNumbers);

    // 4. 建立 Blob 物件 (MIME type 設定為 PDF)
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    // 5. 建立暫時的下載連結
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);

    // 6. 觸發點擊並清理
    document.body.appendChild(link);
    link.click();
    
    // 清理 DOM 和記憶體
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    console.log(`[PDF Helper] 成功下載檔案: ${fileName}`);

  } catch (error) {
    console.error('[PDF Helper] 轉換失敗:', error);
    alert('PDF 下載失敗，請檢查資料來源');
  }
}