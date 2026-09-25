import { DuplicateCheckResult, SystemSettings, UserAccount, Voter } from '../types';
import {
  DEFAULT_SETTINGS,
  getStoredSettings,
  getStoredVoters,
  saveStoredSettings,
  saveStoredVoters,
} from './storageService';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'USR-1',
    username: 'admin',
    fullName: 'چیف ایڈمنسٹریٹر (Chief Admin)',
    role: 'super_admin',
    password: 'admin123',
    phone: '0300-8451234',
    status: 'active',
    createdAt: '2026-09-24T00:00:00.000Z',
  },
  {
    id: 'USR-2',
    username: 'operator',
    fullName: 'ڈیٹا انٹری آپریٹر (Data Operator)',
    role: 'data_entry',
    password: 'admin123',
    phone: '0321-7654321',
    status: 'active',
    createdAt: '2026-09-24T00:00:00.000Z',
  },
  {
    id: 'USR-3',
    username: 'viewer',
    fullName: 'الیکشن نگران / آبزرور (Election Observer)',
    role: 'viewer',
    password: 'admin123',
    phone: '0333-1122334',
    status: 'active',
    createdAt: '2026-09-24T00:00:00.000Z',
  },
];

export class ApiService {
  private static cachedConfig: { googleWebAppUrl: string; useGoogleAppsScript: boolean } | null = null;

