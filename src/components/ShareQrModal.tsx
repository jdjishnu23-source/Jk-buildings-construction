import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink, QrCode, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatLKR, generateSecureShareToken } from '../lib/payrollCalc';
import type { Language, UserProfile, WorkerMonthlySummary } from '../types/payroll';
import { translations } from '../i18n/translations';

interface ShareQrModalProps {
  open: boolean;
  onClose: () => void;
  summary: WorkerMonthlySummary | null;
  profile: UserProfile;
  ownerId: string;
  lang: Language;
  onPreviewShare: (token: string) => void;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  open,
  onClose,
  summary,
  profile,
  ownerId,
  lang,
  onPreviewShare,
}) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !summary) return;
    let cancelled = false;

    const publishSnapshot = async () => {
      setLoading(true);
      setError(null);
      setCopied(false);
      try {
        // Check if an existing shareToken already exists for this owner + worker + month
        const existingQuery = query(
          collection(db, 'sharedReports'),
          where('ownerId', '==', ownerId),
          where('workerId', '==', summary.worker.id),
          where('monthKey', '==', summary.monthKey)
        );
        const snap = await getDocs(existingQuery);
        let token = snap.docs[0]?.id;
        const isExisting = Boolean(token);
        if (!token) {
          token = generateSecureShareToken(summary.worker.id, summary.monthKey);
        }

        const boundedLogs = summary.logs.slice(0, 45).map((l) => ({
          date: l.date.slice(0, 16),
          name: l.workerName.slice(0, 80),
          inTime: (l.inTime || '-').slice(0, 16),
          outTime: (l.outTime || '-').slice(0, 16),
          pCash: Math.max(0, Number(l.pCash) || 0),
          signature: (l.signature || '').slice(0, 60),
          dayUnits: Math.max(0, Math.min(2, Number(l.dayUnits) || 0)),
          otHours: Math.max(0, Math.min(24, Number(l.otHours) || 0)),
          notes: (l.notes || '').slice(0, 160),
        }));

        const commonPayload = {
          monthKey: summary.monthKey,
          companyName: (profile.companyName || 'JK DREAM BUILDINGS CONSTRUCTION (PVT) LTD').slice(0, 120),
          companyAddress: (profile.companyAddress || '50/15, Brass Founder Street, Colombo 13.').slice(0, 200),
          companyMobile: (profile.companyMobile || '077 706 9354 | 077 539 9031').slice(0, 60),
          employeeName: summary.worker.name.slice(0, 80),
          employeeId: summary.worker.employeeId.slice(0, 32),
          designation: summary.worker.designation.slice(0, 60),
          department: summary.department.slice(0, 60),
          siteProject: summary.project.slice(0, 100),
          monthLabel: summary.monthLabel.slice(0, 30),
          year: summary.year.slice(0, 4),
          paymentDate: summary.paymentDate.slice(0, 20),
          daysWorked: Math.max(0, summary.daysWorked),
          dailyRate: Math.max(0, summary.worker.dailyRate),
          otHours: Math.max(0, summary.otHours),
          basicSalary: Math.max(0, summary.basicSalary),
          allowances: Math.max(0, summary.allowances),
          overtimePay: Math.max(0, summary.overtimePay),
          grossSalary: Math.max(0, summary.grossSalary),
          totalAdvance: Math.max(0, summary.totalAdvance),
          netSalaryPayable: summary.netSalaryPayable,
          remarks: (summary.remarks || '').slice(0, 300),
          monthlyMemo: (summary.monthlyMemo || '').slice(0, 500),
          attendanceLogs: boundedLogs,
          updatedAt: serverTimestamp(),
        };

        const docRef = doc(db, 'sharedReports', token);
        if (isExisting) {
          await updateDoc(docRef, commonPayload);
        } else {
          await setDoc(docRef, {
            ...commonPayload,
            shareToken: token,
            ownerId,
            workerId: summary.worker.id,
            createdAt: serverTimestamp(),
          });
        }

        if (!cancelled) {
          setShareToken(token);
        }
      } catch (err) {
        if (!cancelled) {
          try {
            handleFirestoreError(err, OperationType.WRITE, 'sharedReports');
          } catch (formattedErr) {
            setError(formattedErr instanceof Error ? formattedErr.message : 'Unable to generate share link.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void publishSnapshot();
    return () => {
      cancelled = true;
    };
  }, [open, summary, profile, ownerId]);

  if (!open || !summary) return null;

  const shareUrl = shareToken ? `${window.location.origin}/?share=${shareToken}` : '';

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQrPng = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `JK_QR_${summary.worker.employeeId}_${summary.monthKey}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-[#0B2C5D]" />
            <h3 className="font-display text-base font-bold text-slate-900">{t.shareModalTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-xs text-slate-600 leading-relaxed">{t.shareModalDesc}</div>

          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-900">{summary.worker.name}</div>
              <div className="text-slate-500">
                {summary.worker.employeeId} · {summary.monthLabel} {summary.year}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-500">Net Payable</div>
              <div className="font-mono tabular-nums font-bold text-[#0B2C5D] text-sm">
                LKR {formatLKR(summary.netSalaryPayable)}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Generating QR &amp; read-only link...</div>
          ) : shareToken ? (
            <div className="mt-5 flex flex-col items-center">
              <div className="p-4 bg-white border-2 border-[#0B2C5D] rounded-xl">
                <QRCodeSVG
                  value={shareUrl}
                  size={188}
                  bgColor="#FFFFFF"
                  fgColor="#0B2C5D"
                  level="M"
                />
              </div>
              {/* Hidden high-res canvas for PNG download */}
              <div ref={qrCanvasRef} className="hidden" aria-hidden="true">
                <QRCodeCanvas value={shareUrl} size={420} marginSize={3} bgColor="#FFFFFF" fgColor="#0B2C5D" />
              </div>

              <div className="mt-4 w-full">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Read-Only Worker Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 text-xs font-semibold bg-[#0B2C5D] text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t.copied : t.copyLink}</span>
                  </button>
                </div>
              </div>

              <div className="mt-5 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="w-full px-4 py-2.5 text-xs font-semibold border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadQr}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPreviewShare(shareToken);
                  }}
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t.previewPortal}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
