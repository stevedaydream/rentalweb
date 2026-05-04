// functions/index.js
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onObjectFinalized, onObjectDeleted } = require("firebase-functions/v2/storage");
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
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
  : ['https://rental-system-7675e.web.app', 'https://rental-system-7675e.firebaseapp.com'];

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
        case 'MoveOutSummary': templateFile = 'moveoutSummaryTemplate.html'; break;
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
 * Helper: load LINE config for a specific landlord
 * - 本地模擬器：讀 .env（LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN / LINE_LANDLORD_ID）
 * - 生產環境：從 Firestore line_configs/{landlordId} 讀取（多房東架構）
 */
async function getLineConfig(landlordId) {
  if (!landlordId) throw new Error('缺少 landlordId，無法載入 LINE 設定');

  // 本地開發：直接從 .env 讀取
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const envLandlordId = process.env.LINE_LANDLORD_ID;
    if (!channelSecret || !channelAccessToken || !envLandlordId || envLandlordId === 'your_firebase_uid_here') {
      throw new Error('請在 functions/.env 填入 LINE_CHANNEL_SECRET、LINE_CHANNEL_ACCESS_TOKEN、LINE_LANDLORD_ID');
    }
    return { channelSecret, channelAccessToken, landlordId: envLandlordId };
  }

  // 生產環境：每位房東各自的設定文件
  const db = getFirestore();
  const snap = await db.collection('line_configs').doc(landlordId).get();
  if (!snap.exists) throw new Error(`房東 ${landlordId} 尚未設定 LINE Bot，請至「系統設定 → LINE Bot」頁面填入金鑰`);
  const data = snap.data();
  if (!data.channelSecret || !data.channelAccessToken) {
    throw new Error('LINE 設定不完整，請至「系統設定 → LINE Bot」頁面確認所有欄位');
  }
  return { ...data, landlordId };
}

// ============================================================
// LINE Bot Command Handler (Pull 查詢)
// ============================================================

const COMMAND_KEYWORDS = new Set([
  '帳單', '查帳單', '繳費',
  '電費', '電表', '抄表',
  '合約', '租約',
  '公告',
  '報修', '維修',
  '選單', '功能', '說明', 'help', 'menu',
]);

/**
 * Handle a command from a tenant via LINE.
 * Returns true if handled (caller should skip saving to Firestore), false otherwise.
 */
