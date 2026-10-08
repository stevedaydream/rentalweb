const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MENUS, contextFor, quickReplyFor, menuMessage, cardMessage, decorateMessages, billMessage, richMenuAreas, richMenuHtml } = require('./presentation.cjs');
const { installMenus, syncRoleMenu } = require('./menus.cjs');
const { resolveIdentity, bindingMatches } = require('./identity.cjs');

test('角色判斷只接受同房東的租客，房東本人優先', () => {
  const config = { landlordId: 'owner', ownerLineUserId: 'line-owner' };
  const users = [{ id: 'other', role: 'tenant', landlordId: 'elsewhere' }, { id: 'tenant', role: 'tenant', landlordId: 'owner' }];
  assert.equal(resolveIdentity(config, 'line-owner', users).role, 'landlord');
  assert.equal(resolveIdentity(config, 'line-tenant', users).tenantId, 'tenant');
  assert.equal(resolveIdentity(config, 'line-tenant', users.slice(0, 1)).role, 'unbound');
  assert.equal(resolveIdentity(config, 'line-tenant', [{ ...users[1], role: 'admin' }]).role, 'unbound');
});

test('綁定碼不得跨房東頻道使用', () => {
  const config = { landlordId: 'owner' };
  assert.equal(bindingMatches(config, { type: 'landlord', uid: 'owner' }), true);
  assert.equal(bindingMatches(config, { type: 'landlord', uid: 'elsewhere' }), false);
  assert.equal(bindingMatches(config, {}, { role: 'tenant', landlordId: 'owner' }), true);
  assert.equal(bindingMatches(config, {}, { role: 'tenant', landlordId: 'elsewhere' }), false);
  assert.equal(bindingMatches(config, {}, undefined), false);
});

test('三種選單點擊區域完整覆蓋底圖，按鈕不超過 LINE 字數限制', () => {
  for (const role of Object.keys(MENUS)) {
    const areas = richMenuAreas(role);
    assert.equal(areas.length, 6);
    assert.equal(areas.reduce((sum, item) => sum + item.bounds.width * item.bounds.height, 0), 2500 * 1686);
    for (const item of areas) {
      assert.ok(item.action.label.length <= 20);
      assert.ok(item.bounds.x + item.bounds.width <= 2500);
      assert.ok(item.bounds.y + item.bounds.height <= 1686);
    }
    assert.equal(menuMessage(role).contents.footer.contents.length, 6);
  }
  assert.equal(MENUS.landlord[3].action.text, '租客');
});

test('Quick Reply 保留主選單，帳單提供繳費與查電費，房東指向房東頁面', () => {
  const tenant = quickReplyFor('tenant', contextFor('帳單'));
  assert.equal(tenant.items[0].action.text, '選單');
  assert.equal(tenant.items[1].action.uri.endsWith('/tenant/bills?openExternalBrowser=1'), true);
  assert.equal(tenant.items[2].action.text, '電費');
  const owner = quickReplyFor('landlord', contextFor('欠費', 'landlord'));
  assert.equal(owner.items[1].action.uri.endsWith('/landlord/financials?openExternalBrowser=1'), true);
  assert.equal(owner.items[2].action.text, '到期');
  assert.equal(contextFor('電費').path, '/tenant/bills?tab=meter');
  for (const role of Object.keys(MENUS)) {
    const reply = quickReplyFor(role, contextFor('', role));
    assert.ok(reply.items.length <= 13);
    assert.ok(reply.items.every(item => item.action.label.length <= 20));
  }
});

test('網頁入口使用外部瀏覽器，保留頁籤、簽署碼與錨點且不重複參數', () => {
  for (const role of Object.keys(MENUS)) {
    const actions = [...richMenuAreas(role).map(item => item.action), ...menuMessage(role).contents.footer.contents.map(item => item.action), ...quickReplyFor(role, contextFor('電費', role)).items.map(item => item.action)];
    for (const action of actions.filter(item => item.type === 'uri')) {
      assert.deepEqual(new URL(action.uri).searchParams.getAll('openExternalBrowser'), ['1']);
    }
  }
  const source = 'https://rental-system-7675e.web.app/sign/demo-code?tab=meter&openExternalBrowser=0#details';
  const result = cardMessage(`合約簽署提醒\n${source}`);
  const target = new URL(result.contents.footer.contents[0].action.uri);
  assert.equal(target.pathname, '/sign/demo-code');
  assert.equal(target.searchParams.get('tab'), 'meter');
  assert.equal(target.hash, '#details');
  assert.deepEqual(target.searchParams.getAll('openExternalBrowser'), ['1']);
  assert.ok(result.contents.body.contents[0].text.includes(target.toString()));
});

test('多則訊息只由最後一則控制 Quick Reply，且不修改原始卡片', () => {
  const original = menuMessage('tenant');
  const snapshot = JSON.stringify(original);
  const result = decorateMessages([{ type: 'text', text: '電表記錄\n本期 100 度' }, original], 'tenant', contextFor('電費'));
  assert.equal(result[0].type, 'flex');
  assert.equal(result.at(-1).quickReply.items[1].action.uri.endsWith('?tab=meter&openExternalBrowser=1'), true);
  assert.equal(JSON.stringify(original), snapshot);
});

