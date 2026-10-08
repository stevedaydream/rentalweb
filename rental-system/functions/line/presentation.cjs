const SITE_URL = 'https://rental-system-7675e.web.app';
const COLORS = { ink: '#211E19', gold: '#A8792E', paper: '#FFFCF5', muted: '#766D60', line: '#E8DFCF', danger: '#B42332' };
const url = path => SITE_URL + path;
const message = (label, text = label) => ({ type: 'message', label, text });
const uri = (label, path) => ({ type: 'uri', label, uri: url(path) });

const MENUS = require('./menu-items.json');
const fs = require('node:fs');
const path = require('node:path');

function contextFor(text, role = 'tenant') {
  const owner = role === 'landlord';
  const head = String(text).split('\n')[0];
  if (role === 'unbound') return { title: '帳號綁定', path: '/login', label: '登入並取得綁定碼' };
  if (/簽名|簽署|核對|電子合約/.test(head)) return { title: '合約簽署', path: owner ? '/landlord/contract' : '/tenant/contract', label: owner ? '前往核對合約' : '查看合約' };
  if (/到期|續約|續租|合約|租約/.test(head)) return { title: '租約資訊', path: owner ? '/landlord/tenants' : '/tenant/contract', label: owner ? '管理租約' : '查看我的合約' };
  if (/帳單|欠費|繳費|付款|收款/.test(head)) return { title: '帳務摘要', path: owner ? '/landlord/financials' : '/tenant/bills', label: owner ? '查看帳務明細' : '前往繳費／上傳截圖' };
  if (/電費|電表|用電/.test(head)) return { title: '用電摘要', path: owner ? '/landlord/meter-reading' : '/tenant/bills?tab=meter', label: '查看用電明細' };
  if (/公告/.test(head)) return { title: '最新公告', path: owner ? '/landlord/announcements' : '/tenant/announcements', label: '閱讀完整公告' };
  if (/報修|維修/.test(head)) return { title: '報修服務', path: owner ? '/landlord/repairs' : '/tenant/repairs', label: owner ? '處理報修案件' : '新增／查看報修' };
  if (/租客|房間/.test(head)) return { title: '房間資訊', path: '/landlord/tenants', label: '查看租客資料' };
  return { title: '租賃管家', path: owner ? '/landlord/dashboard' : '/tenant/dashboard', label: '開啟線上系統' };
}

function quickReplyFor(role, context) {
  const items = [message('主選單', '選單')];
  if (role === 'unbound') items.push(uri('取得綁定碼', '/login'), uri('使用說明', '/guide'));
  else {
    items.push(uri(context.label, context.path));
    if (role === 'landlord') items.push(context.path.includes('financials') ? message('查到期租約', '到期') : message('查欠費', '欠費'), message('查報修', '報修'));
    else items.push(context.path.includes('bills') && !context.path.includes('meter') ? message('查電費', '電費') : message('查帳單', '帳單'), message('聯繫房東'));
  }
  return { items: items.map(action => ({ type: 'action', action })) };
}

function bubble(title, lines, actions = [], metric) {
  return {
    type: 'bubble', size: 'mega',
    header: { type: 'box', layout: 'vertical', backgroundColor: COLORS.ink, paddingAll: '20px', spacing: 'sm', contents: [
      { type: 'text', text: '租賃管家  /  RENTAL SERVICE', color: '#D3B780', size: 'xxs', weight: 'bold' },
      { type: 'text', text: title || '租賃管家', color: '#FFFFFF', size: 'lg', weight: 'bold', wrap: true },
      ...(metric ? [{ type: 'text', text: metric, color: '#E8C98F', size: 'xxl', weight: 'bold', wrap: true }] : []),
    ] },
    body: { type: 'box', layout: 'vertical', backgroundColor: COLORS.paper, paddingAll: '20px', spacing: 'md', contents:
      (lines.length ? lines : ['詳細資訊請開啟線上系統查看。']).map(line => ({ type: 'text', text: line || ' ', size: 'sm', color: /已逾期|逾期未繳/.test(line) ? COLORS.danger : COLORS.ink, wrap: true })) },
    footer: { type: 'box', layout: 'vertical', backgroundColor: COLORS.paper, paddingAll: '16px', spacing: 'sm', contents: actions.map((action, i) => ({ type: 'button', style: i === 0 ? 'primary' : 'secondary', color: i === 0 ? COLORS.ink : undefined, height: 'sm', action })) },
  };
}

