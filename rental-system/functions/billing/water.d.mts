export type WaterMode = 'unset' | 'landlord' | 'fixed' | 'split' | 'tenant_direct'
export type RoomWaterMode = '' | 'independent' | 'tenant_direct'
export type WaterBasis = 'room' | 'person'

export interface WaterSettings {
  mode: WaterMode
  basis: WaterBasis
  fixedAmount: number
}

export interface WaterRoom { waterMode?: RoomWaterMode | string; waterNo?: string }
export interface WaterTenant { occupants?: number }
export interface WaterParticipant { key: string; leaseStart?: string; leaseEnd?: string; occupants?: number }
export interface WaterShare { key: string; days: number; people: number; weight: number; amount: number }

export const WATER_MODES: readonly WaterMode[]
export const WATER_MODE_LABELS: Readonly<Record<WaterMode | 'independent', string>>
export function occupantsOf(tenant: WaterTenant | null | undefined): number
export function normalizeWaterSettings(raw: Partial<WaterSettings> | null | undefined, templateFeeWater?: string): WaterSettings
export function effectiveWaterMode(settings: WaterSettings, room: WaterRoom | null | undefined): WaterMode | 'independent'
export function fixedWaterCharge(settings: WaterSettings, tenant: WaterTenant, months: number): number
export function fixedWaterDescription(settings: WaterSettings, tenant: WaterTenant, cover: { from: string; to: string }): string
export function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number
export function splitWaterBill(input: {
  total: number; periodStart: string; periodEnd: string; basis: WaterBasis; participants: WaterParticipant[]
}): { shares: WaterShare[]; invalid: string[]; totalWeight: number; remainder: number }
export function independentWaterShares(input: {
  total: number; periodStart: string; periodEnd: string; participants: WaterParticipant[]
}): { shares: WaterShare[]; invalid: string[]; periodDays: number; remainder: number }
export function waterContractText(settings: WaterSettings, room: WaterRoom | null | undefined): string
