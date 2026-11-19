import React from 'react';
import { formatLKR } from '../../lib/payrollCalc';
import type { AttendanceLogSnapshot } from '../../types/payroll';
import { JkBuildingsIcon } from '../BrandMark';

export interface AttendanceLogDocumentProps {
  companyName?: string;
  companyAddress?: string;
  companyMobile?: string;
  monthLabel: string;
  year: string;
  entries: AttendanceLogSnapshot[];
  monthlyMemo?: string;
}

export const AttendanceLogDocument = React.forwardRef<HTMLDivElement, AttendanceLogDocumentProps>(
  (
    {
      companyName = 'JK DREAM BUILDINGS CONSTRUCTION (PVT) LTD',
      companyAddress = '50/15, Brass Founder Street, Colombo 13.',
      companyMobile = '077 706 9354 | 077 539 9031',
      monthLabel,
      year,
      entries,
      monthlyMemo = '',
    },
    ref
  ) => {
    const minRows = Math.max(16, entries.length);
    const totalPCash = entries.reduce((sum, item) => sum + (Number(item.pCash) || 0), 0);
    const totalDayUnits = entries.reduce((sum, item) => sum + (Number(item.dayUnits) || 0), 0);

    return (
      <div
        ref={ref}
        className="print-only-container bg-white text-slate-900 w-full max-w-[820px] mx-auto border border-slate-300 shadow-sm p-5 sm:p-6"
      >
        {/* Top Letterhead Header matching Image 1 */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-[#1D6FA5]">
          <div className="flex-1 text-center">
            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#1D6FA5] uppercase leading-tight">
              {companyName}
            </h2>
            <p className="mt-1 text-[11px] sm:text-xs font-medium text-slate-800">
              Address: {companyAddress} | Mobile: {companyMobile}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Daily Attendance &amp; Petty Cash Sheet · {monthLabel} {year}
            </p>
          </div>
          <JkBuildingsIcon className="w-16 h-12 shrink-0 hidden sm:block" />
        </div>

        {/* Register Grid Table matching Image 1 columns: Date | Name | In | Out | P.cash | Signature */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-900">
                <th className="border border-slate-800 px-2.5 py-2 text-left font-bold w-24">Date</th>
                <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">Name</th>
                <th className="border border-slate-800 px-2 py-2 text-center font-bold w-20">In</th>
                <th className="border border-slate-800 px-2 py-2 text-center font-bold w-20">Out</th>
                <th className="border border-slate-800 px-2.5 py-2 text-right font-bold w-24">P.cash</th>
                <th className="border border-slate-800 px-2.5 py-2 text-center font-bold w-28">Signature</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: minRows }).map((_, index) => {
                const entry = entries[index];
                return (
                  <tr key={index} className="h-8">
                    <td className="border border-slate-800 px-2.5 py-1 font-mono tabular-nums text-slate-800">
                      {entry ? entry.date : ''}
                    </td>
                    <td className="border border-slate-800 px-2.5 py-1 font-medium text-slate-900">
                      {entry ? (
                        <span>
                          {entry.name}
                          {entry.dayUnits !== 1 ? (
                            <span className="ml-1.5 text-[10px] font-mono text-slate-500">
                              ({entry.dayUnits}d)
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="border border-slate-800 px-2 py-1 text-center font-mono tabular-nums text-slate-700">
                      {entry ? entry.inTime : ''}
                    </td>
                    <td className="border border-slate-800 px-2 py-1 text-center font-mono tabular-nums text-slate-700">
                      {entry ? entry.outTime : ''}
                    </td>
                    <td className="border border-slate-800 px-2.5 py-1 text-right font-mono tabular-nums text-slate-900">
                      {entry && entry.pCash > 0 ? formatLKR(entry.pCash) : entry ? '-' : ''}
                    </td>
                    <td className="border border-slate-800 px-2.5 py-1 text-center italic text-slate-700">
                      {entry ? entry.signature : ''}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-bold h-9">
                <td colSpan={2} className="border border-slate-800 px-2.5 py-1.5 text-left">
                  Total ({entries.length} entries · {totalDayUnits} work days)
                </td>
                <td colSpan={2} className="border border-slate-800 px-2.5 py-1.5 text-right">
                  Total P.cash (LKR)
                </td>
                <td className="border border-slate-800 px-2.5 py-1.5 text-right font-mono tabular-nums">
                  {formatLKR(totalPCash)}
                </td>
                <td className="border border-slate-800 px-2.5 py-1.5" />
              </tr>
            </tbody>
          </table>
        </div>

        {monthlyMemo.trim() ? (
          <div className="mt-3 border border-slate-800 bg-slate-50 px-3 py-2 text-xs">
            <div className="font-bold text-slate-900">Monthly Memo:</div>
            <p className="mt-0.5 text-slate-800 leading-relaxed whitespace-pre-wrap">
              {monthlyMemo.trim()}
            </p>
          </div>
        ) : null}
      </div>
    );
  }
);

AttendanceLogDocument.displayName = 'AttendanceLogDocument';
