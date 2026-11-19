import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, Building2, FileSpreadsheet, QrCode, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import type { Language, UserProfile } from '../types/payroll';
import { translations } from '../i18n/translations';
import { JkHouseLogo } from './BrandMark';

interface AuthViewProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenShareToken: (token: string) => void;
}

export const AuthSignInView: React.FC<AuthViewProps> = ({ lang, setLang, onOpenShareToken }) => {
  const t = translations[lang];
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [shareInput, setShareInput] = useState('');

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in right now.';
      setAuthError(message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = shareInput.trim();
    if (!raw) return;
    try {
      if (raw.includes('share=')) {
        const url = new URL(raw.startsWith('http') ? raw : `${window.location.origin}/${raw.replace(/^\/+/, '')}`);
        const token = url.searchParams.get('share');
        if (token) {
          onOpenShareToken(token);
          return;
        }
      }
    } catch {
      // fallback to direct token
    }
    onOpenShareToken(raw);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Clean 3-Zone Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <JkHouseLogo className="w-9 h-8" />
            <span className="font-display text-lg font-bold tracking-tight text-[#0B2C5D]">
              JK Dream Construction
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <span className="whitespace-nowrap shrink-0">Attendance Ledger</span>
            <span className="whitespace-nowrap shrink-0">Pay Sheet</span>
            <span className="whitespace-nowrap shrink-0">Salary Sheet</span>
            <span className="whitespace-nowrap shrink-0">QR Verification</span>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('ta')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'ta' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Left Auth & Lookup Column */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="text-xs font-semibold text-slate-500 tracking-wide">
            JK DREAM BUILDINGS CONSTRUCTION (PVT) LTD · COLOMBO 13
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight text-balance">
            {t.signInTitle}
          </h1>
          <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-xl">
            {t.signInSubtitle}
          </p>

          <div className="mt-8 bg-white border border-slate-200 rounded-xl p-6 max-w-md">
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'ta' ? 'நிறுவன நிர்வாகி உள்நுழைவு & பதிவு' : 'Contractor Sign-In & Registration'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {lang === 'ta'
                ? 'புதிய பயனர்கள் உள்நுழைந்ததும் நிறுவனப் பதிவு படிவம் திறக்கும்.'
                : 'New users complete a one-time contractor registration right after signing in.'}
            </p>

            {authError ? (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="mt-5 w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg bg-[#0B2C5D] text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <span>{signingIn ? 'Connecting...' : t.signInButton}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700">{t.workerLookupTitle}</div>
              <form onSubmit={handleLookupSubmit} className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={shareInput}
                  onChange={(e) => setShareInput(e.target.value)}
                  placeholder={t.workerLookupPlaceholder}
                  className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.workerLookupBtn}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-xl text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-[#0B2C5D] shrink-0 mt-0.5" />
              <span>Daily In/Out, Work Units &amp; P.Cash Register</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-[#0B2C5D] shrink-0 mt-0.5" />
              <span>Official Pay Sheet &amp; Individual Salary Sheet</span>
            </div>
            <div className="flex items-start gap-2.5">
              <QrCode className="w-4 h-4 text-[#0B2C5D] shrink-0 mt-0.5" />
              <span>Read-Only QR Code &amp; Download Link</span>
            </div>
          </div>
        </div>

        {/* Right Architectural Photography Column */}
        <div className="lg:col-span-6 flex">
          <div className="relative w-full min-h-[340px] lg:h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
            <img
              src="/src/assets/images/hero_construction_site_1795022023358.jpg"
              alt="JK Dream Buildings Construction site with architectural blueprints and safety hard hat"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Construction Payroll &amp; Site Ledger</span>
              </div>
              <p className="mt-2 font-display text-xl font-bold leading-snug">
                Build Today... Better Tomorrow...
              </p>
              <p className="mt-1 text-xs text-slate-300">
                50/15, Brass Founder Street, Colombo 13 · 077 706 9354 · 077 539 9031
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

interface ContractorRegisterProps {
  lang: Language;
  defaultName: string;
  email: string;
  initialProfile?: UserProfile | null;
  onSave: (data: {
    displayName: string;
    phone: string;
    designation: string;
    companyName: string;
    companyAddress: string;
    companyMobile: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export const ContractorRegistrationForm: React.FC<ContractorRegisterProps> = ({
  lang,
  defaultName,
  email,
  initialProfile,
  onSave,
  onCancel,
}) => {
  const t = translations[lang];
  const [displayName, setDisplayName] = useState(initialProfile?.displayName || defaultName || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [designation, setDesignation] = useState(initialProfile?.designation || 'Director / Contractor');
  const [companyName, setCompanyName] = useState(
    initialProfile?.companyName || 'JK DREAM BUILDINGS CONSTRUCTION (PVT) LTD'
  );
  const [companyAddress, setCompanyAddress] = useState(
    initialProfile?.companyAddress || '50/15, Brass Founder Street, Colombo 13.'
  );
  const [companyMobile, setCompanyMobile] = useState(
    initialProfile?.companyMobile || '077 706 9354 | 077 539 9031'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !companyName.trim() || !designation.trim()) {
      setError('Please complete all required registration fields.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        displayName: displayName.trim().slice(0, 80),
        phone: phone.trim().slice(0, 30),
        designation: designation.trim().slice(0, 60),
        companyName: companyName.trim().slice(0, 120),
        companyAddress: companyAddress.trim().slice(0, 200),
        companyMobile: companyMobile.trim().slice(0, 60),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save registration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <JkHouseLogo className="w-12 h-10" />
          <div>
            <h1 className="font-display text-xl font-bold text-slate-950">{t.registerProfileTitle}</h1>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">{t.registerProfileSubtitle}</p>

        {error ? (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.fullName} *</label>
              <input
                type="text"
                required
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.designation} *</label>
              <input
                type="text"
                required
                maxLength={60}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.phone}</label>
            <input
              type="text"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="077 706 9354"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.companyName} *</label>
            <input
              type="text"
              required
              maxLength={120}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.companyAddress}</label>
            <input
              type="text"
              maxLength={200}
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.companyMobile}</label>
            <input
              type="text"
              maxLength={60}
              value={companyMobile}
              onChange={(e) => setCompanyMobile(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2C5D]/20 focus:border-[#0B2C5D]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                {t.cancel}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2C5D] rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving...' : t.completeRegistration}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
