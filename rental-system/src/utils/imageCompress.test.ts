import { describe, it, expect } from 'vitest'
import {
  fitWithin, photoPath,
  THUMB_MAX_EDGE, ORIG_MAX_EDGE, THUMB_QUALITY, ORIG_QUALITY,
} from './imageCompress'

describe('fitWithin', () => {
  it('橫幅照片以寬為長邊縮放', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('直幅照片以高為長邊縮放', () => {
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('比上限小的圖不放大', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('剛好等於上限時原樣返回', () => {
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it('極端長寬比的短邊至少保留 1px，不會縮成 0', () => {
    expect(fitWithin(10000, 3, 1600).height).toBe(1)
  })

  it('尺寸為 0 或負數時回 0，交由呼叫端擋掉', () => {
    expect(fitWithin(0, 100, 1600)).toEqual({ width: 0, height: 0 })
    expect(fitWithin(-5, 100, 1600)).toEqual({ width: 0, height: 0 })
  })

  it('小數尺寸不會產生小數畫布', () => {
    const r = fitWithin(1000.7, 500.2, 400)
    expect(Number.isInteger(r.width)).toBe(true)
    expect(Number.isInteger(r.height)).toBe(true)
  })
})

describe('壓縮規格', () => {
  it('原檔上限大於縮圖，且兩者品質都在合理範圍', () => {
    expect(ORIG_MAX_EDGE).toBeGreaterThan(THUMB_MAX_EDGE)
    expect(THUMB_QUALITY).toBeGreaterThan(0.5)
    expect(ORIG_QUALITY).toBeGreaterThan(THUMB_QUALITY)
    expect(ORIG_QUALITY).toBeLessThan(1)
  })
})

describe('photoPath', () => {
  it('縮圖與原檔分開放，排程只需清 orig 目錄', () => {
    expect(photoPath('i1', 'e1', 'p1', 'thumb')).toBe('inspections/i1/thumb/e1_p1.jpg')
    expect(photoPath('i1', 'e1', 'p1', 'orig')).toBe('inspections/i1/orig/e1_p1.jpg')
  })

  it('同一項的多張照片路徑不相撞', () => {
    expect(photoPath('i1', 'e1', 'p1', 'thumb')).not.toBe(photoPath('i1', 'e1', 'p2', 'thumb'))
  })
})
