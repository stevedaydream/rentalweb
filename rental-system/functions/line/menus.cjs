const { richMenuAreas, RICH_MENU_W, RICH_MENU_H } = require('./presentation.cjs');
const ROLES = ['unbound', 'tenant', 'landlord'];

async function syncRoleMenu(client, config, userId, role) {
  const menuId = config.richMenuIds?.[role];
  if (menuId) await client.linkRichMenuIdToUser(userId, menuId);
  else if (config.richMenuIds) await client.unlinkRichMenuIdFromUser(userId);
}

async function installMenus({ client, blobClient, render, name, chatBarText, previous, save, users = [] }) {
  const ids = {};
  let activated = false;
  try {
    for (const role of ROLES) {
      const png = await render(name, role);
      const result = await client.createRichMenu({ size: { width: RICH_MENU_W, height: RICH_MENU_H }, selected: true,
        name: `${name.slice(0, 280)}-${role}`, chatBarText, areas: richMenuAreas(role) });
      ids[role] = result.richMenuId;
      await blobClient.setRichMenuImage(result.richMenuId, new Blob([png], { type: 'image/png' }));
    }
    await client.setDefaultRichMenu(ids.unbound);
    activated = true;
    await save(ids);
  } catch (error) {
    if (activated) {
      // 還原失敗時保留底圖，避免刪除目前可能仍生效的選單。
      try {
        if (previous.richMenuId) await client.setDefaultRichMenu(previous.richMenuId);
        else await client.cancelDefaultRichMenu();
      } catch { throw new Error('圖文選單儲存失敗，且無法還原預設選單；請重新建立。', { cause: error }); }
    }
    await Promise.allSettled(Object.values(ids).map(id => client.deleteRichMenu(id)));
    throw error;
  }
  let pending = 0;
  for (const user of users) {
    try { await syncRoleMenu(client, { richMenuIds: ids }, user.id, user.role); }
    catch { pending++; }
  }
  const oldIds = [...new Set([previous.richMenuId, ...Object.values(previous.richMenuIds || {})].filter(Boolean))];
  const cleanup = await Promise.allSettled(oldIds.filter(id => !Object.values(ids).includes(id)).map(id => client.deleteRichMenu(id)));
  return { ids, pending, cleanupPending: cleanup.filter(result => result.status === 'rejected').length };
}

module.exports = { syncRoleMenu, installMenus };
