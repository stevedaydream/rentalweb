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
  roomLastMeterDate: string;
  electricitySettings?: Settings; // 個別電費方案，未設定時 fallback 全域
  meterType?: 'public';           // 公共電表列（roomId = public_meters 文件 id）
  subGroupId?: string;            // 所屬子群組（4樓、5樓等）
  landlordPays?: boolean;         // 公共表：電費由房東負擔
  cycleFirstUsage?: number;       // 雙月帳期：本帳期第 1 個月的度數
  cycleFirstCost?: number;        // 雙月帳期：本帳期第 1 個月的實收金額
}

// --- 電表群組 ---
export interface SubGroup {
  id: string;
  name: string; // 4樓、5樓等
}

// meter_groups collection：最上層 = 台電計費電表
export interface MeterGroupDoc {
  id: string;
  landlordId: string;
  name: string; // 台電表名稱（如「基隆復興路總表」）
  subGroups: SubGroup[];
  createdAt?: any;
}

// public_meters collection：公共電表，綁定子群組
export interface PublicMeterDoc {
  id: string;
  landlordId: string;
  groupId: string;      // 所屬 meter_groups 文件 id
  subGroupId: string;   // 所屬子群組
  name: string;         // 如「4樓走廊」
  landlordPays: boolean; // 勾選 = 房東負擔，不分攤給租客
  lastMeterReading: number; // 建立時填起始度數，抄表後更新
  lastMeterDate: string;
  createdAt?: any;
}

export interface TierConfig {
  limit: number;
  nonSummerRate: number;
  summerRate: number;
}

// 天數比例策略：級距額度是否隨抄表天數縮放
// 'full-month' = 以「一個完整計費月」為基準，整月不縮放、半個月才按比例縮小
// 'legacy'     = 舊行為，一律 days / 30
// 'none'       = 不縮放，永遠用固定級距
export type DayScaling = 'full-month' | 'legacy' | 'none';

export interface TieredConfig {
  strategy: string;
  season: string;
  dayScaling: DayScaling;
  cycle: 'monthly' | 'bimonthly'; // 台電帳期：單月獨立 / 雙月累積
  cycleAnchor: 'odd' | 'even';    // 帳期第 1 個月為奇數月或偶數月
  minRate: number;                // 保底單價（元/度），0 = 停用
}

export interface Settings {
  mode: string;
  fixedRate: number;
  tieredConfig: TieredConfig;
  tiers: TierConfig[];
}

export const defaultTieredConfig: TieredConfig = {
  strategy: 'split',
  season: 'auto',
  dayScaling: 'full-month',
  cycle: 'monthly',
  cycleAnchor: 'odd',
  minRate: 5,
};

// 設定內容指紋：欄位順序固定，用來判斷房間的個別方案是否與全域一致
export const settingsFingerprint = (s: Settings) => JSON.stringify({
  mode: s.mode,
  fixedRate: s.fixedRate,
  tieredConfig: { ...defaultTieredConfig, ...s.tieredConfig },
  tiers: s.tiers.map(t => [t.limit, t.nonSummerRate, t.summerRate]),
});

// 舊資料的 tieredConfig 只有 strategy / season，補齊新欄位
export const normalizeSettings = (raw: Partial<Settings> | undefined, base: Settings): Settings => ({
  ...base,
  ...raw,
  tieredConfig: { ...defaultTieredConfig, ...base.tieredConfig, ...(raw?.tieredConfig ?? {}) },
  tiers: raw?.tiers ?? base.tiers,
});

export const defaultSettings: Settings = {
  mode: 'tiered',
  fixedRate: 5.0,
  tieredConfig: { ...defaultTieredConfig },
  tiers: [
    { limit: 120,   nonSummerRate: 1.68, summerRate: 1.68 },
    { limit: 330,   nonSummerRate: 2.16, summerRate: 2.45 },
    { limit: 500,   nonSummerRate: 3.03, summerRate: 3.70 },
    { limit: 700,   nonSummerRate: 4.14, summerRate: 5.04 },
    { limit: 1000,  nonSummerRate: 5.07, summerRate: 6.24 },
    { limit: 99999, nonSummerRate: 6.63, summerRate: 8.46 },
  ],
};

// 平均費率預設值（對應 Excel 新式電費計算表的平均費率）
// nonSummerRate 作為單一費率使用，summerRate 保留相同值
export const defaultAvgSettings: Settings = {
  mode: 'tiered_avg',
  fixedRate: 5.0,
  tieredConfig: { ...defaultTieredConfig, season: 'average' },
  tiers: [
    { limit: 120,   nonSummerRate: 1.68,  summerRate: 1.68  },
    { limit: 330,   nonSummerRate: 2.305, summerRate: 2.305 },
    { limit: 500,   nonSummerRate: 3.365, summerRate: 3.365 },
    { limit: 700,   nonSummerRate: 4.59,  summerRate: 4.59  },
    { limit: 1000,  nonSummerRate: 5.655, summerRate: 5.655 },
    { limit: 99999, nonSummerRate: 7.545, summerRate: 7.545 },
  ],
};
