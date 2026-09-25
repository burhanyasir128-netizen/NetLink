import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, Sparkles } from 'lucide-react';
import { compressImage, formatBytes } from '../services/imageCompression';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (compressedBase64: string, info: { originalSize: number; compressedSize: number }) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  // Initialize camera stream
  const startCamera = async (mode: 'user' | 'environment') => {
    setError(null);
    setLoading(true);

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser or use the file upload option.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera detected on this device. Please use standard file upload.');
      } else {
        setError(`Unable to access camera: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCompressionStats(null);
      startCamera(facingMode);
    } else {
      // Clean up on close
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const takeSnapshot = async () => {
    if (!videoRef.current) return;

    try {
      setCompressing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // If user camera, mirror it horizontally for natural selfie feel
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob for compression
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Failed to capture snapshot');
          setCompressing(false);
          return;
        }

        try {
          // Compress via canvas helper: max 800x800, 0.85 quality
          const result = await compressImage(blob, 800, 800, 0.85);
          setCapturedImage(result.base64);
          setCompressionStats({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
          });
        } catch (err: any) {
          setError('Compression failed: ' + err.message);
        } finally {
          setCompressing(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (err: any) {
      setError('Snapshot error: ' + err.message);
      setCompressing(false);
    }
  };

  const handleConfirm = () => {
    if (capturedImage && compressionStats) {
      onCapture(capturedImage, compressionStats);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCompressionStats(null);
    if (!stream) {
      startCamera(facingMode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-slate-100 text-sm md:text-base">
                Take Live Photo (لائیو تصویر لیں)
              </h3>
              <p className="text-xs text-slate-400">Position face centered with clear lighting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport / Captured Preview */}
        <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center max-w-sm">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-sm text-slate-300 mb-4">{error}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <img
                src={capturedImage}
                alt="Captured Voter"
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-sm border border-emerald-500/40 text-emerald-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Photo Captured
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              
              {/* Face Guide Oval */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-dashed border-emerald-400/60 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>

              {loading && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center gap-2 text-slate-300 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  Starting Camera...
                </div>
              )}
            </>
          )}
        </div>

        {/* Compression & Metadata Info Bar */}
        {compressionStats && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-y border-emerald-900/50 flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Canvas Compressed (0.85 JPEG):
            </span>
            <span className="font-mono">
              {formatBytes(compressionStats.originalSize)} &rarr; <strong className="text-white">{formatBytes(compressionStats.compressedSize)}</strong>
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="p-4 bg-slate-900 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retake (دوبارہ لیں)
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-colors shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Use Photo (تصویر منتخب کریں)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleCamera}
                disabled={loading || Boolean(error)}
                className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Switch Camera (Front / Back)"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Switch Camera</span>
                <span className="text-[11px] opacity-75">({facingMode === 'user' ? 'Front' : 'Back'})</span>
              </button>

              <button
                type="button"
                onClick={takeSnapshot}
                disabled={loading || Boolean(error) || compressing}
                className="flex-1 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                Capture Snapshot (تصویر محفوظ کریں)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
