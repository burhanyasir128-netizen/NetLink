import React, { useState, useMemo } from 'react';
import {
  Lock,
  LogOut,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Settings,
  Plus,
  Eye,
  Trash2,
  Edit3,
  Calendar,
  Building,
  CreditCard,
  Phone,
  MapPin,
  CheckCircle,
  X,
  Save,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  Shield,
  KeyRound,
  UserCheck,
  Code,
  Copy,
  Check,
} from 'lucide-react';
import { SystemSettings, Voter, PrintMode, UserAccount } from '../types';
import { ApiService } from '../services/apiService';
import { getDirectImageUrl } from '../services/driveHelper';
import { formatDate, formatCnic, formatMobile } from '../utils/formatters';
import { UserManagementModal } from './UserManagementModal';
import { GOOGLE_APPS_SCRIPT_SOURCE } from '../constants/googleScriptCode';

interface AdminDashboardProps {
  voters: Voter[];
  settings: SystemSettings;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onRefreshData: () => Promise<void>;
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
  onOpenPrint: (mode: PrintMode, voter?: Voter, votersList?: Voter[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  voters,
  settings,
  isDarkMode,
  setIsDarkMode,
  onRefreshData,
  onSaveSettings,
  onOpenPrint,
}) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const stored = sessionStorage.getItem('admin_user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Table Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFirmFilter, setSelectedFirmFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected Voter for Detail/Edit/Delete
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Voter>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SystemSettings>(settings);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);
  const [testingGas, setTestingGas] = useState(false);
  const [gasTestResult, setGasTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SOURCE);
      setIsCodeCopied(true);
      setTimeout(() => setIsCodeCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Quick Add Voter Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVoterForm, setNewVoterForm] = useState({
    fullName: '',
    firmName: '',
    cnic: '',
    mobile: '',
    address: '',
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
  });

  // Unique Firm/Shop Names for Auto-Populated Ward/Area Dropdown
  const uniqueFirms = useMemo(() => {
    const set = new Set<string>();
    voters.forEach((v) => {
      if (v.firmName && v.firmName.trim()) {
        set.add(v.firmName.trim());
      }
    });
    return Array.from(set).sort();
  }, [voters]);

  // Filtered Voters based on dynamic search & firm filter
  const filteredVoters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const digits = searchQuery.replace(/\D/g, '');

