import { describe, it, expect } from 'vitest'
import { tenantCategoryLabel } from './billLabels'

describe('tenantCategoryLabel', () => {
  it('把房東的記帳用語換成租客看得懂的說法', () => {
    expect(tenantCategoryLabel('租金收入')).toBe('房租')
    expect(tenantCategoryLabel('其他收入')).toBe('其他費用')
    expect(tenantCategoryLabel('台電帳單')).toBe('電費')
  })

  it('雙方通用的分類原樣保留', () => {
    expect(tenantCategoryLabel('電費')).toBe('電費')
    expect(tenantCategoryLabel('公共電費')).toBe('公共電費')
    expect(tenantCategoryLabel('押金')).toBe('押金')
  })

  it('未知分類直接顯示，不會變成空白', () => {
    expect(tenantCategoryLabel('停車位')).toBe('停車位')
  })

  it('空值回空字串，不會印出 undefined', () => {
    expect(tenantCategoryLabel()).toBe('')
    expect(tenantCategoryLabel('')).toBe('')
    expect(tenantCategoryLabel('   ')).toBe('')
  })

  it('前後空白不影響對照', () => {
    expect(tenantCategoryLabel(' 租金收入 ')).toBe('房租')
  })
})
