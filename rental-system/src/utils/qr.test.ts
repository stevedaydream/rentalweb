import { describe, it, expect } from 'vitest'
import { toQrDataUrl } from './qr'

const LINK = 'https://rental-system-7675e.web.app/activate/' + 'a'.repeat(64)

describe('toQrDataUrl', () => {
  it('回傳可直接放進 img src 的 data URL', () => {
    expect(toQrDataUrl(LINK)).toMatch(/^data:image\/gif;base64,/)
  })

  it('空字串回空字串，呼叫端才好用 v-if 隱藏', () => {
    expect(toQrDataUrl('')).toBe('')
  })

  it('內容不同就產生不同的圖', () => {
    expect(toQrDataUrl(LINK)).not.toBe(toQrDataUrl(LINK + 'b'))
  })

  it('同樣內容穩定產生同一張圖，重繪不會閃動', () => {
    expect(toQrDataUrl(LINK)).toBe(toQrDataUrl(LINK))
  })

  it('真實長度的啟用連結不會超出 QR 容量而拋錯', () => {
    expect(() => toQrDataUrl(LINK)).not.toThrow()
    expect(toQrDataUrl(LINK).length).toBeGreaterThan(100)
  })
})
