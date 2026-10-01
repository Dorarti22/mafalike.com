import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { api } from './api.ts';
import { PublicSettings } from './types.ts';
import { PublicPlatform } from './components/PublicPlatform.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<'public' | 'admin'>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (path.includes('/admin') || params.get('mode') === 'admin') {
      return 'admin';
    }
    return 'public';
  });

  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function showToast(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success'
  ) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }

  function loadPublicSettings() {
    api
      .getPublicSettings()
      .then((res) => setPublicSettings(res))
      .catch((err) => console.error('Failed to load public settings:', err));
  }

  useEffect(() => {
    loadPublicSettings();
  }, []);

  return (
    <>
      {workspaceMode === 'admin' ? (
        <AdminPanel
          onSwitchToPublic={() => setWorkspaceMode('public')}
          showToast={showToast}
          publicSettings={publicSettings}
          onRefreshPublicSettings={loadPublicSettings}
        />
      ) : (
        <PublicPlatform
          onSwitchToAdmin={() => setWorkspaceMode('admin')}
          showToast={showToast}
          publicSettings={publicSettings}
        />
      )}

      {/* GLOBAL TOAST CONTAINER */}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
        {toasts.map((t) => {
          const borderMap = {
            success: 'border-l-emerald-500',
            error: 'border-l-rose-500',
            info: 'border-l-indigo-500',
            warning: 'border-l-amber-500',
          };
          const iconMap = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
            info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          };
          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-white rounded-2xl p-3.5 shadow-xl border border-slate-200/80 border-l-4 ${borderMap[t.type]} flex items-center gap-3`}
            >
              {iconMap[t.type]}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold capitalize text-slate-900">{t.type}</div>
                <div className="text-xs text-slate-600 break-words">{t.message}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
