// Machine Enums
export type MachineType = 'CIRCULAR_KNITTING' | 'FLAT_KNITTING' | 'WARP_KNITTING' | 'JACQUARD';
export type MachineStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'BREAKDOWN' | 'IDLE' | 'DECOMMISSIONED';

// Labels
export const machineTypeLabels: Record<MachineType, string> = {
  CIRCULAR_KNITTING: 'Circular Knitting',
  FLAT_KNITTING: 'Flat Knitting',
  WARP_KNITTING: 'Warp Knitting',
  JACQUARD: 'Jacquard',
};

export const machineStatusLabels: Record<MachineStatus, string> = {
  OPERATIONAL: 'Operational',
  MAINTENANCE: 'Maintenance',
  BREAKDOWN: 'Breakdown',
  IDLE: 'Idle',
  DECOMMISSIONED: 'Decommissioned',
};

// Colors for status
export const machineStatusColors: Record<MachineStatus, { bg: string; text: string; dot: string }> = {
  OPERATIONAL: { bg: 'bg-success/20', text: 'text-success', dot: 'bg-success' },
  MAINTENANCE: { bg: 'bg-warning/20', text: 'text-warning', dot: 'bg-warning' },
  BREAKDOWN: { bg: 'bg-error/20', text: 'text-error', dot: 'bg-error' },
  IDLE: { bg: 'bg-neutral-500/20', text: 'text-neutral-400', dot: 'bg-neutral-400' },
  DECOMMISSIONED: { bg: 'bg-neutral-700/20', text: 'text-neutral-500', dot: 'bg-neutral-600' },
};

// Needle Config (manual configuration from machine setup)
export interface NeedleConfig {
  name: string;
  position?: string;
  quantity: number;
}

// Machine Interface
export interface Machine {
  id: number;
  machineNumber: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  machineType: MachineType;
  gauge: number | null;
  diameter: number | null;
  feeders: number | null;
  location: string | null;
  position: string | null;
  status: MachineStatus;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  installationDate: string | null;
  needleGauge: number | null;
  totalNeedleSlots: number | null;
  cylinderNeedles: number | null;
  dialNeedles: number | null;
  needleConfigs: NeedleConfig[] | null; // Manual needle entries
  createdAt: string;
  updatedAt: string;
  _count?: {
    productionLogs: number;
    needleAllocations: number;
  };
}

// Machine with relations for detail page
export interface MachineWithDetails extends Machine {
  needleAllocations?: {
    id: number;
    installedQuantity: number;
    position: string | null;
    installedAt: string;
    needleType: {
      id: number;
      code: string;
      name: string;
      gauge: number;
      material: string;
    };
    batch: {
      id: number;
      batchNumber: string;
    } | null;
  }[];
  productionLogs?: {
    id: number;
    shiftId: number;
    rollsProduced: number | null;
    totalWeight: string | null;
    createdAt: string;
  }[];
  downtimeLogs?: {
    id: number;
    reason: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
  }[];
  summary?: {
    totalNeedlesInstalled: number;
    utilizationPercent: number | null;
    activeAllocations: number;
  };
}

// Lightweight machine for dropdowns
export interface MachineLookup {
  id: number;
  machineNumber: string;
  name: string;
  machineType: MachineType;
  status: MachineStatus;
  gauge: number | null;
  diameter: number | null;
}

// Machine stats
export interface MachineStats {
  total: number;
  byStatus: {
    operational: number;
    maintenance: number;
    breakdown: number;
    idle: number;
  };
  byType: Record<MachineType, number>;
  maintenanceDue: number;
  operationalRate: number;
}

// Maintenance schedule item
export interface MaintenanceScheduleItem {
  id: number;
  machineNumber: string;
  name: string;
  machineType: MachineType;
  status: MachineStatus;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  daysUntilMaintenance: number | null;
  isOverdue: boolean;
}

// Production history
export interface ProductionHistoryItem {
  id: number;
  shiftId: number;
  rollsProduced: number | null;
  totalWeight: string | null;
  createdAt: string;
  shift?: {
    id: number;
    shiftNumber: number;
    date: string;
  };
}

// Downtime history
export interface DowntimeHistoryItem {
  id: number;
  reason: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
}

// Form Data
export interface MachineFormData {
  machineNumber: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  machineType: MachineType;
  gauge?: number;
  diameter?: number;
  feeders?: number;
  location?: string;
  position?: string;
  status?: MachineStatus;
  installationDate?: string;
  needleGauge?: number;
  totalNeedleSlots?: number;
  cylinderNeedles?: number;
  dialNeedles?: number;
}

// API Response Types
export interface MachineListResponse {
  machines: Machine[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductionHistoryResponse {
  logs: ProductionHistoryItem[];
  summary: {
    totalRolls: number;
    totalWeight: number;
    daysActive: number;
  };
}

export interface DowntimeHistoryResponse {
  logs: DowntimeHistoryItem[];
  summary: {
    totalDowntimeMinutes: number;
    totalDowntimeHours: number;
    incidents: number;
  };
}
