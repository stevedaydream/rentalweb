/* routes/pdf.js */
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 全域多次取代 {{key}}
function applyTemplate(template, data) {
  return template.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] ?? '');
}

// 判斷是否為本地開發環境 (Firebase Emulator)
const isLocal = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development';

// 取得本地 Chrome 路徑的輔助函式 (僅供本地測試用)
function getLocalChromePath() {
  const platform = os.platform();
  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (platform === 'win32') {
    // 常見 Windows 路徑，若您的安裝位置不同請自行修改
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ];
    return paths.find(p => fs.existsSync(p));
  } else {
    return '/usr/bin/google-chrome'; // Linux
  }
}

router.post('/generate', async (req, res) => {
  let browser;
  try {
    const { 
      roomNo, tenant, landlord, rentfee, deposit, address, 
      startDate, endDate, today, templateType, signature, 
      landlordSignature, landlordId, landlordPhone, tenantId, tenantPhone 
    } = req.body;

    let templateFile;
    if (templateType === 'Guarantee') {
      templateFile = 'guaranteeTemplate.html';
    }
    else if (templateType === 'Deposit') { 
      templateFile = 'depositTemplate.html';
    }
    else if (templateType === 'Contract') {
      templateFile = 'contractTemplate.html';
    } else {
      throw new Error('未知的模板類型');
    }

    // 讀取模板
    const templatePath = path.resolve(__dirname, '../templates', templateFile);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`找不到模板檔案: ${templatePath}`);
    }
    let template = fs.readFileSync(templatePath, 'utf8');

    // 資料帶入
    const filled = applyTemplate(template, {
      roomNo, tenant, landlord, deposit, address, startDate, endDate, today, rentfee,
      signature, landlordSignature, landlordId, landlordPhone, tenantId, tenantPhone
    });

    // --- Puppeteer 啟動設定 (關鍵修改) ---
    let launchOptions = {};

    if (isLocal) {
      // [本地模式] 使用本機 Chrome
      const localExePath = getLocalChromePath();
      console.log('運行於本地模式，使用 Chrome 路徑:', localExePath);
      
      if (!localExePath || !fs.existsSync(localExePath)) {
        throw new Error('本地測試失敗：找不到本機 Chrome。請確認您有安裝 Chrome 瀏覽器，或直接部署到雲端測試。');
      }

      launchOptions = {
        executablePath: localExePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };
    } else {
      // [雲端模式] 使用 @sparticuz/chromium
      console.log('運行於雲端模式，載入 Chromium...');
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // 設定較長的 timeout 避免字型下載超時 (設定 60秒)
    await page.setContent(filled, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true 
    });

    console.log('PDF 產生成功，大小:', pdfBuffer.length);

    res.setHeader('Content-Type', 'application/pdf');
    // 使用 encodeURIComponent 處理檔名中文編碼問題，或直接用英數字
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    res.end(pdfBuffer); 

  } catch (err) {
    console.error('PDF 產生嚴重錯誤:', err);
    // 如果出錯，回傳 JSON，前端開發時請檢查 Response Body
    res.status(500).json({ 
      error: 'PDF 產生失敗', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;