// functions/index.js
const { onRequest, onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const line = require('@line/bot-sdk');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// 模擬器模式：讓 Admin SDK verifyIdToken() 驗本地 Auth emulator 的 token
// 必須在 initializeApp() 之前設定
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
}

// 允許的 CORS 來源：模擬器用 localhost，生產環境用 Firebase Hosting 網域
const ALLOWED_ORIGINS = process.env.FUNCTIONS_EMULATOR === 'true'
  ? ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
  : ['https://rental-8897a.web.app', 'https://rental-8897a.firebaseapp.com'];

// Initialize Firebase Admin SDK (only once)
if (!getApps().length) {
  initializeApp();
}

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

  // 1. CORS 設定：限制為允許的來源
  const origin = req.headers.origin;
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.set('Access-Control-Allow-Origin', allowedOrigin);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.set('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const corsHandler = cors({ origin: ALLOWED_ORIGINS });

  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    // 2. 身份驗證：驗證 Firebase ID Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: missing token' });
    }
    try {
      await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch (e) {
      logger.warn('generatePdf: invalid token', e.message);
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
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

      // ========== 修改開頭 ==========
      // 1. 強制設定內容類型
      res.setHeader('Content-Type', 'application/pdf');
      
      // 2. 加上 Content-Length，讓前端知道這是二進位檔案的長度，避免瀏覽器誤判
      res.setHeader('Content-Length', pdfBuffer.length);
      
      const filename = encodeURIComponent(`Document-${Date.now()}.pdf`);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // 3. 使用 res.end() 取代 res.send()
      // res.send() 有時會嘗試序列化 Buffer，res.end() 則是直接寫入原始二進位流並關閉連線
      res.end(pdfBuffer, 'binary');
      // ========== 修改結尾 ==========

    } catch (error) {
      logger.error("PDF 產生失敗", error);
      res.status(500).json({ error: 'PDF 產生失敗', details: error.message });
    } finally {
      if (browser) await browser.close();
    }
  });
});

// ============================================================
// LINE Bot Integration
// ============================================================

/**
 * Helper: load LINE config from Firestore settings/line
 */
async function getLineConfig() {
  const db = getFirestore();
  const snap = await db.collection('settings').doc('line').get();
  if (!snap.exists) throw new Error('LINE 設定尚未完成，請至「系統設定 → LINE Bot」頁面填入金鑰');
  const data = snap.data();
  if (!data.channelSecret || !data.channelAccessToken || !data.landlordId) {
    throw new Error('LINE 設定不完整，請至「系統設定 → LINE Bot」頁面確認所有欄位');
  }
  return data;
}

/**
 * lineWebhook — receives events from LINE platform
 * Webhook URL: https://asia-east1-rental-8897a.cloudfunctions.net/lineWebhook
 */
exports.lineWebhook = onRequest(
  { region: 'asia-east1', cors: false, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    // LINE webhook verification ping has empty events — return 200 immediately
    const events = req.body?.events;
    if (Array.isArray(events) && events.length === 0) {
      logger.info('LINE webhook verification ping received');
      return res.status(200).json({ status: 'ok' });
    }

    let config;
    try {
      config = await getLineConfig();
    } catch (e) {
      logger.error('LINE config error:', e.message);
      return res.status(500).json({ error: e.message });
    }

    // Verify LINE signature using raw body
    const signature = req.headers['x-line-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    if (!signature || !line.validateSignature(rawBody, config.channelSecret, signature)) {
      logger.warn('Invalid LINE signature — possible spoofed request');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const db = getFirestore();
    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });

    logger.info(`LINE webhook: ${events.length} event(s) received`);

    const BINDING_CODE_RE = /^[0-9]{6}$/;

    for (const event of events) {
      // Only handle text messages
      if (event.type !== 'message' || event.message?.type !== 'text') continue;

      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      const messageText = event.message.text.trim();

      // Get LINE user's display name
      let displayName = 'LINE 用戶';
      try {
        const profile = await client.getProfile(lineUserId);
        displayName = profile.displayName;
      } catch (e) {
        logger.warn('Cannot get LINE profile', { lineUserId });
      }

      // --- 綁定碼處理 ---
      if (BINDING_CODE_RE.test(messageText)) {
        const bindingSnap = await db.collection('line_bindings').doc(messageText).get();

        if (!bindingSnap.exists) {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: '❌ 綁定碼無效或已過期，請重新至租屋系統取得新的綁定碼。' }],
          });
          continue;
        }

        const bindingData = bindingSnap.data();
        if (bindingData.expiresAt.toMillis() < Date.now()) {
          await bindingSnap.ref.delete();
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: '❌ 綁定碼已過期（有效期 10 分鐘），請重新至租屋系統取得新的綁定碼。' }],
          });
          continue;
        }

        // 更新租客帳號
        await db.collection('users').doc(bindingData.uid).update({
          lineUserId,
          lineDisplayName: displayName,
          lineBindingAt: FieldValue.serverTimestamp(),
        });
        await bindingSnap.ref.delete();

        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: `✅ 綁定成功！\n您好，${displayName}，您的帳號已與此 LINE 綁定。\n往後房東的回覆將直接傳送到這裡。` }],
        });
        logger.info('LINE binding successful', { uid: bindingData.uid, lineUserId, displayName });
        continue;
      }

      // --- 一般訊息處理 ---
      // Check if LINE user is linked to a tenant account
      let tenantId = '';
      try {
        const usersSnap = await db.collection('users')
          .where('lineUserId', '==', lineUserId)
          .limit(1)
          .get();
        if (!usersSnap.empty) {
          const userData = usersSnap.docs[0].data();
          displayName = userData.name || displayName;
          tenantId = usersSnap.docs[0].id;
        }
      } catch (e) {
        logger.warn('Error looking up tenant by lineUserId', e);
      }

      // Store message in Firestore
      await db.collection('messages').add({
        landlordId: config.landlordId,
        tenantId,
        tenantName: displayName,
        lineUserId,
        subject: 'LINE 訊息',
        content: messageText,
        source: 'line',
        isRead: false,
        reply: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info('LINE message saved', { lineUserId, displayName, text: messageText.substring(0, 50) });
    }

    res.status(200).json({ status: 'ok' });
  }
);

