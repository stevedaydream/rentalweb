export interface MeterGroup {
  id: string;
  name: string;
  officialMetersCount: number;
  roomCount: number;
  masterLastReading?: number;
  masterCurrentReading?: number;
  masterBillAmount?: number;
}

export interface MeterEntry {
  roomId: string;
  name: string;
  tenantName: string;
  status: string;
  lastReading: number;
  lastReadingDate: string;
  currentReading?: number;
  currentReadingDate: string;
  existingReadingId: string | null;
  isLocked: boolean;
}

export interface TierConfig {
  limit: number;
  nonSummerRate: number;
  summerRate: number;
}

export interface Settings {
  mode: string;
  fixedRate: number;
  tieredConfig: {
    strategy: string;
    season: string;
  };
  tiers: TierConfig[];
}

export const defaultSettings: Settings = {
  mode: 'tiered',
  fixedRate: 5.0,
  tieredConfig: {
    strategy: 'split',
    season: 'auto',
  },
  tiers: [
    { limit: 120,   nonSummerRate: 1.63, summerRate: 1.63 },
    { limit: 330,   nonSummerRate: 2.10, summerRate: 2.38 },
    { limit: 500,   nonSummerRate: 2.89, summerRate: 3.52 },
    { limit: 700,   nonSummerRate: 3.94, summerRate: 4.80 },
    { limit: 1000,  nonSummerRate: 4.60, summerRate: 5.83 },
    { limit: 99999, nonSummerRate: 5.03, summerRate: 6.41 },
  ],
};