    return voters.filter((v) => {
      // Area/Ward firm filter
      if (selectedFirmFilter !== 'ALL' && v.firmName !== selectedFirmFilter) {
        return false;
      }

      if (!q) return true;

      const nameMatch = v.fullName.toLowerCase().includes(q);
      const firmMatch = v.firmName.toLowerCase().includes(q);
      const serialMatch = v.serialNumber.toLowerCase().includes(q);
      const addressMatch = v.address.toLowerCase().includes(q);

      const cnicDigits = v.cnic.replace(/\D/g, '');
      const mobileDigits = v.mobile.replace(/\D/g, '');
      const cnicMatch = digits.length >= 3 && cnicDigits.includes(digits);
      const mobileMatch = digits.length >= 3 && mobileDigits.includes(digits);

      return nameMatch || firmMatch || serialMatch || addressMatch || cnicMatch || mobileMatch;
    });
  }, [voters, searchQuery, selectedFirmFilter]);

  // Handle Authentication submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsVerifyingAuth(true);

    try {
      // Send credentials to backend API for verification
      const res = await ApiService.verifyPassword(passwordInput, usernameInput);
      if (res.valid) {
        setIsAuthenticated(true);
        const user = res.user || {
          id: 'USR-ADMIN',
          username: usernameInput || 'admin',
          fullName: 'چیف ایڈمنسٹریٹر (Super Administrator)',
          role: 'super_admin',
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(user);
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_user_session', JSON.stringify(user));
        setPasswordInput('');
        setUsernameInput('');
      } else {
        setAuthError('غلط پاس ورڈ یا یوزر نیم! براہ کرم دوبارہ کوشش کریں۔ (Invalid credentials)');
      }
    } catch (err: any) {
      setAuthError('Authentication failed: ' + (err.message || 'Server error'));
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_user_session');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setIsRefreshing(false);
  };

  // Export to CSV with UTF-8 BOM for Urdu typography support
  const handleExportCSV = () => {
    const headers = ['Serial #', 'Registration Date', 'Full Name', 'Firm / Shop Name', 'CNIC', 'Mobile', 'Address', 'Status'];
    const rows = filteredVoters.map((v) => [
      `"${v.serialNumber}"`,
      `"${formatDate(v.registrationDate)}"`,
      `"${v.fullName.replace(/"/g, '""')}"`,
      `"${v.firmName.replace(/"/g, '""')}"`,
      `"${v.cnic}"`,
      `"${v.mobile}"`,
      `"${v.address.replace(/"/g, '""')}"`,
      `"${v.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Urdu_Bazar_Voters_Roll_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Record details / edit / delete actions
  const handleOpenDetails = (voter: Voter) => {
    setSelectedVoter(voter);
    setEditFormData(voter);
    setIsEditMode(false);
    setActionError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedVoter) return;
    try {
      const updated: Voter = {
        ...selectedVoter,
        ...editFormData,
      } as Voter;

      const res = await ApiService.editVoter(updated);
      if (res.success) {
        setSelectedVoter(updated);
        setIsEditMode(false);
        await onRefreshData();
      } else {
        setActionError(res.error || 'Failed to update record');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating voter');
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedVoter) return;
    if (!window.confirm(`Are you sure you want to remove ${selectedVoter.fullName} (${selectedVoter.serialNumber}) from the voter roll?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await ApiService.deleteVoter(selectedVoter.serialNumber);
      if (res.success) {
        setSelectedVoter(null);
        await onRefreshData();
      } else {
        setActionError(res.error || 'Failed to delete record');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error deleting voter');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Add Voter
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await ApiService.registerVoter({
        fullName: newVoterForm.fullName,
        firmName: newVoterForm.firmName,
        cnic: newVoterForm.cnic,
        mobile: newVoterForm.mobile,
        address: newVoterForm.address,
        photoUrl: newVoterForm.photoUrl,
        status: 'Verified',
      });
      if (res.success) {
        setIsAddModalOpen(false);
        setNewVoterForm({
          fullName: '',
          firmName: '',
          cnic: '',
          mobile: '',
          address: '',
          photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        });
        await onRefreshData();
      } else {
        alert(res.error || 'Failed to add voter');
      }
    } catch (err: any) {
      alert(err.message || 'Error registering voter');
    }
  };

  // Handle Save Settings
  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaveMsg(null);
    try {
      const isSuper = currentUser?.role === 'super_admin';

      // Save configuration securely into separate config/system-config.json file
      if (isSuper) {
        await ApiService.saveSecureConfig({
          googleWebAppUrl: settingsForm.googleWebAppUrl,
          useGoogleAppsScript: settingsForm.useGoogleAppsScript,
          adminPassword: settingsForm.adminPasswordHash,
        });
      } else {
        // Non-super admins only update local presentation settings, without changing Google Sheet link
        await ApiService.saveSecureConfig({
          googleWebAppUrl: settings.googleWebAppUrl,
          useGoogleAppsScript: settings.useGoogleAppsScript,
          adminPassword: settingsForm.adminPasswordHash,
        });
      }

      await onSaveSettings({
        ...settingsForm,
        googleWebAppUrl: isSuper ? settingsForm.googleWebAppUrl : settings.googleWebAppUrl,
        useGoogleAppsScript: isSuper ? settingsForm.useGoogleAppsScript : settings.useGoogleAppsScript,
      });

      setSettingsSaveMsg('سیٹنگز کامیابی سے محفوظ ہو گئی ہیں! (Settings Saved)');
      setTimeout(() => {
        setIsSettingsOpen(false);
        setSettingsSaveMsg(null);
      }, 1500);
    } catch (err: any) {
      setSettingsSaveMsg('Error saving settings: ' + err.message);
    }
  };

  const handleTestGas = async () => {
    setTestingGas(true);
    setGasTestResult(null);
    try {
      const res = await ApiService.testGasConnection(settingsForm.googleWebAppUrl);
      setGasTestResult(res);
    } catch (err: any) {
      setGasTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingGas(false);
    }
  };

  // --------------------------------------------------------------------------
  // GLASSMORPHISM LOGIN SCREEN (When not authenticated)
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md p-8 rounded-3xl glass-panel border border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-2 mb-8 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-heading text-white">Administrator Access</h2>
            <p className="font-urdu text-sm text-emerald-400">چیف الیکشن کمیشن انتخابی پورٹل</p>
            <p className="text-xs text-slate-400">
              Password will be verified against the Election Commission API.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs text-center">
                {authError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Username / یوزر نیم (اختیاری)
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. admin or operator"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                اگر صرف پاس ورڈ سے لاگ ان کرنا چاہیں تو یوزر نیم خالی چھوڑ دیں۔
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password / خفیہ کوڈ <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter administrator password..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Super Admin (گٹ ہب فائل):</span>
                  </span>
                  <span className="font-mono text-emerald-400">superadmin / SuperAdmin@2026!</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  فائل: <code className="text-slate-400 font-mono">super-admin.json</code> (صرف سپر ایڈمن کو گوگل شیٹ لنک کی اجازت ہے)
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifyingAuth}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition-all shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifyingAuth ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying with Backend...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Dashboard (لاگ ان کریں)</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD UI
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Action Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              Admin Portal
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentUser?.fullName || currentUser?.username || 'Administrator'}</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {currentUser?.role === 'super_admin' ? 'Super Admin' : currentUser?.role === 'data_entry' ? 'Data Entry' : currentUser?.role === 'viewer' ? 'Viewer' : 'Admin'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-white">
            Voter Registry & Management Dashboard
          </h2>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* User Management & Password Button */}
          <button
            type="button"
            onClick={() => setIsUserManagementOpen(true)}
            className="px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            title="Manage Users, Passwords & Access Roles"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>پاس ورڈ و یوزرز (Users & Passwords)</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Refresh Data from Backend"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Add Voter */}
          {currentUser?.role !== 'viewer' && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Voter</span>
            </button>
          )}

          {/* Print A4 List */}
          <button
            type="button"
            onClick={() => onOpenPrint('list', undefined, filteredVoters)}
            className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print Official A4 Voter List"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print List</span>
          </button>

          {/* Print Bulk IDs */}
          <button
            type="button"
            onClick={() => onOpenPrint('all-ids', undefined, filteredVoters)}
            className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print All Filtered ID Cards (Grid)"
          >
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>Print IDs</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV for Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Settings */}
          {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
            <button
              type="button"
              onClick={async () => {
                const isSuper = currentUser?.role === 'super_admin';
                const secConfig = isSuper ? await ApiService.getSecureConfig() : { googleWebAppUrl: '', useGoogleAppsScript: false };
                setSettingsForm({
                  ...settings,
                  googleWebAppUrl: isSuper ? secConfig.googleWebAppUrl : '',
                  useGoogleAppsScript: isSuper ? secConfig.useGoogleAppsScript : false,
                });
                setGasTestResult(null);
                setIsSettingsOpen(true);
              }}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              title="Organization & Backend Settings"
            >
              <Settings className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/50 text-rose-300 text-xs font-medium transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards (Clean unboxed text & stats, no static pill clutter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-heading text-white">{voters.length}</p>
          <p className="text-[11px] text-emerald-400 font-urdu">کل رجسٹرڈ ووٹرز</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Verified Status</span>
            <CheckCircle className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-heading text-teal-300">
            {voters.filter((v) => v.status === 'Verified').length}
          </p>
          <p className="text-[11px] text-teal-400 font-urdu">تصدیق شدہ ووٹرز</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Unique Firms / Wards</span>
            <Building className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-heading text-sky-300">{uniqueFirms.length}</p>
          <p className="text-[11px] text-sky-400 font-urdu">شامل شدہ فرمیں / دکانیں</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Filtered Selection</span>
            <Filter className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-heading text-amber-300">{filteredVoters.length}</p>
          <p className="text-[11px] text-amber-400">Records matching filters</p>
        </div>
      </div>

      {/* Registration Trends Bar Chart */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Registration Trends & Ward Distribution
            </h3>
            <p className="text-xs text-slate-400">Real-time overview across active firms and dates</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Chart.js / SVG Visualizer</span>
        </div>

        {/* Lightweight SVG Bar Chart */}
        <div className="h-44 w-full flex items-end gap-2 pt-6 pb-2 border-b border-slate-800 px-2">
          {uniqueFirms.slice(0, 8).map((firm, idx) => {
            const count = voters.filter((v) => v.firmName === firm).length;
            const maxCount = Math.max(...uniqueFirms.map((f) => voters.filter((v) => v.firmName === f).length), 1);
            const heightPct = Math.max(Math.round((count / maxCount) * 100), 12);

            return (
              <div key={firm} className="flex-1 flex flex-col items-center gap-2 group relative">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg">
                  {firm}: <strong>{count} voter(s)</strong>
                </div>

                <div className="w-full max-w-[42px] bg-slate-800 rounded-t-lg overflow-hidden flex items-end justify-center">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full transition-all duration-500 rounded-t-md ${
                      idx % 3 === 0
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : idx % 3 === 1
                        ? 'bg-gradient-to-t from-teal-600 to-teal-400'
                        : 'bg-gradient-to-t from-sky-600 to-sky-400'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[70px] text-center">
                  {firm.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Filtering & Search Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        {/* Dynamic Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Voter Name, CNIC, Mobile, or Serial #..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Auto-Populated Area/Ward Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedFirmFilter}
            onChange={(e) => setSelectedFirmFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="ALL">All Firms / Wards ({voters.length})</option>
            {uniqueFirms.map((f) => (
              <option key={f} value={f}>
                {f} ({voters.filter((v) => v.firmName === f).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Photo</th>
                <th className="py-3 px-4">Serial #</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Firm / Shop Name</th>
                <th className="py-3 px-4">CNIC</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredVoters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No registered voters found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredVoters.map((voter) => (
                  <tr
                    key={voter.id}
                    onClick={() => handleOpenDetails(voter)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Thumbnail Image (with Google Drive URL conversion) */}
                    <td className="py-2.5 px-4 text-center">
                      <img
                        src={
                          getDirectImageUrl(voter.photoUrl, 'thumb') ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
                        }
                        alt=""
                        className="w-9 h-11 object-cover rounded-lg border border-slate-700 mx-auto"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback on broken image
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
                        }}
                      />
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {voter.serialNumber}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-100">
                      {voter.fullName}
                    </td>

                    <td className="py-3 px-4 text-emerald-400 font-medium">
                      {voter.firmName}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {voter.cnic}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {voter.mobile}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {voter.status || 'Verified'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(voter)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPrint('single-id', voter)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Print ID Card"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* RECORD DETAILS & EDIT/DELETE MODAL                                          */}
      {/* -------------------------------------------------------------------------- */}
      {selectedVoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-600/40">
                  {selectedVoter.serialNumber}
                </span>
                <h3 className="font-heading font-semibold text-slate-100 text-base">
                  {isEditMode ? 'Edit Voter Record' : 'Voter Details & Actions'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVoter(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs">
                  {actionError}
                </div>
              )}

              {isEditMode ? (
                /* Edit Form */
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 font-semibold mb-1 block">Full Name</label>
                      <input
                        type="text"
                        value={editFormData.fullName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-semibold mb-1 block">Firm / Shop Name</label>
                      <input
                        type="text"
                        value={editFormData.firmName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, firmName: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-semibold mb-1 block">CNIC</label>
                      <input
                        type="text"
                        value={editFormData.cnic || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, cnic: formatCnic(e.target.value) })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-semibold mb-1 block">Mobile</label>
                      <input
                        type="text"
                        value={editFormData.mobile || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, mobile: formatMobile(e.target.value) })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 font-semibold mb-1 block">Complete Address</label>
                      <input
                        type="text"
                        value={editFormData.address || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* View Details */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                  <div className="sm:col-span-1 text-center space-y-2">
                    <img
                      src={getDirectImageUrl(selectedVoter.photoUrl, 'medium')}
                      alt=""
                      className="w-32 h-40 object-cover rounded-xl border-2 border-emerald-500/50 mx-auto shadow-md"
                    />
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=UB-VOTER:${selectedVoter.serialNumber}:${selectedVoter.cnic}`}
                      alt="QR"
                      className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-700 mx-auto"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Full Name:</span>
                      <strong className="text-sm text-slate-100">{selectedVoter.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Firm / Shop Name:</span>
                      <strong className="text-sm text-emerald-400">{selectedVoter.firmName}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block">CNIC:</span>
                        <span className="font-mono text-slate-200">{selectedVoter.cnic}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Mobile:</span>
                        <span className="font-mono text-slate-200">{selectedVoter.mobile}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Address:</span>
                      <span className="text-slate-300">{selectedVoter.address}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Registration Date:</span>
                      <span className="text-slate-300">{formatDate(selectedVoter.registrationDate)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenPrint('single-id', selectedVoter)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print ID Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPrint('certificate', selectedVoter)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Certificate</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </>
                ) : (
                  <>
                    {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'data_entry') && (
                      <button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        className="px-3.5 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Edit</span>
                      </button>
                    )}
                    {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
                      <button
                        type="button"
                        onClick={handleDeleteRecord}
                        disabled={isDeleting}
                        className="px-3.5 py-2 border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* QUICK ADD VOTER MODAL                                                       */}
      {/* -------------------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add New Voter (Admin Mode)
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newVoterForm.fullName}
                  onChange={(e) => setNewVoterForm({ ...newVoterForm, fullName: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Firm / Shop Name</label>
                <input
                  type="text"
                  required
                  value={newVoterForm.firmName}
                  onChange={(e) => setNewVoterForm({ ...newVoterForm, firmName: e.target.value })}
                  placeholder="e.g. Maktaba-e-Jamal"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">CNIC</label>
                  <input
                    type="text"
                    required
                    value={newVoterForm.cnic}
                    onChange={(e) => setNewVoterForm({ ...newVoterForm, cnic: formatCnic(e.target.value) })}
                    placeholder="35201-1234567-1"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Mobile</label>
                  <input
                    type="text"
                    required
                    value={newVoterForm.mobile}
                    onChange={(e) => setNewVoterForm({ ...newVoterForm, mobile: formatMobile(e.target.value) })}
                    placeholder="0300-1234567"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Complete Address</label>
                <input
                  type="text"
                  required
                  value={newVoterForm.address}
                  onChange={(e) => setNewVoterForm({ ...newVoterForm, address: e.target.value })}
                  placeholder="Urdu Bazar, Lahore"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
                >
                  Save Voter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* SETTINGS MODAL                                                              */}
      {/* -------------------------------------------------------------------------- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                Election Commission Organization Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsSaveMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs">
                {settingsSaveMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettingsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Urdu Organization Name (اردو نام)</label>
                <input
                  type="text"
                  value={settingsForm.orgNameUr}
                  onChange={(e) => setSettingsForm({ ...settingsForm, orgNameUr: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-urdu"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">English Organization Name</label>
                <input
                  type="text"
                  value={settingsForm.orgNameEn}
                  onChange={(e) => setSettingsForm({ ...settingsForm, orgNameEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Official Contact Numbers</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Commissioner Name in Urdu</label>
                <input
                  type="text"
                  value={settingsForm.commissionerNameUr}
                  onChange={(e) => setSettingsForm({ ...settingsForm, commissionerNameUr: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-urdu"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Admin Password (ایڈمن لاگ ان پاس ورڈ)</label>
                <input
                  type="text"
                  value={settingsForm.adminPasswordHash}
                  onChange={(e) => setSettingsForm({ ...settingsForm, adminPasswordHash: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                />
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span>یہ پاس ورڈ آپ کی گوگل شیٹ کے "Settings" ٹیب اور سرور پر لائیو محفوظ ہوتا ہے۔</span>
                </p>
              </div>

              {/* Separate Secure Configuration: Google Apps Script Backend URL (STRICTLY SUPER ADMIN ONLY) */}
              {currentUser?.role === 'super_admin' ? (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <label className="text-amber-300 font-semibold block text-xs">
                          Google Apps Script Web App Link (صرف سپر ایڈمن کے لیے)
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Super Admin Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        یہ لنک انتہائی خفیہ ہے اور سپر ایڈمن کے علاوہ کسی بھی دوسرے صارف، ایڈمن یا ڈیٹا اینٹری آپریٹر کو نظر نہیں آئے گا۔
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settingsForm.useGoogleAppsScript}
                        onChange={(e) => setSettingsForm({ ...settingsForm, useGoogleAppsScript: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-emerald-400 font-semibold text-xs">فعال کریں (Enable Sync)</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={settingsForm.googleWebAppUrl}
                      onChange={(e) => setSettingsForm({ ...settingsForm, googleWebAppUrl: e.target.value })}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="flex-1 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestGas}
                      disabled={testingGas || !settingsForm.googleWebAppUrl}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs shrink-0 disabled:opacity-50 cursor-pointer shadow-md transition-colors"
                    >
                      {testingGas ? 'Testing...' : 'Test Link (ٹیسٹ کریں)'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsScriptModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-950/80 border border-sky-500/40 hover:bg-sky-900/60 text-sky-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>ایپس اسکرپٹ کا مکمل کوڈ حاصل کریں (View & Copy Apps Script Code)</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      کوڈ کو Google Sheet &gt; Extensions &gt; Apps Script میں پیسٹ کریں
                    </span>
                  </div>

                  {settingsForm.googleWebAppUrl && settingsForm.googleWebAppUrl.includes('docs.google.com/spreadsheets') && (
                    <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs">
                      ⚠️ آپ نے گوگل شیٹ کا ایڈٹ لنک درج کیا ہے۔ سسٹم کو کنیکٹ کرنے کے لیے شیٹ کے اندر <strong>Extensions &gt; Apps Script &gt; Deploy &gt; Web App</strong> سے حاصل کردہ <strong>Web app URL</strong> (جو کہ <code>/exec</code> پر ختم ہوتا ہے) درج کریں۔
                    </div>
                  )}

                  {gasTestResult && (
                    <div className={`p-2.5 rounded-lg text-xs ${gasTestResult.success ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'}`}>
                      {gasTestResult.message}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>گوگل شیٹ ڈیٹا بیس کنکشن صرف <strong>Super Admin</strong> کنٹرول کر سکتا ہے۔</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded">Hidden for non-super admins</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 border border-slate-700 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management & Password Change Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onUserUpdated={async () => {
          await onRefreshData();
        }}
      />

      {/* Apps Script Code Modal */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-mono">
                  &lt;/&gt;
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    گوگل ایپس اسکرپٹ مکمل کوڈ (Code.gs)
                  </h3>
                  <p className="text-xs text-slate-400">
                    یہ کوڈ اپنی گوگل شیٹ کے Apps Script ایڈیٹر میں پیسٹ کریں اور Deploy کریں۔
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  {isCodeCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCodeCopied ? 'کوڈ کاپی ہو گیا! (Copied)' : 'Copy Code (کوڈ کاپی کریں)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsScriptModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick deployment guide steps */}
            <div className="bg-slate-950/90 border-b border-slate-800 p-3 sm:p-4 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-0.5">1. شیٹ کھولیں</span>
                <p className="text-[11px] text-slate-400">Google Sheet میں Extensions &gt; Apps Script کھولیں۔</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-sky-400 block mb-0.5">2. پرانا کوڈ ہٹا کر پیسٹ کریں</span>
                <p className="text-[11px] text-slate-400">Code.gs کا پرانا سب کچھ ہٹا کر یہ کاپی شدہ کوڈ پیسٹ کریں۔</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-amber-400 block mb-0.5">3. Deploy &gt; Web app</span>
                <p className="text-[11px] text-slate-400">Execute as: <strong>Me</strong>، Who has access: <strong>Anyone</strong> منتخب کریں۔</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-teal-400 block mb-0.5">4. Web App URL لگائیں</span>
                <p className="text-[11px] text-slate-400">حاصل کردہ Web App URL (جو /exec پر ختم ہوتا ہے) سیٹنگز میں ڈالیں۔</p>
              </div>
            </div>

            {/* Code Box */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-200">
              <pre className="whitespace-pre overflow-x-auto leading-relaxed select-all">
                <code>{GOOGLE_APPS_SCRIPT_SOURCE}</code>
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                مجموعی لائنز: 600+ | آٹو تصویر ڈرائیو اپلوڈ + ووٹر لسٹ + یوزرز رول سپورٹ
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {isCodeCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{isCodeCopied ? 'کوڈ کاپی ہو گیا! (Copied)' : 'مکمل کوڈ کاپی کریں (Copy Entire Code)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