async function handleCommand(cmd, tenantUid, config, client, replyToken, db) {
  const t = cmd.trim();
  if (!COMMAND_KEYWORDS.has(t)) return false;

  const unbound = [{ type: 'text', text: '⚠️ 您尚未綁定帳號，請先至系統取得綁定碼完成綁定。\n\n傳送「選單」查看可用指令。' }];

  try {
    // ── 選單 ──────────────────────────────────────────────
    if (['選單', '功能', '說明', 'help', 'menu'].includes(t)) {
      await client.replyMessage({ replyToken, messages: [{ type: 'text', text:
        '📋 可用指令\n━━━━━━━━━━\n' +
        '💰 帳單 → 查詢未繳帳單\n' +
        '⚡ 電費 → 查詢電表度數\n' +
        '📋 合約 → 查看合約資訊\n' +
        '📢 公告 → 最新社區公告\n' +
        '🔧 報修 → 查看報修狀態\n' +
        '━━━━━━━━━━\n' +
        '直接傳訊文字可聯繫房東',
      }] });
      return true;
    }

    // ── 帳單 ──────────────────────────────────────────────
    if (['帳單', '查帳單', '繳費'].includes(t)) {
      if (!tenantUid) { await client.replyMessage({ replyToken, messages: unbound }); return true; }
      const snap = await db.collection('bills')
        .where('tenantId', '==', tenantUid)
        .where('status', 'in', ['pending', 'overdue'])
        .orderBy('date', 'desc').limit(5).get();
      if (snap.empty) {
        await client.replyMessage({ replyToken, messages: [{ type: 'text', text: '✅ 目前沒有未繳帳單，感謝您按時繳費！' }] });
        return true;
      }
      const bills = snap.docs.map(d => d.data());
      const total = bills.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
      const nearestDue = bills.reduce((m, b) => (!m || b.dueDate < m) ? b.dueDate : m, '');
      const lines = bills.map(b => {
        const flag = b.status === 'overdue' ? '⚠️逾期' : '待繳';
        return `• ${b.description || b.date || '帳單'} [${flag}]\n  NT$${Number(b.totalAmount||0).toLocaleString()} | 到期 ${b.dueDate||'-'}`;
      }).join('\n');
      await client.replyMessage({ replyToken, messages: [{ type: 'text', text:
        `💰 您的未繳帳單\n━━━━━━━━━━\n${lines}\n━━━━━━━━━━\n合計：NT$${total.toLocaleString()}\n最近到期：${nearestDue||'-'}`,
      }] });
      return true;
    }

    // ── 電費 ──────────────────────────────────────────────
    if (['電費', '電表', '抄表'].includes(t)) {
      if (!tenantUid) { await client.replyMessage({ replyToken, messages: unbound }); return true; }
      const tenantSnap = await db.collection('tenants').where('uid', '==', tenantUid).limit(1).get();
      if (tenantSnap.empty) {
        await client.replyMessage({ replyToken, messages: [{ type: 'text', text: '⚠️ 找不到您的租客資料，請聯繫房東確認。' }] });
        return true;
      }
      const tenantData = tenantSnap.docs[0].data();
      // 優先用 roomId，若無則用 room 名稱查 rooms collection 取得 id
      let roomId = tenantData.roomId;
      let roomDisplayName = tenantData.roomName || tenantData.room || roomId;
      if (!roomId && tenantData.room) {
        const roomSnap = await db.collection('rooms')
          .where('landlordId', '==', tenantData.landlordId)
          .where('name', '==', tenantData.room).limit(1).get();
        if (!roomSnap.empty) {
          roomId = roomSnap.docs[0].id;
          roomDisplayName = tenantData.room;
        }
      }
      if (!roomId) {
        await client.replyMessage({ replyToken, messages: [{ type: 'text', text: '⚠️ 找不到您的房間資料，請聯繫房東確認。' }] });
        return true;
      }
      const meterSnap = await db.collection('meter_readings')
        .where('roomId', '==', roomId).orderBy('yearMonth', 'desc').limit(1).get();
      if (meterSnap.empty) {
        await client.replyMessage({ replyToken, messages: [{ type: 'text', text: '⚡ 尚無電表記錄，請聯繫房東確認。' }] });
        return true;
      }
      const latest = meterSnap.docs[0].data();
      // 用電量：優先用文件內已計算的 usage，其次從 currentReading - lastReading 自算
      const usageVal = (latest.usage != null)
        ? Number(latest.usage).toFixed(1)
        : (latest.currentReading != null && latest.lastReading != null)
          ? (latest.currentReading - latest.lastReading).toFixed(1)
          : null;
      const dateStr = latest.periodEnd || (latest.createdAt?.toDate ? latest.createdAt.toDate().toLocaleDateString('zh-TW') : '-');
      let text = `⚡ 電表記錄 - ${roomDisplayName}\n━━━━━━━━━━\n抄表期間：${dateStr}\n本期度數：${latest.currentReading} 度`;
      if (latest.lastReading != null) text += `\n上期度數：${latest.lastReading} 度`;
      if (usageVal !== null) text += `\n本期用電：${usageVal} 度`;
      if (latest.cost) text += `\n電費金額：NT$${Number(latest.cost).toLocaleString()}`;
      text += '\n━━━━━━━━━━\n如有疑問請聯繫房東';
      await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] });
      return true;
    }

    // ── 合約 ──────────────────────────────────────────────
    if (['合約', '租約'].includes(t)) {
      if (!tenantUid) { await client.replyMessage({ replyToken, messages: unbound }); return true; }
      const snap = await db.collection('contracts')
        .where('tenantId', '==', tenantUid).orderBy('createdAt', 'desc').limit(1).get();
      if (snap.empty) {
        await client.replyMessage({ replyToken, messages: [{ type: 'text', text: '📋 目前沒有合約記錄，請聯繫房東。' }] });
        return true;
      }
      const c = snap.docs[0].data();
      const endDate = c.endDate || c.leaseEnd || '';
      let daysLeft = '';
      if (endDate) {
        const diff = Math.ceil((new Date(endDate) - new Date()) / 864e5);
        daysLeft = diff > 0 ? `剩餘 ${diff} 天` : '⚠️ 已到期';
      }
      const rent = Number(c.monthlyRent || c.rent || 0);
      let text = `📋 您的合約資訊\n━━━━━━━━━━\n租期：${c.startDate||'-'} ~ ${endDate||'-'}`;
      if (daysLeft) text += `\n${daysLeft}`;
      if (rent) text += `\n月租金：NT$${rent.toLocaleString()}`;
      if (c.roomName || c.roomNumber) text += `\n房號：${c.roomName||c.roomNumber}`;
      text += '\n━━━━━━━━━━\n如需續約請聯繫房東';
      await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] });
      return true;
    }

    // ── 公告 ──────────────────────────────────────────────
    if (t === '公告') {
      const snap = await db.collection('announcements')
        .where('landlordId', '==', config.landlordId).orderBy('createdAt', 'desc').limit(3).get();
      if (snap.empty) {
        await client.replyMessage({ replyToken, messages: [{ type: 'text', text: '📢 目前沒有公告。' }] });
        return true;
      }
      const lines = snap.docs.map((d, i) => {
        const a = d.data();
        const date = a.createdAt?.toDate ? a.createdAt.toDate().toLocaleDateString('zh-TW') : '';
        const body = (a.content||'').substring(0, 60).replace(/\n/g, ' ');
        return `${i+1}. ${a.title||'公告'}${date?` (${date})`:''}\n   ${body}${(a.content||'').length>60?'…':''}`;
      }).join('\n\n');
      await client.replyMessage({ replyToken, messages: [{ type: 'text', text:
        `📢 最新公告\n━━━━━━━━━━\n${lines}\n━━━━━━━━━━\n詳細內容請至系統查看`,
      }] });
      return true;
    }

    // ── 報修 ──────────────────────────────────────────────
    if (['報修', '維修'].includes(t)) {
      if (!tenantUid) { await client.replyMessage({ replyToken, messages: unbound }); return true; }
      const snap = await db.collection('repair_requests')
        .where('tenantId', '==', tenantUid).orderBy('createdAt', 'desc').limit(5).get();

      const repairPageBtn = {
        type: 'uri',
        label: '前往報修頁面',
        uri: 'https://rental-system-7675e.web.app/tenant/repairs?openExternalBrowser=1',
      };

      if (snap.empty) {
        await client.replyMessage({ replyToken, messages: [{
          type: 'template', altText: '🔧 您目前沒有報修紀錄',
          template: { type: 'buttons', text: '您目前沒有報修紀錄，如需提交新的報修請點下方按鈕。', actions: [repairPageBtn] },
        }] });
        return true;
      }

      const statusMap = { pending: '待處理', processing: '處理中', resolved: '已解決', closed: '已關閉' };
      const allDone = snap.docs.every(d => ['resolved', 'closed'].includes(d.data().status));

      if (allDone) {
        await client.replyMessage({ replyToken, messages: [{
          type: 'template', altText: '🔧 所有報修已完成',
          template: { type: 'buttons', text: '您最近的報修項目皆已完成處理，如有新的維修需求請點下方按鈕。', actions: [repairPageBtn] },
        }] });
        return true;
      }

      const lines = snap.docs.map(d => {
        const r = d.data();
        const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('zh-TW') : '';
        return `• ${r.type||'報修'} | ${statusMap[r.status]||r.status}\n  ${(r.description||'').substring(0,30)}${date?` (${date})`:''}`;
      }).join('\n');
      await client.replyMessage({ replyToken, messages: [{ type: 'text', text:
        `🔧 您的報修紀錄\n━━━━━━━━━━\n${lines}\n━━━━━━━━━━\n共 ${snap.size} 筆\n\n如需新增或查看詳情：\nhttps://rental-system-7675e.web.app/tenant/repairs?openExternalBrowser=1`,
      }] });
      return true;
    }

  } catch (e) {
    logger.error('handleCommand error', { cmd, error: e.message });
    await client.replyMessage({ replyToken, messages: [{ type: 'text', text: '⚠️ 查詢時發生錯誤，請稍後再試或直接傳訊聯繫房東。' }] }).catch(() => {});
    return true;
  }

  return false;
}

