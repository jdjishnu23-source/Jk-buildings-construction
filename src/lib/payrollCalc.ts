import { toPng } from 'html-to-image';
import type {
  MonthlyAdjustment,
  UserProfile,
  WorkLog,
  Worker,
  WorkerMonthlySummary,
} from '../types/payroll';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthParts(monthKey: string): { monthLabel: string; year: string } {
  const [y, m] = monthKey.split('-');
  const idx = Math.max(0, Math.min(11, Number(m) - 1));
  return {
    monthLabel: MONTH_NAMES[idx] ?? 'January',
    year: y || String(new Date().getFullYear()),
  };
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatLKR(amount: number): string {
  const rounded = Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

export function formatDays(days: number): string {
  const rounded = Math.round((Number.isFinite(days) ? days : 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function calculateWorkerMonthlyPayroll(
  worker: Worker,
  monthKey: string,
  allLogs: WorkLog[],
  adjustment?: MonthlyAdjustment
): WorkerMonthlySummary {
  const logs = allLogs
    .filter((l) => l.workerId === worker.id && l.monthKey === monthKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysWorked = logs.reduce((acc, l) => acc + (Number(l.dayUnits) || 0), 0);
  const otHours = logs.reduce((acc, l) => acc + (Number(l.otHours) || 0), 0);
  const dailyPCashTotal = logs.reduce((acc, l) => acc + (Number(l.pCash) || 0), 0);

  const basicSalary = daysWorked * (Number(worker.dailyRate) || 0);
  const allowances = adjustment ? Number(adjustment.allowances) || 0 : Number(worker.defaultAllowance) || 0;
  const overtimePay = logs.reduce(
    (acc, l) =>
      acc +
      (Number(l.otHours) || 0) *
        (l.hourlyRate !== undefined ? Number(l.hourlyRate) || 0 : Number(worker.otHourlyRate) || 0),
    0
  );
  const grossSalary = basicSalary + allowances + overtimePay;

  const extraAdvance = adjustment ? Number(adjustment.extraAdvance) || 0 : 0;
  const totalAdvance = dailyPCashTotal + extraAdvance;
  const netSalaryPayable = grossSalary - totalAdvance;

  const { monthLabel, year } = getMonthParts(monthKey);
  const lastDay = new Date(Number(year), Number(monthKey.split('-')[1]), 0).getDate();
  const defaultPaymentDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

  return {
    worker,
    monthKey,
    monthLabel,
    year,
    daysWorked,
    otHours,
    basicSalary,
    allowances,
    overtimePay,
    grossSalary,
    dailyPCashTotal,
    extraAdvance,
    totalAdvance,
    netSalaryPayable,
    paymentDate: adjustment?.paymentDate || defaultPaymentDate,
    remarks: adjustment?.remarks || '',
    monthlyMemo: adjustment?.monthlyMemo || '',
    department: adjustment?.department || worker.department,
    project: adjustment?.project || worker.siteProject,
    logs,
  };
}

export function generateSecureShareToken(workerId: string, monthKey: string): string {
  const cleanWorker = workerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'wrk';
  const cleanMonth = monthKey.replace(/[^0-9]/g, '');
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `jk_${cleanWorker}_${cleanMonth}_${hex}`;
}

export async function downloadElementAsPng(element: HTMLElement | null, filename: string): Promise<void> {
  if (!element) return;
  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio: 2.5,
    backgroundColor: '#ffffff',
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerCsvDownload(rows: Array<Array<string | number>>, filename: string): void {
  const csvBody = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPayrollCsv(
  summaries: WorkerMonthlySummary[],
  monthKey: string,
  filename?: string
): void {
  const header = [
    'No.',
    'Employee ID',
    'Employee Name',
    'Designation',
    'Department',
    'Site / Project',
    'Pay Month',
    'Payment Date',
    'Working Days',
    'Daily Rate (LKR)',
    'Basic Salary (LKR)',
    'Allowances (LKR)',
    'OT Hours',
    'Overtime Pay (LKR)',
    'Gross Salary (LKR)',
    'Daily P.Cash (LKR)',
    'Extra Advance (LKR)',
    'Total Deductions / Advance (LKR)',
    'Net Salary Payable (LKR)',
    'Remarks',
    'Monthly Memo',
  ];

  const dataRows = summaries.map((s, idx) => [
    idx + 1,
    s.worker.employeeId,
    s.worker.name,
    s.worker.designation,
    s.department,
    s.project,
    `${s.monthLabel} ${s.year}`,
    s.paymentDate,
    Number(s.daysWorked.toFixed(2)),
    Number(s.worker.dailyRate.toFixed(2)),
    Number(s.basicSalary.toFixed(2)),
    Number(s.allowances.toFixed(2)),
    Number(s.otHours.toFixed(2)),
    Number(s.overtimePay.toFixed(2)),
    Number(s.grossSalary.toFixed(2)),
    Number(s.dailyPCashTotal.toFixed(2)),
    Number(s.extraAdvance.toFixed(2)),
    Number(s.totalAdvance.toFixed(2)),
    Number(s.netSalaryPayable.toFixed(2)),
    s.remarks || '',
    s.monthlyMemo || '',
  ]);

  const rows: Array<Array<string | number>> = [header, ...dataRows];

  if (summaries.length > 1) {
    const sum = (fn: (s: WorkerMonthlySummary) => number) =>
      Number(summaries.reduce((acc, item) => acc + fn(item), 0).toFixed(2));
    rows.push([
      '',
      '',
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      sum((s) => s.daysWorked),
      '',
      sum((s) => s.basicSalary),
      sum((s) => s.allowances),
      sum((s) => s.otHours),
      sum((s) => s.overtimePay),
      sum((s) => s.grossSalary),
      sum((s) => s.dailyPCashTotal),
      sum((s) => s.extraAdvance),
      sum((s) => s.totalAdvance),
      sum((s) => s.netSalaryPayable),
      '',
      '',
    ]);
  }

  triggerCsvDownload(rows, filename || `JK_Payroll_${monthKey}.csv`);
}

export function downloadAttendanceCsv(
  logs: WorkLog[],
  monthKey: string,
  filename?: string
): void {
  const header = [
    'Date',
    'Worker Name',
    'Site / Project',
    'In Time',
    'Out Time',
    'Work Day Units',
    'OT Hours',
    'P.Cash / Expense (LKR)',
    'Signature',
    'Notes',
  ];

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const dataRows = sorted.map((l) => [
    l.date,
    l.workerName,
    l.siteProject || '',
    l.inTime,
    l.outTime,
    Number((l.dayUnits || 0).toFixed(2)),
    Number((l.otHours || 0).toFixed(2)),
    Number((l.pCash || 0).toFixed(2)),
    l.signature,
    l.notes || '',
  ]);

  const totalDays = Number(sorted.reduce((acc, l) => acc + (Number(l.dayUnits) || 0), 0).toFixed(2));
  const totalOt = Number(sorted.reduce((acc, l) => acc + (Number(l.otHours) || 0), 0).toFixed(2));
  const totalPCash = Number(sorted.reduce((acc, l) => acc + (Number(l.pCash) || 0), 0).toFixed(2));

  const rows: Array<Array<string | number>> = [
    header,
    ...dataRows,
    ['TOTAL', `${sorted.length} entries`, '', '', '', totalDays, totalOt, totalPCash, '', ''],
  ];

  triggerCsvDownload(rows, filename || `JK_Attendance_PCash_${monthKey}.csv`);
}

export function downloadMasterMonthlyReportCsv(params: {
  companyName: string;
  companyAddress?: string;
  companyMobile?: string;
  monthKey: string;
  projectLabel: string;
  summaries: WorkerMonthlySummary[];
  logs: WorkLog[];
  workers: Worker[];
}): void {
  const {
    companyName,
    companyAddress = '',
    companyMobile = '',
    monthKey,
    projectLabel,
    summaries,
    logs,
    workers,
  } = params;

  const { monthLabel, year } = getMonthParts(monthKey);
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  const sumSummary = (fn: (s: WorkerMonthlySummary) => number) =>
    Number(summaries.reduce((acc, item) => acc + fn(item), 0).toFixed(2));

  const rows: Array<Array<string | number>> = [
    ['MASTER MONTHLY PAYROLL, ATTENDANCE & PETTY CASH REPORT'],
    ['Company Name', companyName],
    ['Address', companyAddress],
    ['Phone', companyMobile],
    ['Pay Period', `${monthLabel} ${year} (${monthKey})`],
    ['Site / Project Scope', projectLabel],
    ['Generated Date', getTodayDateStr()],
    [],
    ['EXECUTIVE SUMMARY'],
    ['Active Workers in Report', summaries.length],
    ['Total Days Worked', sumSummary((s) => s.daysWorked)],
    ['Total Gross Salary (LKR)', sumSummary((s) => s.grossSalary)],
    ['Total P.Cash & Extra Advances (LKR)', sumSummary((s) => s.totalAdvance)],
    ['Total Net Salary Payable (LKR)', sumSummary((s) => s.netSalaryPayable)],
    [],
    ['SECTION 1: MONTHLY PAY SHEET SUMMARY'],
    [
      'No.',
      'Employee ID',
      'Employee Name',
      'Designation',
      'Department',
      'Site / Project',
      'Working Days',
      'Daily Rate (LKR)',
      'Basic Salary (LKR)',
      'Allowances (LKR)',
      'OT Hours',
      'Overtime Pay (LKR)',
      'Gross Salary (LKR)',
      'Daily P.Cash (LKR)',
      'Extra Advance (LKR)',
      'Total Deductions (LKR)',
      'Net Salary Payable (LKR)',
      'Payment Date',
      'Remarks',
      'Monthly Memo',
    ],
    ...summaries.map((s, idx) => [
      idx + 1,
      s.worker.employeeId,
      s.worker.name,
      s.worker.designation,
      s.department,
      s.project,
      Number(s.daysWorked.toFixed(2)),
      Number(s.worker.dailyRate.toFixed(2)),
      Number(s.basicSalary.toFixed(2)),
      Number(s.allowances.toFixed(2)),
      Number(s.otHours.toFixed(2)),
      Number(s.overtimePay.toFixed(2)),
      Number(s.grossSalary.toFixed(2)),
      Number(s.dailyPCashTotal.toFixed(2)),
      Number(s.extraAdvance.toFixed(2)),
      Number(s.totalAdvance.toFixed(2)),
      Number(s.netSalaryPayable.toFixed(2)),
      s.paymentDate,
      s.remarks || '',
      s.monthlyMemo || '',
    ]),
    [
      '',
      '',
      'PAY SHEET TOTAL',
      '',
      '',
      '',
      sumSummary((s) => s.daysWorked),
      '',
      sumSummary((s) => s.basicSalary),
      sumSummary((s) => s.allowances),
      sumSummary((s) => s.otHours),
      sumSummary((s) => s.overtimePay),
      sumSummary((s) => s.grossSalary),
      sumSummary((s) => s.dailyPCashTotal),
      sumSummary((s) => s.extraAdvance),
      sumSummary((s) => s.totalAdvance),
      sumSummary((s) => s.netSalaryPayable),
      '',
      '',
      '',
    ],
    [],
    ['SECTION 2: PETTY CASH (P.CASH) SUMMARY BY SITE / PROJECT'],
    ['Site / Project', 'Expense Entries', 'Total P.Cash (LKR)', 'Share (%)'],
  ];

  const totalLogPCash = sortedLogs.reduce((acc, l) => acc + (Number(l.pCash) || 0), 0);
  const projectMap = new Map<string, { count: number; total: number }>();
  sortedLogs.forEach((l) => {
    const amt = Number(l.pCash) || 0;
    if (amt <= 0) return;
    const w = workers.find((x) => x.id === l.workerId);
    const proj = (l.siteProject || w?.siteProject || 'General Site').trim() || 'General Site';
    const cur = projectMap.get(proj) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += amt;
    projectMap.set(proj, cur);
  });

  const sortedProjects = Array.from(projectMap.entries()).sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0])
  );
  sortedProjects.forEach(([proj, info]) => {
    const share = totalLogPCash > 0 ? Number(((info.total / totalLogPCash) * 100).toFixed(1)) : 0;
    rows.push([proj, info.count, Number(info.total.toFixed(2)), `${share}%`]);
  });
  rows.push([
    'PETTY CASH TOTAL',
    sortedProjects.reduce((acc, [, info]) => acc + info.count, 0),
    Number(totalLogPCash.toFixed(2)),
    totalLogPCash > 0 ? '100%' : '0%',
  ]);

  rows.push([]);
  rows.push(['SECTION 3: DAILY ATTENDANCE & PETTY CASH LOGS']);
  rows.push([
    'Date',
    'Worker Name',
    'Site / Project',
    'In Time',
    'Out Time',
    'Work Day Units',
    'OT Hours',
    'OT Rate (LKR)',
    'OT Amount (LKR)',
    'P.Cash / Expense (LKR)',
    'Signature',
    'Notes',
  ]);

  let totalLogDays = 0;
  let totalLogOtHours = 0;
  let totalLogOtAmount = 0;

  sortedLogs.forEach((l) => {
    const w = workers.find((x) => x.id === l.workerId);
    const rate =
      l.hourlyRate !== undefined ? Number(l.hourlyRate) || 0 : Number(w?.otHourlyRate ?? 0);
    const otHrs = Number(l.otHours) || 0;
    const otAmt = otHrs * rate;
    const dayUnits = Number(l.dayUnits) || 0;
    const pCash = Number(l.pCash) || 0;
    const proj = l.siteProject || w?.siteProject || '';

    totalLogDays += dayUnits;
    totalLogOtHours += otHrs;
    totalLogOtAmount += otAmt;

    rows.push([
      l.date,
      l.workerName,
      proj,
      l.inTime,
      l.outTime,
      Number(dayUnits.toFixed(2)),
      Number(otHrs.toFixed(2)),
      Number(rate.toFixed(2)),
      Number(otAmt.toFixed(2)),
      Number(pCash.toFixed(2)),
      l.signature,
      l.notes || '',
    ]);
  });

  rows.push([
    'LEDGER TOTAL',
    `${sortedLogs.length} entries`,
    '',
    '',
    '',
    Number(totalLogDays.toFixed(2)),
    Number(totalLogOtHours.toFixed(2)),
    '',
    Number(totalLogOtAmount.toFixed(2)),
    Number(totalLogPCash.toFixed(2)),
    '',
    '',
  ]);

  triggerCsvDownload(rows, `JK_Master_Monthly_Report_${monthKey}.csv`);
}

function serializeValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object') {
    const maybeTimestamp = val as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().toISOString();
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      return new Date(maybeTimestamp.seconds * 1000).toISOString();
    }
    if (Array.isArray(val)) {
      return val.map(serializeValue);
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      result[k] = serializeValue(v);
    }
    return result;
  }
  return val;
}

export function exportAllDataAsJson(params: {
  profile: UserProfile;
  workers: Worker[];
  workLogs: WorkLog[];
  monthlyAdjustments: MonthlyAdjustment[];
}): void {
  const { profile, workers, workLogs, monthlyAdjustments } = params;
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: '1.0',
    company: {
      companyName: profile.companyName,
      companyAddress: profile.companyAddress,
      companyMobile: profile.companyMobile,
      ownerName: profile.displayName,
      ownerEmail: profile.email,
    },
    counts: {
      workers: workers.length,
      workLogs: workLogs.length,
      monthlyAdjustments: monthlyAdjustments.length,
    },
    workers: workers.map((w) => serializeValue(w)),
    workLogs: workLogs.map((l) => serializeValue(l)),
    monthlyAdjustments: monthlyAdjustments.map((a) => serializeValue(a)),
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `JK_Backup_AllData_${getTodayDateStr()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
