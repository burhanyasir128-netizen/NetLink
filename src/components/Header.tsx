import React from 'react';
import { ActiveTab, SystemSettings } from '../types';
import { ShieldCheck, Moon, Sun, UserCheck, UserPlus, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  settings: SystemSettings;
  onOpenSettings?: () => void;
  onToggleSecurity?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  settings,
  onToggleSecurity,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Official Emblem & Branding */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab('register')}>
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 border border-emerald-500/30 shadow-lg shadow-emerald-950/50">
              <i className="fa-solid fa-scale-balanced text-xl text-emerald-200"></i>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <i className="fa-solid fa-check text-[8px] text-slate-950 font-bold"></i>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-urdu text-lg sm:text-xl font-bold text-emerald-400 leading-tight tracking-normal">
                  {settings.orgNameUr || 'چیف الیکشن کمیشن اردو بازار لاہور'}
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-heading font-medium tracking-wide">
                {settings.orgNameEn || 'Chief Election Commission Urdu Bazar Lahore'}
              </p>
            </div>
          </div>

          {/* Navigation Items (Clean segmented buttons) */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Voter Registration</span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'verify'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Verify Voter</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </button>
          </nav>

          {/* Right Controls: Security Toggle & Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Client-side protection status */}
            <button
              onClick={onToggleSecurity}
              className={`p-2 rounded-xl border text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                settings.securityProtectionEnabled
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                  : 'border-slate-800 text-slate-500 hover:text-slate-300 bg-slate-900'
              }`}
              title={`Client Security Shield: ${settings.securityProtectionEnabled ? 'Active (Right-click & DevTools protected)' : 'Inactive (Developer inspect enabled)'}`}
            >
              {settings.securityProtectionEnabled ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
              <span className="hidden xl:inline text-[11px]">
                {settings.securityProtectionEnabled ? 'Protected' : 'Inspect Mode'}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-800/80 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Registration
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'verify' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Verify
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'admin' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </button>
        </div>
      </div>
    </header>
  );
};
