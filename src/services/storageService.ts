import { SystemSettings, Voter } from '../types';

const STORAGE_KEY_VOTERS = 'official_voter_registry_voters_v2';
const STORAGE_KEY_SETTINGS = 'official_voter_registry_settings_v2';

export const DEFAULT_SETTINGS: SystemSettings = {
  orgNameUr: 'چیف الیکشن کمیشن اردو بازار لاہور',
  orgNameEn: 'Chief Election Commission Urdu Bazar Lahore',
  subTitleUr: 'انجمن تاجران و ناشران کتب رجسٹرڈ ووٹر فہرست',
  subTitleEn: 'Association of Traders & Publishers Registered Voters',
  phone: '042-37234567 / 0300-8451234',
  logoUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=200&q=80',
  adminPasswordHash: 'admin', // default backend password
  googleWebAppUrl: 'https://script.google.com/macros/s/AKfycbxeLGd8p4aXQEQgrxoD2YFD24Fpe1qo8J-UDivpatTgqg7vvVKUmQRkNEPgywax-n6POA/exec',
  useGoogleAppsScript: true,
  securityProtectionEnabled: true,
  commissionerNameUr: 'ملک محمد فاروق',
  commissionerTitleUr: 'چیف الیکشن کمشنر',
};

const SEED_VOTERS: Voter[] = [
  {
    id: 'UB-1001',
    serialNumber: 'UB-1001',
    fullName: 'محمد بلال قریشی (Muhammad Bilal)',
    firmName: 'سنگ میل پبلی کیشنز (Sang-e-Meel Publications)',
    cnic: '35201-1234567-1',
    mobile: '0300-8412345',
    address: 'دکان نمبر 25، اردو بازار، بالمقابل حبیب بینک، لاہور',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    registrationDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: 'Verified',
    wardOrArea: 'وارڈ 1 - سنٹرل مارکیٹ',
    notes: 'سینئر ممبر مجلس عاملہ',
  },
  {
    id: 'UB-1002',
    serialNumber: 'UB-1002',
    fullName: 'حاجی رشید احمد (Haji Rasheed Ahmed)',
    firmName: 'علمی کتاب خانہ (Ilmi Kitab Khana)',
    cnic: '35202-7654321-3',
    mobile: '0321-4567890',
    address: 'پلازہ چوک، پیسہ اخبار روڈ، اردو بازار، لاہور',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    registrationDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    status: 'Verified',
    wardOrArea: 'وارڈ 2 - پیسہ اخبار سیکٹر',
    notes: 'سابق صدر انجمن تاجران',
  },
  {
    id: 'UB-1003',
    serialNumber: 'UB-1003',
    fullName: 'سید عثمان علی شاہ (Syed Usman Ali)',
    firmName: 'کاروان بک سنٹر (Caravan Book Centre)',
    cnic: '35201-9876543-5',
    mobile: '0333-8765432',
    address: 'شاپ نمبر 12، مکتبہ کاروان، چوہان پلازہ، لاہور',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    registrationDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: 'Verified',
    wardOrArea: 'وارڈ 1 - سنٹرل مارکیٹ',
  },
  {
    id: 'UB-1004',
    serialNumber: 'UB-1004',
    fullName: 'چوہدری طارق محمود (Ch. Tariq Mehmood)',
    firmName: 'دارالسلام پبلشرز (Darussalam Publishers)',
    cnic: '35202-3344556-7',
    mobile: '0345-4433221',
    address: 'مین انٹری گیٹ نمبر 3، لوئر مال برانچ، اردو بازار، لاہور',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    registrationDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'Verified',
    wardOrArea: 'وارڈ 3 - لوئر مال گیٹ',
  },
  {
    id: 'UB-1005',
    serialNumber: 'UB-1005',
    fullName: 'شیخ ندیم اصغر (Sheikh Nadeem Asghar)',
    firmName: 'مکتبہ جمال لاہور (Maktaba-e-Jamal)',
    cnic: '35201-5566778-9',
    mobile: '0301-9988776',
    address: 'دکان نمبر 4، قذافی مارکیٹ، اردو بازار، لاہور',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    registrationDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    status: 'Verified',
    wardOrArea: 'وارڈ 2 - پیسہ اخبار سیکٹر',
  },
  {
    id: 'UB-1006',
    serialNumber: 'UB-1006',
    fullName: 'حافظ محمد عاصم (Hafiz Muhammad Asim)',
    firmName: 'کتب خانہ عزیزیہ (Kutub Khana Azizia)',
    cnic: '35201-7788990-1',
    mobile: '0312-3344556',
    address: 'بالمقابل گاماں پہلوان اکھاڑہ، اردو بازار، لاہور',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    registrationDate: new Date().toISOString(),
    status: 'Verified',
    wardOrArea: 'وارڈ 1 - سنٹرل مارکیٹ',
  },
];

export function getStoredVoters(): Voter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_VOTERS, JSON.stringify(SEED_VOTERS));
      return SEED_VOTERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_VOTERS;
  } catch {
    return SEED_VOTERS;
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
