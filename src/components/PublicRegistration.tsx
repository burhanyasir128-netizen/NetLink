import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Building,
  CreditCard,
  Phone,
  MapPin,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Loader2,
  ShieldCheck,
  Search,
  Check,
  X,
  FileText,
  Languages,
  ArrowRight,
} from 'lucide-react';
import { SystemSettings, Voter } from '../types';
import { formatCnic, formatMobile, isValidCnic, isValidMobile } from '../utils/formatters';
import { compressImage, formatBytes } from '../services/imageCompression';
import { ApiService } from '../services/apiService';
import { AiService } from '../services/aiService';
import { CameraModal } from './CameraModal';
import { ScanFormModal } from './ScanFormModal';

interface PublicRegistrationProps {
  settings: SystemSettings;
  onRegistrationSuccess: (voter: Voter) => void;
  onOpenVerifyModal: () => void;
}

export const PublicRegistration: React.FC<PublicRegistrationProps> = ({
  settings,
  onRegistrationSuccess,
  onOpenVerifyModal,
}) => {
  // Form State
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [cnic, setCnic] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');

  // Image State (Voter Live Portrait Photo)
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoMeta, setPhotoMeta] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  // Validation States
  const [cnicStatus, setCnicStatus] = useState<'idle' | 'checking' | 'valid' | 'duplicate'>('idle');
  const [cnicDuplicateMsg, setCnicDuplicateMsg] = useState('');
  const [mobileStatus, setMobileStatus] = useState<'idle' | 'checking' | 'valid' | 'duplicate'>('idle');
  const [mobileDuplicateMsg, setMobileDuplicateMsg] = useState('');

  // AI OCR & Translation states
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
  const [ocrFilledNotice, setOcrFilledNotice] = useState<string | null>(null);

  // UI state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedVoter, setSubmittedVoter] = useState<Voter | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoSectionRef = useRef<HTMLDivElement | null>(null);

  // Live Debounced Duplicate Check for CNIC
  useEffect(() => {
    const rawDigits = cnic.replace(/\D/g, '');
    if (rawDigits.length !== 13) {
      setCnicStatus('idle');
      setCnicDuplicateMsg('');
      return;
    }

    setCnicStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await ApiService.checkDuplicate(cnic, '');
        if (res.cnicExists) {
          setCnicStatus('duplicate');
          setCnicDuplicateMsg(`CNIC already registered${res.existingVoterName ? ` to ${res.existingVoterName}` : ''}`);
        } else {
          setCnicStatus('valid');
          setCnicDuplicateMsg('');
        }
      } catch {
        setCnicStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [cnic]);

  // Live Debounced Duplicate Check for Mobile
  useEffect(() => {
    const rawDigits = mobile.replace(/\D/g, '');
    if (rawDigits.length < 11) {
      setMobileStatus('idle');
      setMobileDuplicateMsg('');
      return;
    }

    setMobileStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await ApiService.checkDuplicate('', mobile);
        if (res.mobileExists) {
          setMobileStatus('duplicate');
          setMobileDuplicateMsg(`Mobile already registered${res.existingVoterName ? ` to ${res.existingVoterName}` : ''}`);
        } else {
          setMobileStatus('valid');
          setMobileDuplicateMsg('');
        }
      } catch {
        setMobileStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mobile]);

  // Process File Upload with Canvas Compression
  const handleFile = async (file: File) => {
    setErrorMessage(null);

    // Validate size (max 5MB)
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrorMessage(`Selected image exceeds ${MAX_MB}MB limit. Please choose a smaller image.`);
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      const result = await compressImage(file, 800, 800, 0.85);
      setPhotoBase64(result.base64);
      setPhotoMeta({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
      });
    } catch (err: any) {
      setErrorMessage('Failed to compress image: ' + err.message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Convert English entries to Urdu via local dictionary
  const handleTranslateAllToUrdu = async () => {
    if (!fullName && !firmName && !address) {
      setErrorMessage('Please type entries into Full Name, Firm Name, or Address first.');
      return;
    }

    setIsTranslating(true);
    setErrorMessage(null);
    try {
      const res = await AiService.translateToUrdu({ fullName, firmName, address });
      if (res.success && res.data) {
        if (res.data.fullNameUrdu) setFullName(res.data.fullNameUrdu);
        if (res.data.firmNameUrdu) setFirmName(res.data.firmNameUrdu);
        if (res.data.addressUrdu) setAddress(res.data.addressUrdu);
        setOcrFilledNotice('انگریزی الفاظ کو بغیر کسی بیرونی API کے خودکار اردو رسم الخط میں تبدیل کر دیا گیا ہے۔ (Instant local conversion)');
      } else {
        setErrorMessage(res.error || 'Translation failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Translation error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Callback when OCR scan from modal is applied
  const handleApplyOcrData = (data: {
    fullName: string;
    firmName: string;
    cnic: string;
    mobile: string;
    address: string;
  }) => {
    setFullName(data.fullName);
    setFirmName(data.firmName);
    setCnic(data.cnic);
    setMobile(data.mobile);
    setAddress(data.address);
    setOcrFilledNotice(
      'Manual form scanned successfully! Data populated. Now please take the voter\'s live photo below.'
    );

    // Smooth scroll down to photo section
    setTimeout(() => {
      photoSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form field validations
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name (بنام ووٹر).');
      return;
    }
    if (!firmName.trim()) {
      setErrorMessage('Please enter your firm / shop name (نام فرم / دکان).');
      return;
    }
    if (!isValidCnic(cnic)) {
      setErrorMessage('Please enter a valid 13-digit CNIC number.');
      return;
    }
    if (cnicStatus === 'duplicate') {
      setErrorMessage(cnicDuplicateMsg || 'This CNIC is already registered.');
      return;
    }
    if (!isValidMobile(mobile)) {
      setErrorMessage('Please enter a valid 11-digit mobile number (starting with 03).');
      return;
    }
    if (mobileStatus === 'duplicate') {
      setErrorMessage(mobileDuplicateMsg || 'This mobile number is already registered.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Please enter your complete address (مکمل پتہ).');
      return;
    }
    if (!photoBase64) {
      setErrorMessage('Please capture a live photo of the voter or upload an image.');
      photoSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalFullName = fullName.trim();
      let finalFirmName = firmName.trim();
      let finalAddress = address.trim();

      // If user has English text and auto-translate is enabled, automatically convert before saving!
      const containsEnglish = /[a-zA-Z]/.test(finalFullName) || /[a-zA-Z]/.test(finalFirmName);
      if (autoTranslateEnabled && containsEnglish) {
        try {
          const trans = await AiService.translateToUrdu({
            fullName: finalFullName,
            firmName: finalFirmName,
            address: finalAddress,
          });
          if (trans.success && trans.data) {
            if (trans.data.fullNameUrdu) finalFullName = trans.data.fullNameUrdu;
            if (trans.data.firmNameUrdu) finalFirmName = trans.data.firmNameUrdu;
            if (trans.data.addressUrdu) finalAddress = trans.data.addressUrdu;
          }
        } catch {
          // If translation fails, proceed with original
        }
      }

      const payload = {
        fullName: finalFullName,
        firmName: finalFirmName,
        cnic: cnic.trim(),
        mobile: mobile.trim(),
        address: finalAddress,
        photoUrl: photoBase64,
        status: 'Verified' as const,
        wardOrArea: finalFirmName,
      };

      const result = await ApiService.registerVoter(payload);
      if (result.success && result.voter) {
        setSubmittedVoter(result.voter);
        onRegistrationSuccess(result.voter);
      } else {
        setErrorMessage(result.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFullName('');
    setFirmName('');
    setCnic('');
    setMobile('');
    setAddress('');
    setPhotoBase64('');
    setPhotoMeta(null);
    setCnicStatus('idle');
    setMobileStatus('idle');
    setSubmittedVoter(null);
    setErrorMessage(null);
    setOcrFilledNotice(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Official Banner / Top Intro */}
      <div className="mb-8 p-6 sm:p-8 rounded-3xl glass-panel border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-950 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Official Voter Enrollment Portal
              </span>
            </div>
            <h2 className="font-urdu text-2xl sm:text-3xl font-bold text-white leading-normal">
              {settings.orgNameUr}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-heading">
              {settings.subTitleUr} &bull; Registration of eligible voters, book publishers, and traders of Urdu Bazar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* MANUAL FORM SCANNER BUTTON */}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>Scan Manual Paper Form (دستی فارم سکینر)</span>
            </button>

            {/* VERIFY STATUS BUTTON */}
            <button
              type="button"
              onClick={onOpenVerifyModal}
              className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Verify Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal or Success Card after registration */}
      {submittedVoter ? (
        <div className="p-8 rounded-3xl glass-panel border border-emerald-500/50 bg-slate-900/95 shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1 rounded-md border border-emerald-700/50">
              SERIAL #: {submittedVoter.serialNumber}
            </span>
            <h3 className="text-2xl font-bold font-heading text-white">Registration Successful!</h3>
            <p className="text-sm font-urdu text-emerald-300">
              آپ کا ووٹر اندراج کامیابی سے مکمل ہو چکا ہے۔
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your details and compressed photo have been recorded into the official election registry.
            </p>
          </div>

          {/* Quick Info Box */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Voter Name:</span>
              <span className="font-semibold text-slate-100 font-urdu">{submittedVoter.fullName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Firm / Shop:</span>
              <span className="text-emerald-300 font-semibold font-urdu">{submittedVoter.firmName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">CNIC:</span>
              <span className="font-mono text-slate-200">{submittedVoter.cnic}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Mobile:</span>
              <span className="font-mono text-slate-200">{submittedVoter.mobile}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenVerifyModal}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              View Official Voter Certificate
            </button>
            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Register Another Voter (نیا ووٹر درج کریں)
            </button>
          </div>
        </div>
      ) : (
        /* The Official Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 shadow-xl space-y-6">
            {/* Form Header with Scan Shortcut & Urdu Toggle */}
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span>Voter Registration Form</span>
                  <span className="font-urdu text-sm font-normal text-emerald-400">(فارم برائے اندراج ووٹر)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  All fields marked with an asterisk (<span className="text-rose-400">*</span>) are mandatory.
                </p>
              </div>

              {/* Translation & Scan Action Bar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScanModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scan Manual Form</span>
                </button>

                <button
                  type="button"
                  onClick={handleTranslateAllToUrdu}
                  disabled={isTranslating}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Translate English entries into Urdu Nastaliq"
                >
                  {isTranslating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Languages className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>Convert to Urdu</span>
                </button>
              </div>
            </div>

            {/* Smart Banner: Auto-Translate Toggle */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  <strong>Smart Language Conversion:</strong> Entry in English will automatically be translated to Urdu on submission.
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoTranslateEnabled}
                  onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300 text-xs font-medium font-urdu">خودکار اردو ترجمہ</span>
              </label>
            </div>

            {/* OCR Scanned Success Notice */}
            {ocrFilledNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{ocrFilledNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOcrFilledNotice(null)}
                  className="text-emerald-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1">{errorMessage}</div>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Grid of Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label>
                    Full Name (بنام ووٹر) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-urdu text-emerald-400">مکمل نام</span>
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. محمد بلال قریشی (or Muhammad Bilal)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Firm / Shop Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label>
                    Firm / Shop Name (نام فرم / دکان) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-urdu text-emerald-400">ادارہ / دکان</span>
                </div>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g. سنگ میل پبلی کیشنز (or Sang-e-Meel Publications)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* CNIC Number with Live Duplicate Check & Masking */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label>
                    CNIC Number (قومی شناختی کارڈ) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">XXXXX-XXXXXXX-X</span>
                </div>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={cnic}
                    onChange={(e) => setCnic(formatCnic(e.target.value))}
                    placeholder="35201-1234567-1"
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border rounded-xl text-slate-100 font-mono placeholder-slate-500 text-sm focus:outline-none transition-colors ${
                      cnicStatus === 'valid'
                        ? 'border-emerald-500/80 focus:border-emerald-500'
                        : cnicStatus === 'duplicate'
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-700/80 focus:border-emerald-500'
                    }`}
                  />
                  {/* Validation Indicator Icon */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {cnicStatus === 'checking' && (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    )}
                    {cnicStatus === 'valid' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center" title="CNIC Available">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    {cnicStatus === 'duplicate' && (
                      <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center" title="Duplicate CNIC!">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Duplicate warning message */}
                {cnicStatus === 'duplicate' && (
                  <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {cnicDuplicateMsg}
                  </p>
                )}
                {cnicStatus === 'valid' && (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" />
                    CNIC verified & eligible for registration
                  </p>
                )}
              </div>

              {/* Mobile Number with Live Duplicate Check & Masking */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label>
                    Mobile Number (موبائل نمبر) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">03XXXXXXXXX</span>
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={mobile}
                    onChange={(e) => setMobile(formatMobile(e.target.value))}
                    placeholder="0300-1234567"
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border rounded-xl text-slate-100 font-mono placeholder-slate-500 text-sm focus:outline-none transition-colors ${
                      mobileStatus === 'valid'
                        ? 'border-emerald-500/80 focus:border-emerald-500'
                        : mobileStatus === 'duplicate'
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-700/80 focus:border-emerald-500'
                    }`}
                  />
                  {/* Validation Indicator Icon */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {mobileStatus === 'checking' && (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    )}
                    {mobileStatus === 'valid' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center" title="Mobile Available">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    {mobileStatus === 'duplicate' && (
                      <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center" title="Duplicate Mobile!">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Duplicate warning message */}
                {mobileStatus === 'duplicate' && (
                  <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {mobileDuplicateMsg}
                  </p>
                )}
                {mobileStatus === 'valid' && (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" />
                    Mobile number verified
                  </p>
                )}
              </div>

              {/* Complete Address */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label>
                    Complete Address (مکمل پتہ) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-urdu text-emerald-400">دکان / رہائشی پتہ</span>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. دکان نمبر 24، سرکلر روڈ، چوک اردو بازار، لاہور (or Shop #24, Circular Road, Lahore)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Webcam & Image Upload Section (The Voter's Live Photograph) */}
            <div ref={photoSectionRef} className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Voter Portrait Photograph (ووٹر کی لائیو تصویر لیں) <span className="text-rose-400">*</span></span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Canvas Auto-Compressed (Max 800px, 0.85 JPEG)
                </span>
              </div>

              {photoBase64 ? (
                /* Selected / Captured Image Preview */
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/40 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-xl overflow-hidden border-2 border-emerald-500/60 shadow-md shrink-0 bg-slate-900">
                    <img
                      src={photoBase64}
                      alt="Voter preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Voter Portrait Ready for ID Card & Certificate
                    </div>
                    {photoMeta && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        Original: {formatBytes(photoMeta.originalSize)} &bull; Compressed: <strong className="text-emerald-300">{formatBytes(photoMeta.compressedSize)}</strong>
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      Standardized for Election Commission ID Card & Official Roll.
                    </p>

                    <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        Retake Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                        Upload Different
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoBase64('');
                          setPhotoMeta(null);
                        }}
                        className="px-2 py-1.5 text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Dropzone and Action Buttons */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-4 ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Live Photo (ووٹر کی لائیو تصویر لیں)</span>
                    </button>

                    <span className="text-xs text-slate-500">or</span>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-sky-400" />
                      <span>Choose File</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Drag and drop voter portrait photo here (PNG, JPG, WebP &bull; Max 5MB)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Client-side compression automatically downscales to 800px max before upload
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                By submitting, you certify that all information provided is accurate and authentic.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || cnicStatus === 'duplicate' || mobileStatus === 'duplicate'}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Registration (اندراج مکمل کریں)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Manual Paper Form OCR Modal */}
      <ScanFormModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApplyData={handleApplyOcrData}
      />

      {/* Camera Capture Modal (for Voter Portrait) */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(base64, stats) => {
          setPhotoBase64(base64);
          setPhotoMeta(stats);
        }}
      />
    </div>
  );
};
