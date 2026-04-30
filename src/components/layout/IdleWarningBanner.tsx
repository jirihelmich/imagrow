import { Clock } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext';

interface Props {
  remainingMs: number;
  onDismiss: () => void;
}

export function IdleWarningBanner({ remainingMs, onDismiss }: Props) {
  const { t } = useT();
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-100 border-b border-amber-300 px-4 py-3 flex items-center justify-between gap-4 shadow hidden-print">
      <div className="flex items-center gap-3 min-w-0">
        <Clock size={20} className="text-amber-700 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">{t.idleWarningTitle}</p>
          <p className="text-xs text-amber-800">{t.idleWarningMessage(formatted)}</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded shrink-0"
      >
        {t.idleWarningDismiss}
      </button>
    </div>
  );
}
