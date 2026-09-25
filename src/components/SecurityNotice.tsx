import React, { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface SecurityNoticeProps {
  enabled: boolean;
  onDisableTemporary?: () => void;
}

export const SecurityNotice: React.FC<SecurityNoticeProps> = ({ enabled, onDisableTemporary }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showToast('Right-click is restricted by Election Commission security protocol.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === 'F12') {
        e.preventDefault();
        showToast('Developer console shortcuts (F12) are restricted on this page.');
        return;
      }

      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        showToast('Source view shortcut (Ctrl+U) is restricted.');
        return;
      }

      // Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+Shift+C (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) {
        e.preventDefault();
        showToast('Inspection tools shortcut is disabled by security protocol.');
        return;
      }
    };

    let timer: NodeJS.Timeout;
    const showToast = (msg: string) => {
      setToastMessage(msg);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [enabled]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900/95 border border-rose-500/40 text-slate-100 p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-bounce">
      <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
        <ShieldAlert className="w-4 h-4" />
      </div>
      <div className="flex-1 text-xs">
        <strong className="block font-semibold text-rose-300 mb-0.5">Security Notice</strong>
        <p className="text-slate-300">{toastMessage}</p>
        {onDisableTemporary && (
          <button
            onClick={onDisableTemporary}
            className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
          >
            Allow developer inspection
          </button>
        )}
      </div>
      <button
        onClick={() => setToastMessage(null)}
        className="text-slate-400 hover:text-white p-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