/**
 * lineWebhook — receives events from LINE platform
 * Webhook URL: https://asia-east1-rental-8897a.cloudfunctions.net/lineWebhook?lid={landlordId}
 * 每位房東在 LINE Developers Console 填入各自帶有 ?lid= 的 URL
 */
exports.lineWebhook = onRequest(
  { region: 'asia-east1', cors: false, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    // 從 query 參數取得房東 ID
    const landlordId = req.query.lid;
    if (!landlordId) {
      logger.warn('lineWebhook: missing ?lid= query param');
      return res.status(400).json({ error: 'Missing landlord ID (?lid=)' });
    }

    // LINE webhook verification ping has empty events — return 200 immediately
    const events = req.body?.events;
    if (Array.isArray(events) && events.length === 0) {
      logger.info('LINE webhook verification ping received', { landlordId });
      return res.status(200).json({ status: 'ok' });
    }

    let config;
    try {
      config = await getLineConfig(landlordId);
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

        // 區分房東綁定 vs 租客綁定
        if (bindingData.type === 'landlord') {
          // 房東：將 LINE userId 存入 line_configs
          await db.collection('line_configs').doc(bindingData.uid).set({
            ownerLineUserId: lineUserId,
            ownerLineDisplayName: displayName,
            ownerLineBindingAt: FieldValue.serverTimestamp(),
          }, { merge: true });
          await bindingSnap.ref.delete();
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text:
              `✅ 房東通知綁定成功！\n您好，${displayName}，您的 LINE 帳號已與租屋管理系統綁定。\n往後租客繳費截圖上傳等系統通知將直接傳送到這裡。` }],
          });
          logger.info('Landlord LINE binding successful', { uid: bindingData.uid, lineUserId, displayName });
        } else {
          // 租客：更新 users 帳號
          await db.collection('users').doc(bindingData.uid).update({
            lineUserId,
            lineDisplayName: displayName,
            lineBindingAt: FieldValue.serverTimestamp(),
          });
          await bindingSnap.ref.delete();
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text:
              `✅ 綁定成功！\n您好，${displayName}，您的帳號已與此 LINE 綁定。\n往後房東的回覆將直接傳送到這裡。\n\n💡 可用查詢指令：\n帳單 ｜ 電費 ｜ 合約 ｜ 公告 ｜ 報修\n\n傳送「選單」查看完整說明` }],
          });
          logger.info('LINE binding successful', { uid: bindingData.uid, lineUserId, displayName });
        }
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

      // --- 指令處理（帳單/電費/合約/公告/報修/選單）---
      const isCmd = await handleCommand(messageText, tenantId, config, client, event.replyToken, db);
      if (isCmd) continue;

      // Store message in Firestore (only non-command messages)
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

      // Auto-reply: message received + keyword hints
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text:
          '📨 訊息已送達，等候房東回覆。\n\n💡 也可輸入指令快速查詢：\n帳單 ｜ 電費 ｜ 合約 ｜ 公告 ｜ 報修\n\n傳送「選單」查看完整說明' }],
      }).catch(e => logger.warn('Auto-reply failed', { error: e.message }));

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

    // 房東的 uid 即為 landlordId，讀取自己的 LINE 設定
    let config;
    try {
      config = await getLineConfig(request.auth.uid);
    } catch (e) {
      throw new Error(e.message);
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

    const { month, tenantId } = request.data; // month: 'YYYY-MM' (批次用), tenantId: 單一租客 uid (選填)
    if (!month && !tenantId) throw new Error('Missing required field: month or tenantId');

    // 房東的 uid 即為 landlordId
    let config;
    try {
      config = await getLineConfig(request.auth.uid);
    } catch (e) {
      throw new Error(e.message);
    }

    const db = getFirestore();
    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });

    // 查詢帳單：單一租客模式查全部待收/逾期，批次模式只查當月
    let billsQuery = db.collection('bills')
      .where('landlordId', '==', config.landlordId)
      .where('type', '==', 'income');

    if (tenantId) {
      // 單一租客：查該租客所有未繳帳單
      billsQuery = billsQuery.where('tenantId', '==', tenantId).where('status', 'in', ['pending', 'overdue']);
    } else {
      billsQuery = billsQuery.where('status', '==', 'pending');
    }

    const billsSnap = await billsQuery.get();

    let targetBills = billsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!tenantId && month) {
      targetBills = targetBills.filter(b => b.date && b.date.startsWith(month));
    }

    if (targetBills.length === 0) {
      return { sent: 0, message: tenantId ? '該租客目前沒有未繳帳單' : '本月沒有待收帳單' };
    }

    // Group by tenantId (auth uid) and look up lineUserId
    const tenantUids = [...new Set(targetBills.map(b => b.tenantId).filter(Boolean))];
    let sent = 0;

    for (const uid of tenantUids) {
      const userSnap = await db.collection('users').doc(uid).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data();
      if (!userData.lineUserId) continue;

      const tenantBills = targetBills.filter(b => b.tenantId === uid);
      const totalAmount = tenantBills.reduce((sum, b) => sum + (Number(b.totalAmount || b.amount) || 0), 0);
      const nearestDue = tenantBills.reduce((m, b) => (!m || b.dueDate < m) ? b.dueDate : m, '');
      const name = userData.name || '您';

      let text;
      if (tenantId) {
        // 單一租客提醒：列出各筆帳單
        const lines = tenantBills.map(b => `• ${b.description || b.date || '帳單'} NT$${Number(b.totalAmount||b.amount||0).toLocaleString()}${b.status === 'overdue' ? '（已逾期）' : ''}`).join('\n');
        text = `💰 帳單繳費提醒\n\n${name}，您有 ${tenantBills.length} 筆未繳帳單：\n${lines}\n\n合計：NT$ ${totalAmount.toLocaleString()} 元\n最近截止：${nearestDue || '-'}\n\n如有疑問請直接回覆此訊息聯繫房東。`;
      } else {
        text = `💰 ${month.replace('-', ' 年 ')} 月帳單提醒\n\n${name}，本月帳單共 NT$ ${totalAmount.toLocaleString()} 元，請於 ${nearestDue || '-'} 前完成繳費。\n\n如有疑問請直接回覆此訊息聯繫房東。`;
      }

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

// ============================================================
// Firestore Trigger: 帳單建立推播
// ============================================================

/**
 * notifyBillCreated — triggered when a new bill document is created in bills/{billId}
 * Pushes LINE notification to the tenant if they have LINE bound
 */
exports.notifyBillCreated = onDocumentCreated(
  { document: 'bills/{billId}', region: 'asia-east1' },
  async (event) => {
    const bill = event.data?.data();
    if (!bill) return;

    // Only notify for income bills (收費單) with a tenant and landlord
    if (bill.type !== 'income' || !bill.tenantId || !bill.landlordId) return;

    let config;
    try {
      config = await getLineConfig(bill.landlordId);
    } catch (e) {
      logger.warn('notifyBillCreated: LINE config error', { landlordId: bill.landlordId, error: e.message });
      return;
    }

    const db = getFirestore();
    const userSnap = await db.collection('users').doc(bill.tenantId).get();
    if (!userSnap.exists) return;
    const userData = userSnap.data();
    if (!userData.lineUserId) return;

    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });

    const amount = Number(bill.totalAmount || bill.amount || 0);
    const name = userData.name || '您';
    const month = (bill.date || '').substring(0, 7).replace('-', ' 年 ') + ' 月';
    const dueDate = bill.dueDate || '-';
    const desc = bill.description || bill.title || '帳單';

    const text =
      `💰 新帳單通知\n━━━━━━━━━━\n${name}，您有一筆新帳單：\n\n` +
      `項目：${desc}\n` +
      `金額：NT$${amount.toLocaleString()}\n` +
      `到期日：${dueDate}\n` +
      `━━━━━━━━━━\n請至系統完成繳費，或傳送「帳單」查詢詳情。`;

    try {
      await client.pushMessage({ to: userData.lineUserId, messages: [{ type: 'text', text }] });
      logger.info('notifyBillCreated: sent', { billId: event.params.billId, tenantId: bill.tenantId });
    } catch (e) {
      logger.error('notifyBillCreated: push failed', { error: e.message });
    }
  }
);

