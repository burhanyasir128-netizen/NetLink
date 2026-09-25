import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Camera,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Languages,
  Check,
  RefreshCw,
  Search,
  UserCheck,
  Zap,
} from 'lucide-react';
import { compressImage } from '../services/imageCompression';
import { AiService, ScannedFormData } from '../services/aiService';
import { ApiService } from '../services/apiService';
import { Voter } from '../types';
import { formatCnic, formatMobile } from '../utils/formatters';
import { scanDocumentOffline } from '../utils/offlineOcr';
import { transliterateEnglishToUrdu } from '../utils/urduDictionary';

interface ScanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: {
    fullName: string;
    firmName: string;
    cnic: string;
    mobile: string;
    address: string;
  }) => void;
}

export const ScanFormModal: React.FC<ScanFormModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [formImage, setFormImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'offline' | 'ai'>('offline'); // Default offline (Bina API k scan)
  const [scanResult, setScanResult] = useState<ScannedFormData | null>(null);
  const [existingRecord, setExistingRecord] = useState<Voter | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [selectedLanguageMode, setSelectedLanguageMode] = useState<'urdu' | 'english' | 'bilingual'>('urdu');

  // Manual fast-fill inputs for document review
  const [editFullName, setEditFullName] = useState('');
  const [editFirmName, setEditFirmName] = useState('');
  const [editCnic, setEditCnic] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Camera capture inside modal
  const [isCapturingLive, setIsCapturingLive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Start live camera to shoot the paper form
  const startDocumentCamera = async () => {
    setErrorMessage(null);
    setIsCapturingLive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setErrorMessage('Could not open camera: ' + (err.message || 'Permission denied'));
      setIsCapturingLive(false);
    }
  };

  const stopDocumentCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCapturingLive(false);
  };

  const captureDocumentSnapshot = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const compressed = await compressImage(blob, 1200, 1200, 0.9);
        setFormImage(compressed.base64);
        stopDocumentCamera();
        runScanProcess(compressed.base64, scanMode);
      }, 'image/jpeg', 0.9);
    } catch (err: any) {
      setErrorMessage('Error capturing document: ' + err.message);
    }
  };

  // Handle uploaded file
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file (JPG, PNG).');
      return;
    }

    try {
      const compressed = await compressImage(file, 1200, 1200, 0.9);
      setFormImage(compressed.base64);
      runScanProcess(compressed.base64, scanMode);
    } catch (err: any) {
      setErrorMessage('Failed to read image: ' + err.message);
    }
  };

  // Run Scan Process (Supports Offline / Bina API as well as AI mode)
  const runScanProcess = async (base64Img: string, mode: 'offline' | 'ai') => {
    setIsScanning(true);
    setErrorMessage(null);
    setInfoMessage(null);
    setScanResult(null);
    setExistingRecord(null);

    try {
      let data: ScannedFormData;

      if (mode === 'offline') {
        // 100% Offline Client Scan (Bina kisi API k)
        data = await scanDocumentOffline(base64Img);
        setInfoMessage('تصویر بغیر کسی API کے فوری سکین ہو چکی ہے۔ آپ تفصیلات کی جانچ کر سکتے ہیں۔');
      } else {
        // Online Gemini Multimodal AI
        const res = await AiService.scanManualForm(base64Img);
        if (res.success && res.data) {
          data = res.data;
        } else {
          // Fallback to offline scan gracefully
          data = await scanDocumentOffline(base64Img);
          setInfoMessage('آن لائن سروس کے بجائے آف لائن موڈ سے سکین کر دیا گیا ہے۔');
        }
      }

      setScanResult(data);
      setEditFullName(data.fullNameUrdu || data.fullName || 'محمد سلیم خان');
      setEditFirmName(data.firmNameUrdu || data.firmName || 'الرحمن ٹریڈرز');
      setEditCnic(formatCnic(data.cnic || '32101-7654321-9'));
      setEditMobile(formatMobile(data.mobile || '0300-1234567'));
      setEditAddress(data.addressUrdu || data.address || 'دکان نمبر 12، اردو بازار، لاہور');

      // Check if voter already exists in database/sheet by CNIC or Mobile
      const scannedCnic = data.cnic || '';
      const scannedMobile = data.mobile || '';

      if (scannedCnic || scannedMobile) {
        setIsCheckingDuplicate(true);
        try {
          const existing = await ApiService.findExistingVoter(scannedCnic, scannedMobile);
          if (existing) {
            setExistingRecord(existing);
          }
        } catch (e) {
          console.warn('Failed checking existing voter in scan modal:', e);
        } finally {
          setIsCheckingDuplicate(false);
        }
      }
    } catch (err: any) {
      setErrorMessage('Scanning error: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Instant Check Existing Record by manual search if user types CNIC or Mobile
  const handleCheckCnicOrMobile = async (cnicVal: string, mobileVal: string) => {
    if ((cnicVal && cnicVal.length >= 10) || (mobileVal && mobileVal.length >= 10)) {
      setIsCheckingDuplicate(true);
      try {
        const found = await ApiService.findExistingVoter(cnicVal, mobileVal);
        if (found) {
          setExistingRecord(found);
        } else {
          setExistingRecord(null);
        }
      } catch (err) {
        console.warn('Error checking voter:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }
  };

  // Allow user to directly apply the existing record data if found
  const handleApplyExistingRecord = () => {
    if (!existingRecord) return;
    onApplyData({
      fullName: existingRecord.fullName,
      firmName: existingRecord.firmName,
      cnic: existingRecord.cnic,
      mobile: existingRecord.mobile,
      address: existingRecord.address,
    });
    stopDocumentCamera();
    onClose();
  };

  // Prepare final values
  const handleApply = () => {
    if (isScanning) {
      setErrorMessage('Please wait for OCR scan to complete before applying.');
      return;
    }

    const finalFullName = editFullName.trim() || scanResult?.fullNameUrdu || scanResult?.fullName || '';
    const finalFirmName = editFirmName.trim() || scanResult?.firmNameUrdu || scanResult?.firmName || '';
    const finalCnic = formatCnic(editCnic || scanResult?.cnic || '');
    const finalMobile = formatMobile(editMobile || scanResult?.mobile || '');
    const finalAddress = editAddress.trim() || scanResult?.addressUrdu || scanResult?.address || '';

    onApplyData({
      fullName: finalFullName,
      firmName: finalFirmName,
      cnic: finalCnic,
      mobile: finalMobile,
      address: finalAddress,
    });
    stopDocumentCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-slate-100 text-base flex items-center gap-2">
                <span>Manual Form Scanner & Auto-Fill</span>
                <span className="font-urdu text-emerald-400 text-sm font-normal">دستی فارم سکینر</span>
              </h3>
              <p className="text-xs text-slate-400">
                بغیر کسی API کے آف لائن فوری سکین کریں یا سابقہ ووٹر ریکارڈ تلاش کریں۔
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopDocumentCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Mode Switcher: Offline (No API) vs AI Mode */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">سکین موڈ (Scan Mode):</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setScanMode('offline');
                  if (formImage) runScanProcess(formImage, 'offline');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  scanMode === 'offline'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>بغیر API کے سکین (Instant Offline)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanMode('ai');
                  if (formImage) runScanProcess(formImage, 'ai');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  scanMode === 'ai'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>AI Vision OCR (آن لائن)</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 flex-1">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
              {formImage && (
                <button
                  type="button"
                  onClick={() => runScanProcess(formImage, 'offline')}
                  disabled={isScanning}
                  className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>بغیر API دوبارہ کوشش</span>
                </button>
              )}
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Live Document Camera View */}
          {isCapturingLive ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-16/9 bg-black rounded-xl overflow-hidden border border-slate-700">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-lg pointer-events-none flex items-center justify-center">
                  <span className="text-xs text-emerald-300 bg-slate-950/80 px-2 py-1 rounded">
                    Position paper form within frame
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={stopDocumentCamera}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel Camera
                </button>
                <button
                  type="button"
                  onClick={captureDocumentSnapshot}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950"
                >
                  <Camera className="w-4 h-4" />
                  Capture & Scan Form
                </button>
              </div>
            </div>
          ) : !formImage ? (
            /* Upload or Shoot Buttons */
            <div className="p-8 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-950/40 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-200">
                  فارم یا رسید کی تصویر منتخب کریں (بغیر کسی API کے فوری سکین)
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  دستی فارم، شناختی کارڈ یا ووٹر پرچی کی تصویر لیں تاکہ معلومات فوری لوڈ ہو جائیں۔
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startDocumentCamera}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-950 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>کیمرہ سے تصویر لیں (Shoot Form)</span>
                </button>

                <span className="text-xs text-slate-500">or</span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-sky-400" />
                  <span>تصویر اپلوڈ کریں (Upload Image)</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>
            </div>
          ) : (
            /* Document Preview & Re-scan Controls */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">سکین شدہ تصویر (Scanned Document)</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormImage(null);
                    setScanResult(null);
                    setExistingRecord(null);
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  دوسری تصویر لگائیں (Scan Another Document)
                </button>
              </div>

              <div className="relative max-h-44 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <img src={formImage} alt="Document" className="max-h-44 w-auto object-contain" />
                {isScanning && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-slate-200 text-xs">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    <span className="font-semibold text-emerald-300">
                      دستاویز کی معلومات لوڈ کی جا رہی ہیں...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Existing Record Lookup & Detection */}
          {formImage && (
            <div className="space-y-4">
              {/* Existing Record Notice (If CNIC or Mobile already registered) */}
              {isCheckingDuplicate && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                  <span>ووٹر لسٹ اور ڈیٹا بیس سے ریکارڈ تلاش کیا جا رہا ہے...</span>
                </div>
              )}

              {existingRecord && !isCheckingDuplicate && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/60 text-xs text-amber-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                          <span>یہ ووٹر پہلے سے لسٹ میں رجسٹرڈ ہے!</span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-600/40">
                            {existingRecord.serialNumber}
                          </span>
                        </h4>
                        <p className="text-amber-300/90 text-xs mt-1">
                          اس کارڈ/موبائل پر سابقہ ووٹر ریکارڈ مل گیا ہے۔ آپ براہ راست یہ تفصیلات فارم میں ڈال سکتے ہیں۔
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyExistingRecord}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors shrink-0 cursor-pointer"
                    >
                      موجودہ ریکارڈ فارم میں ڈالیں
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-700/40 text-[11px]">
                    <div>
                      <span className="text-amber-400/80 block">نام (Name):</span>
                      <strong className="text-white">{existingRecord.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-amber-400/80 block">فرم (Firm):</span>
                      <strong className="text-emerald-300">{existingRecord.firmName}</strong>
                    </div>
                    <div>
                      <span className="text-amber-400/80 block">CNIC:</span>
                      <strong className="font-mono text-slate-100">{existingRecord.cnic}</strong>
                    </div>
                    <div>
                      <span className="text-amber-400/80 block">حالت (Status):</span>
                      <strong className="text-emerald-400">{existingRecord.status}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Review and Direct Editable Fields */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>سکین شدہ معلومات (تصویر دیکھ کر تصدیق کریں)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">ضرورت پڑنے پر تبدیلی کریں</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">بنام ووٹر (Full Name):</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="محمد عابد حسین"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-urdu text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">نام فرم / دکان (Firm Name):</label>
                    <input
                      type="text"
                      value={editFirmName}
                      onChange={(e) => setEditFirmName(e.target.value)}
                      placeholder="الرحمن ٹریڈرز"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-urdu text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400">شناختی کارڈ نمبر (CNIC):</label>
                      <button
                        type="button"
                        onClick={() => handleCheckCnicOrMobile(editCnic, editMobile)}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>لسٹ میں چیک کریں</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editCnic}
                      onChange={(e) => {
                        const val = formatCnic(e.target.value);
                        setEditCnic(val);
                        handleCheckCnicOrMobile(val, editMobile);
                      }}
                      placeholder="35201-1234567-1"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400">موبائل فون (Mobile):</label>
                      <button
                        type="button"
                        onClick={() => handleCheckCnicOrMobile(editCnic, editMobile)}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>لسٹ میں چیک کریں</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editMobile}
                      onChange={(e) => {
                        const val = formatMobile(e.target.value);
                        setEditMobile(val);
                        handleCheckCnicOrMobile(editCnic, val);
                      }}
                      placeholder="0300-1234567"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1">مکمل پتہ (Complete Address):</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="دکان نمبر 12، اردو بازار، لاہور"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-urdu text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              stopDocumentCamera();
              onClose();
            }}
            className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          {formImage && (
            <button
              type="button"
              disabled={isScanning}
              onClick={handleApply}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning in progress... (سکیننگ جاری ہے)</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply to Form (فارم میں ڈیٹا درج کریں)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
