import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Download, Lock, Printer } from 'lucide-react';
import { db } from '../lib/firebase';
import { downloadElementAsPng } from '../lib/payrollCalc';
import type { Language, SharedReport } from '../types/payroll';
import { translations } from '../i18n/translations';
import { JkHouseLogo } from './BrandMark';
import { AttendanceLogDocument } from './sheets/AttendanceLogDocument';
import { PaySheetDocument } from './sheets/PaySheetDocument';
import { SalarySheetDocument } from './sheets/SalarySheetDocument';

interface WorkerPublicPortalProps {
  shareToken: string;
  lang: Language;
  setLang: (lang: Language) => void;
  onExitToPortal?: () => void;
}

export const WorkerPublicPortal: React.FC<WorkerPublicPortalProps> = ({
  shareToken,
  lang,
  setLang,
  onExitToPortal,
}) => {
  const t = translations[lang];
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<'pay' | 'salary'>('pay');
  const [downloading, setDownloading] = useState(false);

  const paySheetRef = useRef<HTMLDivElement>(null);
  const salarySheetRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, 'sharedReports', shareToken));
        if (!snap.exists()) {
          if (!cancelled) {
            setError('This payroll link could not be found or is invalid.');
          }
          return;
        }
        if (!cancelled) {
          setReport(snap.data() as SharedReport);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load the verified payroll report.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const handleDownloadCurrent = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const target = selectedSheet === 'pay' ? paySheetRef.current : salarySheetRef.current;
      const prefix = selectedSheet === 'pay' ? 'PaySheet' : 'SalarySheet';
      await downloadElementAsPng(
        target,
        `JK_${prefix}_${report.employeeId}_${report.monthKey}.png`
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAttendance = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await downloadElementAsPng(
        attendanceRef.current,
        `JK_AttendanceLog_${report.employeeId}_${report.monthKey}.png`
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <JkHouseLogo className="w-8 h-7" />
            <span className="font-display text-base sm:text-lg font-bold text-[#0B2C5D]">
              JK Dream Construction
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.readOnlyBanner}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('ta')}
                className={`px-2 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  lang === 'ta' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                தமிழ்
              </button>
            </div>
            {onExitToPortal ? (
              <button
                type="button"
                onClick={onExitToPortal}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Portal</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
            Loading verified payroll document...
          </div>
        ) : error || !report ? (
          <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h1 className="font-display text-lg font-bold text-slate-900">Report Not Available</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            {onExitToPortal ? (
              <button
                type="button"
                onClick={onExitToPortal}
                className="mt-5 px-4 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg cursor-pointer"
              >
                Back to Portal
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Worker Controls Toolbar: Two Sheet Options + Download Buttons */}
            <div className="no-print bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">
                  {report.employeeId} · {report.designation} · {report.monthLabel} {report.year}
                </div>
                <h1 className="font-display text-lg font-bold text-slate-950">{report.employeeName}</h1>
              </div>

              {/* Exact 2 Sheet Options requested: Pay Sheet | Salary Sheet */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedSheet('pay')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSheet === 'pay'
                      ? 'bg-[#0B2C5D] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {t.sheetTypePay}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSheet('salary')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSheet === 'salary'
                      ? 'bg-[#0B2C5D] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {t.sheetTypeSalary}
                </button>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadCurrent}
                  disabled={downloading}
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Exporting...' : t.downloadPng}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.printPdf}</span>
                </button>
              </div>
            </div>

            {/* Active Sheet Display */}
            {selectedSheet === 'pay' ? (
              <div className="space-y-8">
                <PaySheetDocument
                  ref={paySheetRef}
                  companyName={report.companyName}
                  monthLabel={report.monthLabel}
                  year={report.year}
                  department={report.department || 'Construction'}
                  project={report.siteProject || 'Main Site'}
                  rows={[
                    {
                      employeeName: report.employeeName,
                      designation: report.designation,
                      workingDays: report.daysWorked,
                      dailyRate: report.dailyRate,
                      totalAmount: report.grossSalary,
                      advance: report.totalAdvance,
                      netPay: report.netSalaryPayable,
                      signature: 'Verified',
                    },
                  ]}
                  remarks={report.remarks}
                  monthlyMemo={report.monthlyMemo}
                />

                {/* Daily Attendance & Petty Cash Proof Register */}
                <div>
                  <div className="no-print max-w-[820px] mx-auto mb-3 flex items-center justify-between gap-4">
                    <h2 className="font-display text-sm font-bold text-slate-800">
                      Daily Attendance &amp; Petty Cash Verification Log ({report.attendanceLogs.length} days)
                    </h2>
                    <button
                      type="button"
                      onClick={handleDownloadAttendance}
                      disabled={downloading}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Log PNG</span>
                    </button>
                  </div>
                  <AttendanceLogDocument
                    ref={attendanceRef}
                    companyName={report.companyName}
                    companyAddress={report.companyAddress}
                    companyMobile={report.companyMobile}
                    monthLabel={report.monthLabel}
                    year={report.year}
                    entries={report.attendanceLogs}
                    monthlyMemo={report.monthlyMemo}
                  />
                </div>
              </div>
            ) : (
              <SalarySheetDocument
                ref={salarySheetRef}
                companyName={report.companyName}
                employeeName={report.employeeName}
                employeeId={report.employeeId}
                designation={report.designation}
                siteProject={report.siteProject || 'Main Site'}
                payMonth={`${report.monthLabel} ${report.year}`}
                paymentDate={report.paymentDate || report.monthKey}
                daysWorked={report.daysWorked}
                dailyRate={report.dailyRate}
                otHours={report.otHours}
                basicSalary={report.basicSalary}
                allowances={report.allowances}
                overtimePay={report.overtimePay}
                grossSalary={report.grossSalary}
                salaryAdvance={report.totalAdvance}
                netSalaryPayable={report.netSalaryPayable}
                remarks={report.remarks}
                monthlyMemo={report.monthlyMemo}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
