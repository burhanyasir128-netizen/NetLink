import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Play, AlertCircle, FileCode, Server, Database } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_SOURCE } from '../constants/googleScriptCode';
import { ApiService } from '../services/apiService';
import { SystemSettings } from '../types';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [copied, setCopied] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState(settings.googleWebAppUrl || '');
  const [useGas, setUseGas] = useState(settings.useGoogleAppsScript || false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SOURCE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_SOURCE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a Google Apps Script Web App URL first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await ApiService.testGasConnection(webAppUrl.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveBackendConfig = () => {
    onSaveSettings({
      ...settings,
      googleWebAppUrl: webAppUrl.trim(),
      useGoogleAppsScript: useGas,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-slate-100 text-base">
                Google Apps Script Backend (Code.gs)
              </h3>
              <p className="text-xs text-slate-400">
                Serverless API for Google Sheets (Database) & Google Drive (Image Storage)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Explanation & Mode Toggle */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Backend Storage Mode
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose between the built-in local persistent storage or live Google Sheets/Drive.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUseGas(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    !useGas ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Local DB (Ready)
                </button>
                <button
                  type="button"
                  onClick={() => setUseGas(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    useGas ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Live Google Apps Script
                </button>
              </div>
            </div>

            {/* URL Input & Test */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300">
                Google Apps Script Web App URL (ends with <code className="text-emerald-400">/exec</code>):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Deployment Instructions (5-Minute Setup)
            </h4>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Create a new Google Sheet at{' '}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  sheets.new <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>In your Sheet, click <strong className="text-white">Extensions &gt; Apps Script</strong>.</li>
              <li>Paste the complete code below into <code className="text-emerald-300">Code.gs</code>.</li>
              <li>Click <strong className="text-white">Deploy &gt; New deployment</strong>.</li>
              <li>Select type <strong className="text-white">Web app</strong>.</li>
              <li>Set <strong className="text-white">Execute as</strong>: <code className="text-slate-300">Me (your-email)</code>.</li>
              <li>Set <strong className="text-white">Who has access</strong>: <strong className="text-emerald-400 font-bold">Anyone</strong> (essential for public registration submissions!).</li>
              <li>Click Deploy, approve the permissions, and copy the Web App URL into the field above!</li>
            </ol>
          </div>

          {/* Code Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Complete Code.gs Source Code</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Download .gs File
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Entire Code.gs'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-72 overflow-y-auto select-all leading-normal">
              {GOOGLE_APPS_SCRIPT_SOURCE}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveBackendConfig}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-950"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
