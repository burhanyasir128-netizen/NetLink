import React, { useState } from 'react';
import { Search, X, CheckCircle2, Star, Printer, Building, CreditCard, Phone, MapPin, User, Calendar, ShieldCheck } from 'lucide-react';
import { SystemSettings, Voter } from '../types';
import { formatDate } from '../utils/formatters';
import { getDirectImageUrl } from '../services/driveHelper';

interface VerifyVoterModalProps {
  isOpen: boolean;
  onClose: () => void;
  voters: Voter[];
  settings: SystemSettings;
  onPrintCertificate: (voter: Voter) => void;
}

export const VerifyVoterModal: React.FC<VerifyVoterModalProps> = ({
  isOpen,
  onClose,
  voters,
  settings,
  onPrintCertificate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  // Search logic: by name, mobile, firm name, or CNIC
  const cleanQuery = searchTerm.trim().toLowerCase();
  const searchDigits = searchTerm.replace(/\D/g, '');

  const filtered = voters.filter((v) => {
    if (!cleanQuery) return false;
    const nameMatch = v.fullName.toLowerCase().includes(cleanQuery);
    const firmMatch = v.firmName.toLowerCase().includes(cleanQuery);
    const serialMatch = v.serialNumber.toLowerCase().includes(cleanQuery);
    const cnicDigits = v.cnic.replace(/\D/g, '');
    const mobileDigits = v.mobile.replace(/\D/g, '');

    const cnicMatch = searchDigits.length >= 4 && cnicDigits.includes(searchDigits);
    const mobileMatch = searchDigits.length >= 4 && mobileDigits.includes(searchDigits);

    return nameMatch || firmMatch || serialMatch || cnicMatch || mobileMatch;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    if (filtered.length === 1) {
      setSelectedVoter(filtered[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-slate-100 text-base">
                Verify Registered Voter (ووٹر تصدیقی پورٹل)
              </h3>
              <p className="text-xs text-slate-400">Search by Name, Mobile Number, CNIC, or Firm / Shop Name</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHasSearched(false);
                }}
                placeholder="Search by Name, Mobile (e.g. 0300...), CNIC, or Firm name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-emerald-950 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>

          {/* Quick results picker if multiple matches */}
          {filtered.length > 0 && !selectedVoter && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Found {filtered.length} matching registered voter(s). Select one to view certificate:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filtered.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoter(v)}
                    className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl cursor-pointer transition-all flex items-center gap-3"
                  >
                    <img
                      src={getDirectImageUrl(v.photoUrl, 'thumb') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                      alt={v.fullName}
                      className="w-11 h-11 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-100 truncate">{v.fullName}</p>
                      <p className="text-[11px] text-emerald-400 truncate">{v.firmName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{v.cnic}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If search resulted in no voters */}
          {hasSearched && filtered.length === 0 && (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">No Record Found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No registered voter was found matching "{searchTerm}". Please check the spelling or CNIC digits.
              </p>
            </div>
          )}

          {/* OFFICIAL VOTER CERTIFICATE DISPLAY */}
          {selectedVoter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedVoter(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  &larr; Search another voter
                </button>
                <button
                  type="button"
                  onClick={() => onPrintCertificate(selectedVoter)}
                  className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Official Certificate
                </button>
              </div>

              {/* Certificate Card */}
              <div className="relative p-6 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-4 border-amber-500/60 rounded-2xl shadow-2xl overflow-hidden">
                {/* Golden Ornate Corner Accents */}
                <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-400/80" />
                <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-400/80" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-400/80" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-400/80" />

                {/* Watermark Crest */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <i className="fa-solid fa-scale-balanced text-[200px] text-amber-300"></i>
                </div>

                {/* Certificate Header */}
                <div className="text-center space-y-1 pb-4 border-b border-amber-500/30">
                  <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-5 h-5 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>

                  <h3 className="font-urdu text-xl sm:text-2xl font-bold text-amber-300 leading-normal">
                    {settings.orgNameUr}
                  </h3>
                  <p className="text-xs text-slate-300 font-heading tracking-wide uppercase">
                    {settings.orgNameEn}
                  </p>
                  <div className="inline-block mt-1 px-4 py-0.5 bg-emerald-500/20 border border-emerald-500/50 rounded-full text-emerald-300 text-xs font-semibold">
                    تصدیق شدہ ووٹر سرٹیفکیٹ • OFFICIAL VOTER CERTIFICATE
                  </div>
                </div>

                {/* Verification Badge with Green Tick */}
                <div className="my-5 flex items-center justify-center gap-2 text-emerald-400">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-950">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="font-heading font-semibold text-sm text-emerald-300 tracking-wide">
                    VERIFIED & REGISTERED VOTER IN OFFICIAL ROLL
                  </span>
                </div>

                {/* Voter Details Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-center my-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  {/* Photo & Serial */}
                  <div className="sm:col-span-1 flex flex-col items-center text-center space-y-2">
                    <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-lg bg-slate-900">
                      <img
                        src={getDirectImageUrl(selectedVoter.photoUrl, 'medium')}
                        alt={selectedVoter.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                      {selectedVoter.serialNumber}
                    </span>
                  </div>

                  {/* Metadata Fields */}
                  <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 flex items-center gap-1.5 mb-0.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Full Name (بنام ووٹر)
                      </span>
                      <p className="font-semibold text-slate-100 text-sm">{selectedVoter.fullName}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1.5 mb-0.5">
                        <Building className="w-3.5 h-3.5 text-amber-400" />
                        Firm / Shop Name (نام فرم)
                      </span>
                      <p className="font-semibold text-emerald-300 text-sm">{selectedVoter.firmName}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1.5 mb-0.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        CNIC Number (شناختی کارڈ)
                      </span>
                      <p className="font-mono text-slate-200 font-semibold">{selectedVoter.cnic}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1.5 mb-0.5">
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        Mobile Number (موبائل نمبر)
                      </span>
                      <p className="font-mono text-slate-200">{selectedVoter.mobile}</p>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-slate-400 flex items-center gap-1.5 mb-0.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        Address (مکمل پتہ)
                      </span>
                      <p className="text-slate-300">{selectedVoter.address}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 flex items-center gap-1.5 mb-0.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Registration Date
                      </span>
                      <p className="text-slate-300">{formatDate(selectedVoter.registrationDate)}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 mb-0.5 block">Official Roll Status</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ELIGIBLE TO VOTE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer with QR Code & Signature */}
                <div className="pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ELECTION-COMMISSION-VERIFIED:${selectedVoter.serialNumber}:${selectedVoter.cnic}`}
                      alt="Verification QR"
                      className="w-16 h-16 rounded-lg bg-white p-1 border border-slate-700"
                    />
                    <div className="text-[11px] text-slate-400">
                      <p className="font-mono text-amber-300">{selectedVoter.serialNumber}</p>
                      <p>Scan for online verification</p>
                      <p className="text-[10px] text-slate-500">Official Election Commission Portal</p>
                    </div>
                  </div>

                  {/* Official Stamp & Sign */}
                  <div className="text-center text-xs">
                    <div className="font-urdu text-sm text-slate-200 font-semibold">
                      {settings.commissionerNameUr || 'ملک محمد فاروق'}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-urdu">
                      {settings.commissionerTitleUr || 'چیف الیکشن کمشنر'}
                    </div>
                    <div className="w-36 border-b border-dashed border-slate-600 mx-auto mt-1 mb-1"></div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Authorized Signature & Seal
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
