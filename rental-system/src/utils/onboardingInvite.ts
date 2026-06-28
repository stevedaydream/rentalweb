// 租客上線邀請：房東建立邀請（authed 寫 onboarding_invites），
// 租客公開填表透過 Cloud Function（admin）讀寫，不直接碰 Firestore。
import { db } from '../firebase/config'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import axios from 'axios'

const apiBase = import.meta.env.VITE_API_BASE
export const INVITE_TTL_DAYS = 7

export interface InviteSubmission {
  name: string
  phone: string
  idNumber?: string
  email?: string
  emergencyContact?: string
}

// 房東端：建立邀請並回傳公開連結
export const createOnboardingInvite = async (opts: {
  landlordId: string
  landlordCode: string
  landlordName: string
}): Promise<{ code: string; url: string; expireAt: number }> => {
  const code = crypto.randomUUID().replace(/-/g, '') // 32 hex，足夠不可猜
  const expireAt = Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  await setDoc(doc(db, 'onboarding_invites', code), {
    landlordId: opts.landlordId,
    landlordCode: opts.landlordCode || '',
    landlordName: opts.landlordName || '房東',
    status: 'pending',
    submission: null,
    expireAt,
    createdAt: serverTimestamp(),
  })
  return { code, url: `${window.location.origin}/onboard/${code}`, expireAt }
}

// 公開端：呼叫 Cloud Function（info 取得資訊 / submit 送出填表）
export const onboardingInviteCall = async (
  code: string,
  action: 'info' | 'submit',
  submission?: InviteSubmission,
): Promise<any> => {
  const res = await axios.post(`${apiBase}/onboardingInvite`, { code, action, submission })
  return res.data
}
