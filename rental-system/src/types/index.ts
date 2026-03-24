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
  rent?: number;
  deposit?: number;
  tenantId?: string;
  tenantName?: string;
  note?: string;
  createdAt?: any;
}

export interface Tenant {
  id: string;
  uid?: string;
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
