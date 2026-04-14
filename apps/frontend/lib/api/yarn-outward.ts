import { api } from './client';
import { YarnOutward, YarnOutwardFormData, YarnOutwardCompleteData, YarnOutwardStatus } from '@/lib/types/yarn';

interface ApiYarnOutward {
  id: number;
  outwardNumber: string;
  yarnTypeId: number;
  boxId: number | null;
  quantityIssued: string;
  machineId: number;
  issuedAt: string;
  issuedBy: number | null;
  collectedBy: string;
  status: YarnOutwardStatus;
  quantityReturned: string;
  quantityUsed: string;
  shiftId: number | null;
  purpose: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  yarnType?: {
    id: number;
    code: string;
    name: string;
    brandName: string;
    color: string;
  };
  machine?: {
    id: number;
    machineNumber: number;
    name: string;
  };
  box?: {
    id: number;
    boxNumber: string;
  };
  shift?: {
    id: number;
    name: string;
    code: string;
  };
}

function transformOutward(data: ApiYarnOutward): YarnOutward {
  return {
    id: data.id,
    outwardNumber: data.outwardNumber,
    yarnTypeId: data.yarnTypeId,
    boxId: data.boxId,
    quantityIssued: Number(data.quantityIssued),
    machineId: data.machineId,
    issuedAt: data.issuedAt,
    issuedBy: data.issuedBy,
    collectedBy: data.collectedBy,
    status: data.status,
    quantityReturned: Number(data.quantityReturned),
    quantityUsed: Number(data.quantityUsed),
    shiftId: data.shiftId,
    purpose: data.purpose as YarnOutward['purpose'],
    notes: data.notes,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    yarnType: data.yarnType,
    machine: data.machine,
    box: data.box,
    shift: data.shift,
  };
}

interface OutwardListResponse {
  data: YarnOutward[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const yarnOutwardApi = {
  async getAll(params?: {
    yarnTypeId?: number;
    machineId?: number;
    status?: YarnOutwardStatus;
    page?: number;
    limit?: number;
  }): Promise<OutwardListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.yarnTypeId) queryParams.append('yarnTypeId', String(params.yarnTypeId));
    if (params?.machineId) queryParams.append('machineId', String(params.machineId));
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const url = `/yarn/outwards${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await api.get<{ data: ApiYarnOutward[]; pagination: OutwardListResponse['pagination'] }>(url);

    return {
      data: response.data.data.map(transformOutward),
      pagination: response.data.pagination,
    };
  },

  async getById(id: number): Promise<YarnOutward> {
    const response = await api.get<{ data: ApiYarnOutward }>(`/yarn/outwards/${id}`);
    return transformOutward(response.data.data);
  },

  async getByMachine(machineId: number): Promise<YarnOutward[]> {
    const response = await api.get<{ data: ApiYarnOutward[] }>(`/yarn/outwards/by-machine/${machineId}`);
    return response.data.data.map(transformOutward);
  },

  async create(data: YarnOutwardFormData): Promise<YarnOutward> {
    const response = await api.post<{ message: string; data: { outward: ApiYarnOutward } }>(
      '/yarn/outwards',
      data
    );
    return transformOutward(response.data.data.outward);
  },

  async start(id: number): Promise<YarnOutward> {
    const response = await api.post<{ message: string; data: ApiYarnOutward }>(
      `/yarn/outwards/${id}/start`
    );
    return transformOutward(response.data.data);
  },

  async complete(id: number, data: YarnOutwardCompleteData): Promise<YarnOutward> {
    const response = await api.post<{ message: string; data: ApiYarnOutward }>(
      `/yarn/outwards/${id}/complete`,
      data
    );
    return transformOutward(response.data.data);
  },
};