// ============================================================
// Firestore Trigger: 公告建立推播
// ============================================================

/**
 * notifyAnnouncementCreated — triggered when a new announcement is created
 * Pushes to all tenants of that landlord who have LINE bound
 */
exports.notifyAnnouncementCreated = onDocumentCreated(
  { document: 'announcements/{annoId}', region: 'asia-east1' },
  async (event) => {
    const anno = event.data?.data();
    if (!anno || !anno.landlordId) return;

    let config;
    try {
      config = await getLineConfig(anno.landlordId);
    } catch (e) {
      logger.warn('notifyAnnouncementCreated: LINE config error', { landlordId: anno.landlordId, error: e.message });
      return;
    }

    const db = getFirestore();
    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });

    // Find all tenants belonging to this landlord who have LINE bound
    const usersSnap = await db.collection('users')
      .where('landlordId', '==', anno.landlordId)
      .where('role', '==', 'tenant')
      .get();

    const title = anno.title || '新公告';
    const body = (anno.content || '').substring(0, 100).replace(/\n/g, ' ');
    const text =
      `📢 社區公告\n━━━━━━━━━━\n【${title}】\n\n${body}${(anno.content||'').length > 100 ? '…' : ''}\n━━━━━━━━━━\n詳細內容請至系統查看，或傳送「公告」查詢最新消息。`;

    let sent = 0;
    for (const doc of usersSnap.docs) {
      const ud = doc.data();
      if (!ud.lineUserId) continue;
      try {
        await client.pushMessage({ to: ud.lineUserId, messages: [{ type: 'text', text }] });
        sent++;
      } catch (e) {
        logger.warn('notifyAnnouncementCreated: push failed', { uid: doc.id, error: e.message });
      }
    }
    logger.info('notifyAnnouncementCreated: done', { annoId: event.params.annoId, sent });
  }
);

