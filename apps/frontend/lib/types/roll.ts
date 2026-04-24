// Roll Status enum
export type RollStatus =
  | 'GREY_STOCK'
  | 'SENT_TO_DYEING'
  | 'AT_DYEING'
  | 'RECEIVED_FROM_DYEING'
  | 'FINISHED_STOCK'
  | 'SOLD'
  | 'REJECTED';

// Stock Out destination type
export type StockOutDestinationType = 'SALE' | 'DYEING' | 'TRANSFER' | 'RETURN';

// Machine reference (embedded in roll)
export interface RollMachine {
  id: number;
  machineNumber: string;
  name: string;
  machineType?: string;
}

// Roll status history entry
export interface RollStatusHistoryEntry {
  id: number;
  fromStatus: RollStatus | null;
  toStatus: RollStatus;
  notes: string | null;
  changedAt: string;
  changedBy?: number;
}

// Fabric reference (embedded in roll)
export interface RollFabric {
  id: number;
  code: string;
  name: string;
}

// Base Roll type
export interface Roll {
  id: number;
  rollNumber: string;
  qrCode: string | null;
  machineId: number;
  fabricId: number | null;
  fabricType: string;
  greyWeight: number;
  finishedWeight?: number;
  status: RollStatus;
  grade: string;
  defectNotes: string | null;
  location: string | null;
  productionLogId: number | null;
  producedAt: string;
  createdAt: string;
  updatedAt: string;
  machine?: RollMachine;
  fabric?: RollFabric | null;
}

// Roll with status history
export interface RollWithHistory extends Roll {
  statusHistory: RollStatusHistoryEntry[];
}

// Roll with machine details
export interface RollWithDetails extends Roll {
  machine: RollMachine;
  fabric?: RollFabric | null;
  productionLog?: {
    id: number;
    shiftId: number;
    targetWeight: number;
    actualWeight: number;
    createdAt: string;
  } | null;
  statusHistory: RollStatusHistoryEntry[];
}

// Pagination meta
export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

// Roll list response
export interface RollListResponse {
  rolls: Roll[];
  pagination: PaginationMeta;
}

// Roll list query params
export interface RollListParams {
  status?: RollStatus;
  machineId?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'rollNumber' | 'greyWeight' | 'producedAt' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Create roll data
export interface CreateRollData {
  // Primary way: use fabricId (will derive machineId and fabricType from Fabric)
  fabricId?: number;
  // Legacy: direct machineId and fabricType (required if fabricId not provided)
  machineId?: number;
  fabricType?: string;
  // Required
  greyWeight: number;
  // Optional
  rollNumber?: string;
  grade?: string;
  defectNotes?: string;
  location?: string;
  productionLogId?: number;
}

// Update roll status data
export interface UpdateRollStatusData {
  status: RollStatus;
  notes?: string;
}

// Stock out data
export interface StockOutData {
  notes?: string;
  destinationType?: StockOutDestinationType;
  referenceId?: number;
}

// QR lookup response
export interface QRLookupResponse {
  data: RollWithHistory;
  isIssued: boolean;
  warning: string | null;
}

// Create roll response
export interface CreateRollResponse {
  data: Roll;
  message: string;
}

// Update status response
export interface UpdateStatusResponse {
  data: Roll;
  previousStatus: RollStatus;
  newStatus: RollStatus;
}

// Stock out response
export interface StockOutResponse {
  data: Roll;
  previousStatus: RollStatus;
  wasAlreadyIssued: boolean;
  warning: string | null;
}

// Roll history response
export interface RollHistoryResponse {
  roll: {
    id: number;
    rollNumber: string;
    qrCode: string | null;
    status: RollStatus;
  };
  history: RollStatusHistoryEntry[];
}

// Grey stock summary response
export interface GreyStockSummary {
  totalRolls: number;
  totalWeight: number;
  byMachine: Array<{
    machineId: number;
    _count: { id: number };
    _sum: { greyWeight: number | null };
  }>;
  recentRolls: Array<{
    id: number;
    rollNumber: string;
    qrCode: string | null;
    greyWeight: number;
    fabricType: string;
    producedAt: string;
    machine: {
      machineNumber: string;
      name: string;
    };
  }>;
}

// Finished stock summary response
export interface FinishedStockSummary {
  totalRolls: number;
  totalWeight: number;
  byStatus: Record<RollStatus, { count: number; weight: number }>;
  recentRolls: Array<{
    id: number;
    rollNumber: string;
    qrCode: string | null;
    greyWeight: number;
    fabricType: string;
    producedAt: string;
  }>;
}

// Roll stats overview
export interface RollStatsOverview {
  byStatus: Record<RollStatus, { count: number; weight: number }>;
  today: {
    rollsProduced: number;
    weightProduced: number;
  };
  totalWeight: number;
  greyStockCount: number;
  finishedStockCount: number;
  soldCount: number;
}

// Label data for printing
export interface RollLabelData {
  qrCode: string;
  rollNumber: string;
  weight: number;
  fabricType: string;
  date: string;
  machineNumber?: string;
}
