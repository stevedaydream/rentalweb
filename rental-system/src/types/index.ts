// ===========================
// Enums
// ===========================

export const RoomStatus = {
  Occupied: 'occupied',
  Vacant: 'vacant',
  Maintenance: 'maintenance'
} as const;
export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];

export const BillStatus = {
  Pending: 'pending',
  Completed: 'completed',
  Overdue: 'overdue'
} as const;
export type BillStatus = typeof BillStatus[keyof typeof BillStatus];

export const RepairStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Resolved: 'resolved'
} as const;
export type RepairStatus = typeof RepairStatus[keyof typeof RepairStatus];

// ===========================
// Core Interfaces
// ===========================

export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  landlordId: string;
  floor?: number;
  /** 月租金（正式欄位，RoomManagement 以此建檔）。取值請用 utils/room.ts 的 roomMonthlyRent */
  price?: number;
  /** @deprecated 舊欄位，實際資料未使用；保留僅為相容 */
  rent?: number;
  deposit?: number;
  tenantId?: string;
  tenantName?: string;
  note?: string;
  subGroupId?: string;
  /** 所屬建物（properties 文件 id）。房屋稅／地價稅／火險與公益出租人皆以建物為單位 */
  propertyId?: string;
  /** 測試資料標記。衍生資料（帳單、抄表等）不帶此旗標，清除時靠關聯反查 */
  isTest?: boolean;
  createdAt?: any;
}

/** 火災保險保單。通常一棟一張（標的物為建物） */
export interface FireInsurance {
  /** 保險公司 */
  insurer?: string;
  /** 保單號碼 */
  policyNo?: string;
  /** 保單起日 YYYY-MM-DD */
  startDate?: string;
  /** 保單迄日 YYYY-MM-DD，到期提醒以此為準 */
  endDate?: string;
  /** 保費 */
  amount?: number;
}

/**
 * 公益出租人的年度核定狀態。
 *
 * 資格跟「門牌」走：只要該門牌下有任一租客領有政府租金補貼，房東即為
 * 該門牌的公益出租人；而**整個門牌每月共用一個 15,000 元免稅額**，
 * 不會因為分租多間而變成多份。
 *
 * 「自動取得資格」與「稅捐處實際核定」是兩回事（房屋稅、地價稅各自要
 * 申請核定），故逐年度逐稅目分別記錄，報稅回頭查才不會因為租客搬走
 * 就查不到當年狀態。
 */
export interface PublicWelfareYear {
  /** 核定年度（民國轉西元後的西元年） */
  year: number;
  /** 房屋稅已核定適用自住住家用稅率 */
  houseTax: boolean;
  /** 地價稅已核定適用自用住宅用地稅率 */
  landTax: boolean;
  /** 綜所稅適用每屋每月 15,000 元免稅額 */
  incomeTax: boolean;
  /** 認定函字號 */
  docNo?: string;
  validFrom?: string;
  validTo?: string;
}

/**
 * 建物（門牌）。稅、險與公益出租人的歸屬單位。
 *
 * 與 meter_groups（台電總表）是**兩個各自獨立的維度**：台電按電號寄帳單，
 * 一棟可能有兩個電號、公共電表也可能跨棟，故不互相綁定。
 */
export interface Property {
  id: string;
  landlordId: string;
  /** 建物名稱，如「基隆復興路」 */
  name: string;
  address?: string;
  /** 房屋稅籍編號，一棟一個 */
  houseTaxNo?: string;
  /** 地號。一棟可坐落多筆土地 */
  landNos?: string[];
  fireInsurance?: FireInsurance;
  publicWelfare?: PublicWelfareYear[];
  /**
   * 由哪一筆 meter_groups 種子而來。僅供遷移冪等判斷（避免重複建立），
   * 不代表兩者語意上有從屬關係。
   */
  seededFromGroupId?: string;
  /** 測試資料標記 */
  isTest?: boolean;
  createdAt?: any;
}

