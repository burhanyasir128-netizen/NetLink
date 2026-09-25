import { DuplicateCheckResult, SystemSettings, Voter } from '../types';
import {
  DEFAULT_SETTINGS,
  getStoredSettings,
  getStoredVoters,
  saveStoredSettings,
  saveStoredVoters,
} from './storageService';

export class ApiService {
  /**
   * Check if Google Apps Script Web App is active
   */
  private static isGasActive(settings: SystemSettings): boolean {
    return Boolean(settings.useGoogleAppsScript && settings.googleWebAppUrl && settings.googleWebAppUrl.trim().startsWith('http'));
  }

  /**
   * GET All Voters and Settings
   */
  static async getAllData(): Promise<{ voters: Voter[]; settings: SystemSettings; isGas: boolean }> {
    const settings = getStoredSettings();

    if (this.isGasActive(settings)) {
      try {
        const url = new URL(settings.googleWebAppUrl);
        url.searchParams.set('action', 'getAll');
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.voters)) {
          // Sync to local cache
          saveStoredVoters(data.voters);
          if (data.settings) {
            const mergedSettings = { ...settings, ...data.settings };
            saveStoredSettings(mergedSettings);
            return { voters: data.voters, settings: mergedSettings, isGas: true };
          }
          return { voters: data.voters, settings, isGas: true };
        }
      } catch (err) {
        console.warn('Google Apps Script fetch failed, falling back to local database:', err);
      }
    }

    // Local DB fallback
    const voters = getStoredVoters();
    return { voters, settings, isGas: false };
  }

  /**
   * Live Validation: Check for duplicate CNIC or Mobile
   */
  static async checkDuplicate(cnic: string, mobile: string): Promise<DuplicateCheckResult> {
    const cleanCnic = (cnic || '').replace(/[^0-9]/g, '');
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');

    const settings = getStoredSettings();

    if (this.isGasActive(settings)) {
      try {
        const url = new URL(settings.googleWebAppUrl);
        url.searchParams.set('action', 'checkDuplicate');
        url.searchParams.set('cnic', cnic);
        url.searchParams.set('mobile', mobile);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          return {
            cnicExists: Boolean(data.cnicExists),
            mobileExists: Boolean(data.mobileExists),
            existingVoterName: data.existingVoterName,
          };
        }
      } catch (err) {
        console.warn('Google Apps Script duplicate check failed, using local db check', err);
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
   * Verify Admin Password
   */
  static async verifyPassword(password: string): Promise<boolean> {
    const settings = getStoredSettings();

    if (this.isGasActive(settings)) {
      try {
        const url = new URL(settings.googleWebAppUrl);
        url.searchParams.set('action', 'verifyPassword');
        url.searchParams.set('password', password);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          return Boolean(data.valid || data.success);
        }
      } catch (err) {
        console.warn('Google Apps Script password check failed, checking local', err);
      }
    }

    // Local Check
    return password === (settings.adminPasswordHash || DEFAULT_SETTINGS.adminPasswordHash);
  }

  /**
   * Register New Voter (POST)
   */
  static async registerVoter(voterData: Omit<Voter, 'id' | 'serialNumber' | 'registrationDate'>): Promise<{
    success: boolean;
    voter?: Voter;
    error?: string;
  }> {
    const settings = getStoredSettings();

    // Check duplicate first
    const dup = await this.checkDuplicate(voterData.cnic, voterData.mobile);
    if (dup.cnicExists) {
      return { success: false, error: `CNIC is already registered${dup.existingVoterName ? ` to ${dup.existingVoterName}` : ''}.` };
    }
    if (dup.mobileExists) {
      return { success: false, error: `Mobile number is already registered${dup.existingVoterName ? ` to ${dup.existingVoterName}` : ''}.` };
    }

    if (this.isGasActive(settings)) {
      try {
        const res = await fetch(settings.googleWebAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'register',
            ...voterData,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const newVoter: Voter = {
              id: data.serialNumber || `UB-${Date.now().toString().slice(-4)}`,
              serialNumber: data.serialNumber || `UB-${Date.now().toString().slice(-4)}`,
              ...voterData,
              photoUrl: data.photoUrl || voterData.photoUrl,
              registrationDate: new Date().toISOString(),
              status: voterData.status || 'Verified',
            };
            const current = getStoredVoters();
            saveStoredVoters([newVoter, ...current]);
            return { success: true, voter: newVoter };
          } else {
            return { success: false, error: data.error || 'Server error occurred' };
          }
        }
      } catch (err) {
        console.warn('Google Apps Script register failed, falling back to local creation', err);
      }
    }

    // Local DB Insertion
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
    return { success: true, voter: newVoter };
  }

  /**
   * Edit Voter Record (POST)
   */
  static async editVoter(voter: Voter): Promise<{ success: boolean; error?: string }> {
    const settings = getStoredSettings();

    if (this.isGasActive(settings)) {
      try {
        const res = await fetch(settings.googleWebAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
        console.warn('Google Apps Script edit failed, updating locally', err);
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
    const settings = getStoredSettings();

    if (this.isGasActive(settings)) {
      try {
        const res = await fetch(settings.googleWebAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
        console.warn('Google Apps Script delete failed, deleting locally', err);
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

    if (this.isGasActive(newSettings)) {
      try {
        await fetch(newSettings.googleWebAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateSettings',
            ...newSettings,
          }),
        });
      } catch (err) {
        console.warn('Failed to update settings in Google Apps Script', err);
      }
    }

    return { success: true };
  }

  /**
   * Test Connection to Google Apps Script Web App
   */
  static async testGasConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.trim().startsWith('http')) {
      return { success: false, message: 'Please enter a valid HTTP/HTTPS URL starting with https://script.google.com/...' };
    }

    try {
      const pingUrl = new URL(url);
      pingUrl.searchParams.set('action', 'ping');
      const res = await fetch(pingUrl.toString());
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      if (data.success) {
        return { success: true, message: `Connected successfully! Server time: ${data.timestamp || 'OK'}` };
      }
      return { success: false, message: data.error || 'Server responded with error status' };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message || 'Check URL permissions and ensure "Anyone" access is set'}` };
    }
  }
}