function menuMessage(role) {
  const title = role === 'landlord' ? '房東管理中心' : role === 'tenant' ? '我的租屋生活' : '歡迎使用租賃管家';
  const entries = MENUS[role] || MENUS.unbound;
  return { type: 'flex', altText: title, contents: bubble(title,
    [role === 'unbound' ? '請登入系統取得六位數綁定碼，再將綁定碼傳送到這個聊天室。租客請至「聯繫房東」，房東請至「系統設定 → LINE」。' : '選擇服務查看摘要，或開啟網頁完成操作。'], entries.map(item => item.action)), quickReply: quickReplyFor(role, contextFor('', role)) };
}

function cardMessage(text, role = 'tenant', context = contextFor(text, role)) {
  const raw = String(text || '租賃管家通知');
  const lines = raw.split('\n').filter(line => line.trim() && !/^[━─—=]{3,}$/.test(line.trim()));
  let title = lines.shift() || context.title;
  if (title.length > 200) { lines.unshift(title); title = context.title; }
  const chunks = [];
  let chunk = [], length = 0;
  for (const line of lines) {
    for (let i = 0; i < line.length; i += 1000) {
      const part = line.slice(i, i + 1000);
      if (length + part.length > 1200 && chunk.length) { chunks.push(chunk); chunk = []; length = 0; }
      chunk.push(part); length += part.length;
    }
  }
  if (chunk.length || !chunks.length) chunks.push(chunk);
  const quickReply = quickReplyFor(role, context);
  if (chunks.length > 10) {
    chunks.length = 10;
    chunks[9].push('內容較長，請開啟線上系統查看完整明細。');
  }
  const link = raw.match(/https:\/\/rental-system-7675e\.web\.app\/[^\s<>]+/);
  const action = link ? { type: 'uri', label: /\/sign\//.test(link[0]) ? '開啟簽署連結' : context.label, uri: link[0] } : uri(context.label, context.path);
  const amount = /bills|financials/.test(context.path)
    ? (raw.match(/(?:合計|總計|總額)[：:\s]*NT\$\s*[\d,]+/) || raw.match(/(?:金額|帳單共)[：:\s]*NT\$\s*[\d,]+/))?.[0].match(/NT\$\s*[\d,]+/)?.[0]
    : undefined;
  const cards = chunks.map((part, i) => bubble(chunks.length > 1 ? `${title}（${i + 1}/${chunks.length}）` : title, part, [action], i === 0 ? amount : undefined));
  return { type: 'flex', altText: raw.slice(0, 400), contents: cards.length === 1 ? cards[0] : { type: 'carousel', contents: cards }, quickReply };
}

function decorateMessages(messages, role, context) {
  const result = (Array.isArray(messages) ? messages : [messages]).map(item => {
    if (item.type === 'text') return cardMessage(item.text, role, context || contextFor(item.text, role));
    if (item.type === 'template' && item.template?.type === 'buttons') return {
      type: 'flex', altText: item.altText, contents: bubble('報修服務', [item.template.text], item.template.actions),
    };
    return { ...item };
  });
  for (const item of result.slice(0, -1)) delete item.quickReply;
  const last = result.at(-1);
  if (last) last.quickReply = quickReplyFor(role, context || contextFor(last.altText || '', role));
  return result;
}

function billMessage(bills, total, nearestDue, outstanding) {
  const lines = bills.slice(0, 5).map(b => `${b.description || b.date || '帳單'}\nNT$ ${outstanding(b).toLocaleString('zh-TW')} · ${b.status === 'overdue' ? '已逾期' : '待繳'}\n截止日 ${b.dueDate || '未設定'}`);
  if (bills.length > 5) lines.push(`另有 ${bills.length - 5} 筆帳單，請開啟明細查看。`);
  lines.unshift(`未繳 ${bills.length} 筆 · 最近截止 ${nearestDue || '未設定'}`);
  return { type: 'flex', altText: `未繳帳單 ${bills.length} 筆，合計 NT$ ${total.toLocaleString('zh-TW')}`, contents: bubble('應繳金額', lines, [uri('前往繳費／上傳截圖', '/tenant/bills')], `NT$ ${total.toLocaleString('zh-TW')}`) };
}

const RICH_MENU_W = 2500, RICH_MENU_H = 1686;
function richMenuAreas(role = 'tenant') {
  return MENUS[role].map((item, i) => ({ bounds: { x: (i % 3) * 833, y: Math.floor(i / 3) * 843, width: i % 3 === 2 ? 834 : 833, height: 843 }, action: item.action }));
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
function richMenuHtml(title, role = 'tenant') {
  const fontCss = [400, 700].map(weight => {
    const data = fs.readFileSync(path.join(__dirname, 'fonts', `NotoSansTC-menu-${weight}.ttf`)).toString('base64');
    return `@font-face{font-family:"Noto Sans TC";font-weight:${weight};src:url(data:font/ttf;base64,${data}) format("truetype");}`;
  }).join('');
  const paths = {
    receipt_long: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    build: '<path d="M14 6a5 5 0 0 0-6-3l3 3-4 4-3-3a5 5 0 0 0 6 6l8 8 3-3-8-8a5 5 0 0 0 1-4Z"/>',
    description: '<path d="M5 3h9l5 5v13H5V3Z"/><path d="M14 3v5h5M8 12h8M8 16h6"/>',
    campaign: '<path d="m3 9 17-5v16L3 15V9ZM7 16l2 5h4l-2-4M3 12H1"/>',
    home: '<path d="m3 10 9-8 9 8M5 8v13h14V8M10 21v-7h4v7"/>',
    payments: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 9h1M18 15h1"/>',
    event: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    account_balance_wallet: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4M8 14h3M8 17h7"/>',
    link: '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
    login: '<path d="M14 3h7v18h-7M2 12h14m-5-5 5 5-5 5"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 3-3 6M12 17v1"/>',
    chat: '<path d="M3 4h18v13H9l-6 4V4Z"/><path d="M7 8h10M7 12h7"/>',
    grid_view: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" width="126" height="126" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>${fontCss}
    *{box-sizing:border-box;margin:0}body{width:2500px;height:1686px;background:${COLORS.paper};font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;color:${COLORS.ink}}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,843px)}
    .cell{position:relative;padding:64px 58px;border-right:2px solid ${COLORS.line};border-bottom:2px solid ${COLORS.line};display:flex;flex-direction:column;justify-content:center;gap:25px}
    .cell:first-child{background:${COLORS.ink};color:#FFF}.number{position:absolute;top:38px;right:44px;font-size:32px;color:#A69A87;letter-spacing:5px}
    .icon{font-size:122px;color:${COLORS.gold};line-height:1.2}.title{font-size:86px;font-weight:700;letter-spacing:4px}.sub{font-size:40px;color:#8A7A5C;letter-spacing:2px}.brand{position:absolute;bottom:28px;right:38px;font-size:26px;color:#9A8662}
  </style></head><body><div class="grid">${MENUS[role].map((b, i) => `<div class="cell"><div class="number">0${i + 1}</div><div class="icon">${icon(b.icon)}</div><div class="title">${b.title}</div><div class="sub">${b.sub}</div></div>`).join('')}</div><div class="brand">${escapeHtml(title)} · ${role === 'landlord' ? '房東服務' : role === 'tenant' ? '租客服務' : '帳號綁定'}</div></body></html>`;
}

module.exports = { SITE_URL, MENUS, COLORS, contextFor, quickReplyFor, menuMessage, cardMessage, decorateMessages, billMessage, RICH_MENU_W, RICH_MENU_H, richMenuAreas, richMenuHtml };
