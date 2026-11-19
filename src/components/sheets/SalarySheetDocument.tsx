import React from 'react';
import { formatDays, formatLKR } from '../../lib/payrollCalc';
import { JkHouseLogo, SafetyHelmetGraphic } from '../BrandMark';

export interface SalarySheetDocumentProps {
  companyName?: string;
  employeeName: string;
  employeeId: string;
  designation: string;
  siteProject: string;
  payMonth: string;
  paymentDate: string;
  daysWorked: number;
  dailyRate: number;
  otHours: number;
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  grossSalary: number;
  salaryAdvance: number;
  netSalaryPayable: number;
  remarks?: string;
  monthlyMemo?: string;
}

export const SalarySheetDocument = React.forwardRef<HTMLDivElement, SalarySheetDocumentProps>(
  (
    {
      companyName = 'JK DREAM BUILDING CONSTRUCTION',
      employeeName,
      employeeId,
      designation,
      siteProject,
      payMonth,
      paymentDate,
      daysWorked,
      dailyRate,
      otHours,
      basicSalary,
      allowances,
      overtimePay,
      grossSalary,
      salaryAdvance,
      netSalaryPayable,
      remarks,
      monthlyMemo = '',
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="print-only-container bg-white text-slate-900 w-full max-w-[780px] mx-auto border border-slate-300 shadow-sm overflow-hidden"
      >
        {/* Top Branded Header */}
        <div className="px-6 pt-5 pb-3 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <JkHouseLogo className="w-20 h-16 shrink-0" />
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B2C5D] leading-tight">
                  {companyName}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-0.5 w-6 bg-[#EAB308]" />
                  <span className="text-xs italic font-semibold text-slate-700">
                    Build Today... Better Tomorrow...
                  </span>
                  <span className="h-0.5 w-6 bg-[#EAB308]" />
                </div>
              </div>
            </div>

            <div className="hidden sm:block">
              <SafetyHelmetGraphic className="w-20 h-14" />
            </div>
          </div>

          {/* Individual Salary Pay Sheet Banner */}
          <div className="mt-3 bg-[#0B2C5D] border-2 border-[#EAB308] rounded-md py-1.5 px-4 text-center">
            <span className="text-sm sm:text-base font-extrabold tracking-wider text-white uppercase">
              INDIVIDUAL SALARY PAY SHEET
            </span>
          </div>
        </div>

        {/* Employee & Pay Period Details Box */}
        <div className="px-6 pb-4">
          <div className="border-2 border-[#0B2C5D] rounded-lg px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="space-y-2 sm:border-r sm:border-[#0B2C5D]/40 sm:pr-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-32 shrink-0">Employee Name</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-semibold text-slate-900">
                  {employeeName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-32 shrink-0">Employee ID</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-mono font-semibold text-slate-900">
                  {employeeId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-32 shrink-0">Designation / Trade</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-semibold text-slate-900">
                  {designation}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-32 shrink-0">Site / Project</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-semibold text-slate-900">
                  {siteProject}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-28 shrink-0">Pay Month</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-semibold text-slate-900">
                  {payMonth}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-28 shrink-0">Payment Date</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-mono font-semibold text-slate-900">
                  {paymentDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-28 shrink-0">Days Worked</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-mono font-semibold text-slate-900">
                  {formatDays(daysWorked)} days @ LKR {formatLKR(dailyRate)}/day
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B2C5D] w-28 shrink-0">OT Hours</span>
                <span className="font-bold text-[#0B2C5D]">:</span>
                <span className="flex-1 border-b border-slate-500 pb-0.5 font-mono font-semibold text-slate-900">
                  {formatDays(otHours)} hrs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* EARNINGS TABLE */}
        <div className="px-6 pb-4">
          <table className="w-full border-collapse border-2 border-[#0B2C5D] text-sm">
            <thead>
              <tr className="bg-[#0B2C5D] text-white">
                <th className="border border-slate-400 px-4 py-2 text-center font-bold tracking-wide w-2/3">
                  EARNINGS
                </th>
                <th className="border border-slate-400 px-4 py-2 text-center font-bold tracking-wide w-1/3">
                  AMOUNT (LKR)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 font-semibold text-slate-900">
                  Basic Salary
                  <span className="ml-2 text-xs font-normal text-slate-500 font-mono">
                    ({formatDays(daysWorked)} × {formatLKR(dailyRate)})
                  </span>
                </td>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatLKR(basicSalary)}
                </td>
              </tr>
              <tr>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 font-semibold text-slate-900">
                  Allowances
                </td>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatLKR(allowances)}
                </td>
              </tr>
              <tr>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 font-semibold text-slate-900">
                  Overtime
                </td>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatLKR(overtimePay)}
                </td>
              </tr>
              <tr className="bg-[#DBEAFE]">
                <td className="border border-[#0B2C5D] px-4 py-2 font-extrabold text-[#0B2C5D] text-base">
                  Gross Salary
                </td>
                <td className="border border-[#0B2C5D] px-4 py-2 text-right font-mono tabular-nums font-extrabold text-[#0B2C5D] text-base">
                  {formatLKR(grossSalary)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DEDUCTIONS TABLE */}
        <div className="px-6 pb-4">
          <table className="w-full border-collapse border-2 border-[#0B2C5D] text-sm">
            <thead>
              <tr className="bg-[#0B2C5D] text-white">
                <th className="border border-slate-400 px-4 py-2 text-center font-bold tracking-wide w-2/3">
                  DEDUCTIONS
                </th>
                <th className="border border-slate-400 px-4 py-2 text-center font-bold tracking-wide w-1/3">
                  AMOUNT (LKR)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 font-semibold text-slate-900">
                  Salary Advance / P.Cash (Expenses)
                </td>
                <td className="border border-[#0B2C5D]/60 px-4 py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatLKR(salaryAdvance)}
                </td>
              </tr>
              <tr className="bg-[#DBEAFE]">
                <td className="border border-[#0B2C5D] px-4 py-2 font-extrabold text-[#0B2C5D] text-base">
                  Total Deductions
                </td>
                <td className="border border-[#0B2C5D] px-4 py-2 text-right font-mono tabular-nums font-extrabold text-[#0B2C5D] text-base">
                  {formatLKR(salaryAdvance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net Salary Payable Banner */}
        <div className="px-6 pb-4">
          <div className="bg-[#F59E0B] rounded-lg px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-base sm:text-lg font-extrabold text-[#0B2C5D]">
              Net Salary Payable (LKR)
            </span>
            <div className="bg-white border-2 border-[#0B2C5D] rounded-md px-5 py-1.5 min-w-[200px] text-right font-mono tabular-nums text-lg font-extrabold text-[#0B2C5D]">
              LKR {formatLKR(netSalaryPayable)}
            </div>
          </div>
          {remarks ? (
            <p className="mt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Remarks:</span> {remarks}
            </p>
          ) : null}
          {monthlyMemo.trim() ? (
            <div className="mt-2.5 border border-[#0B2C5D]/40 bg-amber-50/50 rounded-lg px-3.5 py-2.5">
              <div className="text-xs font-bold text-[#0B2C5D]">Monthly Memo:</div>
              <p className="mt-0.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {monthlyMemo.trim()}
              </p>
            </div>
          ) : null}
        </div>

        {/* Signatures Row */}
        <div className="px-6 pt-5 pb-6 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="border-t-2 border-[#0B2C5D] pt-1.5 font-bold text-[#0B2C5D]">
              Employee Signature
            </div>
          </div>
          <div>
            <div className="border-t-2 border-[#0B2C5D] pt-1.5 font-bold text-[#0B2C5D]">
              Authorized Signature
            </div>
            <div className="text-[10px] text-slate-600">(For JK Dream Building Construction)</div>
          </div>
          <div>
            <div className="border-t-2 border-[#0B2C5D] pt-1.5 font-bold text-[#0B2C5D]">
              Date: <span className="font-mono font-normal text-slate-800">{paymentDate}</span>
            </div>
          </div>
        </div>

        {/* Bottom Branded Strip */}
        <div className="bg-[#0B2C5D] border-t-4 border-[#EAB308] px-6 py-3 flex items-center justify-between text-white text-xs">
          <span className="font-semibold italic text-amber-200">
            JK Dream Building Construction · Together We Build a Stronger Future
          </span>
          <SafetyHelmetGraphic className="w-12 h-8" />
        </div>
      </div>
    );
  }
);

SalarySheetDocument.displayName = 'SalarySheetDocument';