test('長公告分卡保留內容，簽署通知保留一次性連結', () => {
  const content = Array.from({ length: 30 }, (_, i) => `第 ${i} 行：${'公告內容'.repeat(30)}`);
  const result = cardMessage('社區公告\n' + content.join('\n'));
  assert.equal(result.contents.type, 'carousel');
  const restored = result.contents.contents.flatMap(item => item.body.contents.map(line => line.text)).join('\n');
  assert.equal(restored, content.join('\n'));
  const signing = cardMessage('合約簽署提醒\nhttps://rental-system-7675e.web.app/sign/demo-code');
  assert.equal(signing.contents.footer.contents[0].action.uri.endsWith('/sign/demo-code?openExternalBrowser=1'), true);
  assert.ok(signing.altText.length <= 400);
});

test('帳單顯示部分付款剩餘金額、逾期與超過五筆的提示', () => {
  const bills = Array.from({ length: 7 }, (_, i) => ({ amount: 5500, paidAmount: i ? 0 : 1000, status: i ? 'pending' : 'overdue', description: '租金', dueDate: '2026-10-12' }));
  const result = billMessage(bills, 37500, '2026-10-12', b => b.amount - b.paidAmount);
  const text = JSON.stringify(result);
  assert.ok(text.includes('4,500'));
  assert.ok(text.includes('另有 2 筆'));
  assert.ok(text.includes('已逾期'));
  assert.ok(text.includes('37,500'));
});

test('圖文選單品牌名稱跳脫 HTML', () => {
  const html = richMenuHtml('<img onerror="alert(1)">', 'landlord');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('data:font/ttf;base64,'));
  assert.ok(!html.includes('fonts.googleapis.com'));
});

test('通知金額大字呈現，超長內容維持有效卡片並提示開啟明細', () => {
  const bill = cardMessage('新帳單通知\n項目：租金\n金額：NT$5,500\n到期日：2026-10-12');
  assert.equal(bill.contents.header.contents.at(-1).text, 'NT$5,500');
  const long = cardMessage('社區公告\n' + '長公告內容'.repeat(6000));
  assert.equal(long.type, 'flex');
  assert.equal(long.contents.contents.length, 10);
  assert.ok(JSON.stringify(long).includes('請開啟線上系統查看完整明細'));
  assert.ok(Buffer.byteLength(JSON.stringify(long.contents)) < 50000);
});

function fixture(failAt) {
  const calls = [];
  let count = 0;
  const client = {
    async createRichMenu() { const id = `new-${++count}`; calls.push(['create', id]); return { richMenuId: id }; },
    async setDefaultRichMenu(id) { calls.push(['default', id]); },
    async cancelDefaultRichMenu() { calls.push(['cancel']); },
    async deleteRichMenu(id) { calls.push(['delete', id]); },
    async linkRichMenuIdToUser(id, menu) { calls.push(['link', id, menu]); if (failAt === 'link') throw Error('連結失敗'); },
    async unlinkRichMenuIdFromUser(id) { calls.push(['unlink', id]); },
  };
  return { calls, args: { client, blobClient: { async setRichMenuImage(id) { calls.push(['upload', id]); if (failAt === 'upload') throw Error('上傳失敗'); } },
    render: async () => Buffer.from('png'), name: '租賃管家', chatBarText: '開啟服務', previous: { richMenuId: 'old' },
    save: async ids => { calls.push(['save', ids]); if (failAt === 'save') throw Error('儲存失敗'); },
    users: [{ id: 'tenant', role: 'tenant' }, { id: 'owner', role: 'landlord' }],
  } };
}

test('全部底圖上傳後才啟用，保存後依角色連結並清除舊選單', async () => {
  const { args, calls } = fixture();
  const result = await installMenus(args);
  assert.equal(result.ids.unbound, 'new-1');
  assert.deepEqual(calls.filter(item => item[0] === 'link'), [['link', 'tenant', 'new-2'], ['link', 'owner', 'new-3']]);
  assert.ok(calls.findIndex(item => item[0] === 'default') > calls.findLastIndex(item => item[0] === 'upload'));
  assert.equal(calls.at(-1)[1], 'old');
});

test('底圖上傳失敗只清除新選單，保留舊預設', async () => {
  const { args, calls } = fixture('upload');
  await assert.rejects(installMenus(args), /上傳失敗/);
  assert.ok(!calls.some(item => item[0] === 'default'));
  assert.deepEqual(calls.filter(item => item[0] === 'delete'), [['delete', 'new-1']]);
});

test('保存失敗會還原舊預設，清除三份新選單', async () => {
  const { args, calls } = fixture('save');
  await assert.rejects(installMenus(args), /儲存失敗/);
  assert.deepEqual(calls.filter(item => item[0] === 'default'), [['default', 'new-1'], ['default', 'old']]);
  assert.equal(calls.filter(item => item[0] === 'delete').length, 3);
});

test('還原失敗保留已啟用的底圖並回報，不刪除生效選單', async () => {
  const { args, calls } = fixture('save');
  args.client.setDefaultRichMenu = async id => { if (id === 'old') throw Error('還原失敗'); };
  await assert.rejects(installMenus(args), /無法還原/);
  assert.ok(!calls.some(item => item[0] === 'delete'));
});

test('個別帳號切換失敗回報待重試，下次訊息可重試角色選單', async () => {
  const { args } = fixture('link');
  const result = await installMenus(args);
  assert.equal(result.pending, 2);
  const next = fixture();
  await syncRoleMenu(next.args.client, { richMenuIds: result.ids }, 'tenant', 'tenant');
  assert.deepEqual(next.calls, [['link', 'tenant', 'new-2']]);
});