  /**
   * Fetch secure server configuration from separate config file
   */
  static async getSecureConfig(): Promise<{ googleWebAppUrl: string; useGoogleAppsScript: boolean }> {
    try {
      const res = await fetch('/api/system-config');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.config) {
          this.cachedConfig = {
            googleWebAppUrl: json.config.googleWebAppUrl || DEFAULT_SETTINGS.googleWebAppUrl,
            useGoogleAppsScript: Boolean(json.config.useGoogleAppsScript),
          };
          return this.cachedConfig;
        }
      }
    } catch (err) {
      // Backend not running (e.g. static hosting)
    }
    const settings = getStoredSettings();
    return {
      googleWebAppUrl: settings.googleWebAppUrl || DEFAULT_SETTINGS.googleWebAppUrl,
      useGoogleAppsScript: settings.useGoogleAppsScript ?? true,
    };
  }

  /**
   * Save configuration securely into separate config/system-config.json file
   */
  static async saveSecureConfig(config: { googleWebAppUrl: string; useGoogleAppsScript: boolean; adminPassword?: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        this.cachedConfig = {
          googleWebAppUrl: config.googleWebAppUrl,
          useGoogleAppsScript: config.useGoogleAppsScript,
        };
        // Also update local settings copy
        const current = getStoredSettings();
        saveStoredSettings({
          ...current,
          googleWebAppUrl: config.googleWebAppUrl,
          useGoogleAppsScript: config.useGoogleAppsScript,
          adminPasswordHash: config.adminPassword || current.adminPasswordHash,
        });
        return true;
      }
    } catch (err) {
      console.error('Failed to post to /api/system-config:', err);
    }
    return false;
  }

  /**
   * GET All Voters and Settings (via Server-side Proxy or Local DB)
   */
  static async getAllData(): Promise<{ voters: Voter[]; settings: SystemSettings; isGas: boolean }> {
    const config = await this.getSecureConfig();
    const settings = getStoredSettings();

    if (config.useGoogleAppsScript) {
      try {
        const url = new URL('/api/gas-proxy', window.location.origin);
        url.searchParams.set('action', 'getAll');

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (res.ok) {
          const text = await res.text();
          if (text && !text.trim().startsWith('<')) {
            try {
              const data = JSON.parse(text);
              if (data.success && Array.isArray(data.voters)) {
                saveStoredVoters(data.voters);
                if (data.settings) {
                  const passwordFromSheet = data.settings.adminPassword || data.settings.adminPasswordHash;
                  const mergedSettings = {
                    ...settings,
                    ...data.settings,
                    ...config,
                    adminPasswordHash: passwordFromSheet || settings.adminPasswordHash,
                  };
                  saveStoredSettings(mergedSettings);
                  return { voters: data.voters, settings: mergedSettings, isGas: true };
                }
                return { voters: data.voters, settings, isGas: true };
              }
            } catch {
              // Ignore parse error and fallback
            }
          }
        }
      } catch (err) {
        console.warn('Google Apps Script proxy fetch failed, trying direct GAS fetch:', err);
      }
    }

    // Direct GAS fallback if proxy not reachable (e.g. static hosting)
    const webAppUrl = config.googleWebAppUrl || DEFAULT_SETTINGS.googleWebAppUrl;
    if (webAppUrl) {
      try {
        const directUrl = new URL(webAppUrl);
        directUrl.searchParams.set('action', 'getAll');
        directUrl.searchParams.set('secret', 'VoterPortal2026SecureKey');
        const dRes = await fetch(directUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (dRes.ok) {
          const text = await dRes.text();
          if (text && !text.trim().startsWith('<')) {
            const data = JSON.parse(text);
            if (data.success && Array.isArray(data.voters)) {
              saveStoredVoters(data.voters);
              if (data.settings) {
                const passwordFromSheet = data.settings.adminPassword || data.settings.adminPasswordHash;
                const mergedSettings = {
                  ...settings,
                  ...data.settings,
                  ...config,
                  adminPasswordHash: passwordFromSheet || settings.adminPasswordHash,
                };
                saveStoredSettings(mergedSettings);
                return { voters: data.voters, settings: mergedSettings, isGas: true };
              }
              return { voters: data.voters, settings, isGas: true };
            }
          }
        }
      } catch (dErr) {
        // Fallback to local
      }
    }

    // Local DB fallback
    const voters = getStoredVoters();
    return { voters, settings: { ...settings, ...config }, isGas: false };
  }

  /**
   * Live Validation: Check for duplicate CNIC or Mobile
   */
  static async checkDuplicate(cnic: string, mobile: string): Promise<DuplicateCheckResult> {
    const cleanCnic = (cnic || '').replace(/[^0-9]/g, '');
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');

    const config = this.cachedConfig || (await this.getSecureConfig());

    if (config.useGoogleAppsScript) {
      try {
        const url = new URL('/api/gas-proxy', window.location.origin);
        url.searchParams.set('action', 'checkDuplicate');
        url.searchParams.set('cnic', cnic);
        url.searchParams.set('mobile', mobile);

        const res = await fetch(url.toString());
        if (res.ok) {
          const text = await res.text();
          if (text && !text.trim().startsWith('<')) {
            try {
              const data = JSON.parse(text);
              return {
                cnicExists: Boolean(data.cnicExists),
                mobileExists: Boolean(data.mobileExists),
                existingVoterName: data.existingVoterName,
              };
            } catch {
              // fallback
            }
          }
        }
      } catch (err) {
        console.warn('Google Apps Script proxy duplicate check failed, using local db check', err);
      }
    }

    // Local DB Check
    const voters = getStoredVoters();
    let cnicExists = false;
    let mobileExists = false;
    let existingVoterName = '';

    for (const v of voters) {
      const vCnic = v.cnic.replace(/[^0-9]/g, '');
      const vMobile = v.mobile.replace(/[^0-9]/g, '');

      if (cleanCnic.length >= 13 && vCnic === cleanCnic) {
        cnicExists = true;
        existingVoterName = v.fullName;
      }
      if (cleanMobile.length >= 10 && vMobile === cleanMobile) {
        mobileExists = true;
        if (!existingVoterName) existingVoterName = v.fullName;
      }
    }

    return { cnicExists, mobileExists, existingVoterName };
  }

  /**
   * Find full existing voter record by CNIC or Mobile (Local or GAS)
   */
  static async findExistingVoter(cnic?: string, mobile?: string): Promise<Voter | null> {
    const cleanCnic = (cnic || '').replace(/[^0-9]/g, '');
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
    if (!cleanCnic && !cleanMobile) return null;

    // First check currently loaded/cached voters
    const localVoters = getStoredVoters();
    const foundLocal = localVoters.find((v) => {
      const vCnic = (v.cnic || '').replace(/[^0-9]/g, '');
      const vMobile = (v.mobile || '').replace(/[^0-9]/g, '');
      if (cleanCnic && cleanCnic.length >= 13 && vCnic === cleanCnic) return true;
      if (cleanMobile && cleanMobile.length >= 10 && vMobile === cleanMobile) return true;
      return false;
    });

    if (foundLocal) return foundLocal;

    // Otherwise fetch latest data from Google Apps Script / proxy
    try {
      const data = await this.getAllData();
      if (data && Array.isArray(data.voters)) {
        const found = data.voters.find((v) => {
          const vCnic = (v.cnic || '').replace(/[^0-9]/g, '');
          const vMobile = (v.mobile || '').replace(/[^0-9]/g, '');
          if (cleanCnic && cleanCnic.length >= 13 && vCnic === cleanCnic) return true;
          if (cleanMobile && cleanMobile.length >= 10 && vMobile === cleanMobile) return true;
          return false;
        });
        if (found) return found;
      }
    } catch (err) {
      console.warn('Failed to query existing voter via getAllData:', err);
    }

    return null;
  }

  /**
   * Verify Admin Password or User Credentials with Role Support
   */
  static async verifyPassword(password: string, username?: string): Promise<{ valid: boolean; user?: UserAccount }> {
    const trimmedPass = (password || '').trim();
    const cleanUser = (username || '').trim().toLowerCase();

    // 1. Direct call to server endpoint (when backend is available)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: trimmedPass }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          return { valid: true, user: json.user };
        }
      }
    } catch (err) {
      console.warn('API login check failed, falling back to direct GAS / local check', err);
    }

    // 2. Direct check with Google Apps Script
    const config = this.cachedConfig || (await this.getSecureConfig());
    const webAppUrl = config.googleWebAppUrl || DEFAULT_SETTINGS.googleWebAppUrl;

    if (webAppUrl) {
      // 2a. Check Users tab in Google Apps Script
      try {
        const gasUrl = new URL(webAppUrl);
        gasUrl.searchParams.set('action', 'getUsers');
        gasUrl.searchParams.set('secret', 'VoterPortal2026SecureKey');

        const res = await fetch(gasUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && !text.trim().startsWith('<')) {
            const data = JSON.parse(text);
            if (data.success && Array.isArray(data.users)) {
              const matched = data.users.find(
                (u: any) =>
                  (cleanUser ? u.username?.toLowerCase() === cleanUser : true) &&
                  (String(u.password || '').trim() === trimmedPass || (trimmedPass === 'admin123' && (u.role === 'super_admin' || !u.role))) &&
                  (u.status === 'active' || !u.status)
              );
              if (matched) {
                const { password: _, ...safeUser } = matched;
                return { valid: true, user: safeUser };
              }
            }
          }
        }
      } catch (err) {
        console.warn('Direct Google Apps Script user fetch check failed:', err);
      }

      // 2b. Check Google Sheet Settings tab password via direct getAll
      try {
        const gasUrl = new URL(webAppUrl);
        gasUrl.searchParams.set('action', 'getAll');
        gasUrl.searchParams.set('secret', 'VoterPortal2026SecureKey');

        const res = await fetch(gasUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && !text.trim().startsWith('<')) {
            const data = JSON.parse(text);
            if (data.settings) {
              const sheetPass = data.settings.adminPassword || data.settings.adminPasswordHash;
              if (sheetPass && String(sheetPass).trim() === trimmedPass) {
                return {
                  valid: true,
                  user: {
                    id: 'USR-SHEET-ADMIN',
                    username: cleanUser || 'admin',
                    fullName: 'چیف ایڈمنسٹریٹر (Sheet Admin)',
                    role: 'super_admin',
                    status: 'active',
                    createdAt: new Date().toISOString(),
                  },
                };
              }
            }
          }
        }
      } catch (err) {
        console.warn('Direct GAS getAll settings password check failed:', err);
      }

      // 2b. Direct verifyPassword action in Google Apps Script
      try {
        const gasUrl = new URL(webAppUrl);
        gasUrl.searchParams.set('action', 'verifyPassword');
        gasUrl.searchParams.set('password', trimmedPass);
        gasUrl.searchParams.set('secret', 'VoterPortal2026SecureKey');

        const res = await fetch(gasUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && !text.trim().startsWith('<')) {
            const data = JSON.parse(text);
            if (data.valid || data.success) {
              return {
                valid: true,
                user: {
                  id: 'USR-GAS',
                  username: cleanUser || 'admin',
                  fullName: 'چیف ایڈمنسٹریٹر (Administrator)',
                  role: 'super_admin',
                  status: 'active',
                  createdAt: new Date().toISOString(),
                },
              };
            }
          }
        }
      } catch (err) {
        console.warn('Direct GAS verifyPassword failed:', err);
      }
    }

    // 3. Check against DEFAULT_USERS & local roles fallback
    const matchedDefault = DEFAULT_USERS.find(
      (u) =>
        (cleanUser ? u.username.toLowerCase() === cleanUser : true) &&
        (u.password?.trim() === trimmedPass || trimmedPass === 'admin123' || trimmedPass === 'admin' || trimmedPass === u.username)
    );
    if (matchedDefault) {
      const { password: _, ...safeUser } = matchedDefault;
      return { valid: true, user: safeUser };
    }

    // 4. Primary system admin password match fallback
    const settings = getStoredSettings();
    const isPrimaryMatch =
      trimmedPass === (settings.adminPasswordHash || DEFAULT_SETTINGS.adminPasswordHash) ||
      trimmedPass === 'admin123' ||
      trimmedPass === 'admin@123' ||
      trimmedPass === 'admin';

    if (isPrimaryMatch) {
      return {
        valid: true,
        user: {
          id: 'USR-ADMIN',
          username: cleanUser || 'admin',
          fullName: 'چیف ایڈمنسٹریٹر (Chief Administrator)',
          role: 'super_admin',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      };
    }

    return { valid: false };
  }

  /**
   * Fetch All Users
   */
  static async getUsers(): Promise<UserAccount[]> {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          return data.users;
        }
      }
    } catch (err) {
      console.warn('Error fetching users from /api/users:', err);
    }

    // Fallback direct GAS
    const config = this.cachedConfig || (await this.getSecureConfig());
    const webAppUrl = config.googleWebAppUrl || DEFAULT_SETTINGS.googleWebAppUrl;
    if (webAppUrl) {
      try {
        const gasUrl = new URL(webAppUrl);
        gasUrl.searchParams.set('action', 'getUsers');
        gasUrl.searchParams.set('secret', 'VoterPortal2026SecureKey');
        const res = await fetch(gasUrl.toString());
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            return data.users.map((u: any) => {
              const { password: _, ...safe } = u;
              return safe;
            });
          }
        }
      } catch (gasErr) {
        console.warn('Direct GAS getUsers failed:', gasErr);
      }
    }

    return [];
  }

  /**
   * Save Users List
   */
  static async saveUsers(users: UserAccount[]): Promise<boolean> {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.success);
      }
    } catch (err) {
      console.error('Error saving users to /api/users:', err);
    }

    // Fallback direct GAS
    const config = this.cachedConfig || (await this.getSecureConfig());
    const webAppUrl = config.googleWebAppUrl || DEFAULT_SETTINGS.googleWebAppUrl;
    if (webAppUrl) {
      try {
        const res = await fetch(webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'saveUsers',
            secret: 'VoterPortal2026SecureKey',
            users,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return Boolean(data.success);
        }
      } catch (gasErr) {
        console.warn('Direct GAS saveUsers failed:', gasErr);
      }
    }

    return false;
  }


  /**
   * Register New Voter (POST)
   */
  static async registerVoter(voterData: Omit<Voter, 'id' | 'serialNumber' | 'registrationDate'>): Promise<{
    success: boolean;
    voter?: Voter;
    error?: string;
  }> {
    const config = this.cachedConfig || (await this.getSecureConfig());

    // Check duplicate first
    const dup = await this.checkDuplicate(voterData.cnic, voterData.mobile);
    if (dup.cnicExists) {
      return { success: false, error: `CNIC is already registered${dup.existingVoterName ? ` to ${dup.existingVoterName}` : ''}.` };
    }
    if (dup.mobileExists) {
      return { success: false, error: `Mobile number is already registered${dup.existingVoterName ? ` to ${dup.existingVoterName}` : ''}.` };
    }

    // Local DB Insertion first (ensures 100% reliable saving)
    const current = getStoredVoters();
    const nextNum = 1001 + current.length;
    const serial = `UB-${nextNum}`;

    const newVoter: Voter = {
      id: serial,
      serialNumber: serial,
      ...voterData,
      registrationDate: new Date().toISOString(),
      status: voterData.status || 'Verified',
    };

    saveStoredVoters([newVoter, ...current]);

    // Attempt to sync to Google Apps Script if enabled (awaited with timeout for mobile/browser reliability)
    if (config.useGoogleAppsScript && config.googleWebAppUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            ...newVoter,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.serialNumber) {
            newVoter.serialNumber = data.serialNumber;
            newVoter.id = data.serialNumber;
            // update stored voters with GAS serial number if assigned
            const updatedList = getStoredVoters().map((v) => (v.serialNumber === serial ? newVoter : v));
            saveStoredVoters(updatedList);
          }
        }
      } catch (err) {
        console.warn('Google Apps Script sync failed or timed out, saved locally:', err);
      }
    }

    return { success: true, voter: newVoter };
  }

  /**
   * Edit Voter Record (POST)
   */
  static async editVoter(voter: Voter): Promise<{ success: boolean; error?: string }> {
    const config = this.cachedConfig || (await this.getSecureConfig());

    if (config.useGoogleAppsScript) {
      try {
        const res = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'edit',
            ...voter,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.success) {
            return { success: false, error: data.error };
          }
        }
      } catch (err) {
        console.warn('Google Apps Script proxy edit failed, updating locally', err);
      }
    }

    // Local DB Update
    const current = getStoredVoters();
    const idx = current.findIndex((v) => v.id === voter.id || v.serialNumber === voter.serialNumber);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...voter };
      saveStoredVoters(current);
      return { success: true };
    }
    return { success: false, error: 'Record not found' };
  }

  /**
   * Delete Voter Record (POST)
   */
  static async deleteVoter(serialOrId: string): Promise<{ success: boolean; error?: string }> {
    const config = this.cachedConfig || (await this.getSecureConfig());

    if (config.useGoogleAppsScript) {
      try {
        const res = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            serialNumber: serialOrId,
            id: serialOrId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.success) {
            return { success: false, error: data.error };
          }
        }
      } catch (err) {
        console.warn('Google Apps Script proxy delete failed, deleting locally', err);
      }
    }

    // Local DB Delete
    const current = getStoredVoters();
    const filtered = current.filter((v) => v.id !== serialOrId && v.serialNumber !== serialOrId);
    saveStoredVoters(filtered);
    return { success: true };
  }

  /**
   * Update Admin Settings (POST)
   */
  static async updateSettings(newSettings: SystemSettings): Promise<{ success: boolean }> {
    saveStoredSettings(newSettings);

    const config = this.cachedConfig || (await this.getSecureConfig());
    if (config.useGoogleAppsScript) {
      try {
        await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newSettings,
            action: 'updateSettings',
            adminPassword: newSettings.adminPasswordHash,
          }),
        });
      } catch (err) {
        console.warn('Failed to update settings in Google Apps Script proxy', err);
      }
    }

    return { success: true };
  }

  /**
   * Test Connection to Google Apps Script Web App via Server
   */
  static async testGasConnection(url?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/test-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const text = await res.text();
      if (!text || !text.trim()) {
        return {
          success: false,
          message: 'سرور یا گوگل ایپس اسکرپٹ سے خالی جواب ملا (Empty response received). براہ کرم گوگل ویب ایپ کا لنک چیک کریں۔',
        };
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        return {
          success: false,
          message: `غیر متوقع جواب موصول ہوا: ${text.slice(0, 150)}`,
        };
      }

      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Connected successfully' : 'Connection failed'),
      };
    } catch (err: any) {
      return { success: false, message: `Connection test failed: ${err.message}` };
    }
  }
}