// ============================================================
// Scheduled Function: 每日帳單 & 合約到期提醒 (09:00 台灣時間)
// ============================================================

/**
 * scheduledReminderDaily — runs every day at 09:00 Asia/Taipei
 * Pushes reminders for:
 *   - Bills due in 3 days
 *   - Contracts expiring in 90 days (first notice → sets renewalStatus: 'pending')
 *   - Contracts expiring in 60 days (second notice)
 *   - Contracts expiring in 30 days (final notice)
 */
exports.scheduledReminderDaily = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Asia/Taipei', region: 'asia-east1' },
  async () => {
    const db = getFirestore();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (d) => d.toISOString().substring(0, 10);

    const in3  = new Date(today); in3.setDate(in3.getDate() + 3);
    const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
    const in60 = new Date(today); in60.setDate(in60.getDate() + 60);
    const in90 = new Date(today); in90.setDate(in90.getDate() + 90);
    const due3     = fmt(in3);
    const expiry30 = fmt(in30);
    const expiry60 = fmt(in60);
    const expiry90 = fmt(in90);

    // 取得所有已設定 LINE Bot 的房東
    const configsSnap = await db.collection('line_configs').get();
    if (configsSnap.empty) {
      logger.info('scheduledReminderDaily: no landlords configured');
      return;
    }

    let totalBills = 0, totalContracts = 0;

    // ── Helper: push LINE message to tenant ──────────────────
    const pushToTenant = async (client, tenantId, text, label) => {
      if (!tenantId) return;
      const userSnap = await db.collection('users').doc(tenantId).get();
      if (!userSnap.exists) return;
      const ud = userSnap.data();
      if (!ud.lineUserId) return;
      await client.pushMessage({ to: ud.lineUserId, messages: [{ type: 'text', text }] });
    };

    for (const configDoc of configsSnap.docs) {
      const landlordId = configDoc.id;
      const configData = configDoc.data();
      if (!configData.channelAccessToken) continue;

      const client = new line.messagingApi.MessagingApiClient({
        channelAccessToken: configData.channelAccessToken,
      });

      // ── 帳單：3 天後到期 ──────────────────────────────────
      const billsSnap = await db.collection('bills')
        .where('landlordId', '==', landlordId)
        .where('dueDate', '==', due3)
        .where('status', 'in', ['pending', 'overdue'])
        .where('type', '==', 'income')
        .get();

      for (const doc of billsSnap.docs) {
        const bill = doc.data();
        if (!bill.tenantId) continue;
        const userSnap = await db.collection('users').doc(bill.tenantId).get();
        if (!userSnap.exists) continue;
        const ud = userSnap.data();
        if (!ud.lineUserId) continue;

        const amount = Number(bill.totalAmount || bill.amount || 0);
        const name = ud.name || '您';
        const text =
          `⏰ 帳單繳費提醒\n━━━━━━━━━━\n${name}，您有一筆帳單將於 3 天後（${due3}）到期：\n\n` +
          `項目：${bill.description || bill.title || '帳單'}\n` +
          `金額：NT$${amount.toLocaleString()}\n` +
          `━━━━━━━━━━\n請記得按時完成繳費，傳送「帳單」查詢詳情。`;

        try {
          await client.pushMessage({ to: ud.lineUserId, messages: [{ type: 'text', text }] });
          totalBills++;
        } catch (e) {
          logger.warn('scheduledReminderDaily: bill push failed', { landlordId, billId: doc.id, error: e.message });
        }
      }

      // ── 合約提醒共用查詢函式 ──────────────────────────────
      const sendContractReminder = async (expiryDate, dayLabel, setRenewalPending) => {
        const snap = await db.collection('contracts')
          .where('landlordId', '==', landlordId)
          .where('endDate', '==', expiryDate)
          .where('status', '==', 'active')
          .get();

        for (const cDoc of snap.docs) {
          const c = cDoc.data();
          if (!c.tenantId) continue;

          // 若已回覆，只在 90 天時標記（不重複提醒）
          if (c.renewalStatus === 'confirmed' || c.renewalStatus === 'declined') continue;

          const userSnap = await db.collection('users').doc(c.tenantId).get();
          if (!userSnap.exists) continue;
          const ud = userSnap.data();
          if (!ud.lineUserId) continue;

          const name = ud.name || '您';
          const rent = Number(c.monthlyRent || c.rent || 0);
          const roomLabel = c.roomName || c.roomNumber || '';
          const text =
            `📋 租約到期提醒（${dayLabel}）\n━━━━━━━━━━\n` +
            `${name}，您的租約將於 ${dayLabel} 後到期。\n` +
            `到期日：${expiryDate}\n` +
            (roomLabel ? `房號：${roomLabel}\n` : '') +
            (rent ? `月租金：NT$${rent.toLocaleString()}\n` : '') +
            `━━━━━━━━━━\n請盡早透過 App 回覆是否續租，或聯繫房東確認。`;

          try {
            await client.pushMessage({ to: ud.lineUserId, messages: [{ type: 'text', text }] });
            totalContracts++;

            // 首次（90天）提醒時，設定 renewalStatus: 'pending'
            if (setRenewalPending && !c.renewalStatus) {
              await db.collection('contracts').doc(cDoc.id).update({ renewalStatus: 'pending' });
            }
          } catch (e) {
            logger.warn('scheduledReminderDaily: contract push failed', {
              landlordId, contractId: cDoc.id, dayLabel, error: e.message
            });
          }
        }
      };

      await sendContractReminder(expiry90, '3 個月', true);
      await sendContractReminder(expiry60, '60 天', false);
      await sendContractReminder(expiry30, '30 天', false);

      logger.info('scheduledReminderDaily: landlord done', { landlordId, bills: billsSnap.size });
    }

    logger.info('scheduledReminderDaily: complete', {
      date: fmt(today),
      landlords: configsSnap.size,
      billsSent: totalBills,
      contractsSent: totalContracts,
    });
  }
);

