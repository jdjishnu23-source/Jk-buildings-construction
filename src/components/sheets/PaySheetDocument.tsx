import React from 'react';
import { formatDays, formatLKR } from '../../lib/payrollCalc';
import { JkHouseLogo } from '../BrandMark';

export interface PaySheetRowData {
  employeeName: string;
  designation: string;
  workingDays: number;
  dailyRate: number;
  totalAmount: number;
  advance: number;
  netPay: number;
  signature?: string;
}

export interface PaySheetDocumentProps {
  companyName?: string;
  monthLabel: string;
  year: string;
  department: string;
  project: string;
  rows: PaySheetRowData[];
  remarks?: string;
  monthlyMemo?: string;
  preparedBy?: string;
}

export const PaySheetDocument = React.forwardRef<HTMLDivElement, PaySheetDocumentProps>(
  (
    {
      companyName = 'JK DREAM BUILDING CONSTRUCTION',
      monthLabel,
      year,
      department,
      project,
      rows,
      remarks = '',
      monthlyMemo = '',
      preparedBy = 'HR / Admin',
    },
    ref
  ) => {
    const totalGross = rows.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    const totalAdvance = rows.reduce((sum, r) => sum + (Number(r.advance) || 0), 0);
    const totalNet = rows.reduce((sum, r) => sum + (Number(r.netPay) || 0), 0);
    const minRows = Math.max(5, rows.length);

    return (
      <div
        ref={ref}
        className="print-only-container bg-white text-slate-900 w-full max-w-[920px] mx-auto border border-slate-300 shadow-sm overflow-hidden"
      >
        {/* Branded Header */}
        <div className="px-6 pt-5 pb-3 bg-gradient-to-b from-sky-50/70 to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <JkHouseLogo className="w-20 h-16 shrink-0" />
              <div className="text-left">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B2C5D] leading-tight">
                  {companyName}
                </h2>
                <div className="mt-0.5 inline-block bg-[#FACC15] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#0B2C5D]">
                  BUILDING CONSTRUCTION
                </div>
                <p className="mt-1 text-xs italic font-medium text-slate-700">
                  Build Today... Better Tomorrow...
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Residential · Commercial · Renovation · Construction Works
                </p>
              </div>
            </div>

            {/* Subtle architectural blueprint motif */}
            <div className="hidden sm:flex items-center gap-2 text-right">
              <svg viewBox="0 0 120 64" className="w-28 h-14" fill="none" aria-hidden="true">
                <rect x="6" y="18" width="44" height="40" stroke="#0B2C5D" strokeWidth="1.5" fill="#EFF6FF" />
                <line x1="6" y1="30" x2="50" y2="30" stroke="#0B2C5D" strokeWidth="1" />
                <line x1="28" y1="18" x2="28" y2="58" stroke="#0B2C5D" strokeWidth="1" />
                <path d="M56 54 C60 36, 74 26, 90 26 C106 26, 114 38, 116 54 Z" fill="#FACC15" stroke="#A16207" strokeWidth="1.5" />
                <path d="M50 54 L118 54" stroke="#A16207" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="mt-3 flex justify-center">
            <div className="bg-[#0B2C5D] text-white px-10 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase">
              PAY SHEET
            </div>
          </div>
        </div>

        {/* Metadata Info Grid */}
        <div className="px-6 py-3">
          <div className="bg-[#EFF6FF] border border-[#0B2C5D]/40 rounded-lg px-4 py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0B2C5D] w-24 shrink-0">Month</span>
              <span className="font-bold text-[#0B2C5D]">:</span>
              <span className="flex-1 border-b border-slate-500 pb-0.5 font-semibold text-slate-900">
                {monthLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0B2C5D] w-20 shrink-0">Year</span>
              <span className="font-bold text-[#0B2C5D]">:</span>
              <span className="flex-1 border-b border-slate-500 pb-0.5 font-mono font-semibold text-slate-900">
                {year}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0B2C5D] w-24 shrink-0">Department</span>
              <span className="font-bold text-[#0B2C5D]">:</span>
              <span className="flex-1 border-b border-slate-500 pb-0.5 font-semibold text-slate-900">
                {department || 'Construction'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0B2C5D] w-20 shrink-0">Project</span>
              <span className="font-bold text-[#0B2C5D]">:</span>
              <span className="flex-1 border-b border-slate-500 pb-0.5 font-semibold text-slate-900">
                {project || 'All Sites'}
              </span>
            </div>
          </div>
        </div>

        {/* Pay Sheet Table */}
        <div className="px-6 pb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-[#0B2C5D] text-xs">
            <thead>
              <tr className="bg-[#0B2C5D] text-white">
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold w-10">No.</th>
                <th className="border border-slate-400 px-2.5 py-2 text-left font-semibold">Employee Name</th>
                <th className="border border-slate-400 px-2.5 py-2 text-left font-semibold">Designation</th>
                <th className="border border-slate-400 px-2 py-2 text-right font-semibold">Working Days</th>
                <th className="border border-slate-400 px-2 py-2 text-right font-semibold">Daily Rate (LKR)</th>
                <th className="border border-slate-400 px-2 py-2 text-right font-semibold">Total Amount</th>
                <th className="border border-slate-400 px-2 py-2 text-right font-semibold">Advance</th>
                <th className="border border-slate-400 px-2 py-2 text-right font-semibold">Net Pay</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold w-24">Signature</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: minRows }).map((_, index) => {
                const row = rows[index];
                return (
                  <tr key={index} className="h-9 bg-white">
                    <td className="border border-slate-700 px-2 py-1.5 text-center font-mono font-semibold text-slate-800">
                      {index + 1}.
                    </td>
                    <td className="border border-slate-700 px-2.5 py-1.5 font-semibold text-slate-900">
                      {row ? row.employeeName : ''}
                    </td>
                    <td className="border border-slate-700 px-2.5 py-1.5 text-slate-700">
                      {row ? row.designation : ''}
                    </td>
                    <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums text-slate-900">
                      {row ? formatDays(row.workingDays) : ''}
                    </td>
                    <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums text-slate-900">
                      {row ? formatLKR(row.dailyRate) : ''}
                    </td>
                    <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums text-slate-900">
                      {row ? formatLKR(row.totalAmount) : ''}
                    </td>
                    <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums text-slate-900">
                      {row ? formatLKR(row.advance) : ''}
                    </td>
                    <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums font-bold text-[#0B2C5D]">
                      {row ? formatLKR(row.netPay) : ''}
                    </td>
                    <td className="border border-slate-700 px-2 py-1.5 text-center text-[11px] italic text-slate-600">
                      {row?.signature || ''}
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-[#DBEAFE] font-bold text-slate-950 h-9">
                <td colSpan={5} className="border border-slate-700 px-3 py-1.5 text-center text-sm tracking-wide">
                  Total
                </td>
                <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums">
                  {formatLKR(totalGross)}
                </td>
                <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums">
                  {formatLKR(totalAdvance)}
                </td>
                <td className="border border-slate-700 px-2 py-1.5 text-right font-mono tabular-nums text-[#0B2C5D]">
                  {formatLKR(totalNet)}
                </td>
                <td className="border border-slate-700 px-2 py-1.5" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Monthly Memo */}
        {monthlyMemo.trim() ? (
          <div className="px-6 pb-3">
            <div className="border border-[#0B2C5D]/40 bg-amber-50/50 rounded-lg px-3.5 py-2.5">
              <div className="text-xs font-bold text-[#0B2C5D]">Monthly Memo:</div>
              <p className="mt-1 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {monthlyMemo.trim()}
              </p>
            </div>
          </div>
        ) : null}

        {/* Remarks & Signatures */}
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 border border-[#0B2C5D]/40 bg-[#EFF6FF]/60 rounded-lg p-3 min-h-[82px]">
            <div className="text-xs font-bold text-[#0B2C5D]">Remarks:</div>
            <p className="mt-1 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {remarks || 'Monthly wages verified against daily attendance & petty cash ledger.'}
            </p>
          </div>

          <div className="md:col-span-4 text-center py-2">
            <p className="text-sm italic font-bold text-[#0B2C5D]">Thank you for your hard work!</p>
            <div className="mx-auto mt-1 h-0.5 w-40 bg-[#FACC15]" />
          </div>

          <div className="md:col-span-4 grid grid-cols-2 gap-3">
            <div className="border border-[#0B2C5D]/40 rounded-lg p-2.5 text-center">
              <div className="text-[11px] font-bold text-[#0B2C5D]">Prepared By</div>
              <div className="mt-6 border-t border-slate-600 pt-1 text-[11px] font-semibold text-slate-700">
                {preparedBy}
              </div>
            </div>
            <div className="border border-[#0B2C5D]/40 rounded-lg p-2.5 text-center">
              <div className="text-[11px] font-bold text-[#0B2C5D]">Approved By</div>
              <div className="mt-6 border-t border-slate-600 pt-1 text-[11px] font-semibold text-slate-700">
                Director
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navy & Gold Branded Wave */}
        <div className="relative bg-[#0B2C5D] text-white px-6 py-3 border-t-4 border-[#FACC15]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-bold italic text-sm">JK Dream Building Construction</div>
              <div className="text-[11px] italic text-amber-200">Together We Build a Stronger Future</div>
            </div>
            <div className="text-[11px] text-slate-200 font-mono">
              Colombo 13 · Official Payroll Document
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PaySheetDocument.displayName = 'PaySheetDocument';
