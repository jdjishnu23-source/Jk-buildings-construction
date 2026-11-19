import React from 'react';
import { formatDays, formatLKR, getTodayDateStr } from '../../lib/payrollCalc';
import type { WorkLog, Worker, WorkerMonthlySummary } from '../../types/payroll';
import { JkHouseLogo } from '../BrandMark';

export interface ProjectExpenseBucket {
  project: string;
  entryCount: number;
  totalPCash: number;
  sharePct: number;
}

export interface MasterMonthlyReportDocumentProps {
  companyName: string;
  companyAddress?: string;
  companyMobile?: string;
  monthLabel: string;
  year: string;
  projectLabel: string;
  preparedBy?: string;
  summaries: WorkerMonthlySummary[];
  logs: WorkLog[];
  workers: Worker[];
}

export const MasterMonthlyReportDocument = React.forwardRef<
  HTMLDivElement,
  MasterMonthlyReportDocumentProps
>(
  (
    {
      companyName,
      companyAddress,
      companyMobile,
      monthLabel,
      year,
      projectLabel,
      preparedBy = 'HR / Admin',
      summaries,
      logs,
      workers,
    },
    ref
  ) => {
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

    const totalDays = summaries.reduce((acc, s) => acc + s.daysWorked, 0);
    const totalGross = summaries.reduce((acc, s) => acc + s.grossSalary, 0);
    const totalAdvances = summaries.reduce((acc, s) => acc + s.totalAdvance, 0);
    const totalNet = summaries.reduce((acc, s) => acc + s.netSalaryPayable, 0);

    const logTotalDays = sortedLogs.reduce((acc, l) => acc + (Number(l.dayUnits) || 0), 0);
    const logTotalOt = sortedLogs.reduce((acc, l) => acc + (Number(l.otHours) || 0), 0);
    const logTotalPCash = sortedLogs.reduce((acc, l) => acc + (Number(l.pCash) || 0), 0);

    const logTotalOtAmount = sortedLogs.reduce((acc, l) => {
      const worker = workers.find((w) => w.id === l.workerId);
      const rate =
        l.hourlyRate !== undefined ? Number(l.hourlyRate) || 0 : Number(worker?.otHourlyRate ?? 0);
      return acc + (Number(l.otHours) || 0) * rate;
    }, 0);

    // Petty cash categorized by project for the selected month
    const projectMap = new Map<string, { entryCount: number; totalPCash: number }>();
    sortedLogs.forEach((l) => {
      const amount = Number(l.pCash) || 0;
      if (amount <= 0) return;
      const worker = workers.find((w) => w.id === l.workerId);
      const proj = (l.siteProject || worker?.siteProject || 'General Site').trim() || 'General Site';
      const existing = projectMap.get(proj) || { entryCount: 0, totalPCash: 0 };
      existing.entryCount += 1;
      existing.totalPCash += amount;
      projectMap.set(proj, existing);
    });

    const projectExpenses: ProjectExpenseBucket[] = Array.from(projectMap.entries())
      .map(([project, data]) => ({
        project,
        entryCount: data.entryCount,
        totalPCash: data.totalPCash,
        sharePct: logTotalPCash > 0 ? (data.totalPCash / logTotalPCash) * 100 : 0,
      }))
      .sort((a, b) => b.totalPCash - a.totalPCash || a.project.localeCompare(b.project));

    const memos = summaries
      .filter((s) => s.monthlyMemo.trim() || s.remarks.trim())
      .map((s) => ({
        name: s.worker.name,
        memo: s.monthlyMemo.trim(),
        remarks: s.remarks.trim(),
      }));

    return (
      <div
        ref={ref}
        className="print-only-container bg-white text-slate-900 w-full mx-auto space-y-6"
      >
        {/* Official Company Header */}
        <div className="border-b-2 border-[#0B2C5D] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <JkHouseLogo className="w-16 h-14 shrink-0" />
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0B2C5D] leading-tight">
                  {companyName}
                </h2>
                <p className="text-[11px] font-semibold text-slate-700">
                  {companyAddress || '50/15, Brass Founder Street, Colombo 13.'}
                  {companyMobile ? ` · ${companyMobile}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-[#0B2C5D] text-white px-4 py-1 text-xs font-bold tracking-wider uppercase rounded">
                MASTER MONTHLY REPORT
              </div>
              <div className="mt-1.5 text-[11px] text-slate-600 font-mono tabular-nums">
                {monthLabel} {year} · {projectLabel}
              </div>
              <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                Generated: {getTodayDateStr()}
              </div>
            </div>
          </div>

          {/* Summary KPI Grid */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Workers</div>
              <div className="mt-0.5 font-mono tabular-nums text-sm font-bold text-slate-950">
                {summaries.length}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Total Days</div>
              <div className="mt-0.5 font-mono tabular-nums text-sm font-bold text-slate-950">
                {formatDays(totalDays)}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Gross Salary</div>
              <div className="mt-0.5 font-mono tabular-nums text-sm font-bold text-slate-950">
                LKR {formatLKR(totalGross)}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg px-3 py-2 bg-amber-50/60">
              <div className="text-[10px] font-semibold text-amber-800 uppercase">
                P.Cash &amp; Advances
              </div>
              <div className="mt-0.5 font-mono tabular-nums text-sm font-bold text-amber-800">
                LKR {formatLKR(totalAdvances)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 border border-[#0B2C5D]/30 rounded-lg px-3 py-2 bg-sky-50/70">
              <div className="text-[10px] font-semibold text-[#0B2C5D] uppercase">Net Payable</div>
              <div className="mt-0.5 font-mono tabular-nums text-sm font-bold text-[#0B2C5D]">
                LKR {formatLKR(totalNet)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Monthly Pay Sheet Summary */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2C5D] mb-2">
            1. Monthly Pay Sheet Summary ({monthLabel} {year})
          </h3>
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#0B2C5D] text-white">
                  <th className="px-2 py-1.5 text-center border-r border-white/20">No.</th>
                  <th className="px-2 py-1.5 text-left border-r border-white/20">Employee</th>
                  <th className="px-2 py-1.5 text-left border-r border-white/20">Trade / Site</th>
                  <th className="px-2 py-1.5 text-right border-r border-white/20">Days</th>
                  <th className="px-2 py-1.5 text-right border-r border-white/20">OT Pay</th>
                  <th className="px-2 py-1.5 text-right border-r border-white/20">Gross (LKR)</th>
                  <th className="px-2 py-1.5 text-right border-r border-white/20">P.Cash / Adv</th>
                  <th className="px-2 py-1.5 text-right">Net Pay (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summaries.map((s, idx) => (
                  <tr key={s.worker.id}>
                    <td className="px-2 py-1.5 text-center font-mono border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-1.5 border-r border-slate-200">
                      <span className="font-semibold text-slate-950">{s.worker.name}</span>{' '}
                      <span className="font-mono text-[10px] text-slate-500">
                        ({s.worker.employeeId})
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-700 border-r border-slate-200">
                      {s.worker.designation} · {s.project}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                      {formatDays(s.daysWorked)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                      {s.overtimePay > 0 ? formatLKR(s.overtimePay) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                      {formatLKR(s.grossSalary)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-amber-800 border-r border-slate-200">
                      {formatLKR(s.totalAdvance)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums font-bold text-[#0B2C5D]">
                      {formatLKR(s.netSalaryPayable)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sky-50 border-t-2 border-[#0B2C5D] font-bold text-slate-950">
                  <td colSpan={3} className="px-2 py-1.5 text-left border-r border-slate-200">
                    TOTAL ({summaries.length} workers)
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                    {formatDays(totalDays)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                    —
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                    {formatLKR(totalGross)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-amber-800 border-r border-slate-200">
                    {formatLKR(totalAdvances)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[#0B2C5D]">
                    {formatLKR(totalNet)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: Petty Cash Summary by Project */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2C5D] mb-2">
            2. Petty Cash (P.Cash) Summary by Site / Project
          </h3>
          {projectExpenses.length === 0 ? (
            <div className="border border-slate-200 rounded px-3 py-3 text-[11px] text-slate-500">
              No daily P.Cash expenses recorded for {monthLabel} {year}.
            </div>
          ) : (
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <th className="px-2.5 py-1.5 text-left border-r border-slate-200">Site / Project</th>
                    <th className="px-2.5 py-1.5 text-right border-r border-slate-200">
                      Expense Entries
                    </th>
                    <th className="px-2.5 py-1.5 text-right border-r border-slate-200">Share (%)</th>
                    <th className="px-2.5 py-1.5 text-right">Total P.Cash (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projectExpenses.map((item) => (
                    <tr key={item.project}>
                      <td className="px-2.5 py-1.5 font-semibold text-slate-900 border-r border-slate-200">
                        {item.project}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                        {item.entryCount}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-600 border-r border-slate-200">
                        {item.sharePct.toFixed(1)}%
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums font-semibold text-amber-800">
                        {formatLKR(item.totalPCash)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50/70 border-t border-slate-300 font-bold text-slate-950">
                    <td className="px-2.5 py-1.5 text-left border-r border-slate-200">
                      TOTAL MONTHLY P.CASH
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                      {projectExpenses.reduce((acc, p) => acc + p.entryCount, 0)}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                      100.0%
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-amber-800">
                      LKR {formatLKR(logTotalPCash)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Complete Daily Attendance & Petty Cash Logs */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2C5D] mb-2">
            3. Daily Attendance &amp; Petty Cash Ledger ({sortedLogs.length} entries)
          </h3>
          {sortedLogs.length === 0 ? (
            <div className="border border-slate-200 rounded px-3 py-3 text-[11px] text-slate-500">
              No daily attendance logs recorded for {monthLabel} {year}.
            </div>
          ) : (
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-[#0B2C5D] text-white">
                    <th className="px-2 py-1.5 text-left border-r border-white/20">Date</th>
                    <th className="px-2 py-1.5 text-left border-r border-white/20">Worker</th>
                    <th className="px-2 py-1.5 text-left border-r border-white/20">Project</th>
                    <th className="px-2 py-1.5 text-center border-r border-white/20">In / Out</th>
                    <th className="px-2 py-1.5 text-right border-r border-white/20">Days</th>
                    <th className="px-2 py-1.5 text-right border-r border-white/20">OT</th>
                    <th className="px-2 py-1.5 text-right border-r border-white/20">OT Amt</th>
                    <th className="px-2 py-1.5 text-right border-r border-white/20">P.Cash</th>
                    <th className="px-2 py-1.5 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedLogs.map((l) => {
                    const w = workers.find((x) => x.id === l.workerId);
                    const rate =
                      l.hourlyRate !== undefined ? Number(l.hourlyRate) || 0 : Number(w?.otHourlyRate ?? 0);
                    const otAmt = (Number(l.otHours) || 0) * rate;
                    const proj = l.siteProject || w?.siteProject || '—';
                    return (
                      <tr key={l.id}>
                        <td className="px-2 py-1 font-mono tabular-nums whitespace-nowrap border-r border-slate-200">
                          {l.date}
                        </td>
                        <td className="px-2 py-1 font-semibold text-slate-900 border-r border-slate-200">
                          {l.workerName}
                        </td>
                        <td className="px-2 py-1 text-slate-600 border-r border-slate-200">{proj}</td>
                        <td className="px-2 py-1 text-center font-mono tabular-nums whitespace-nowrap border-r border-slate-200">
                          {l.inTime} – {l.outTime}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums border-r border-slate-200">
                          {formatDays(l.dayUnits)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums border-r border-slate-200">
                          {formatDays(l.otHours)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums border-r border-slate-200">
                          {otAmt > 0 ? formatLKR(otAmt) : '-'}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-amber-800 border-r border-slate-200">
                          {l.pCash > 0 ? formatLKR(l.pCash) : '-'}
                        </td>
                        <td className="px-2 py-1 text-slate-600 max-w-[160px] break-words">
                          {l.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-[#0B2C5D] font-bold text-slate-950">
                    <td colSpan={4} className="px-2 py-1.5 text-left border-r border-slate-200">
                      LEDGER TOTAL ({sortedLogs.length} entries)
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                      {formatDays(logTotalDays)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums border-r border-slate-200">
                      {formatDays(logTotalOt)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[#0B2C5D] border-r border-slate-200">
                      {formatLKR(logTotalOtAmount)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-amber-800 border-r border-slate-200">
                      {formatLKR(logTotalPCash)}
                    </td>
                    <td className="px-2 py-1.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Memos / Remarks & Signatures */}
        {memos.length > 0 && (
          <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide mb-1.5">
              Remarks &amp; Monthly Memos
            </h4>
            <div className="space-y-1 text-[11px] text-slate-700">
              {memos.map((m) => (
                <div key={m.name}>
                  <span className="font-semibold text-slate-950">{m.name}:</span>{' '}
                  {[m.remarks, m.memo].filter(Boolean).join(' · ')}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-700">
          <div>
            <div className="font-semibold text-slate-900">Prepared By</div>
            <div className="mt-6 border-t border-slate-400 pt-1 w-48">{preparedBy}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-slate-900">Approved By</div>
            <div className="mt-6 border-t border-slate-400 pt-1 w-48 ml-auto">
              Director / Contractor
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MasterMonthlyReportDocument.displayName = 'MasterMonthlyReportDocument';