// ============================================================
// submitRenewalResponse — 租客回覆是否續租，通知房東 LINE
// ============================================================
exports.submitRenewalResponse = onCall(
  { region: 'asia-east1' },
  async (request) => {
    const { HttpsError } = require('firebase-functions/v2/https');
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '請先登入');

    const { contractId, response, note } = request.data;
    if (!contractId || !['confirmed', 'declined'].includes(response)) {
      throw new HttpsError('invalid-argument', '缺少必要參數');
    }

    const db = getFirestore();
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    if (!contractSnap.exists) throw new HttpsError('not-found', '合約不存在');

    const c = contractSnap.data();
    if (c.tenantId !== uid) throw new HttpsError('permission-denied', '無操作權限');

    // 更新合約
    await contractRef.update({
      renewalStatus: response,
      renewalNote: note || '',
      renewalRespondedAt: FieldValue.serverTimestamp(),
    });

    // 通知房東 LINE
    try {
      const landlordId = c.landlordId;
      const lineConfigSnap = await db.collection('line_configs').doc(landlordId).get();
      if (lineConfigSnap.exists && lineConfigSnap.data().channelAccessToken) {
        const client = new line.messagingApi.MessagingApiClient({
          channelAccessToken: lineConfigSnap.data().channelAccessToken,
        });
        // 找房東自己的 lineUserId
        const landlordUserSnap = await db.collection('users').doc(landlordId).get();
        if (landlordUserSnap.exists) {
          const lu = landlordUserSnap.data();
          if (lu.lineUserId) {
            const responseLabel = response === 'confirmed' ? '✅ 確認續租' : '❌ 不續租';
            const tenantName = c.tenantName || '租客';
            const roomLabel = c.roomNumber || c.roomName || '';
            const text =
              `📬 租客續約回覆\n━━━━━━━━━━\n` +
              `${tenantName}${roomLabel ? `（${roomLabel}）` : ''}\n` +
              `回覆：${responseLabel}\n` +
              (note ? `備註：${note}\n` : '') +
              `━━━━━━━━━━\n租期：${c.startDate || ''} ~ ${c.endDate || ''}`;
            await client.pushMessage({ to: lu.lineUserId, messages: [{ type: 'text', text }] });
          }
        }
      }
    } catch (e) {
      logger.warn('submitRenewalResponse: LINE notify failed', { contractId, error: e.message });
    }

    return { success: true };
  }
);

// 評價新增時，自動更新 public_profiles 的 avgRating / reviewCount
exports.onReviewCreated = onDocumentCreated(
  { document: 'reviews/{reviewId}', region: 'asia-east1' },
  async (event) => {
    const data = event.data?.data();
    if (!data?.landlordId || !data?.isVisible) return;

    const db = getFirestore();
    const landlordId = data.landlordId;

    // 重新計算該房東所有可見評價的平均分
    const snap = await db.collection('reviews')
      .where('landlordId', '==', landlordId)
      .where('isVisible', '==', true)
      .get();

    const count = snap.size;
    const avg = count > 0
      ? snap.docs.reduce((sum, d) => sum + (d.data().rating || 0), 0) / count
      : 0;

    await db.collection('public_profiles').doc(landlordId).set({
      avgRating: Math.round(avg * 10) / 10,
      reviewCount: count,
    }, { merge: true });

    logger.info('onReviewCreated: updated public_profiles', { landlordId, avg, count });
  }
);

// ============================================================
// 費用保護機制 (Cost Protection)
// ============================================================

