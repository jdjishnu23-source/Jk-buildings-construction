import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { AuthSignInView, ContractorRegistrationForm } from './components/AuthAndRegisterView';
import { DashboardApp } from './components/DashboardApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkerPublicPortal } from './components/WorkerPublicPortal';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import type { Language, UserProfile } from './types/payroll';

function getInitialShareToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('share');
  if (fromQuery && fromQuery.trim().length >= 16) {
    return fromQuery.trim();
  }
  const match = window.location.pathname.match(/^\/share\/([a-zA-Z0-9_-]{16,64})$/);
  return match ? match[1] : null;
}

function AppContent() {
  const [lang, setLang] = useState<Language>('en');
  const [shareToken, setShareToken] = useState<string | null>(() => getInitialShareToken());

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Listen to browser back/forward navigation for share links
  useEffect(() => {
    const handlePopState = () => {
      setShareToken(getInitialShareToken());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfileLoading(true);
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const openShareToken = (token: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('share', token);
    window.history.pushState({}, '', url.toString());
    setShareToken(token);
  };

  const exitSharePortal = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    if (url.pathname.startsWith('/share/')) {
      url.pathname = '/';
    }
    window.history.pushState({}, '', url.toString());
    setShareToken(null);
  };

  // Priority 1: Read-Only Worker QR / Share Link Portal (no login needed!)
  if (shareToken) {
    return (
      <WorkerPublicPortal
        shareToken={shareToken}
        lang={lang}
        setLang={setLang}
        onExitToPortal={exitSharePortal}
      />
    );
  }

  // Priority 2: Wait for auth initialization
  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-500">Loading JK Dream Construction Portal...</div>
      </div>
    );
  }

  // Priority 3: Unauthenticated -> Sign-In / Worker Lookup Screen
  if (!user) {
    return (
      <AuthSignInView
        lang={lang}
        setLang={setLang}
        onOpenShareToken={openShareToken}
      />
    );
  }

  // Priority 4: Authenticated first-time user -> Complete Registration Form
  if (!profile) {
    return (
      <ContractorRegistrationForm
        lang={lang}
        defaultName={user.displayName || ''}
        email={user.email || ''}
        onSave={async (data) => {
          const docRef = doc(db, 'users', user.uid);
          try {
            await setDoc(docRef, {
              uid: user.uid,
              email: (user.email || '').slice(0, 120),
              ...data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            const freshSnap = await getDoc(docRef);
            if (freshSnap.exists()) {
              setProfile(freshSnap.data() as UserProfile);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          }
        }}
      />
    );
  }

  // Priority 5: Registered & Authenticated Contractor Dashboard
  return (
    <DashboardApp
      user={user}
      profile={profile}
      onUpdateProfile={async (data) => {
        const docRef = doc(db, 'users', user.uid);
        try {
          await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
          });
          const freshSnap = await getDoc(docRef);
          if (freshSnap.exists()) {
            setProfile(freshSnap.data() as UserProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }}
      lang={lang}
      setLang={setLang}
      onPreviewShare={openShareToken}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
