export type SigningDetailKey = 'tenantPhone' | 'tenantAddress' | 'tenantMailAddress' | 'tenantEmail' | 'emergencyContact' | 'guarantor' | 'guarantorId' | 'guarantorAddress' | 'guarantorMailAddress' | 'guarantorPhone'
export type SigningDetails = Record<SigningDetailKey, string>
export const SIGNING_DETAIL_FIELDS: readonly {
  key: SigningDetailKey
  label: string
  maxLength: number
  required?: boolean
  type: 'text' | 'tel' | 'email'
  placeholder?: string
}[]
export function pickSigningDetails(contract?: Record<string, unknown>): SigningDetails
export function normalizeSigningDetails(raw: unknown): SigningDetails
