export type UserRole = 'super_admin' | 'admin' | 'data_entry' | 'viewer';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Voter {
  id: string;
  serialNumber: string;
  fullName: string;
  firmName: string;
  cnic: string; // Format: XXXXX-XXXXXXX-X
  mobile: string; // Format: 03XXXXXXXXX
  address: string;
  photoUrl: string; // Base64 or Google Drive / hosted URL
  registrationDate: string; // ISO date string
  status: 'Verified' | 'Pending' | 'Rejected';
  wardOrArea?: string;
  notes?: string;
}

export interface SystemSettings {
  orgNameEn: string;
  orgNameUr: string;
  subTitleEn: string;
  subTitleUr: string;
  logoUrl: string;
  phone: string;
  adminPasswordHash: string; // Backend password
  googleWebAppUrl: string;
  useGoogleAppsScript: boolean;
  securityProtectionEnabled: boolean;
  commissionerNameUr: string;
  commissionerTitleUr: string;
}

export interface DuplicateCheckResult {
  cnicExists: boolean;
  mobileExists: boolean;
  existingVoterName?: string;
}

export type ActiveTab = 'register' | 'verify' | 'admin' | 'script-info';

export type PrintMode = 'none' | 'single-id' | 'all-ids' | 'list' | 'certificate';