// ── 設定門檻（依需求調整） ──────────────────────────────────
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;  // 5 GB (免費方案上限)
const STORAGE_WARN_THRESHOLD = 0.8;                    // 80% 時警告
const STORAGE_BLOCK_THRESHOLD = 0.95;                  // 95% 時封鎖新上傳
// ───────────────────────────────────────────────────────────

/** 內部：更新 _system/storageStats，必要時設定封鎖旗標並發 LINE 通知 */
async function _updateStorageStats(deltaBytes) {
  const db = getFirestore();
  const statsRef = db.collection('_system').doc('storageStats');
  const quotaRef = db.collection('_system').doc('quotaControl');

  let newTotal = 0;
  await db.runTransaction(async (t) => {
    const stats = await t.get(statsRef);
    const current = stats.exists ? (stats.data().totalBytes || 0) : 0;
    newTotal = Math.max(0, current + deltaBytes);
    t.set(statsRef, { totalBytes: newTotal, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    const ratio = newTotal / STORAGE_LIMIT_BYTES;
    if (ratio >= STORAGE_BLOCK_THRESHOLD) {
      t.set(quotaRef, {
        storageBlocked: true,
        blockedAt: FieldValue.serverTimestamp(),
        reason: `Storage ${(ratio * 100).toFixed(1)}% used`,
      }, { merge: true });
    } else {
      // 空間夠用時解除封鎖
      t.set(quotaRef, { storageBlocked: false }, { merge: true });
    }
  });

  const ratio = newTotal / STORAGE_LIMIT_BYTES;
  const totalMB = (newTotal / 1024 / 1024).toFixed(1);
  const percent = (ratio * 100).toFixed(1);
  logger.info('Storage stats updated', { totalMB, percent });

  // 超過警告門檻時，推播 LINE 通知給所有房東
  if (ratio >= STORAGE_WARN_THRESHOLD) {
    const isBlocked = ratio >= STORAGE_BLOCK_THRESHOLD;
    const icon = isBlocked ? '🚫' : '⚠️';
    const statusText = isBlocked
      ? `已達 ${percent}%，新上傳已自動封鎖！`
      : `已達 ${percent}%，即將到達上限`;
    const msg = `${icon} Firebase Storage 費用警告\n━━━━━━━━━━\n目前使用：${totalMB} MB\n上限：${(STORAGE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB\n狀態：${statusText}\n\n請至 Firebase Console 確認用量。`;

    const configsSnap = await getFirestore().collection('line_configs').get();
    for (const doc of configsSnap.docs) {
      const cfg = doc.data();
      if (!cfg.channelAccessToken || !cfg.landlordId) continue;
      try {
        const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: cfg.channelAccessToken });
        await client.pushMessage({ to: cfg.landlordId, messages: [{ type: 'text', text: msg }] });
      } catch (e) {
        logger.warn('Cost alert LINE push failed', { landlordId: doc.id, error: e.message });
      }
    }
  }
}

/**
 * 追蹤 Storage 上傳：計算已用空間
 */
exports.trackStorageOnUpload = onObjectFinalized({ region: 'us-east1' }, async (event) => {
  const fileSize = parseInt(event.data.size || '0', 10);
  if (!fileSize) return;
  logger.info('File uploaded', { name: event.data.name, sizeBytes: fileSize });
  await _updateStorageStats(fileSize);
});

/**
 * 追蹤 Storage 刪除：釋放已用空間
 */
exports.trackStorageOnDelete = onObjectDeleted({ region: 'us-east1' }, async (event) => {
  const fileSize = parseInt(event.data.size || '0', 10);
  if (!fileSize) return;
  logger.info('File deleted', { name: event.data.name, sizeBytes: fileSize });
  await _updateStorageStats(-fileSize);
});

/**
 * GCP Budget Alert 接收 (Pub/Sub topic: "budget-alerts")
 * 設定步驟：GCP Console → Billing → Budgets → 新增 budget → Pub/Sub notifications
 * Topic 名稱設為 "budget-alerts"
 */
exports.budgetAlert = onMessagePublished(
  { topic: 'budget-alerts', region: 'asia-east1' },
  async (event) => {
    const budgetData = event.data.message.json || {};
    const costUnits = Number(budgetData.costAmount?.units || 0);
    const budgetUnits = Number(budgetData.budgetAmount?.units || 0);
    const alertThreshold = Number(budgetData.alertThresholdExceeded || 0);

    logger.warn('GCP Budget alert received', { costUnits, budgetUnits, alertThreshold });

    const db = getFirestore();
    await db.collection('_system').doc('budgetAlerts').set({
      lastAlert: FieldValue.serverTimestamp(),
      costUnits,
      budgetUnits,
      alertThreshold,
    }, { merge: true });

    // 超過 90% 預算時封鎖 Storage
    if (alertThreshold >= 0.9) {
      await db.collection('_system').doc('quotaControl').set({
        storageBlocked: true,
        blockedAt: FieldValue.serverTimestamp(),
        reason: `GCP budget ${(alertThreshold * 100).toFixed(0)}%: $${costUnits} / $${budgetUnits}`,
      }, { merge: true });
      logger.error('Budget threshold exceeded! Storage blocked.', { costUnits, budgetUnits });

      // 推播緊急通知
      const msg = `🚨 Firebase 費用緊急警告！\n━━━━━━━━━━\n目前費用：$${costUnits}\n預算上限：$${budgetUnits}\n已達：${(alertThreshold * 100).toFixed(0)}%\n\n⛔ Storage 上傳已自動停用，請盡速至 GCP Console 確認！`;
      const configsSnap = await db.collection('line_configs').get();
      for (const doc of configsSnap.docs) {
        const cfg = doc.data();
        if (!cfg.channelAccessToken || !cfg.landlordId) continue;
        try {
          const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: cfg.channelAccessToken });
          await client.pushMessage({ to: cfg.landlordId, messages: [{ type: 'text', text: msg }] });
        } catch (e) {
          logger.warn('Budget alert LINE push failed', { landlordId: doc.id, error: e.message });
        }
      }
    }
  }
);

