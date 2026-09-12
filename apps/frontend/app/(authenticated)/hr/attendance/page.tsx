'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { attendanceApi, Attendance, Employee } from '@/lib/api/hr';
import { Clock, Check, X, Save, Calendar, Users } from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'LATE';

const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'PRESENT', label: 'Present', color: 'bg-success text-white' },
  { value: 'ABSENT', label: 'Absent', color: 'bg-error text-white' },
  { value: 'HALF_DAY', label: 'Half Day', color: 'bg-warning text-black' },
  { value: 'LEAVE', label: 'Leave', color: 'bg-info text-white' },
  { value: 'LATE', label: 'Late', color: 'bg-orange-500 text-white' },
  { value: 'HOLIDAY', label: 'Holiday', color: 'bg-purple-500 text-white' },
];

interface AttendanceEntry {
  employeeId: number;
  employee: Pick<Employee, 'id' | 'code' | 'fullName' | 'department' | 'designation'>;
  attendance: Attendance | null;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
  changed: boolean;
}

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leave: 0, late: 0, unmarked: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const { showToast } = useToast();

  useEffect(() => {
    fetchAttendance();
  }, [date]);

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const data = await attendanceApi.getDaily(date);
      setStats(data.stats);
      setEntries(data.data.map((item) => ({
        employeeId: item.employee.id,
        employee: item.employee,
        attendance: item.attendance,
        status: item.attendance?.status || 'PRESENT',
        checkIn: item.attendance?.checkIn?.split('T')[1]?.slice(0, 5) || '',
        checkOut: item.attendance?.checkOut?.split('T')[1]?.slice(0, 5) || '',
        notes: item.attendance?.notes || '',
        changed: false,
      })));
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntry = (employeeId: number, field: keyof AttendanceEntry, value: any) => {
    setEntries((prev) => prev.map((e) =>
      e.employeeId === employeeId ? { ...e, [field]: value, changed: true } : e
    ));
  };

  const markAll = (status: AttendanceStatus) => {
    setEntries((prev) => prev.map((e) => ({
      ...e,
      status,
      changed: true,
    })));
  };

  const saveAttendance = async () => {
    const changedEntries = entries.filter((e) => e.changed);
    if (changedEntries.length === 0) {
      showToast('info', 'No changes to save');
      return;
    }

    try {
      setIsSaving(true);
      const bulkData = changedEntries.map((e) => ({
        employeeId: e.employeeId,
        status: e.status,
        checkIn: e.checkIn ? `${date}T${e.checkIn}:00.000Z` : undefined,
        checkOut: e.checkOut ? `${date}T${e.checkOut}:00.000Z` : undefined,
        notes: e.notes || undefined,
      }));

      await attendanceApi.saveBulk(date, bulkData);
      showToast('success', `Saved attendance for ${changedEntries.length} employees`);
      fetchAttendance();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const departments = [...new Set(entries.map((e) => e.employee.department).filter(Boolean))];
  const filteredEntries = filterDept === 'ALL'
    ? entries
    : entries.filter((e) => e.employee.department === filterDept);

  const changedCount = entries.filter((e) => e.changed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Daily Attendance</h1>
          <p className="text-neutral-400 mt-1">Mark attendance for all employees</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
          />
          <Button onClick={saveAttendance} disabled={isSaving || changedCount === 0}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : `Save (${changedCount})`}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading attendance...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-neutral-400">Total</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
              <p className="text-2xl font-bold text-success">{stats.present}</p>
              <p className="text-sm text-neutral-400">Present</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
              <p className="text-2xl font-bold text-error">{stats.absent}</p>
              <p className="text-sm text-neutral-400">Absent</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
              <p className="text-2xl font-bold text-info">{stats.leave}</p>
              <p className="text-sm text-neutral-400">Leave</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">{stats.late}</p>
              <p className="text-sm text-neutral-400">Late</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
              <p className="text-2xl font-bold text-warning">{stats.unmarked}</p>
              <p className="text-sm text-neutral-400">Unmarked</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-neutral-400 text-sm">Quick Mark All:</span>
              {statusOptions.slice(0, 4).map((opt) => (
                <Button
                  key={opt.value}
                  variant="secondary"
                  size="sm"
                  onClick={() => markAll(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
              <div className="ml-auto">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white text-sm"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Employee</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Department</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Check In</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Check Out</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.employeeId} className={`hover:bg-factory-gray transition-colors ${entry.changed ? 'bg-primary-500/5' : ''}`}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                            <span className="text-primary-400 font-medium text-sm">
                              {entry.employee.fullName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{entry.employee.fullName}</p>
                            <p className="text-xs text-neutral-500">{entry.employee.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-neutral-400 text-sm">{entry.employee.department || '-'}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center gap-1">
                          {statusOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateEntry(entry.employeeId, 'status', opt.value)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                entry.status === opt.value
                                  ? opt.color
                                  : 'bg-factory-gray text-neutral-400 hover:bg-factory-border'
                              }`}
                              title={opt.label}
                            >
                              {opt.label.slice(0, 1)}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="time"
                          value={entry.checkIn}
                          onChange={(e) => updateEntry(entry.employeeId, 'checkIn', e.target.value)}
                          className="px-2 py-1 rounded bg-factory-gray border border-factory-border text-white text-sm w-24"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="time"
                          value={entry.checkOut}
                          onChange={(e) => updateEntry(entry.employeeId, 'checkOut', e.target.value)}
                          className="px-2 py-1 rounded bg-factory-gray border border-factory-border text-white text-sm w-24"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) => updateEntry(entry.employeeId, 'notes', e.target.value)}
                          placeholder="Notes..."
                          className="px-2 py-1 rounded bg-factory-gray border border-factory-border text-white text-sm w-full min-w-[100px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No employees found</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
