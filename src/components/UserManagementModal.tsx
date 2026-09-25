import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import {
  Users,
  Shield,
  KeyRound,
  UserPlus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  UserCheck,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { ApiService } from '../services/apiService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onUserUpdated?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'password' | 'users'>('password');
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // User Add / Edit Modal State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('data_entry');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // Load users on opening
  React.useEffect(() => {
    if (isOpen) {
      loadUsers();
      setStatusMsg(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const users = await ApiService.getUsers();
      setUsersList(users);
    } catch {
      setStatusMsg({ type: 'error', text: 'صارفین کی فہرست لوڈ نہ ہو سکی۔' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Handle Current User Change Password
  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword.length < 4) {
      setStatusMsg({ type: 'error', text: 'نیا پاس ورڈ کم از کم 4 حروف پر مشتمل ہونا چاہیے!' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'نیا پاس ورڈ اور تصدیقی پاس ورڈ آپس میں مماثل نہیں ہیں!' });
      return;
    }

    setIsChangingPass(true);
    try {
      // Fetch latest users
      const currentUsers = await ApiService.getUsers();
      const userIndex = currentUsers.findIndex((u) => u.username === currentUser?.username);

      if (userIndex !== -1) {
        currentUsers[userIndex].password = newPassword;
      } else {
        // Fallback for default admin
        currentUsers.unshift({
          id: `USR-${Date.now()}`,
          username: currentUser?.username || 'admin',
          fullName: currentUser?.fullName || 'Chief Administrator',
          role: currentUser?.role || 'super_admin',
          password: newPassword,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }

      const ok = await ApiService.saveUsers(currentUsers);
      if (ok) {
        setStatusMsg({ type: 'success', text: 'پاس ورڈ کامیابی سے تبدیل ہو گیا اور گوگل شیٹ و سرور پر محفوظ ہو گیا!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onUserUpdated) onUserUpdated();
      } else {
        setStatusMsg({ type: 'error', text: 'پاس ورڈ محفوظ کرنے میں خرابی پیش آئی۔' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'پاس ورڈ تبدیل نہ ہو سکا۔' });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Open User Add Modal
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormFullName('');
    setFormRole('data_entry');
    setFormPassword('');
    setFormPhone('');
    setIsEditUserOpen(true);
  };

  // Open User Edit Modal
  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormFullName(user.fullName);
    setFormRole(user.role);
    setFormPassword(''); // leave blank if unchanged
    setFormPhone(user.phone || '');
    setIsEditUserOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formFullName.trim()) {
      alert('براہ کرم یوزر نیم اور مکمل نام درج کریں!');
      return;
    }

    if (!editingUser && !formPassword.trim()) {
      alert('براہ کرم نئے صارف کے لیے پاس ورڈ درج کریں!');
      return;
    }

    try {
      const updatedList = [...usersList];
      if (editingUser) {
        // Update
        const idx = updatedList.findIndex((u) => u.id === editingUser.id);
        if (idx !== -1) {
          updatedList[idx] = {
            ...updatedList[idx],
            username: formUsername.trim().toLowerCase(),
            fullName: formFullName.trim(),
            role: formRole,
            phone: formPhone.trim(),
            ...(formPassword ? { password: formPassword } : {}),
          };
        }
      } else {
        // Check duplicate username
        if (updatedList.some((u) => u.username.toLowerCase() === formUsername.trim().toLowerCase())) {
          alert('یہ یوزر نیم پہلے سے موجود ہے! مختلف یوزر نیم منتخب کریں۔');
          return;
        }

        const newUser: UserAccount = {
          id: `USR-${Date.now().toString().slice(-4)}`,
          username: formUsername.trim().toLowerCase(),
          fullName: formFullName.trim(),
          role: formRole,
          password: formPassword.trim(),
          phone: formPhone.trim(),
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        updatedList.push(newUser);
      }

      const ok = await ApiService.saveUsers(updatedList);
      if (ok) {
        setUsersList(updatedList);
        setIsEditUserOpen(false);
        setStatusMsg({ type: 'success', text: 'صارف کا ریکارڈ گوگل شیٹ کی "Users" شیٹ اور سرور پر کامیابی سے محفوظ ہو گیا!' });
        if (onUserUpdated) onUserUpdated();
      } else {
        alert('صارف کا ریکارڈ محفوظ نہ ہو سکا۔');
      }
    } catch (err: any) {
      alert('Error saving user: ' + err.message);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserAccount) => {
    if (user.username === currentUser?.username) {
      alert('آپ اپنا اپنا اکاؤنٹ خود ڈیلیٹ نہیں کر سکتے!');
      return;
    }
    if (!window.confirm(`کیا آپ واقعی صارف "${user.fullName} (${user.username})" کو ختم کرنا چاہتے ہیں؟`)) {
      return;
    }

    const filtered = usersList.filter((u) => u.id !== user.id);
    const ok = await ApiService.saveUsers(filtered);
    if (ok) {
      setUsersList(filtered);
      setStatusMsg({ type: 'success', text: `صارف ${user.username} کو ڈیلیٹ کر دیا گیا ہے۔` });
      if (onUserUpdated) onUserUpdated();
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Super Admin (مکمل اختیارات)</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Admin (ایڈمنسٹریٹر)</span>;
      case 'data_entry':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">Data Entry (اندراج ووٹر)</span>;
      case 'viewer':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/20 text-slate-300 border border-slate-600/40">Viewer (صرف دیکھنے کی اجازت)</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <span>User Management & Security</span>
                <span className="font-urdu text-sm font-normal text-emerald-400">(صارفین کا انتظام اور رولز)</span>
              </h3>
              <p className="text-xs text-slate-400">
                لاگ ان صارف: <strong className="text-slate-200">{currentUser?.fullName || currentUser?.username}</strong> &bull; Role: {getRoleBadge(currentUser?.role || 'admin')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>پاس ورڈ تبدیل کریں (Change Password)</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>تمام صارفین اور رولز (Users & Roles)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {usersList.length}
            </span>
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div className="flex-1 font-medium">{statusMsg.text}</div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangeMyPassword} className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  <span>محفوظ پاس ورڈ تبدیلی (Secure Password Update)</span>
                </p>
                <p className="text-slate-400 text-[11px]">
                  یہاں سے پاس ورڈ تبدیل کرنے پر یہ سرور کی الگ سیکیورٹی فائل <code className="text-slate-200 font-mono">system-config.json</code> اور گوگل شیٹ میں فوراً اپڈیٹ ہو جائے گا۔
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">نیا پاس ورڈ (New Password) *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="کم از کم 4 ہندسے یا حروف..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">نئے پاس ورڈ کی تصدیق (Confirm New Password) *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="دوبارہ وہی نیا پاس ورڈ درج کریں..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isChangingPass ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>نیا پاس ورڈ محفوظ کریں (Update Password)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: USERS & ROLES MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>رجسٹرڈ صارفین اور اختیارات (Users & Permissions)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Google Sheet "Users" Tab Synced
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    تمام صارفین کا ڈیٹا خودکار طور پر گوگل شیٹ کی علیحدہ شیٹ <code className="text-emerald-400 font-mono">"Users"</code> اور سرور میں محفوظ ہوتا ہے۔
                  </p>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={handleOpenAddUser}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>نیا صارف شامل کریں (Add User)</span>
                  </button>
                )}
              </div>

              {/* Roles explanation card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px]">
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-300">1. Super Admin:</span>
                  <p className="text-slate-400">گٹ ہب فائل <code className="text-amber-400 font-mono">super-admin.json</code> سے لائیو، گوگل شیٹ لنک کی تنصیب اور کنفیگریشن کا واحد مجاز</p>
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-sky-300">2. Data Entry:</span>
                  <p className="text-slate-400">صرف ووٹر کا اندراج اور تصدیق کر سکتا ہے (گوگل شیٹ کا لنک پوشیدہ رہتا ہے)</p>
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-300">3. Viewer:</span>
                  <p className="text-slate-400">صرف ووٹر لسٹ اور سرٹیفکیٹ دیکھ اور پرنٹ کر سکتا ہے</p>
                </div>
              </div>

              {/* Users Table / List */}
              <div className="space-y-2">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>صارفین کی تفصیلات لوڈ ہو رہی ہیں...</span>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    کوئی صارف نہیں ملا۔ ڈیفالٹ ایڈمن فعال ہے۔
                  </div>
                ) : (
                  usersList.map((u) => (
                    <div
                      key={u.id || u.username}
                      className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                          {u.role === 'super_admin' ? (
                            <Shield className="w-5 h-5 text-amber-400" />
                          ) : u.role === 'data_entry' ? (
                            <UserCheck className="w-5 h-5 text-sky-400" />
                          ) : (
                            <Eye className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100">{u.fullName}</span>
                            <span className="font-mono text-xs text-slate-400">(@{u.username})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleBadge(u.role)}
                            {u.phone && <span className="text-[11px] text-slate-500 font-mono">{u.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {isSuperAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit User & Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.username !== currentUser?.username && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 hover:text-white transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Role-Based Access Control (RBAC) &bull; Urdu Bazar EC
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>

      {/* SUB-MODAL: ADD / EDIT USER */}
      {isEditUserOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-heading font-bold text-white text-base">
                {editingUser ? 'صارف کی ترمیم (Edit User)' : 'نیا صارف شامل کریں (Add New User)'}
              </h4>
              <button
                onClick={() => setIsEditUserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  صارف کا نام (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. محمد احمد قریشی (Muhammad Ahmed)"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  یوزر نیم (Username for Login) *
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. operator1, inspector, admin"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  اختیارات / رول (Role & Permissions) *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="data_entry">Data Entry Operator (صرف اندراج اور رجسٹریشن)</option>
                  <option value="admin">Admin (ایڈمن - ووٹر مینجمنٹ اور پرنٹنگ)</option>
                  <option value="super_admin">Super Admin (مکمل کنٹرول اور پاس ورڈز)</option>
                  <option value="viewer">Viewer (صرف نگران و فہرست دیکھنا)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {editingUser ? 'پاس ورڈ (خالی چھوڑیں اگر تبدیل نہیں کرنا)' : 'پاس ورڈ (Login Password) *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'پاس ورڈ تبدیل کرنے کے لیے نیا درج کریں...' : 'صارف کا پاس ورڈ...'}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">موبائل نمبر (رابطہ)</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                >
                  کینسل
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg"
                >
                  محفوظ کریں (Save User)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