/**
 * sendLineReply — callable function for landlord to push reply to LINE user
 * Called from Messages.vue when replying to a LINE-sourced message
 */
exports.sendLineReply = onCall(
  { region: 'asia-east1' },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new Error('Unauthenticated');
    }

    const { messageId, replyText, lineUserId } = request.data;
    if (!messageId || !replyText?.trim() || !lineUserId) {
      throw new Error('Missing required fields: messageId, replyText, lineUserId');
    }

    let config;
    try {
      config = await getLineConfig();
    } catch (e) {
      throw new Error(e.message);
    }

    // Verify caller is the configured landlord
    if (request.auth.uid !== config.landlordId) {
      throw new Error('Unauthorized: only the landlord may send replies');
    }

    const db = getFirestore();
    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });

    // Send Push Message to LINE user
    await client.pushMessage({
      to: lineUserId,
      messages: [{ type: 'text', text: replyText }],
    });
    logger.info('LINE push message sent', { lineUserId, preview: replyText.substring(0, 50) });

    // Update Firestore message doc
    await db.collection('messages').doc(messageId).update({
      reply: replyText,
      replyAt: FieldValue.serverTimestamp(),
      isRead: true,
    });

    return { success: true };
  }
);

/**
 * sendLineBillNotifications — callable: push bill reminder to all tenants with LINE bound
 * Called from Financials.vue "LINE 通知租客" button
 */
exports.sendLineBillNotifications = onCall(
  { region: 'asia-east1' },
  async (request) => {
    if (!request.auth) throw new Error('Unauthenticated');

    const { month } = request.data; // 'YYYY-MM'
    if (!month) throw new Error('Missing required field: month');

    let config;
    try {
      config = await getLineConfig();
    } catch (e) {
      throw new Error(e.message);
    }

    if (request.auth.uid !== config.landlordId) {
      throw new Error('Unauthorized: only the landlord may send notifications');
    }

    const db = getFirestore();
    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });

    // Find pending bills for this month
    const billsSnap = await db.collection('bills')
      .where('landlordId', '==', config.landlordId)
      .where('status', '==', 'pending')
      .where('type', '==', 'income')
      .get();

    const monthBills = billsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(b => b.date && b.date.startsWith(month));

    if (monthBills.length === 0) {
      return { sent: 0, message: '本月沒有待收帳單' };
    }

    // Group by tenantId (auth uid) and look up lineUserId
    const tenantUids = [...new Set(monthBills.map(b => b.tenantId).filter(Boolean))];
    let sent = 0;

    for (const uid of tenantUids) {
      const userSnap = await db.collection('users').doc(uid).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data();
      if (!userData.lineUserId) continue;

      const tenantBills = monthBills.filter(b => b.tenantId === uid);
      const totalAmount = tenantBills.reduce((sum, b) => sum + (b.amount || 0), 0);
      const dueDate = tenantBills[0].dueDate || '';
      const name = userData.name || '您';

      const text = `💰 ${month.replace('-', ' 年 ')} 月帳單提醒\n\n${name}，本月帳單共 NT$ ${totalAmount.toLocaleString()} 元，請於 ${dueDate} 前完成繳費。\n\n如有疑問請直接回覆此訊息聯繫房東。`;

      try {
        await client.pushMessage({ to: userData.lineUserId, messages: [{ type: 'text', text }] });
        sent++;
        logger.info('LINE bill notification sent', { uid, lineUserId: userData.lineUserId });
      } catch (e) {
        logger.warn('Failed to send LINE notification', { uid, error: e.message });
      }
    }

    return { sent };
  }
);