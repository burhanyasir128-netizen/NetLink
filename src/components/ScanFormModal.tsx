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
  Eye,
} from 'lucide-react';
import { compressImage } from '../services/imageCompression';
import { AiService, ScannedFormData } from '../services/aiService';
import { ApiService } from '../services/apiService';
import { Voter } from '../types';
import { formatCnic, formatMobile } from '../utils/formatters';

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
  const [scanResult, setScanResult] = useState<ScannedFormData | null>(null);
  const [existingRecord, setExistingRecord] = useState<Voter | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLanguageMode, setSelectedLanguageMode] = useState<'urdu' | 'english' | 'bilingual'>('urdu');

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
        runOcrScan(compressed.base64);
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
      runOcrScan(compressed.base64);
    } catch (err: any) {
      setErrorMessage('Failed to read image: ' + err.message);
    }
  };

  // Execute AI OCR Scan
  const runOcrScan = async (base64Img: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setScanResult(null);
    setExistingRecord(null);

    try {
      const res = await AiService.scanManualForm(base64Img);
      if (res.success && res.data) {
        setScanResult(res.data);

        // Check if voter already exists in database/sheet by CNIC or Mobile
        const scannedCnic = res.data.cnic || '';
        const scannedMobile = res.data.mobile || '';

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
      } else {
        setErrorMessage(res.error || 'Could not detect voter details. Please ensure form text is clear.');
      }
    } catch (err: any) {
      setErrorMessage('Scanning service error: ' + err.message);
    } finally {
      setIsScanning(false);
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

  // Prepare final values based on chosen language preference (Urdu vs English vs Bilingual)
  const getPreparedValues = () => {
    if (!scanResult) return null;

    let fullName = scanResult.fullName || '';
    let firmName = scanResult.firmName || '';
    let address = scanResult.address || '';

    if (selectedLanguageMode === 'urdu') {
      fullName = scanResult.fullNameUrdu || scanResult.fullName || '';
      firmName = scanResult.firmNameUrdu || scanResult.firmName || '';
      address = scanResult.addressUrdu || scanResult.address || '';
    } else if (selectedLanguageMode === 'english') {
      fullName = scanResult.fullName || scanResult.fullNameUrdu || '';
      firmName = scanResult.firmName || scanResult.firmNameUrdu || '';
      address = scanResult.address || scanResult.addressUrdu || '';
    } else if (selectedLanguageMode === 'bilingual') {
      // e.g. "Muhammad Bilal (محمد بلال)"
      if (scanResult.fullName && scanResult.fullNameUrdu && scanResult.fullName !== scanResult.fullNameUrdu) {
        fullName = `${scanResult.fullName} (${scanResult.fullNameUrdu})`;
      } else {
        fullName = scanResult.fullNameUrdu || scanResult.fullName || '';
      }

      if (scanResult.firmName && scanResult.firmNameUrdu && scanResult.firmName !== scanResult.firmNameUrdu) {
        firmName = `${scanResult.firmName} (${scanResult.firmNameUrdu})`;
      } else {
        firmName = scanResult.firmNameUrdu || scanResult.firmName || '';
      }

      address = scanResult.addressUrdu || scanResult.address || '';
    }

    return {
      fullName,
      firmName,
      cnic: formatCnic(scanResult.cnic || ''),
      mobile: formatMobile(scanResult.mobile || ''),
      address,
    };
  };

  const handleApply = () => {
    const prepared = getPreparedValues();
    if (prepared) {
      onApplyData(prepared);
      stopDocumentCamera();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-slate-100 text-base flex items-center gap-2">
                <span>AI Manual Form Scanner & Auto-Fill</span>
                <span className="font-urdu text-emerald-400 text-sm font-normal">دستی فارم سکینر</span>
              </h3>
              <p className="text-xs text-slate-400">
                Upload or capture a photo of the paper form/slip to automatically extract and translate fields.
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
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 flex-1">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
              {formImage && (
                <button
                  type="button"
                  onClick={() => runOcrScan(formImage)}
                  disabled={isScanning}
                  className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Retry Scan</span>
                </button>
              )}
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
                  Select or Capture Manual Form / Registration Slip
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Take a clear photo of the handwritten or printed voter form, token, or CNIC.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startDocumentCamera}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-950 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Camera to Shoot Form</span>
                </button>

                <span className="text-xs text-slate-500">or</span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-sky-400" />
                  <span>Upload Form Image</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          ) : (
            /* Image Preview & Scanning Status */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Scanned Document:</span>
                  <span className="text-xs text-emerald-400 font-medium">Image Loaded</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormImage(null);
                    setScanResult(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Scan Another Document
                </button>
              </div>

              <div className="relative max-h-48 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <img src={formImage} alt="Document" className="max-h-48 w-auto object-contain" />
                {isScanning && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-slate-200 text-xs">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    <span className="font-semibold text-emerald-300">
                      Gemini Multimodal AI is extracting details...
                    </span>
                    <span className="font-urdu text-slate-400">دستی فارم سے معلومات حاصل کی جا رہی ہیں</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scanned Results & Language Mode Switch */}
          {scanResult && (
            <div className="space-y-4 p-5 rounded-2xl bg-slate-950/70 border border-emerald-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Extracted Form Fields</span>
                </div>

                {/* Language Preference Segmented Control */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedLanguageMode('urdu')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedLanguageMode === 'urdu'
                        ? 'bg-emerald-600 text-white font-urdu'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Languages className="w-3 h-3" />
                    <span>اردو میں محفوظ کریں</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguageMode('english')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedLanguageMode === 'english'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguageMode('bilingual')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedLanguageMode === 'bilingual'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Both (دونوں)
                  </button>
                </div>
              </div>

              {/* Existing Record Notice (If CNIC or Mobile already registered) */}
              {isCheckingDuplicate && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                  <span>Checking database for existing registered voter record... (ووٹر ریکارڈ کی جانچ ہو رہی ہے)</span>
                </div>
              )}

              {existingRecord && !isCheckingDuplicate && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/60 text-xs text-amber-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                          <span>یہ ووٹر پہلے سے رجسٹرڈ ہے! (Record Already Exists)</span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-600/40">
                            {existingRecord.serialNumber}
                          </span>
                        </h4>
                        <p className="text-amber-300/90 text-xs mt-1">
                          سکین کیے گئے شناختی کارڈ یا موبائل نمبر سے ریکارڈ مل گیا ہے۔
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyExistingRecord}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors shrink-0 cursor-pointer"
                    >
                      موجودہ ریکارڈ لوڈ کریں (Use Existing Data)
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

              {/* Data Preview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Full Name (بنام ووٹر):</span>
                  <p className="font-semibold text-slate-100 text-sm">
                    {selectedLanguageMode === 'urdu'
                      ? scanResult.fullNameUrdu || scanResult.fullName
                      : selectedLanguageMode === 'english'
                      ? scanResult.fullName
                      : `${scanResult.fullName || ''} (${scanResult.fullNameUrdu || ''})`}
                  </p>
                  {scanResult.fullNameUrdu && selectedLanguageMode !== 'urdu' && (
                    <p className="text-[11px] font-urdu text-emerald-400">{scanResult.fullNameUrdu}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Firm / Shop Name (نام فرم):</span>
                  <p className="font-semibold text-emerald-300 text-sm">
                    {selectedLanguageMode === 'urdu'
                      ? scanResult.firmNameUrdu || scanResult.firmName
                      : selectedLanguageMode === 'english'
                      ? scanResult.firmName
                      : `${scanResult.firmName || ''} (${scanResult.firmNameUrdu || ''})`}
                  </p>
                  {scanResult.firmNameUrdu && selectedLanguageMode !== 'urdu' && (
                    <p className="text-[11px] font-urdu text-emerald-400">{scanResult.firmNameUrdu}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">CNIC Number:</span>
                  <p className="font-mono font-bold text-slate-100">{formatCnic(scanResult.cnic || '')}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Mobile Number:</span>
                  <p className="font-mono font-bold text-slate-100">{formatMobile(scanResult.mobile || '')}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 sm:col-span-2">
                  <span className="text-slate-400 block mb-0.5">Complete Address (مکمل پتہ):</span>
                  <p className="text-slate-200">
                    {selectedLanguageMode === 'urdu'
                      ? scanResult.addressUrdu || scanResult.address
                      : scanResult.address}
                  </p>
                  {scanResult.addressUrdu && selectedLanguageMode !== 'urdu' && (
                    <p className="text-[11px] font-urdu text-emerald-400 mt-0.5">{scanResult.addressUrdu}</p>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Clicking "Apply to Form" will fill these fields. Next, you can snap the voter's live photo and submit!
                </span>
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
            className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl"
          >
            Cancel
          </button>

          {scanResult && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Form (فارم میں ڈیٹا درج کریں)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
