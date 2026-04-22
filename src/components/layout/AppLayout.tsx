import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { ErrorBoundary } from './ErrorBoundary';
import { useIdleLogout } from '../../hooks/useIdleLogout';
import { useT } from '../../i18n/LanguageContext';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useT();
  const location = useLocation();
  useIdleLogout();

  return (
    <div className="min-h-screen bg-gray-bg print:bg-white">
      <div className="hidden-print">
        <Sidebar collapsed={collapsed} />
      </div>
      <div className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'} print:!ml-0`}>
        <div className="hidden-print">
          <TopNav onToggleSidebar={() => setCollapsed((c) => !c)} />
        </div>
        <main>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200 mt-8 hidden-print">
          <p>{t.footerText}</p>
        </footer>
      </div>
    </div>
  );
}
