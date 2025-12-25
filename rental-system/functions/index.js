// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const fs = require("fs");
const path = require("path");
const cors = require('cors');

// --- 輔助函式 ---
function applyTemplate(template, data) {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    const value = data[key.trim()];
    return value !== undefined && value !== null ? value : '';
  });
}

function injectStyles(html) {
  const fontLinks = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@400;700&display=swap" rel="stylesheet">
  `;
  const customStyle = `
    <style>
      body { font-family: 'Noto Serif TC', 'Noto Sans TC', "標楷體", DFKai-SB, serif !important; }
      img { max-width: 100%; }
    </style>
  `;
  return html.replace('</head>', `${fontLinks}\n${customStyle}\n</head>`);
}

// --- 主程式 ---
exports.generatePdf = onRequest({ memory: "1GiB", timeoutSeconds: 60, region: "asia-east1" }, async (req, res) => {
  
  // 1. CORS 設定：允許所有來源 (解決開發環境跨域問題)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const corsHandler = cors({ origin: true });
  
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    let browser = null;
    try {
      const data = req.body;
      const { templateType } = data;
      logger.info("收到 PDF 請求", { templateType });

      // 2. [關鍵] 自動判斷環境：Windows 本地開發 vs 雲端 Linux
      const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
      let executablePath;
      let launchArgs;

      if (isEmulator) {
        // --- 本地開發設定 ---
        logger.info("模式：本地模擬器 (使用 Windows Chrome)");
        // ⚠️ 請確認你的 Chrome 路徑是否正確
        executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
        launchArgs = []; 
      } else {
        // --- 雲端環境設定 ---
        logger.info("模式：雲端環境 (使用 @sparticuz/chromium)");
        executablePath = await chromium.executablePath();
        launchArgs = chromium.args;
      }

      // 3. 讀取模板
      let templateFile;
      switch (templateType) {
        case 'Guarantee': templateFile = 'guaranteeTemplate.html'; break;
        case 'Deposit': templateFile = 'depositTemplate.html'; break;
        case 'Contract': templateFile = 'contractTemplate.html'; break;
        default: throw new Error('未知的模板類型');
      }

      const templatePath = path.join(__dirname, 'templates', templateFile);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`找不到模板檔案: ${templatePath}`);
      }
      let template = fs.readFileSync(templatePath, 'utf8');

      // 4. 產生 PDF
      template = injectStyles(template);
      const filledHtml = applyTemplate(template, data);

      browser = await puppeteer.launch({
        args: launchArgs,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: "new",
        ignoreHTTPSErrors: true,
      });

      const page = await browser.newPage();
      await page.setContent(filledHtml, { 
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 30000 
      });

      const pdfBuffer = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
      });

      res.setHeader('Content-Type', 'application/pdf');
      const filename = encodeURIComponent(`Document-${Date.now()}.pdf`);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);

    } catch (error) {
      logger.error("PDF 產生失敗", error);
      res.status(500).json({ error: 'PDF 產生失敗', details: error.message });
    } finally {
      if (browser) await browser.close();
    }
  });
});