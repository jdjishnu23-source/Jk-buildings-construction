import React, { useEffect, useMemo, useRef, useState } from 'react';
import { signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ClipboardList,
  Database,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  LogOut,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  calculateWorkerMonthlyPayroll,
  downloadAttendanceCsv,
  downloadElementAsPng,
  downloadMasterMonthlyReportCsv,
  downloadPayrollCsv,
  exportAllDataAsJson,
  formatDays,
  formatLKR,
  getCurrentMonthKey,
  getMonthParts,
  getTodayDateStr,
} from '../lib/payrollCalc';
import type {
  Language,
  MonthlyAdjustment,
  UserProfile,
  WorkLog,
  Worker,
  WorkerMonthlySummary,
} from '../types/payroll';
import { translations } from '../i18n/translations';
import { ContractorRegistrationForm } from './AuthAndRegisterView';
import { JkHouseLogo } from './BrandMark';
import { ShareQrModal } from './ShareQrModal';
import { AttendanceLogDocument } from './sheets/AttendanceLogDocument';
import { MasterMonthlyReportDocument } from './sheets/MasterMonthlyReportDocument';
import { PaySheetDocument } from './sheets/PaySheetDocument';
import { SalarySheetDocument } from './sheets/SalarySheetDocument';

type TabKey = 'overview' | 'daily' | 'sheets' | 'workers';
type SheetKind = 'pay' | 'salary' | 'attendance';

interface DashboardAppProps {
  user: User;
  profile: UserProfile;
  onUpdateProfile: (data: {
    displayName: string;
    phone: string;
    designation: string;
    companyName: string;
    companyAddress: string;
    companyMobile: string;
  }) => Promise<void>;
  lang: Language;
  setLang: (lang: Language) => void;
  onPreviewShare: (token: string) => void;
}

