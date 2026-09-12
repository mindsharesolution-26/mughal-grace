import { api } from './client';

// ============ TYPES ============

export interface Designation {
  id: number;
  code: string;
  name: string;
  nameUrdu?: string;
  department?: string;
  baseSalary?: number;
  level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: number;
  code: string;
  fullName: string;
  fullNameUrdu?: string;
  fatherName?: string;
  cnic?: string;
  phone?: string;
  emergencyPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  designationId?: number;
  designation?: Designation;
  department?: string;
  joiningDate: string;
  probationEndDate?: string;
  confirmationDate?: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY' | 'PIECE_RATE';
  baseSalary: number;
  hourlyRate?: number;
  dailyRate?: number;
  overtimeRate?: number;
  bankName?: string;
  bankAccountNo?: string;
  bankBranch?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'RESIGNED' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: number;
  employeeId: number;
  employee?: Employee;
  date: string;
  checkIn?: string;
  checkOut?: string;
  breakMinutes: number;
  hoursWorked?: number;
  overtimeHours?: number;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'LATE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  nameUrdu?: string;
  description?: string;
  annualAllowance: number;
  isPaid: boolean;
  isActive: boolean;
}

export interface Leave {
  id: number;
  employeeId: number;
  employee?: Employee;
  leaveTypeId: number;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedById?: number;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Salary {
  id: number;
  employeeId: number;
  employee?: Employee;
  month: number;
  year: number;
  baseSalary: number;
  overtimeAmount: number;
  allowances: number;
  bonus: number;
  grossSalary: number;
  advances: number;
  loans: number;
  tax: number;
  eobi: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID';
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ DESIGNATIONS API ============

export const designationsApi = {
  async getAll(): Promise<Designation[]> {
    const response = await api.get<{ data: Designation[] }>('/designations');
    return response.data.data;
  },

  async getLookup(): Promise<Pick<Designation, 'id' | 'code' | 'name' | 'department'>[]> {
    const response = await api.get<{ data: Pick<Designation, 'id' | 'code' | 'name' | 'department'>[] }>('/designations/lookup');
    return response.data.data;
  },

  async getById(id: number): Promise<Designation> {
    const response = await api.get<{ data: Designation }>(`/designations/${id}`);
    return response.data.data;
  },

  async create(data: Partial<Designation>): Promise<Designation> {
    const response = await api.post<{ message: string; data: Designation }>('/designations', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Designation>): Promise<Designation> {
    const response = await api.put<{ message: string; data: Designation }>(`/designations/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/designations/${id}`);
  },
};

// ============ EMPLOYEES API ============

export const employeesApi = {
  async getAll(params?: { search?: string; status?: string; department?: string; isActive?: boolean }): Promise<Employee[]> {
    const response = await api.get<{ data: Employee[] }>('/employees', { params });
    return response.data.data;
  },

  async getLookup(): Promise<Pick<Employee, 'id' | 'code' | 'fullName' | 'department' | 'designation'>[]> {
    const response = await api.get<{ data: Pick<Employee, 'id' | 'code' | 'fullName' | 'department' | 'designation'>[] }>('/employees/lookup');
    return response.data.data;
  },

  async getStats(): Promise<{ total: number; active: number; onLeave: number; probation: number; resigned: number }> {
    const response = await api.get<{ total: number; active: number; onLeave: number; probation: number; resigned: number }>('/employees/stats');
    return response.data;
  },

  async getById(id: number): Promise<Employee & { attendances?: Attendance[]; leaves?: Leave[]; salaries?: Salary[] }> {
    const response = await api.get<{ data: Employee & { attendances?: Attendance[]; leaves?: Leave[]; salaries?: Salary[] } }>(`/employees/${id}`);
    return response.data.data;
  },

  async create(data: Partial<Employee>): Promise<Employee> {
    const response = await api.post<{ message: string; data: Employee }>('/employees', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<Employee>): Promise<Employee> {
    const response = await api.put<{ message: string; data: Employee }>(`/employees/${id}`, data);
    return response.data.data;
  },

  async updateStatus(id: number, status: string, resignationDate?: string, lastWorkingDate?: string): Promise<Employee> {
    const response = await api.put<{ message: string; data: Employee }>(`/employees/${id}/status`, {
      status,
      resignationDate,
      lastWorkingDate,
    });
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/employees/${id}`);
  },
};

// ============ ATTENDANCE API ============

export const attendanceApi = {
  async getAll(params?: { date?: string; fromDate?: string; toDate?: string; employeeId?: number; status?: string }): Promise<Attendance[]> {
    const response = await api.get<{ data: Attendance[] }>('/attendance', { params });
    return response.data.data;
  },

  async getDaily(date?: string): Promise<{
    date: string;
    stats: { total: number; present: number; absent: number; leave: number; late: number; unmarked: number };
    data: { employee: Pick<Employee, 'id' | 'code' | 'fullName' | 'department' | 'designation'>; attendance: Attendance | null }[];
  }> {
    const response = await api.get<{
      date: string;
      stats: { total: number; present: number; absent: number; leave: number; late: number; unmarked: number };
      data: { employee: Pick<Employee, 'id' | 'code' | 'fullName' | 'department' | 'designation'>; attendance: Attendance | null }[];
    }>('/attendance/daily', { params: { date } });
    return response.data;
  },

  async getReport(params?: { month?: number; year?: number; employeeId?: number }): Promise<{
    month: number;
    year: number;
    workingDays: number;
    data: {
      employee: Pick<Employee, 'id' | 'code' | 'fullName' | 'department'>;
      present: number;
      absent: number;
      halfDay: number;
      leave: number;
      late: number;
      totalHours: number;
      overtimeHours: number;
    }[];
  }> {
    const response = await api.get('/attendance/report', { params });
    return response.data;
  },

  async checkIn(employeeId: number, checkIn?: string, notes?: string): Promise<Attendance> {
    const response = await api.post<{ message: string; data: Attendance }>('/attendance/check-in', {
      employeeId,
      checkIn,
      notes,
    });
    return response.data.data;
  },

  async checkOut(employeeId: number, checkOut?: string, breakMinutes?: number, notes?: string): Promise<Attendance> {
    const response = await api.post<{ message: string; data: Attendance }>('/attendance/check-out', {
      employeeId,
      checkOut,
      breakMinutes,
      notes,
    });
    return response.data.data;
  },

  async saveBulk(date: string, entries: { employeeId: number; status: string; checkIn?: string; checkOut?: string; hoursWorked?: number; overtimeHours?: number; notes?: string }[]): Promise<{ employeeId: number; success: boolean }[]> {
    const response = await api.post<{ message: string; results: { employeeId: number; success: boolean }[] }>('/attendance/bulk', {
      date,
      entries,
    });
    return response.data.results;
  },

  async update(id: number, data: Partial<Attendance>): Promise<Attendance> {
    const response = await api.put<{ message: string; data: Attendance }>(`/attendance/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/attendance/${id}`);
  },
};

// ============ LEAVES API ============

export const leavesApi = {
  async getTypes(): Promise<LeaveType[]> {
    const response = await api.get<{ data: LeaveType[] }>('/leaves/types');
    return response.data.data;
  },

  async createType(data: Partial<LeaveType>): Promise<LeaveType> {
    const response = await api.post<{ message: string; data: LeaveType }>('/leaves/types', data);
    return response.data.data;
  },

  async updateType(id: number, data: Partial<LeaveType>): Promise<LeaveType> {
    const response = await api.put<{ message: string; data: LeaveType }>(`/leaves/types/${id}`, data);
    return response.data.data;
  },

  async deleteType(id: number): Promise<void> {
    await api.delete(`/leaves/types/${id}`);
  },

  async getAll(params?: { employeeId?: number; status?: string; fromDate?: string; toDate?: string }): Promise<Leave[]> {
    const response = await api.get<{ data: Leave[] }>('/leaves', { params });
    return response.data.data;
  },

  async getPending(): Promise<Leave[]> {
    const response = await api.get<{ data: Leave[] }>('/leaves/pending');
    return response.data.data;
  },

  async getBalance(employeeId: number): Promise<{ leaveType: LeaveType; allowed: number; used: number; remaining: number }[]> {
    const response = await api.get<{ data: { leaveType: LeaveType; allowed: number; used: number; remaining: number }[] }>(`/leaves/balance/${employeeId}`);
    return response.data.data;
  },

  async getById(id: number): Promise<Leave> {
    const response = await api.get<{ data: Leave }>(`/leaves/${id}`);
    return response.data.data;
  },

  async create(data: { employeeId: number; leaveTypeId: number; startDate: string; endDate: string; reason?: string }): Promise<Leave> {
    const response = await api.post<{ message: string; data: Leave }>('/leaves', data);
    return response.data.data;
  },

  async approve(id: number): Promise<Leave> {
    const response = await api.put<{ message: string; data: Leave }>(`/leaves/${id}/approve`);
    return response.data.data;
  },

  async reject(id: number, reason?: string): Promise<Leave> {
    const response = await api.put<{ message: string; data: Leave }>(`/leaves/${id}/reject`, { reason });
    return response.data.data;
  },

  async cancel(id: number): Promise<Leave> {
    const response = await api.put<{ message: string; data: Leave }>(`/leaves/${id}/cancel`);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/leaves/${id}`);
  },
};

// ============ SALARIES API ============

export const salariesApi = {
  async getAll(params?: { month?: number; year?: number; employeeId?: number; status?: string }): Promise<Salary[]> {
    const response = await api.get<{ data: Salary[] }>('/salaries', { params });
    return response.data.data;
  },

  async getStats(): Promise<{ pending: number; approved: number; paid: number; totalPending: number; totalPaid: number }> {
    const response = await api.get('/salaries/stats');
    return response.data;
  },

  async getById(id: number): Promise<Salary> {
    const response = await api.get<{ data: Salary }>(`/salaries/${id}`);
    return response.data.data;
  },

  async generate(month: number, year: number, employeeIds?: number[]): Promise<{ generated: number; skipped: number; salaries: Salary[] }> {
    const response = await api.post<{ message: string; generated: number; skipped: number; salaries: Salary[] }>('/salaries/generate', {
      month,
      year,
      employeeIds,
    });
    return { generated: response.data.generated, skipped: response.data.skipped, salaries: response.data.salaries };
  },

  async update(id: number, data: Partial<Salary>): Promise<Salary> {
    const response = await api.put<{ message: string; data: Salary }>(`/salaries/${id}`, data);
    return response.data.data;
  },

  async submit(id: number): Promise<Salary> {
    const response = await api.put<{ message: string; data: Salary }>(`/salaries/${id}/submit`);
    return response.data.data;
  },

  async approve(id: number): Promise<Salary> {
    const response = await api.put<{ message: string; data: Salary }>(`/salaries/${id}/approve`);
    return response.data.data;
  },

  async pay(id: number, paymentMethod: string): Promise<Salary> {
    const response = await api.post<{ message: string; data: Salary }>(`/salaries/${id}/pay`, { paymentMethod });
    return response.data.data;
  },

  async bulkApprove(ids: number[]): Promise<{ approved: number }> {
    const response = await api.post<{ message: string; approved: number }>('/salaries/bulk-approve', { ids });
    return { approved: response.data.approved };
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/salaries/${id}`);
  },
};