/** 建物年度費用的種類。皆為租賃所得的可列舉必要費用 */
export const PropertyCostType = {
  HouseTax: '房屋稅',
  LandTax: '地價稅',
  FireInsurance: '火災險',
} as const;
export type PropertyCostType = typeof PropertyCostType[keyof typeof PropertyCostType];

/** 一筆費用分攤到某一棟的金額 */
export interface CostAllocation {
  propertyId: string;
  amount: number;
}

/**
 * 建物年度費用（房屋稅／地價稅／火災險）。
 *
 * 與 `bills` 的分工：本表是主檔，記錄稅單／保單本身（所屬期間、單號、
 * 憑證、繳納期限），**無論繳沒繳都存在**；`bills` 只在標記已繳時才依
 * allocations 落帳，維持「bills 純現金流」——因為帳務頁的「本月支出」
 * 不看狀態、月內全算，未繳的稅單若先落帳會讓當月支出提前虛增。
 *
 * allocations 支援一張稅單跨多棟：地價稅是按土地所有權人在同一縣市的
 * 全部土地合併計算後開單，一張稅單可能涵蓋多棟的地。
 */
export interface PropertyCost {
  id: string;
  landlordId: string;
  type: PropertyCostType;
  /** 所屬期間起日 YYYY-MM-DD。與繳款日分開：房屋稅課稅期間是前一年 7/1～當年 6/30 */
  periodStart: string;
  periodEnd: string;
  /** 稅單／保單總額。allocations 加總必須等於此值 */
  amount: number;
  allocations: CostAllocation[];
  /** 繳納期限 */
  dueDate: string;
  /** 實際繳納日；有值才視為已繳並落帳到 bills */
  paidAt?: string;
  /** 稅單號／保單號 */
  docNo?: string;
  attachmentUrl?: string;
  /** 落帳時產生的 bills 文件 id，取消已繳或刪除時據此回收 */
  billIds?: string[];
  createdAt?: any;
}

/**
 * 租客的政府租金補貼。
 *
 * 公益出租人資格的**事實來源**：該門牌下只要有任一租客領有補貼，房東即
 * 自動取得該門牌的資格。與 `Property.publicWelfare`（稅捐處實際核定的
 * 年度）分開存——取得資格與被核定是兩道手續，兩者不一致時要能看出落差。
 */
export interface RentSubsidy {
  hasSubsidy: boolean;
  /** 補貼期間起日 YYYY-MM-DD */
  from?: string;
  /** 補貼期間迄日；到期即可能失去公益出租人資格 */
  to?: string;
  /** 核定函字號 */
  docNo?: string;
}

export interface Tenant {
  id: string;
  uid?: string;
  rentSubsidy?: RentSubsidy;
  /** 測試資料標記 */
  isTest?: boolean;
  name: string;
  email?: string;
  phone?: string;
  landlordId: string;
  roomId?: string;
  roomName?: string;
  boundLandlordCode?: string;
  tenantId?: string;
  status?: 'active' | 'inactive';
  moveInDate?: any;
  createdAt?: any;
}

export interface Bill {
  id: string;
  tenantId: string;
  tenantName?: string;
  landlordId: string;
  roomId?: string;
  roomName?: string;
  amount: number;
  status: BillStatus;
  month?: string;
  dueDate?: any;
  paidAt?: any;
  createdAt?: any;
  description?: string;
  electricityFee?: number;
  waterFee?: number;
  managementFee?: number;
}

export interface RepairRequest {
  id: string;
  tenantId?: string;
  tenantName?: string;
  landlordId: string;
  roomId?: string;
  room?: string;
  tenant?: string;
  type: string;
  description: string;
  status: RepairStatus;
  priority?: 'low' | 'medium' | 'high';
  imageUrl?: string;
  note?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MeterReading {
  id: string;
  landlordId: string;
  roomId: string;
  roomName: string;
  reading: number;
  previousReading?: number;
  usage?: number;
  readingDate: any;
  createdAt?: any;
}

export interface Announcement {
  id: string;
  landlordId: string;
  title: string;
  content: string;
  pinned?: boolean;
  createdAt?: any;
}