export const DashboardApp: React.FC<DashboardAppProps> = ({
  user,
  profile,
  onUpdateProfile,
  lang,
  setLang,
  onPreviewShare,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [editingSettings, setEditingSettings] = useState(false);

  // Live Firestore collections
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [adjustments, setAdjustments] = useState<MonthlyAdjustment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Daily Work Log Form State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logWorkerId, setLogWorkerId] = useState<string>('');
  const [workerQuickSearch, setWorkerQuickSearch] = useState<string>('');
  const [logDate, setLogDate] = useState<string>(getTodayDateStr());
  const [logDayUnits, setLogDayUnits] = useState<string>('1');
  const [logInTime, setLogInTime] = useState<string>('08:00 AM');
  const [logOutTime, setLogOutTime] = useState<string>('05:30 PM');
  const [logOtHours, setLogOtHours] = useState<string>('0');
  const [logHourlyRate, setLogHourlyRate] = useState<string>('0');
  const [logDailyAllowance, setLogDailyAllowance] = useState<string>('0');
  const [logPCash, setLogPCash] = useState<string>('0');
  const [logSignature, setLogSignature] = useState<string>('Signed');
  const [quickNotesEnabled, setQuickNotesEnabled] = useState<boolean>(false);
  const [logNotes, setLogNotes] = useState<string>('');
  const [logSaving, setLogSaving] = useState(false);
  const [logSearchFilter, setLogSearchFilter] = useState<string>('');

  // Worker Registration Form State
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [wEmpId, setWEmpId] = useState('JK-001');
  const [wName, setWName] = useState('');
  const [wDesignation, setWDesignation] = useState('Mason');
  const [wDepartment, setWDepartment] = useState('Civil Works');
  const [wSiteProject, setWSiteProject] = useState('Colombo 13 Site');
  const [wDailyRate, setWDailyRate] = useState('3500');
  const [wOtRate, setWOtRate] = useState('500');
  const [wDefaultAllowance, setWDefaultAllowance] = useState('0');
  const [wPhone, setWPhone] = useState('');
  const [wStatus, setWStatus] = useState<'active' | 'inactive'>('active');
  const [workerSaving, setWorkerSaving] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');

  // Sheets Tab State
  const [sheetKind, setSheetKind] = useState<SheetKind>('pay');
  const [sheetScope, setSheetScope] = useState<'single' | 'all'>('single');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [adjAllowances, setAdjAllowances] = useState<string>('0');
  const [adjExtraAdvance, setAdjExtraAdvance] = useState<string>('0');
  const [adjPaymentDate, setAdjPaymentDate] = useState<string>('');
  const [adjDepartment, setAdjDepartment] = useState<string>('');
  const [adjProject, setAdjProject] = useState<string>('');
  const [adjRemarks, setAdjRemarks] = useState<string>('');
  const [adjMonthlyMemo, setAdjMonthlyMemo] = useState<string>('');
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjSavedNotice, setAdjSavedNotice] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [masterReportOpen, setMasterReportOpen] = useState(false);
  const [clearLogsConfirmOpen, setClearLogsConfirmOpen] = useState(false);
  const [clearingMonthLogs, setClearingMonthLogs] = useState(false);

  // Share QR Modal & Quick Add Overview Dropdown/Modals
  const [qrSummary, setQrSummary] = useState<WorkerMonthlySummary | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickModal, setQuickModal] = useState<'log' | 'worker' | null>(null);
  const [overviewSearch, setOverviewSearch] = useState('');

  const quickAddMenuRef = useRef<HTMLDivElement>(null);
  const sheetPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!printPreviewOpen && !masterReportOpen && !clearLogsConfirmOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPrintPreviewOpen(false);
        setMasterReportOpen(false);
        if (!clearingMonthLogs) setClearLogsConfirmOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [printPreviewOpen, masterReportOpen, clearLogsConfirmOpen, clearingMonthLogs]);

  useEffect(() => {
    if (!quickAddOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (quickAddMenuRef.current && !quickAddMenuRef.current.contains(event.target as Node)) {
        setQuickAddOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuickAddOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [quickAddOpen]);

  // Subscribe to workers, workLogs, monthlyAdjustments
  useEffect(() => {
    setDataLoading(true);
    const workersQ = query(collection(db, 'workers'), where('ownerId', '==', user.uid));
    const logsQ = query(collection(db, 'workLogs'), where('ownerId', '==', user.uid));
    const adjQ = query(collection(db, 'monthlyAdjustments'), where('ownerId', '==', user.uid));

    const unsubWorkers = onSnapshot(
      workersQ,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Worker, 'id'>) }))
          .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
        setWorkers(list);
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workers')
    );

    const unsubLogs = onSnapshot(
      logsQ,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<WorkLog, 'id'>) }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setWorkLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workLogs')
    );

    const unsubAdj = onSnapshot(
      adjQ,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MonthlyAdjustment, 'id'>),
        }));
        setAdjustments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'monthlyAdjustments')
    );

    return () => {
      unsubWorkers();
      unsubLogs();
      unsubAdj();
    };
  }, [user.uid]);

  // Keep selectedWorkerId & logWorkerId synced with available workers
  useEffect(() => {
    if (workers.length > 0) {
      if (!selectedWorkerId || !workers.some((w) => w.id === selectedWorkerId)) {
        setSelectedWorkerId(workers[0].id);
      }
      if (!logWorkerId || !workers.some((w) => w.id === logWorkerId)) {
        setLogWorkerId(workers[0].id);
        setLogHourlyRate(String(workers[0].otHourlyRate ?? 0));
        setLogDailyAllowance(String(workers[0].defaultAllowance ?? 0));
      }
    }
  }, [workers, selectedWorkerId, logWorkerId]);

  // Derived project list
  const projects = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      if (w.siteProject) set.add(w.siteProject);
    });
    return Array.from(set).sort();
  }, [workers]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    if (projectFilter === 'ALL') return workers;
    return workers.filter((w) => w.siteProject === projectFilter);
  }, [workers, projectFilter]);

  // Monthly payroll summaries for filtered workers
  const summaries = useMemo(() => {
    return filteredWorkers.map((worker) => {
      const adj = adjustments.find((a) => a.workerId === worker.id && a.monthKey === monthKey);
      return calculateWorkerMonthlyPayroll(worker, monthKey, workLogs, adj);
    });
  }, [filteredWorkers, adjustments, workLogs, monthKey]);

  const activeSummary = useMemo(() => {
    return summaries.find((s) => s.worker.id === selectedWorkerId) || summaries[0] || null;
  }, [summaries, selectedWorkerId]);

  // Sync adjustment form values when activeSummary changes
  useEffect(() => {
    if (activeSummary) {
      setAdjAllowances(String(activeSummary.allowances));
      setAdjExtraAdvance(String(activeSummary.extraAdvance));
      setAdjPaymentDate(activeSummary.paymentDate);
      setAdjDepartment(activeSummary.department);
      setAdjProject(activeSummary.project);
      setAdjRemarks(activeSummary.remarks);
      setAdjMonthlyMemo(activeSummary.monthlyMemo);
    }
  }, [activeSummary]);

  // Aggregate KPIs
  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, s) => {
        acc.days += s.daysWorked;
        acc.advances += s.totalAdvance;
        acc.net += s.netSalaryPayable;
        return acc;
      },
      { days: 0, advances: 0, net: 0 }
    );
  }, [summaries]);

  // Filtered summaries for Overview payroll table real-time search
  const visibleSummaries = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (s) =>
        s.worker.name.toLowerCase().includes(q) ||
        s.worker.employeeId.toLowerCase().includes(q)
    );
  }, [summaries, overviewSearch]);

  const visibleSummaryTotals = useMemo(() => {
    return visibleSummaries.reduce(
      (acc, s) => {
        acc.days += s.daysWorked;
        acc.gross += s.grossSalary;
        acc.advances += s.totalAdvance;
        acc.net += s.netSalaryPayable;
        return acc;
      },
      { days: 0, gross: 0, advances: 0, net: 0 }
    );
  }, [visibleSummaries]);

  const logsInSelectedMonth = useMemo(() => {
    return workLogs.filter((l) => l.monthKey === monthKey);
  }, [workLogs, monthKey]);

  // Month logs for Daily Work Log tab & Attendance Sheet
  const monthLogs = useMemo(() => {
    return logsInSelectedMonth.filter((l) => {
      if (projectFilter !== 'ALL') {
        const w = workers.find((x) => x.id === l.workerId);
        if (w && w.siteProject !== projectFilter) return false;
      }
      if (logSearchFilter.trim()) {
        const q = logSearchFilter.trim().toLowerCase();
        return (
          l.workerName.toLowerCase().includes(q) ||
          (l.notes || '').toLowerCase().includes(q) ||
          l.date.includes(q)
        );
      }
      return true;
    });
  }, [logsInSelectedMonth, projectFilter, workers, logSearchFilter]);

  const { monthLabel, year } = getMonthParts(monthKey);

  const todayStr = getTodayDateStr();

  const todayPCashTotal = useMemo(() => {
    return workLogs.reduce((acc, l) => {
      if (l.date !== todayStr) return acc;
      if (projectFilter !== 'ALL') {
        const w = workers.find((x) => x.id === l.workerId);
        const proj = (l.siteProject || w?.siteProject || 'General Site').trim() || 'General Site';
        if (proj !== projectFilter) return acc;
      }
      return acc + (Number(l.pCash) || 0);
    }, 0);
  }, [workLogs, todayStr, projectFilter, workers]);

  const dailyExpensesByProject = useMemo(() => {
    const groups = new Map<
      string,
      {
        project: string;
        totalPCash: number;
        entryCount: number;
        items: Array<{ id: string; workerName: string; amount: number; notes: string }>;
      }
    >();

    workLogs.forEach((l) => {
      if (l.date !== todayStr) return;
      const amount = Number(l.pCash) || 0;
      if (amount <= 0) return;
      const w = workers.find((x) => x.id === l.workerId);
      const project = (l.siteProject || w?.siteProject || 'General Site').trim() || 'General Site';
      if (projectFilter !== 'ALL' && project !== projectFilter) return;

      const existing = groups.get(project) || {
        project,
        totalPCash: 0,
        entryCount: 0,
        items: [],
      };
      existing.totalPCash += amount;
      existing.entryCount += 1;
      existing.items.push({
        id: l.id,
        workerName: l.workerName,
        amount,
        notes: (l.notes || '').trim(),
      });
      groups.set(project, existing);
    });

    const grandTotal = Array.from(groups.values()).reduce((sum, g) => sum + g.totalPCash, 0);

    return Array.from(groups.values())
      .map((g) => ({
        ...g,
        sharePct: grandTotal > 0 ? (g.totalPCash / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalPCash - a.totalPCash || a.project.localeCompare(b.project));
  }, [workLogs, todayStr, projectFilter, workers]);

  const monthlyLogsForReport = useMemo(() => {
    return logsInSelectedMonth.filter((l) => {
      if (projectFilter === 'ALL') return true;
      const w = workers.find((x) => x.id === l.workerId);
      const proj = (l.siteProject || w?.siteProject || 'General Site').trim() || 'General Site';
      return proj === projectFilter;
    });
  }, [logsInSelectedMonth, projectFilter, workers]);

  const threeMonthTrend = useMemo(() => {
    const [yStr, mStr] = monthKey.split('-');
    const baseY = Number(yStr) || new Date().getFullYear();
    const baseM = (Number(mStr) || 1) - 1;
    return [2, 1, 0].map((offset) => {
      const d = new Date(baseY, baseM - offset, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const { monthLabel: mName, year: yr } = getMonthParts(k);
      let netPayroll = 0;
      let grossSalary = 0;
      let advances = 0;
      let daysWorked = 0;
      filteredWorkers.forEach((worker) => {
        const adj = adjustments.find((a) => a.workerId === worker.id && a.monthKey === k);
        const summary = calculateWorkerMonthlyPayroll(worker, k, workLogs, adj);
        netPayroll += summary.netSalaryPayable;
        grossSalary += summary.grossSalary;
        advances += summary.totalAdvance;
        daysWorked += summary.daysWorked;
      });
      return {
        monthKey: k,
        label: `${mName.slice(0, 3)} ${yr}`,
        fullLabel: `${mName} ${yr}`,
        netPayroll: Math.round(netPayroll * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        advances: Math.round(advances * 100) / 100,
        daysWorked: Math.round(daysWorked * 100) / 100,
      };
    });
  }, [monthKey, filteredWorkers, adjustments, workLogs]);

  const monthLogsTotals = useMemo(() => {
    return monthLogs.reduce(
      (acc, log) => {
        const worker = workers.find((w) => w.id === log.workerId);
        const effectiveRate =
          log.hourlyRate !== undefined
            ? Number(log.hourlyRate) || 0
            : Number(worker?.otHourlyRate ?? 0);
        const otAmount = (Number(log.otHours) || 0) * effectiveRate;
        acc.days += Number(log.dayUnits) || 0;
        acc.otHours += Number(log.otHours) || 0;
        acc.otAmount += otAmount;
        acc.pCash += Number(log.pCash) || 0;
        return acc;
      },
      { days: 0, otHours: 0, otAmount: 0, pCash: 0 }
    );
  }, [monthLogs, workers]);

  // Handlers: Worker Registration / Edit / Delete
  const resetNewWorkerFields = () => {
    const nextNum = String(workers.length + 1).padStart(3, '0');
    setEditingWorkerId(null);
    setWEmpId(`JK-${nextNum}`);
    setWName('');
    setWDesignation('Mason');
    setWDepartment('Civil Works');
    setWSiteProject(projectFilter !== 'ALL' ? projectFilter : 'Colombo 13 Site');
    setWDailyRate('3500');
    setWOtRate('500');
    setWDefaultAllowance('0');
    setWPhone('');
    setWStatus('active');
  };

  const openNewWorkerForm = () => {
    resetNewWorkerFields();
    setShowWorkerForm(true);
  };

  const openQuickWorkerModal = () => {
    resetNewWorkerFields();
    setQuickAddOpen(false);
    setQuickModal('worker');
  };

  const handleSelectLogWorker = (workerId: string) => {
    setLogWorkerId(workerId);
    const w = workers.find((item) => item.id === workerId);
    if (w) {
      setLogHourlyRate(String(w.otHourlyRate ?? 0));
      setLogDailyAllowance(String(w.defaultAllowance ?? 0));
    }
  };

  const openQuickLogModal = () => {
    setEditingLogId(null);
    setWorkerQuickSearch('');
    const activeWorker = workers.find((w) => w.id === logWorkerId) || workers[0];
    if (activeWorker) {
      setLogWorkerId(activeWorker.id);
      setLogHourlyRate(String(activeWorker.otHourlyRate ?? 0));
      setLogDailyAllowance(String(activeWorker.defaultAllowance ?? 0));
    }
    setLogDate(getTodayDateStr());
    setLogDayUnits('1');
    setLogInTime('08:00 AM');
    setLogOutTime('05:30 PM');
    setLogOtHours('0');
    setLogPCash('0');
    setLogSignature('Signed');
    setQuickNotesEnabled(false);
    setLogNotes('');
    setQuickAddOpen(false);
    setQuickModal('log');
  };

  const openEditWorkerForm = (w: Worker) => {
    setEditingWorkerId(w.id);
    setWEmpId(w.employeeId);
    setWName(w.name);
    setWDesignation(w.designation);
    setWDepartment(w.department);
    setWSiteProject(w.siteProject);
    setWDailyRate(String(w.dailyRate));
    setWOtRate(String(w.otHourlyRate));
    setWDefaultAllowance(String(w.defaultAllowance));
    setWPhone(w.phone || '');
    setWStatus(w.status);
    setShowWorkerForm(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wName.trim() || !wEmpId.trim()) return;
    setWorkerSaving(true);
    const cleanEmpId = wEmpId.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32) || 'JK-001';
    const payload = {
      employeeId: cleanEmpId,
      name: wName.trim().slice(0, 80),
      designation: (wDesignation.trim() || 'Worker').slice(0, 60),
      department: (wDepartment.trim() || 'Civil Works').slice(0, 60),
      siteProject: (wSiteProject.trim() || 'Main Site').slice(0, 100),
      dailyRate: Math.max(0, Number(wDailyRate) || 0),
      otHourlyRate: Math.max(0, Number(wOtRate) || 0),
      defaultAllowance: Math.max(0, Number(wDefaultAllowance) || 0),
      phone: wPhone.trim().slice(0, 30),
      status: wStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingWorkerId) {
        await updateDoc(doc(db, 'workers', editingWorkerId), payload);
      } else {
        const newRef = doc(collection(db, 'workers'));
        await setDoc(newRef, {
          ...payload,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
        setLogWorkerId(newRef.id);
        setSelectedWorkerId(newRef.id);
      }
      setShowWorkerForm(false);
      setQuickModal(null);
    } catch (err) {
      handleFirestoreError(err, editingWorkerId ? OperationType.UPDATE : OperationType.CREATE, 'workers');
    } finally {
      setWorkerSaving(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    try {
      await deleteDoc(doc(db, 'workers', workerId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workers/${workerId}`);
    }
  };

  // Handlers: Daily Work Log
  const handleSaveWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetWorker = workers.find((w) => w.id === logWorkerId);
    if (!targetWorker || !logDate) return;

    setLogSaving(true);
    const derivedMonthKey = logDate.slice(0, 7);
    const payload = {
      workerName: targetWorker.name.slice(0, 80),
      monthKey: derivedMonthKey,
      date: logDate,
      siteProject: targetWorker.siteProject.slice(0, 100),
      dayUnits: Math.max(0, Math.min(2, Number(logDayUnits) || 0)),
      inTime: (logInTime.trim() || '08:00 AM').slice(0, 16),
      outTime: (logOutTime.trim() || '05:30 PM').slice(0, 16),
      otHours: Math.max(0, Math.min(24, Number(logOtHours) || 0)),
      hourlyRate: Math.max(0, Math.min(100000000, Number(logHourlyRate) || 0)),
      dailyAllowance: Math.max(0, Math.min(100000000, Number(logDailyAllowance) || 0)),
      pCash: Math.max(0, Math.min(100000000, Number(logPCash) || 0)),
      signature: (logSignature.trim() || targetWorker.name.split(' ')[0] || 'Signed').slice(0, 60),
      notes: quickNotesEnabled ? logNotes.trim().slice(0, 200) : '',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingLogId) {
        await updateDoc(doc(db, 'workLogs', editingLogId), payload);
        setEditingLogId(null);
      } else {
        const newRef = doc(collection(db, 'workLogs'));
        await setDoc(newRef, {
          ...payload,
          ownerId: user.uid,
          workerId: targetWorker.id,
          createdAt: serverTimestamp(),
        });
      }
      setMonthKey(derivedMonthKey);
      setLogPCash('0');
      setLogOtHours('0');
      setQuickNotesEnabled(false);
      setLogNotes('');
      setQuickModal(null);
    } catch (err) {
      handleFirestoreError(err, editingLogId ? OperationType.UPDATE : OperationType.CREATE, 'workLogs');
    } finally {
      setLogSaving(false);
    }
  };

  const handleEditLog = (log: WorkLog) => {
    const w = workers.find((item) => item.id === log.workerId);
    setEditingLogId(log.id);
    setLogWorkerId(log.workerId);
    setLogDate(log.date);
    setLogDayUnits(String(log.dayUnits));
    setLogInTime(log.inTime);
    setLogOutTime(log.outTime);
    setLogOtHours(String(log.otHours));
    setLogHourlyRate(String(log.hourlyRate !== undefined ? log.hourlyRate : w?.otHourlyRate ?? 0));
    setLogDailyAllowance(
      String(log.dailyAllowance !== undefined ? log.dailyAllowance : w?.defaultAllowance ?? 0)
    );
    setLogPCash(String(log.pCash));
    setLogSignature(log.signature);
    setQuickNotesEnabled(Boolean(log.notes && log.notes.trim()));
    setLogNotes(log.notes || '');
    setActiveTab('daily');
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'workLogs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workLogs/${logId}`);
    }
  };

  const handleClearAllMonthlyLogs = async () => {
    const targetLogs = workLogs.filter((l) => l.monthKey === monthKey);
    if (targetLogs.length === 0) {
      setClearLogsConfirmOpen(false);
      return;
    }
    setClearingMonthLogs(true);
    try {
      const chunkSize = 450;
      for (let i = 0; i < targetLogs.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = targetLogs.slice(i, i + chunkSize);
        chunk.forEach((log) => {
          batch.delete(doc(db, 'workLogs', log.id));
        });
        await batch.commit();
      }
      if (editingLogId && targetLogs.some((l) => l.id === editingLogId)) {
        setEditingLogId(null);
      }
      setClearLogsConfirmOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workLogs (${monthKey})`);
    } finally {
      setClearingMonthLogs(false);
    }
  };

  const handleExportAllData = () => {
    exportAllDataAsJson({
      profile,
      workers,
      workLogs,
      monthlyAdjustments: adjustments,
    });
  };

  // Handler: Monthly Adjustments
  const handleSaveAdjustments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSummary) return;
    setAdjSaving(true);
    setAdjSavedNotice(false);
    const docId = `${user.uid}_${activeSummary.worker.id}_${monthKey}`;
    const existing = adjustments.find((a) => a.id === docId);

    const payload = {
      allowances: Math.max(0, Number(adjAllowances) || 0),
      extraAdvance: Math.max(0, Number(adjExtraAdvance) || 0),
      paymentDate: adjPaymentDate.trim().slice(0, 20),
      remarks: adjRemarks.trim().slice(0, 300),
      monthlyMemo: adjMonthlyMemo.trim().slice(0, 500),
      department: adjDepartment.trim().slice(0, 60),
      project: adjProject.trim().slice(0, 100),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existing) {
        await updateDoc(doc(db, 'monthlyAdjustments', docId), payload);
      } else {
        await setDoc(doc(db, 'monthlyAdjustments', docId), {
          ...payload,
          ownerId: user.uid,
          workerId: activeSummary.worker.id,
          monthKey,
          createdAt: serverTimestamp(),
        });
      }
      setAdjSavedNotice(true);
      setTimeout(() => setAdjSavedNotice(false), 2500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `monthlyAdjustments/${docId}`);
    } finally {
      setAdjSaving(false);
    }
  };

  const handleDownloadSheetPng = async () => {
    setExportingPng(true);
    try {
      const label =
        sheetKind === 'pay'
          ? 'PaySheet'
          : sheetKind === 'salary'
            ? 'SalarySheet'
            : 'AttendanceLog';
      const who =
        sheetScope === 'single' && activeSummary
          ? activeSummary.worker.employeeId
          : 'AllWorkers';
      await downloadElementAsPng(sheetPrintRef.current, `JK_${label}_${who}_${monthKey}.png`);
    } finally {
      setExportingPng(false);
    }
  };

  const handleDownloadCsv = () => {
    if (sheetKind === 'attendance') {
      const logsToExport =
        sheetScope === 'single' && activeSummary ? activeSummary.logs : monthLogs;
      const who =
        sheetScope === 'single' && activeSummary ? activeSummary.worker.employeeId : 'AllWorkers';
      downloadAttendanceCsv(logsToExport, monthKey, `JK_Attendance_PCash_${who}_${monthKey}.csv`);
      return;
    }

    const rowsToExport =
      sheetScope === 'single' && activeSummary && sheetKind === 'pay'
        ? [activeSummary]
        : sheetKind === 'salary' && activeSummary
          ? [activeSummary]
          : summaries;
    const who =
      (sheetScope === 'single' || sheetKind === 'salary') && activeSummary
        ? activeSummary.worker.employeeId
        : 'AllWorkers';
    downloadPayrollCsv(rowsToExport, monthKey, `JK_Payroll_${who}_${monthKey}.csv`);
  };

  const effectiveMonthlyMemo = useMemo(() => {
    if (sheetScope === 'single' && activeSummary) {
      return adjMonthlyMemo.trim();
    }
    return summaries
      .map((s) => {
        const memo =
          s.worker.id === activeSummary?.worker.id ? adjMonthlyMemo.trim() : s.monthlyMemo.trim();
        return memo ? `${s.worker.name}: ${memo}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }, [sheetScope, activeSummary, adjMonthlyMemo, summaries]);

  if (editingSettings) {
    return (
      <ContractorRegistrationForm
        lang={lang}
        defaultName={profile.displayName}
        email={profile.email}
        initialProfile={profile}
        onSave={async (data) => {
          await onUpdateProfile(data);
          setEditingSettings(false);
        }}
        onCancel={() => setEditingSettings(false)}
      />
    );
  }

  const renderActiveSheet = (attachRef: boolean) => (
    <>
      {sheetKind === 'pay' && (
        <PaySheetDocument
          ref={attachRef ? sheetPrintRef : undefined}
          companyName={profile.companyName}
          monthLabel={monthLabel}
          year={year}
          department={
            sheetScope === 'single' && activeSummary
              ? activeSummary.department
              : 'Construction / Site Labour'
          }
          project={
            sheetScope === 'single' && activeSummary
              ? activeSummary.project
              : projectFilter === 'ALL'
                ? 'All Sites'
                : projectFilter
          }
          rows={(sheetScope === 'single' && activeSummary ? [activeSummary] : summaries).map((s) => ({
            employeeName: s.worker.name,
            designation: s.worker.designation,
            workingDays: s.daysWorked,
            dailyRate: s.worker.dailyRate,
            totalAmount: s.grossSalary,
            advance: s.totalAdvance,
            netPay: s.netSalaryPayable,
            signature: '',
          }))}
          remarks={sheetScope === 'single' && activeSummary ? activeSummary.remarks : ''}
          monthlyMemo={effectiveMonthlyMemo}
          preparedBy={profile.displayName || 'HR / Admin'}
        />
      )}

      {sheetKind === 'salary' && activeSummary && (
        <SalarySheetDocument
          ref={attachRef ? sheetPrintRef : undefined}
          companyName={profile.companyName}
          employeeName={activeSummary.worker.name}
          employeeId={activeSummary.worker.employeeId}
          designation={activeSummary.worker.designation}
          siteProject={activeSummary.project}
          payMonth={`${monthLabel} ${year}`}
          paymentDate={activeSummary.paymentDate}
          daysWorked={activeSummary.daysWorked}
          dailyRate={activeSummary.worker.dailyRate}
          otHours={activeSummary.otHours}
          basicSalary={activeSummary.basicSalary}
          allowances={activeSummary.allowances}
          overtimePay={activeSummary.overtimePay}
          grossSalary={activeSummary.grossSalary}
          salaryAdvance={activeSummary.totalAdvance}
          netSalaryPayable={activeSummary.netSalaryPayable}
          remarks={activeSummary.remarks}
          monthlyMemo={adjMonthlyMemo.trim()}
        />
      )}

      {sheetKind === 'attendance' && (
        <AttendanceLogDocument
          ref={attachRef ? sheetPrintRef : undefined}
          companyName={profile.companyName}
          companyAddress={profile.companyAddress}
          companyMobile={profile.companyMobile}
          monthLabel={monthLabel}
          year={year}
          entries={(sheetScope === 'single' && activeSummary ? activeSummary.logs : monthLogs).map(
            (l) => ({
              date: l.date,
              name: l.workerName,
              inTime: l.inTime,
              outTime: l.outTime,
              pCash: l.pCash,
              signature: l.signature,
              dayUnits: l.dayUnits,
              otHours: l.otHours,
              notes: l.notes,
            })
          )}
          monthlyMemo={effectiveMonthlyMemo}
        />
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div
        className={
          printPreviewOpen || masterReportOpen
            ? 'no-print flex-1 flex flex-col'
            : 'flex-1 flex flex-col'
        }
      >
      {/* Strict 3-Zone Top Bar */}
      <header className="no-print bg-white border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title (1 line) */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            <JkHouseLogo className="w-8 h-7" />
            <span className="font-display text-lg font-bold tracking-tight text-[#0B2C5D]">
              {t.brandShort}
            </span>
          </button>

          {/* Zone 2: 4 Single-line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#0B2C5D] text-[#0B2C5D] font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-950'
              }`}
            >
              {t.navOverview}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'daily'
                  ? 'border-[#0B2C5D] text-[#0B2C5D] font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-950'
              }`}
            >
              {t.navDailyLog}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sheets')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'sheets'
                  ? 'border-[#0B2C5D] text-[#0B2C5D] font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-950'
              }`}
            >
              {t.navSheets}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('workers')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'workers'
                  ? 'border-[#0B2C5D] text-[#0B2C5D] font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-950'
              }`}
            >
              {t.navWorkers}
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA Button */}
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0B2C5D] rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.ctaLogWork}</span>
          </button>
        </div>

        {/* Mobile Nav Bar */}
        <div className="md:hidden mt-3 pt-2 border-t border-slate-100 flex items-center gap-4 overflow-x-auto text-xs font-medium">
          {(['overview', 'daily', 'sheets', 'workers'] as TabKey[]).map((key) => {
            const label =
              key === 'overview'
                ? t.navOverview
                : key === 'daily'
                  ? t.navDailyLog
                  : key === 'sheets'
                    ? t.navSheets
                    : t.navWorkers;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`pb-1 border-b-2 whitespace-nowrap shrink-0 ${
                  activeTab === key
                    ? 'border-[#0B2C5D] text-[#0B2C5D] font-semibold'
                    : 'border-transparent text-slate-600'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Workspace Toolbar: Month, Project Filter, Language, Company Settings, Sign Out */}
      <div className="no-print bg-slate-100/80 border-b border-slate-200 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">{t.monthSelector}:</label>
              <input
                type="month"
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="px-2.5 py-1 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800"
            >
              <option value="ALL">{t.allProjects}</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <span className="hidden lg:inline text-xs text-slate-500">
              {profile.companyName} · {profile.displayName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 text-xs font-semibold rounded-md cursor-pointer ${
                  lang === 'en' ? 'bg-[#0B2C5D] text-white' : 'text-slate-600'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('ta')}
                className={`px-2 py-0.5 text-xs font-semibold rounded-md cursor-pointer ${
                  lang === 'ta' ? 'bg-[#0B2C5D] text-white' : 'text-slate-600'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportAllData}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title={t.exportAllData}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.exportAllData}</span>
            </button>

            <button
              type="button"
              onClick={() => setEditingSettings(true)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.companySettings}</span>
            </button>

            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 sm:py-8">
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview Header with Quick Add Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-950">
                  {t.overviewHeaderTitle} · {monthLabel} {year}
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">{t.overviewHeaderSubtitle}</p>
              </div>

              <div className="flex items-center gap-2.5">
                <div ref={quickAddMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen((prev) => !prev)}
                    aria-expanded={quickAddOpen}
                    aria-haspopup="menu"
                    className="px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.quickAdd}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        quickAddOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {quickAddOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={openQuickLogModal}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        <ClipboardList className="w-4 h-4 text-[#0B2C5D] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{t.ctaLogWork}</div>
                          <div className="text-[11px] text-slate-500">{t.quickAddLogDesc}</div>
                        </div>
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={openQuickWorkerModal}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 text-[#0B2C5D] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{t.registerWorker}</div>
                          <div className="text-[11px] text-slate-500">{t.quickAddWorkerDesc}</div>
                        </div>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 3-Month Net Payroll Trend Chart (Recharts) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#0B2C5D]" />
                    <h2 className="font-display text-sm font-bold text-slate-950">
                      {t.payrollTrendTitle}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{t.payrollTrendSubtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {threeMonthTrend.map((pt, idx) => (
                    <div key={pt.monthKey} className="flex items-center gap-1.5">
                      {idx > 0 && <span className="text-slate-300 mr-1.5">·</span>}
                      <span className="text-slate-500">{pt.label}:</span>
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          idx === threeMonthTrend.length - 1 ? 'text-[#0B2C5D]' : 'text-slate-700'
                        }`}
                      >
                        LKR {formatLKR(pt.netPayroll)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 h-[220px] w-full">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={threeMonthTrend}
                    margin={{ top: 10, right: 16, left: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="netPayrollAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B2C5D" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0B2C5D" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                      dy={6}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={78}
                      tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                      tickFormatter={(v: number) => {
                        if (Math.abs(v) >= 1_000_000) return `LKR ${(v / 1_000_000).toFixed(1)}M`;
                        if (Math.abs(v) >= 1_000) return `LKR ${Math.round(v / 1_000)}k`;
                        return `LKR ${v}`;
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const row = payload[0]?.payload as (typeof threeMonthTrend)[number] | undefined;
                        if (!row) return null;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3.5 py-2.5 text-xs min-w-[210px]">
                            <div className="font-display font-bold text-slate-950 pb-1.5 mb-1.5 border-b border-slate-100">
                              {row.fullLabel}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">{t.netPayrollSeries}</span>
                                <span className="font-mono tabular-nums font-bold text-[#0B2C5D]">
                                  LKR {formatLKR(row.netPayroll)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">{t.grossSalarySeries}</span>
                                <span className="font-mono tabular-nums text-slate-800">
                                  LKR {formatLKR(row.grossSalary)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">{t.advances}</span>
                                <span className="font-mono tabular-nums text-amber-700">
                                  LKR {formatLKR(row.advances)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">{t.daysWorked}</span>
                                <span className="font-mono tabular-nums text-slate-700">
                                  {formatDays(row.daysWorked)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="netPayroll"
                      name={t.netPayrollSeries}
                      stroke="#0B2C5D"
                      strokeWidth={2.5}
                      fill="url(#netPayrollAreaFill)"
                      dot={{ r: 4, fill: '#0B2C5D', stroke: '#FFFFFF', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#0B2C5D', stroke: '#F59E0B', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4-Column KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">{t.totalWorkers}</div>
                <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-950">
                  {filteredWorkers.filter((w) => w.status === 'active').length}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {filteredWorkers.length} registered total
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">{t.totalDaysLogged}</div>
                <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-950">
                  {formatDays(totals.days)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {monthLabel} {year}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">{t.totalExpenses}</div>
                <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-amber-700">
                  LKR {formatLKR(totals.advances)}
                </div>
                <div className="mt-1 text-xs text-slate-600 flex items-center justify-between gap-2">
                  <span>{t.todayPCashLabel}:</span>
                  <span className="font-mono tabular-nums font-semibold text-amber-800">
                    LKR {formatLKR(todayPCashTotal)}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">{t.totalNetPayroll}</div>
                <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-[#0B2C5D]">
                  LKR {formatLKR(totals.net)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Ready for {monthLabel} payout
                </div>
              </div>
            </div>

            {/* Daily Expenses Categorized by Project (Today) */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-950">
                    {t.dailyExpensesTitle} · {todayStr}
                  </h2>
                  <p className="text-xs text-slate-500">{t.dailyExpensesSubtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span>{t.todayTotalLabel}:</span>
                    <span className="font-mono tabular-nums font-bold text-amber-800">
                      LKR {formatLKR(todayPCashTotal)}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {dailyExpensesByProject.length}{' '}
                      {dailyExpensesByProject.length === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openQuickLogModal}
                    className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.ctaLogWork}</span>
                  </button>
                </div>
              </div>

              {dailyExpensesByProject.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-slate-500">{t.dailyExpensesEmpty}</p>
                  <button
                    type="button"
                    onClick={openQuickLogModal}
                    className="mt-3 px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    {t.logFirstEntry}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="px-4 py-2.5 font-semibold">{t.projectSite}</th>
                        <th className="px-4 py-2.5 font-semibold text-right">{t.expenseEntries}</th>
                        <th className="px-4 py-2.5 font-semibold">{t.expenseBreakdown}</th>
                        <th className="px-4 py-2.5 font-semibold text-right w-36">
                          {t.expenseShare}
                        </th>
                        <th className="px-4 py-2.5 font-semibold text-right">{t.pCash}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyExpensesByProject.map((group) => (
                        <tr key={group.project} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-semibold text-slate-950">
                            {group.project}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                            {group.entryCount}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-md whitespace-normal">
                            {group.items.map((item, idx) => (
                              <React.Fragment key={item.id}>
                                {idx > 0 && (
                                  <span className="mx-1.5 text-slate-300" aria-hidden="true">
                                    ·
                                  </span>
                                )}
                                <span className="text-slate-800 font-medium">
                                  {item.workerName}
                                </span>{' '}
                                <span className="font-mono tabular-nums text-amber-700">
                                  (LKR {formatLKR(item.amount)})
                                </span>
                                {item.notes ? (
                                  <span className="text-slate-500"> — {item.notes}</span>
                                ) : null}
                              </React.Fragment>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2 justify-end w-full">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(4, group.sharePct))}%` }}
                                />
                              </div>
                              <span className="font-mono tabular-nums text-slate-600 w-11 text-right">
                                {group.sharePct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-amber-800">
                            LKR {formatLKR(group.totalPCash)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-950">
                      <tr>
                        <td className="px-4 py-2.5 text-left">
                          {t.todayTotalLabel} ({dailyExpensesByProject.length}{' '}
                          {dailyExpensesByProject.length === 1 ? 'project' : 'projects'})
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {dailyExpensesByProject.reduce((acc, g) => acc + g.entryCount, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-normal">
                          {todayStr}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                          100%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-800">
                          LKR {formatLKR(todayPCashTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Monthly Worker Payroll Summary Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-950">
                    {t.monthlySummaryTitle} · {monthLabel} {year}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click Sheets to preview/download Pay Sheet &amp; Salary Sheet, or Share QR to generate the read-only worker link.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={overviewSearch}
                      onChange={(e) => setOverviewSearch(e.target.value)}
                      placeholder={t.overviewSearchPlaceholder}
                      aria-label={t.overviewSearchPlaceholder}
                      className="pl-8 pr-7 py-2 text-xs bg-white border border-slate-300 rounded-lg w-56 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
                    />
                    {overviewSearch ? (
                      <button
                        type="button"
                        onClick={() => setOverviewSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      openNewWorkerForm();
                      setActiveTab('workers');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t.registerWorker}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSheetKind('pay');
                      setSheetScope('all');
                      setActiveTab('sheets');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Group Pay Sheet</span>
                  </button>
                </div>
              </div>

              {dataLoading ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading payroll records...</div>
              ) : summaries.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="mt-3 text-sm text-slate-600">{t.monthlySummaryEmpty}</p>
                  <button
                    type="button"
                    onClick={() => {
                      openNewWorkerForm();
                      setActiveTab('workers');
                    }}
                    className="mt-4 px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    {t.addFirstWorker}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="px-4 py-3 font-semibold">{t.employeeId}</th>
                        <th className="px-4 py-3 font-semibold">{t.workerName}</th>
                        <th className="px-4 py-3 font-semibold">{t.trade}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.daysWorked}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.dailyRate}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.grossSalary}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.advances}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.netPay}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-xs text-slate-500">
                            <span>{t.noSearchMatches}</span>{' '}
                            <button
                              type="button"
                              onClick={() => setOverviewSearch('')}
                              className="ml-1 font-semibold text-[#0B2C5D] hover:underline cursor-pointer"
                            >
                              Reset
                            </button>
                          </td>
                        </tr>
                      ) : (
                        visibleSummaries.map((s) => (
                          <tr key={s.worker.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono text-slate-600">{s.worker.employeeId}</td>
                            <td className="px-4 py-3 font-semibold text-slate-950">{s.worker.name}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {s.worker.designation} · {s.worker.siteProject}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                              {formatDays(s.daysWorked)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                              {formatLKR(s.worker.dailyRate)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                              {formatLKR(s.grossSalary)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                              {formatLKR(s.totalAdvance)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#0B2C5D]">
                              {formatLKR(s.netSalaryPayable)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedWorkerId(s.worker.id);
                                    setSheetScope('single');
                                    setSheetKind('salary');
                                    setActiveTab('sheets');
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold border border-slate-300 text-slate-800 rounded-md hover:bg-slate-100 cursor-pointer"
                                >
                                  {t.viewSheets}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQrSummary(s)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>{t.shareQr}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300">
                      <tr className="font-bold text-slate-950">
                        <td colSpan={3} className="px-4 py-3 text-left">
                          Total ({visibleSummaries.length}{' '}
                          {visibleSummaries.length === 1 ? 'worker' : 'workers'})
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatDays(visibleSummaryTotals.days)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-400">
                          —
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          LKR {formatLKR(visibleSummaryTotals.gross)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-800">
                          LKR {formatLKR(visibleSummaryTotals.advances)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[#0B2C5D]">
                          LKR {formatLKR(visibleSummaryTotals.net)}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= DAILY WORK LOG TAB ================= */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-950">{t.dailyEntryTitle}</h2>
                  <p className="text-xs text-slate-500">
                    Select or search a worker by name, enter day units, In/Out time, and any P.Cash/expenses given.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs text-slate-600">
                    <span>{t.todayPCashLabel}: </span>
                    <span className="font-mono tabular-nums font-bold text-amber-800">
                      LKR {formatLKR(todayPCashTotal)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSheetKind('attendance');
                      setSheetScope('all');
                      setActiveTab('sheets');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-800 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>View Official Attendance Sheet</span>
                  </button>
                </div>
              </div>

              {workers.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-600">{t.monthlySummaryEmpty}</p>
                  <button
                    type="button"
                    onClick={() => {
                      openNewWorkerForm();
                      setActiveTab('workers');
                    }}
                    className="mt-3 px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg cursor-pointer"
                  >
                    {t.addFirstWorker}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveWorkLog} className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.selectWorker} *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={workerQuickSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkerQuickSearch(val);
                          const match = workers.find((w) =>
                            w.name.toLowerCase().includes(val.toLowerCase())
                          );
                          if (match) handleSelectLogWorker(match.id);
                        }}
                        placeholder={t.searchWorkerPlaceholder}
                        className="w-40 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <select
                        required
                        value={logWorkerId}
                        onChange={(e) => handleSelectLogWorker(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      >
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.employeeId} · {w.designation})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.date} *</label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.dayUnits} *</label>
                    <select
                      value={logDayUnits}
                      onChange={(e) => setLogDayUnits(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="1">1.0 (Full Day)</option>
                      <option value="0.5">0.5 (Half Day)</option>
                      <option value="1.5">1.5 (Day + Half)</option>
                      <option value="2">2.0 (Double Shift)</option>
                      <option value="0">0.0 (Advance Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.inTime}</label>
                    <input
                      type="text"
                      maxLength={16}
                      value={logInTime}
                      onChange={(e) => setLogInTime(e.target.value)}
                      placeholder="08:00 AM"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.outTime}</label>
                    <input
                      type="text"
                      maxLength={16}
                      value={logOutTime}
                      onChange={(e) => setLogOutTime(e.target.value)}
                      placeholder="05:30 PM"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.otHours}</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={logOtHours}
                      onChange={(e) => setLogOtHours(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.hourlyRate}</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={logHourlyRate}
                      onChange={(e) => setLogHourlyRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.dailyAllowanceField}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={logDailyAllowance}
                      onChange={(e) => setLogDailyAllowance(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.pCash}</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={logPCash}
                      onChange={(e) => setLogPCash(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.signature}</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={logSignature}
                      onChange={(e) => setLogSignature(e.target.value)}
                      placeholder="Signed"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <label
                        htmlFor="daily-quick-notes-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        {t.quickNotes}
                      </label>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={quickNotesEnabled}
                        onClick={() => setQuickNotesEnabled((prev) => !prev)}
                        className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer"
                      >
                        <span>{quickNotesEnabled ? 'ON' : 'OFF'}</span>
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            quickNotesEnabled ? 'bg-[#0B2C5D]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              quickNotesEnabled ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                    <input
                      id="daily-quick-notes-input"
                      type="text"
                      maxLength={200}
                      disabled={!quickNotesEnabled}
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder={quickNotesEnabled ? t.quickNotesPlaceholder : t.quickNotesEnableHint}
                      className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                        quickNotesEnabled
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={logSaving}
                      className="flex-1 px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {logSaving ? 'Saving...' : editingLogId ? t.updateDailyLog : t.saveDailyLog}
                    </button>
                    {editingLogId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLogId(null);
                          setQuickNotesEnabled(false);
                          setLogNotes('');
                        }}
                        className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                      >
                        {t.cancel}
                      </button>
                    ) : null}
                  </div>
                </form>
              )}
            </div>

            {/* Daily Work Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-sm font-bold text-slate-950">
                  {t.recentLogs} · {monthLabel} {year}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={logSearchFilter}
                      onChange={(e) => setLogSearchFilter(e.target.value)}
                      placeholder="Filter by name or date..."
                      className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setClearLogsConfirmOpen(true)}
                    disabled={logsInSelectedMonth.length === 0 || clearingMonthLogs}
                    className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.clearMonthlyLogs}</span>
                  </button>
                </div>
              </div>

              {monthLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">{t.noLogsMonth}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="px-4 py-2.5 font-semibold">{t.date}</th>
                        <th className="px-4 py-2.5 font-semibold">{t.workerName}</th>
                        <th className="px-4 py-2.5 font-semibold text-center">{t.inTime}</th>
                        <th className="px-4 py-2.5 font-semibold text-center">{t.outTime}</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Days</th>
                        <th className="px-4 py-2.5 font-semibold text-right">OT</th>
                        <th className="px-4 py-2.5 font-semibold text-right">{t.otAmount}</th>
                        <th className="px-4 py-2.5 font-semibold text-right">{t.pCash}</th>
                        <th className="px-4 py-2.5 font-semibold">{t.signature}</th>
                        <th className="px-4 py-2.5 font-semibold">{t.workNotes}</th>
                        <th className="px-4 py-2.5 font-semibold text-right">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthLogs.map((log) => {
                        const logWorker = workers.find((w) => w.id === log.workerId);
                        const effectiveRate =
                          log.hourlyRate !== undefined
                            ? Number(log.hourlyRate) || 0
                            : Number(logWorker?.otHourlyRate ?? 0);
                        const otAmount = (Number(log.otHours) || 0) * effectiveRate;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-2.5 font-mono tabular-nums text-slate-800">
                              {log.date}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-950">
                              {log.workerName}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono tabular-nums text-slate-600">
                              {log.inTime}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono tabular-nums text-slate-600">
                              {log.outTime}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                              {formatDays(log.dayUnits)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                              {formatDays(log.otHours)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#0B2C5D] font-medium">
                              {otAmount > 0 ? formatLKR(otAmount) : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-700 font-medium">
                              {log.pCash > 0 ? formatLKR(log.pCash) : '-'}
                            </td>
                            <td className="px-4 py-2.5 italic text-slate-600">{log.signature}</td>
                            <td className="px-4 py-2.5 text-slate-700 max-w-[260px] whitespace-normal break-words">
                              {log.notes && log.notes.trim() ? (
                                <span className="inline-block bg-amber-50 border border-amber-200 text-slate-800 rounded px-2 py-0.5 text-[11px] leading-snug">
                                  {log.notes}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditLog(log)}
                                  className="p-1 text-slate-500 hover:text-[#0B2C5D] cursor-pointer"
                                  title={t.edit}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteLog(log.id)}
                                  className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                                  title={t.delete}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-950">
                      <tr>
                        <td colSpan={4} className="px-4 py-2.5 text-left">
                          {t.ledgerTotal} ({monthLogs.length})
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {formatDays(monthLogsTotals.days)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                          {formatDays(monthLogsTotals.otHours)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#0B2C5D]">
                          LKR {formatLKR(monthLogsTotals.otAmount)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-800">
                          LKR {formatLKR(monthLogsTotals.pCash)}
                        </td>
                        <td colSpan={3} className="px-4 py-2.5" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PAY & SALARY SHEETS TAB ================= */}
        {activeTab === 'sheets' && (
          <div className="space-y-6">
            {/* Sheet Controls Bar */}
            <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Sheet Type Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSheetKind('pay')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sheetKind === 'pay' ? 'bg-[#0B2C5D] text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  {t.sheetTypePay}
                </button>
                <button
                  type="button"
                  onClick={() => setSheetKind('salary')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sheetKind === 'salary' ? 'bg-[#0B2C5D] text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  {t.sheetTypeSalary}
                </button>
                <button
                  type="button"
                  onClick={() => setSheetKind('attendance')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sheetKind === 'attendance'
                      ? 'bg-[#0B2C5D] text-white shadow-sm'
                      : 'text-slate-700'
                  }`}
                >
                  {t.sheetTypeAttendance}
                </button>
              </div>

              {/* Worker / Scope Selector */}
              <div className="flex flex-wrap items-center gap-2.5">
                {sheetKind !== 'salary' ? (
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSheetScope('single')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        sheetScope === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      {t.scopeSingleWorker}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetScope('all')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        sheetScope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      {t.scopeAllWorkers}
                    </button>
                  </div>
                ) : null}

                {(sheetKind === 'salary' || sheetScope === 'single') && workers.length > 0 ? (
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.employeeId})
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              {/* Export & Share QR Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={
                    sheetKind === 'attendance' ? monthLogs.length === 0 : summaries.length === 0
                  }
                  className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{t.downloadCsv}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSheetPng}
                  disabled={exportingPng || summaries.length === 0}
                  className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportingPng ? 'Exporting...' : t.downloadPng}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPreviewOpen(true)}
                  disabled={summaries.length === 0}
                  className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t.printPreview}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintPreviewOpen(false);
                    setMasterReportOpen(true);
                  }}
                  disabled={summaries.length === 0 && monthlyLogsForReport.length === 0}
                  className="px-3.5 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t.downloadMonthlyReport}</span>
                </button>
                {activeSummary ? (
                  <button
                    type="button"
                    onClick={() => setQrSummary(activeSummary)}
                    className="px-3.5 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{t.generateQrLink}</span>
                  </button>
                ) : null}
              </div>
            </div>

            {summaries.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                {t.monthlySummaryEmpty}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Monthly Adjustment Panel (hidden on print) */}
                {activeSummary && sheetKind !== 'attendance' ? (
                  <div className="no-print xl:col-span-3 bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="font-display text-sm font-bold text-slate-950">
                      {t.monthlyAdjustments}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeSummary.worker.name} · {monthLabel} {year}
                    </p>

                    <form onSubmit={handleSaveAdjustments} className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.allowances}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={adjAllowances}
                          onChange={(e) => setAdjAllowances(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.extraAdvance}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={adjExtraAdvance}
                          onChange={(e) => setAdjExtraAdvance(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                        <div className="mt-1 text-[11px] text-slate-500 font-mono">
                          + Daily P.Cash: LKR {formatLKR(activeSummary.dailyPCashTotal)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.paymentDate}
                        </label>
                        <input
                          type="date"
                          value={adjPaymentDate}
                          onChange={(e) => setAdjPaymentDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.department}
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={adjDepartment}
                          onChange={(e) => setAdjDepartment(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.siteProject}
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={adjProject}
                          onChange={(e) => setAdjProject(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.remarks}
                        </label>
                        <textarea
                          rows={2}
                          maxLength={300}
                          value={adjRemarks}
                          onChange={(e) => setAdjRemarks(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            {t.monthlyMemo}
                          </label>
                          <span className="text-[10px] font-mono tabular-nums text-slate-400">
                            {adjMonthlyMemo.length}/500
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={adjMonthlyMemo}
                          onChange={(e) => setAdjMonthlyMemo(e.target.value)}
                          placeholder={t.monthlyMemoPlaceholder}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg placeholder:text-slate-400"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={adjSaving}
                        className="w-full px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        {adjSaving ? 'Saving...' : adjSavedNotice ? 'Updated!' : t.saveAdjustments}
                      </button>
                    </form>
                  </div>
                ) : null}

                {/* Official Sheet Preview Area */}
                <div
                  className={
                    activeSummary && sheetKind !== 'attendance' ? 'xl:col-span-9' : 'xl:col-span-12'
                  }
                >
                  {renderActiveSheet(true)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= WORKERS TAB ================= */}
        {activeTab === 'workers' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-950">{t.navWorkers}</h2>
                <p className="text-xs text-slate-500">
                  Register workers / customers with daily wage rate, trade, and site assignment.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    placeholder={t.searchWorkerPlaceholder}
                    className="pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={openNewWorkerForm}
                  className="px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t.registerWorker}</span>
                </button>
              </div>
            </div>

            {showWorkerForm && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display text-sm font-bold text-slate-950">
                  {editingWorkerId ? t.editWorker : t.registerWorker}
                </h3>
                <form
                  onSubmit={handleSaveWorker}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.employeeId} *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={32}
                      value={wEmpId}
                      onChange={(e) => setWEmpId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.workerName} *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={wName}
                      onChange={(e) => setWName(e.target.value)}
                      placeholder="e.g. K. Suresh"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.trade} *</label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={wDesignation}
                      onChange={(e) => setWDesignation(e.target.value)}
                      placeholder="Mason / Helper / Carpenter"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.department} *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={wDepartment}
                      onChange={(e) => setWDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.siteProject} *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={wSiteProject}
                      onChange={(e) => setWSiteProject(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.dailyRate} *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="50"
                      value={wDailyRate}
                      onChange={(e) => setWDailyRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.otHourlyRate}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={wOtRate}
                      onChange={(e) => setWOtRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.defaultAllowance}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={wDefaultAllowance}
                      onChange={(e) => setWDefaultAllowance(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.phone}</label>
                    <input
                      type="text"
                      maxLength={30}
                      value={wPhone}
                      onChange={(e) => setWPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.status}</label>
                    <select
                      value={wStatus}
                      onChange={(e) => setWStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="active">{t.active}</option>
                      <option value="inactive">{t.inactive}</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={workerSaving}
                      className="flex-1 px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      {workerSaving ? 'Saving...' : t.saveWorker}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWorkerForm(false)}
                      className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {workers.length === 0 ? (
                <div className="p-10 text-center">
                  <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="mt-3 text-sm text-slate-600">{t.monthlySummaryEmpty}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="px-4 py-3 font-semibold">{t.employeeId}</th>
                        <th className="px-4 py-3 font-semibold">{t.workerName}</th>
                        <th className="px-4 py-3 font-semibold">{t.trade}</th>
                        <th className="px-4 py-3 font-semibold">{t.siteProject}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.dailyRate}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.otHourlyRate}</th>
                        <th className="px-4 py-3 font-semibold">{t.status}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workers
                        .filter((w) => {
                          if (!workerSearch.trim()) return true;
                          const q = workerSearch.trim().toLowerCase();
                          return (
                            w.name.toLowerCase().includes(q) ||
                            w.employeeId.toLowerCase().includes(q) ||
                            w.designation.toLowerCase().includes(q)
                          );
                        })
                        .map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono text-slate-600">{w.employeeId}</td>
                            <td className="px-4 py-3 font-semibold text-slate-950">{w.name}</td>
                            <td className="px-4 py-3 text-slate-700">{w.designation}</td>
                            <td className="px-4 py-3 text-slate-600">{w.siteProject}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {formatLKR(w.dailyRate)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                              {formatLKR(w.otHourlyRate)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium ${
                                  w.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {w.status === 'active' ? t.active : t.inactive}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLogWorkerId(w.id);
                                    setActiveTab('daily');
                                  }}
                                  className="text-xs font-semibold text-[#0B2C5D] hover:underline cursor-pointer"
                                >
                                  Log Work
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditWorkerForm(w)}
                                  className="p-1 text-slate-500 hover:text-[#0B2C5D] cursor-pointer"
                                  title={t.edit}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteWorker(w.id)}
                                  className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                                  title={t.delete}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* A4 Print Preview Modal */}
      {printPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex flex-col print:static print:bg-white print:block"
          role="dialog"
          aria-modal="true"
          aria-label={t.printPreview}
        >
          {/* Modal Toolbar (hidden during print) */}
          <div className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0B2C5D]/10 text-[#0B2C5D] flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 truncate">
                  {t.printPreview} ·{' '}
                  {sheetKind === 'pay'
                    ? t.sheetTypePay
                    : sheetKind === 'salary'
                      ? t.sheetTypeSalary
                      : t.sheetTypeAttendance}
                </h3>
                <p className="text-[11px] font-mono text-slate-500">
                  A4 Portrait (210 × 297 mm) · {monthLabel} {year}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t.printNow}</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintPreviewOpen(false)}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close print preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable A4 Paper Canvas */}
          <div className="flex-1 overflow-y-auto bg-slate-200/90 p-4 sm:p-8 print:overflow-visible print:bg-white print:p-0">
            <div className="w-full max-w-[794px] min-h-[1123px] mx-auto bg-white shadow-2xl border border-slate-300 p-6 sm:p-8 print:shadow-none print:border-none print:p-0 print:min-h-0 print:max-w-full">
              <div className="w-full [&>.print-only-container]:max-w-full [&>.print-only-container]:shadow-none">
                {renderActiveSheet(false)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Monthly Report Modal (PDF Print & Master CSV Export) */}
      {masterReportOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex flex-col print:static print:bg-white print:block"
          role="dialog"
          aria-modal="true"
          aria-label={t.masterReportTitle}
        >
          {/* Modal Toolbar (hidden during print) */}
          <div className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0B2C5D]/10 text-[#0B2C5D] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 truncate">
                  {t.masterReportTitle} · {monthLabel} {year}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">{t.masterReportSubtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  downloadMasterMonthlyReportCsv({
                    companyName: profile.companyName,
                    companyAddress: profile.companyAddress,
                    companyMobile: profile.companyMobile,
                    monthKey,
                    projectLabel: projectFilter === 'ALL' ? 'All Sites' : projectFilter,
                    summaries,
                    logs: monthlyLogsForReport,
                    workers,
                  })
                }
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{t.downloadMasterCsv}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t.saveMasterPdf}</span>
              </button>
              <button
                type="button"
                onClick={() => setMasterReportOpen(false)}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close monthly report"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable A4 Paper Canvas */}
          <div className="flex-1 overflow-y-auto bg-slate-200/90 p-4 sm:p-8 print:overflow-visible print:bg-white print:p-0">
            <div className="w-full max-w-[794px] min-h-[1123px] mx-auto bg-white shadow-2xl border border-slate-300 p-6 sm:p-8 print:shadow-none print:border-none print:p-0 print:min-h-0 print:max-w-full">
              <MasterMonthlyReportDocument
                companyName={profile.companyName}
                companyAddress={profile.companyAddress}
                companyMobile={profile.companyMobile}
                monthLabel={monthLabel}
                year={year}
                projectLabel={projectFilter === 'ALL' ? 'All Sites' : projectFilter}
                preparedBy={profile.displayName || 'HR / Admin'}
                summaries={summaries}
                logs={monthlyLogsForReport}
                workers={workers}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Add: Log Daily Work Modal (keeps user on Overview) */}
      {quickModal === 'log' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-[#0B2C5D]" />
                <h3 className="font-display text-base font-bold text-slate-950">{t.dailyEntryTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {workers.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-600">{t.monthlySummaryEmpty}</p>
                  <button
                    type="button"
                    onClick={openQuickWorkerModal}
                    className="mt-4 px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    {t.addFirstWorker}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveWorkLog} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.selectWorker} *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={workerQuickSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkerQuickSearch(val);
                          const match = workers.find((w) =>
                            w.name.toLowerCase().includes(val.toLowerCase())
                          );
                          if (match) handleSelectLogWorker(match.id);
                        }}
                        placeholder={t.searchWorkerPlaceholder}
                        className="w-36 sm:w-44 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <select
                        required
                        value={logWorkerId}
                        onChange={(e) => handleSelectLogWorker(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      >
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.employeeId} · {w.designation})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.date} *</label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.dayUnits} *</label>
                    <select
                      value={logDayUnits}
                      onChange={(e) => setLogDayUnits(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="1">1.0 (Full Day)</option>
                      <option value="0.5">0.5 (Half Day)</option>
                      <option value="1.5">1.5 (Day + Half)</option>
                      <option value="2">2.0 (Double Shift)</option>
                      <option value="0">0.0 (Advance Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.inTime}</label>
                    <input
                      type="text"
                      maxLength={16}
                      value={logInTime}
                      onChange={(e) => setLogInTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.outTime}</label>
                    <input
                      type="text"
                      maxLength={16}
                      value={logOutTime}
                      onChange={(e) => setLogOutTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.otHours}</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={logOtHours}
                      onChange={(e) => setLogOtHours(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.hourlyRate}</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={logHourlyRate}
                      onChange={(e) => setLogHourlyRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.dailyAllowanceField}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={logDailyAllowance}
                      onChange={(e) => setLogDailyAllowance(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.pCash}</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={logPCash}
                      onChange={(e) => setLogPCash(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{t.signature}</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={logSignature}
                      onChange={(e) => setLogSignature(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <label
                        htmlFor="modal-quick-notes-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        {t.quickNotes}
                      </label>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={quickNotesEnabled}
                        onClick={() => setQuickNotesEnabled((prev) => !prev)}
                        className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer"
                      >
                        <span>{quickNotesEnabled ? 'ON' : 'OFF'}</span>
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            quickNotesEnabled ? 'bg-[#0B2C5D]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              quickNotesEnabled ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                    <input
                      id="modal-quick-notes-input"
                      type="text"
                      maxLength={200}
                      disabled={!quickNotesEnabled}
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder={quickNotesEnabled ? t.quickNotesPlaceholder : t.quickNotesEnableHint}
                      className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                        quickNotesEnabled
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setQuickModal(null)}
                      className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={logSaving}
                      className="px-5 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-60"
                    >
                      {logSaving ? 'Saving...' : t.saveDailyLog}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add: Register New Worker Modal (keeps user on Overview) */}
      {quickModal === 'worker' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-[#0B2C5D]" />
                <h3 className="font-display text-base font-bold text-slate-950">{t.registerWorker}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.employeeId} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={wEmpId}
                  onChange={(e) => setWEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.workerName} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  placeholder="e.g. K. Suresh"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.trade} *</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={wDesignation}
                  onChange={(e) => setWDesignation(e.target.value)}
                  placeholder="Mason / Helper / Carpenter"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.department} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={wDepartment}
                  onChange={(e) => setWDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.siteProject} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={wSiteProject}
                  onChange={(e) => setWSiteProject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.dailyRate} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={wDailyRate}
                  onChange={(e) => setWDailyRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.otHourlyRate}
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={wOtRate}
                  onChange={(e) => setWOtRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.defaultAllowance}
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={wDefaultAllowance}
                  onChange={(e) => setWDefaultAllowance(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.phone}</label>
                <input
                  type="text"
                  maxLength={30}
                  value={wPhone}
                  onChange={(e) => setWPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.status}</label>
                <select
                  value={wStatus}
                  onChange={(e) => setWStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
              </div>

              <div className="sm:col-span-2 pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={workerSaving}
                  className="px-5 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-60"
                >
                  {workerSaving ? 'Saving...' : t.saveWorker}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Monthly Logs Confirmation Modal */}
      {clearLogsConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.clearMonthlyLogsTitle}
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-950">
                  {t.clearMonthlyLogsTitle}
                </h3>
              </div>
              <button
                type="button"
                disabled={clearingMonthLogs}
                onClick={() => setClearLogsConfirmOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                {t.clearMonthlyLogsWarning}{' '}
                <span className="font-bold text-slate-950">
                  {monthLabel} {year}
                </span>{' '}
                (
                <span className="font-mono font-bold text-red-700">
                  {logsInSelectedMonth.length}{' '}
                  {logsInSelectedMonth.length === 1 ? 'entry' : 'entries'}
                </span>
                ).
              </p>
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                {t.clearMonthlyLogsNote}
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={clearingMonthLogs}
                onClick={() => setClearLogsConfirmOpen(false)}
                className="px-4 py-2 text-xs font-medium border border-slate-300 bg-white rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={clearingMonthLogs}
                onClick={() => void handleClearAllMonthlyLogs()}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearingMonthLogs ? t.clearingLogs : t.clearMonthlyLogs}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code & Read-Only Share Link Modal */}
      <ShareQrModal
        open={Boolean(qrSummary)}
        onClose={() => setQrSummary(null)}
        summary={qrSummary}
        profile={profile}
        ownerId={user.uid}
        lang={lang}
        onPreviewShare={onPreviewShare}
      />
    </div>
  );
};
