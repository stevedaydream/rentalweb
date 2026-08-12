import { describe, it, expect } from 'vitest'
import {
  encryptSignature, decryptSignature, isValidPin, isSignatureVault, WrongPinError,
} from './signatureVault'

const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('isValidPin', () => {
  it.each(['1234', '000000', '12345678'])('%s 為合法（4~8 位數字）', (pin) => {
    expect(isValidPin(pin)).toBe(true)
  })

  it.each([
    ['太短', '123'],
    ['太長', '123456789'],
    ['含英文', '12a4'],
    ['含符號', '12-4'],
    ['空字串', ''],
    ['含空白', '12 34'],
  ])('%s 不合法', (_label, pin) => {
    expect(isValidPin(pin)).toBe(false)
  })
})

describe('加解密往返', () => {
  it('以正確 PIN 可還原原始簽名', async () => {
    const vault = await encryptSignature(SIG, '1234')
    expect(await decryptSignature(vault, '1234')).toBe(SIG)
  })

  it('密文不得包含明文片段', async () => {
    const vault = await encryptSignature(SIG, '1234')
    expect(vault.cipher).not.toContain('data:image')
    expect(vault.cipher).not.toContain(SIG.slice(30, 60))
  })

  it('每次加密使用不同的 salt 與 iv，相同輸入產生不同密文', async () => {
    const a = await encryptSignature(SIG, '1234')
    const b = await encryptSignature(SIG, '1234')
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.cipher).not.toBe(b.cipher)
    // 但兩者都能以同一組 PIN 解開
    expect(await decryptSignature(a, '1234')).toBe(SIG)
    expect(await decryptSignature(b, '1234')).toBe(SIG)
  })

  it('可處理較長的簽名圖', async () => {
    const long = 'data:image/png;base64,' + 'A'.repeat(50_000)
    const vault = await encryptSignature(long, '987654')
    expect(await decryptSignature(vault, '987654')).toBe(long)
  })
})

describe('錯誤 PIN', () => {
  it('拋出 WrongPinError 而非瀏覽器原生錯誤', async () => {
    const vault = await encryptSignature(SIG, '1234')
    await expect(decryptSignature(vault, '4321')).rejects.toBeInstanceOf(WrongPinError)
  })

  it.each(['0000', '9999', '12345'])('錯誤 PIN %s 無法取得任何明文', async (pin) => {
    const vault = await encryptSignature(SIG, '1234')
    await expect(decryptSignature(vault, pin)).rejects.toThrow()
  })

  it('竄改密文亦會失敗（AES-GCM 具完整性驗證）', async () => {
    const vault = await encryptSignature(SIG, '1234')
    const tampered = { ...vault, cipher: 'A' + vault.cipher.slice(1) }
    await expect(decryptSignature(tampered, '1234')).rejects.toThrow()
  })

  it('換掉 salt 會失敗', async () => {
    const a = await encryptSignature(SIG, '1234')
    const b = await encryptSignature(SIG, '1234')
    await expect(decryptSignature({ ...a, salt: b.salt }, '1234')).rejects.toThrow()
  })
})

describe('輸入驗證', () => {
  it('簽名為空時拒絕加密', async () => {
    await expect(encryptSignature('', '1234')).rejects.toThrow('簽名內容為空')
  })

  it('PIN 不合規時拒絕加密', async () => {
    await expect(encryptSignature(SIG, '12')).rejects.toThrow('4~8 位數字')
  })

  it('保險箱結構不完整時拒絕解密', async () => {
    await expect(decryptSignature({} as never, '1234')).rejects.toThrow('尚未設定加密簽名')
  })
})

describe('isSignatureVault：辨識 Firestore 取回的結構', () => {
  it('合法結構回傳 true', async () => {
    expect(isSignatureVault(await encryptSignature(SIG, '1234'))).toBe(true)
  })

  it.each([
    ['明文字串（舊資料）', SIG],
    ['null', null],
    ['undefined', undefined],
    ['空物件', {}],
    ['缺 cipher', { v: 1, salt: 'a', iv: 'b' }],
    ['版本不符', { v: 2, salt: 'a', iv: 'b', cipher: 'c' }],
  ])('%s 回傳 false', (_label, value) => {
    expect(isSignatureVault(value)).toBe(false)
  })
})
