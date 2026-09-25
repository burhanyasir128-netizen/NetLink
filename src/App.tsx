import React, { useState, useEffect } from 'react';
import { ActiveTab, PrintMode, SystemSettings, Voter } from './types';
import { ApiService } from './services/apiService';
import { DEFAULT_SETTINGS } from './services/storageService';
import { Header } from './components/Header';
import { PublicRegistration } from './components/PublicRegistration';
import { VerifyVoterModal } from './components/VerifyVoterModal';
import { AdminDashboard } from './components/AdminDashboard';
import { PrintTemplates } from './components/PrintTemplates';
import { Shield, CheckCircle, Phone } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Print System State
  const [printState, setPrintState] = useState<{
    mode: PrintMode;
    voter?: Voter | null;
    votersList?: Voter[];
  }>({
    mode: 'none',
    voter: null,
    votersList: [],
  });

  // Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Sync dark mode class on <html> element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load Initial Data
  const loadData = async () => {
    try {
      const res = await ApiService.getAllData();
      setVoters(res.voters);
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error('Failed to load election data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Auto-refresh when returning to window/tab
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Anti-Inspect / Disable Developer Tools & Right Click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && ['U', 'u'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSaveSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    await ApiService.updateSettings(newSettings);
  };

  const handleOpenPrint = (mode: PrintMode, voter?: Voter, votersList?: Voter[]) => {
    setPrintState({
      mode,
      voter: voter || null,
      votersList: votersList || voters,
    });
  };

  const handleClosePrint = () => {
    setPrintState({ mode: 'none', voter: null, votersList: [] });
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        settings={settings}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'register' && (
          <PublicRegistration
            settings={settings}
            onRegistrationSuccess={(newVoter) => {
              setVoters((prev) => [newVoter, ...prev]);
            }}
            onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
          />
        )}

        {activeTab === 'verify' && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="p-8 rounded-3xl glass-panel border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold font-heading text-white">
                Voter Verification Portal (ووٹر تصدیق)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Search the official election roll by Voter Name, Mobile, CNIC, or Shop/Firm Name to generate your official certificate.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-xl shadow-emerald-950 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  Open Voter Verification Search
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            voters={voters}
            settings={settings}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            onRefreshData={loadData}
            onSaveSettings={handleSaveSettings}
            onOpenPrint={handleOpenPrint}
          />
        )}
      </main>

      {/* Verify Voter Modal */}
      <VerifyVoterModal
        isOpen={isVerifyModalOpen || activeTab === 'verify'}
        onClose={() => {
          setIsVerifyModalOpen(false);
          if (activeTab === 'verify') setActiveTab('register');
        }}
        voters={voters}
        settings={settings}
        onPrintCertificate={(v) => {
          setIsVerifyModalOpen(false);
          handleOpenPrint('certificate', v);
        }}
      />

      {/* Print Templates (renders only when printing triggered) */}
      <PrintTemplates
        mode={printState.mode}
        voter={printState.voter}
        voters={printState.votersList || voters}
        settings={settings}
        onClose={handleClosePrint}
      />

      {/* Official Footer */}
      <footer className="no-print mt-auto border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <i className="fa-solid fa-scale-balanced text-sm"></i>
              </div>
              <div className="text-left">
                <p className="font-urdu text-xs text-emerald-400 font-semibold">
                  {settings.orgNameUr}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Official Election Commission Web Registry &bull; Urdu Bazar Lahore
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {settings.phone}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