/**
 * 每日使用量報告 (每天早上 9:00 台灣時間)
 * 超過 80% 時主動推播 LINE 通知
 */
exports.dailyUsageCheck = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'Asia/Taipei', region: 'asia-east1' },
  async () => {
    const db = getFirestore();
    const [statsSnap, quotaSnap, budgetSnap] = await Promise.all([
      db.collection('_system').doc('storageStats').get(),
      db.collection('_system').doc('quotaControl').get(),
      db.collection('_system').doc('budgetAlerts').get(),
    ]);

    const totalBytes = statsSnap.exists ? (statsSnap.data().totalBytes || 0) : 0;
    const isBlocked = quotaSnap.exists ? (quotaSnap.data().storageBlocked || false) : false;
    const budgetInfo = budgetSnap.exists ? budgetSnap.data() : null;

    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
    const limitMB = (STORAGE_LIMIT_BYTES / 1024 / 1024).toFixed(0);
    const percent = (totalBytes / STORAGE_LIMIT_BYTES * 100).toFixed(1);
    const today = new Date().toISOString().split('T')[0];

    logger.info('Daily usage report', { today, totalMB, limitMB, percent, isBlocked });

    await db.collection('_system').doc('dailyReport').set({
      date: today,
      storageBytes: totalBytes,
      storageMB: parseFloat(totalMB),
      storagePercent: parseFloat(percent),
      isBlocked,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 超過警告門檻才推播（避免每天騷擾）
    const ratio = totalBytes / STORAGE_LIMIT_BYTES;
    if (ratio >= STORAGE_WARN_THRESHOLD) {
      const icon = isBlocked ? '🚫' : '⚠️';
      let msg = `${icon} [每日報告] Firebase Storage\n━━━━━━━━━━\n日期：${today}\n使用量：${totalMB} MB / ${limitMB} MB\n佔比：${percent}%\n狀態：${isBlocked ? '上傳已封鎖' : '正常（接近上限）'}`;
      if (budgetInfo?.costUnits) {
        msg += `\n\nGCP 本月費用：$${budgetInfo.costUnits}`;
      }
      msg += '\n\n請至 Firebase Console 確認用量。';

      const configsSnap = await db.collection('line_configs').get();
      for (const doc of configsSnap.docs) {
        const cfg = doc.data();
        if (!cfg.channelAccessToken || !cfg.landlordId) continue;
        try {
          const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: cfg.channelAccessToken });
          await client.pushMessage({ to: cfg.landlordId, messages: [{ type: 'text', text: msg }] });
        } catch (e) {
          logger.warn('Daily report LINE push failed', { landlordId: doc.id, error: e.message });
        }
      }
    }
  }
);

// ─── createTenantAccount ───────────────────────────────────────────────────
// 由房東呼叫：以手機號碼 + 身分證號為租客建立 Firebase Auth 帳號
exports.createTenantAccount = onCall({ region: 'asia-east1' }, async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');

  const db = getFirestore();
  const callerUid = request.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists) throw new Error('Caller not found');
  const callerRole = callerDoc.data().role;
  if (callerRole !== 'landlord' && callerRole !== 'admin') throw new Error('Permission denied');

  const { phone, idNumber, tenantDocId, name } = request.data;
  if (!phone || !idNumber || !tenantDocId) throw new Error('Missing required fields');

  const email = `${phone}@tenant.myrental`;

  try {
    let userRecord;
    try {
      userRecord = await getAuth().getUserByEmail(email);
    } catch (_) {
      userRecord = await getAuth().createUser({ email, password: idNumber, displayName: name || phone });
    }

    await db.collection('tenants').doc(tenantDocId).update({ uid: userRecord.uid });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: name || '',
      phone,
      role: 'tenant',
      isLandlordCreated: true,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info('createTenantAccount: success', { phone, tenantDocId, uid: userRecord.uid });
    return { success: true, uid: userRecord.uid };
  } catch (e) {
    logger.error('createTenantAccount error', e);
    throw new Error(e.message);
  }
});

// ─── resetTenantPassword ───────────────────────────────────────────────────
// 由 Admin 呼叫：強制重設指定租客的密碼
exports.resetTenantPassword = onCall({ region: 'asia-east1' }, async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');

  const db = getFirestore();
  const callerUid = request.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') throw new Error('Permission denied: admin only');

  const { uid, newPassword } = request.data;
  if (!uid || !newPassword) throw new Error('Missing required fields');
  if (newPassword.length < 6) throw new Error('密碼至少需要 6 個字元');

  try {
    await getAuth().updateUser(uid, { password: newPassword });
    logger.info('resetTenantPassword: success', { targetUid: uid, callerUid });
    return { success: true };
  } catch (e) {
    logger.error('resetTenantPassword error', e);
    throw new Error(e.message);
  }
});