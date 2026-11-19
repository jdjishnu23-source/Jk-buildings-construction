import type { Timestamp } from 'firebase/firestore';

export type Language = 'en' | 'ta';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  designation: string;
  companyName: string;
  companyAddress?: string;
  companyMobile?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Worker {
  id: string;
  ownerId: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  siteProject: string;
  dailyRate: number;
  otHourlyRate: number;
  defaultAllowance: number;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkLog {
  id: string;
  ownerId: string;
  workerId: string;
  workerName: string;
  monthKey: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  siteProject?: string;
  dayUnits: number; // e.g., 1, 0.5, 1.5
  inTime: string;
  outTime: string;
  otHours: number;
  hourlyRate?: number;
  dailyAllowance?: number;
  pCash: number; // Daily petty cash / expense / advance given
  signature: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MonthlyAdjustment {
  id: string;
  ownerId: string;
  workerId: string;
  monthKey: string;
  allowances: number;
  extraAdvance: number;
  paymentDate: string;
  remarks?: string;
  monthlyMemo?: string;
  department?: string;
  project?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AttendanceLogSnapshot {
  date: string;
  name: string;
  inTime: string;
  outTime: string;
  pCash: number;
  signature: string;
  dayUnits: number;
  otHours?: number;
  notes?: string;
}

export interface SharedReport {
  shareToken: string;
  ownerId: string;
  workerId: string;
  monthKey: string;
  companyName: string;
  companyAddress?: string;
  companyMobile?: string;
  employeeName: string;
  employeeId: string;
  designation: string;
  department?: string;
  siteProject?: string;
  monthLabel: string;
  year: string;
  paymentDate?: string;
  daysWorked: number;
  dailyRate: number;
  otHours: number;
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  grossSalary: number;
  totalAdvance: number;
  netSalaryPayable: number;
  remarks?: string;
  monthlyMemo?: string;
  attendanceLogs: AttendanceLogSnapshot[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkerMonthlySummary {
  worker: Worker;
  monthKey: string;
  monthLabel: string;
  year: string;
  daysWorked: number;
  otHours: number;
  basicSalary: number; // daysWorked * dailyRate
  allowances: number;
  overtimePay: number;
  grossSalary: number; // basicSalary + allowances + overtimePay
  dailyPCashTotal: number; // sum of pCash from workLogs
  extraAdvance: number;
  totalAdvance: number; // dailyPCashTotal + extraAdvance
  netSalaryPayable: number; // grossSalary - totalAdvance
  paymentDate: string;
  remarks: string;
  monthlyMemo: string;
  department: string;
  project: string;
  logs: WorkLog[];
}
