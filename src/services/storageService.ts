import { SystemSettings, Voter } from '../types';

const STORAGE_KEY_VOTERS = 'official_voter_registry_voters_live';
const STORAGE_KEY_SETTINGS = 'official_voter_registry_settings_live';

export const DEFAULT_SETTINGS: SystemSettings = {
  orgNameUr: 'چیف الیکشن کمیشن اردو بازار لاہور',
  orgNameEn: 'Chief Election Commission Urdu Bazar Lahore',
  subTitleUr: 'انجمن تاجران و ناشران کتب رجسٹرڈ ووٹر فہرست',
  subTitleEn: 'Association of Traders & Publishers Registered Voters',
  phone: '042-37234567 / 0300-8451234',
  logoUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=200&q=80',
  adminPasswordHash: 'admin123', // default backend password
  googleWebAppUrl: 'https://script.google.com/macros/s/AKfycbxeLGd8p4aXQEQgrxoD2YFD24Fpe1qo8J-UDivpatTgqg7vvVKUmQRkNEPgywax-n6POA/exec',
  useGoogleAppsScript: true,
  securityProtectionEnabled: true,
  commissionerNameUr: 'ملک محمد فاروق',
  commissionerTitleUr: 'چیف الیکشن کمشنر',
};

export function getStoredVoters(): Voter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTERS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredVoters(voters: Voter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOTERS, JSON.stringify(voters));
  } catch (e) {
    console.error('Failed to save voters to localStorage', e);
  }
}

export function getStoredSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}
