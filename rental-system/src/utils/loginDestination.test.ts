import { describe, expect, it } from 'vitest';
import { loginDestination } from './loginDestination';

describe('LINE 入口登入導向', () => {
  it('保留同角色頁面與電表分頁', () => {
    expect(loginDestination('tenant', '/tenant/bills?tab=meter')).toBe('/tenant/bills?tab=meter');
    expect(loginDestination('landlord', '/landlord/contract')).toBe('/landlord/contract');
  });
  it('跨角色、外站、路徑跳脫與非字串回到角色首頁', () => {
    for (const value of ['/landlord/financials', 'https://evil.test', '//evil.test', '/tenant/../admin/dashboard', '/tenant/%2e%2e/admin/dashboard', '/tenant/\\evil', ['/tenant/bills'], undefined]) {
      expect(loginDestination('tenant', value)).toBe('/tenant/dashboard');
    }
  });
});
