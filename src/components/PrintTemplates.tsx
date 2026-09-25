import React from 'react';
import { PrintMode, SystemSettings, Voter } from '../types';
import { formatDate } from '../utils/formatters';
import { getDirectImageUrl } from '../services/driveHelper';

interface PrintTemplatesProps {
  mode: PrintMode;
  voter?: Voter | null;
  voters?: Voter[];
  settings: SystemSettings;
  onClose: () => void;
}

/**
 * Preload all images inside a DOM node before calling window.print()
 */
export async function triggerPrintWithPreload(): Promise<void> {
  const images = Array.from(document.querySelectorAll('.print-container img')) as HTMLImageElement[];
  const promises = images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });

  await Promise.all(promises);
  // Short pause to ensure CSS paints
  setTimeout(() => {
    window.print();
  }, 150);
}

export const PrintTemplates: React.FC<PrintTemplatesProps> = ({
  mode,
  voter,
  voters = [],
  settings,
  onClose,
}) => {
  if (mode === 'none') return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 overflow-y-auto p-4 flex flex-col items-center">
      {/* Print Action Bar (Hidden on actual print) */}
      <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-6 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <i className="fa-solid fa-print text-lg"></i>
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold text-sm">
              {mode === 'single-id' && 'Print Single Voter ID Card (54mm x 86mm)'}
              {mode === 'all-ids' && `Print All Voter ID Cards (${voters.length} cards)`}
              {mode === 'list' && `Print Official A4 Voter Roll (${voters.length} records)`}
              {mode === 'certificate' && 'Print Official Voter Certificate'}
            </h3>
            <p className="text-xs text-slate-400">
              High resolution vector print layout. Press Print to trigger system print dialog.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => triggerPrintWithPreload()}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
          >
            <i className="fa-solid fa-print"></i>
            Print Now
          </button>
        </div>
      </div>

      {/* Actual Printable Container */}
      <div className="print-container bg-white text-black p-6 rounded-xl shadow-2xl max-w-4xl w-full">
        {/* ========================================================================= */}
        {/* 1. SINGLE ID CARD (54mm x 86mm or standard CR80 86mm x 54mm)              */}
        {/* ========================================================================= */}
        {mode === 'single-id' && voter && (
          <div className="flex justify-center p-4">
            <SingleIdCard voter={voter} settings={settings} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. BULK ALL ID CARDS (Grid formatted for multi-card A4 sheets)            */}
        {/* ========================================================================= */}
        {mode === 'all-ids' && (
          <div className="space-y-4">
            <div className="no-print pb-2 border-b text-xs text-slate-600">
              Showing {voters.length} ID cards formatted for standard card sheets.
            </div>
            <div className="id-card-print-grid grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
              {voters.map((v) => (
                <div key={v.id} className="id-card-print-item">
                  <SingleIdCard voter={v} settings={settings} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. FULL A4 TABULAR VOTER ROLL LIST                                         */}
        {/* ========================================================================= */}
        {mode === 'list' && (
          <div className="a4-voter-list space-y-4 text-black">
            {/* Custom Urdu Header using CSS table layout for precise RTL reading */}
            <div
              style={{
                display: 'table',
                width: '100%',
                direction: 'rtl',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'table-row' }}>
                {/* Logo Cell (Right in RTL) */}
                <div style={{ display: 'table-cell', width: '70px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8fafc',
                    }}
                  >
                    <i className="fa-solid fa-scale-balanced text-2xl text-emerald-800"></i>
                  </div>
                </div>

                {/* Title & Organization (Center) */}
                <div style={{ display: 'table-cell', verticalAlign: 'middle', textAlign: 'center', padding: '0 10px' }}>
                  <h1
                    className="font-urdu"
                    style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#047857', lineHeight: '1.6' }}
                  >
                    {settings.orgNameUr || 'چیف الیکشن کمیشن اردو بازار لاہور'}
                  </h1>
                  <p style={{ fontSize: '11px', fontWeight: '600', margin: '2px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {settings.orgNameEn || 'Chief Election Commission Urdu Bazar Lahore'}
                  </p>
                  <p className="font-urdu" style={{ fontSize: '12px', color: '#334155', margin: '0' }}>
                    {settings.subTitleUr || 'انجمن تاجران و ناشران کتب رجسٹرڈ ووٹر فہرست'}
                  </p>
                </div>

                {/* Phone & Date Info (Left in RTL) */}
                <div style={{ display: 'table-cell', width: '180px', verticalAlign: 'middle', textAlign: 'left', direction: 'ltr', fontSize: '10px' }}>
                  <p style={{ margin: '1px 0', fontWeight: 'bold' }}>Phone: {settings.phone}</p>
                  <p style={{ margin: '1px 0' }}>Printed: {new Date().toLocaleDateString('en-GB')}</p>
                  <p style={{ margin: '1px 0' }}>Total Registered: <strong>{voters.length}</strong></p>
                </div>
              </div>
            </div>

            {/* Official Voters Table */}
            <table className="w-full text-left border-collapse" style={{ fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: 'white' }}>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '55px', textAlign: 'center' }}>Sr #</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '40px', textAlign: 'center' }}>Photo</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a' }}>Voter Name (بنام ووٹر)</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a' }}>Firm / Shop Name (نام فرم)</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '115px' }}>CNIC Number</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '95px' }}>Mobile</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a' }}>Address</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '60px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '70px', textAlign: 'center' }}>Signature</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((v, idx) => (
                  <tr
                    key={v.id}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {v.serialNumber}
                    </td>
                    <td style={{ padding: '3px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <img
                        src={getDirectImageUrl(v.photoUrl, 'thumb') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                        alt=""
                        style={{ width: '28px', height: '32px', objectFit: 'cover', borderRadius: '3px', margin: '0 auto' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                      {v.fullName}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', color: '#047857', fontWeight: '600' }}>
                      {v.firmName}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                      {v.cnic}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                      {v.mobile}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', fontSize: '10px' }}>
                      {v.address}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#047857', fontWeight: 'bold' }}>
                      {v.status || 'Verified'}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <div style={{ height: '22px', borderBottom: '1px dotted #94a3b8' }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Official Signature Footer */}
            <div
              style={{
                display: 'table',
                width: '100%',
                direction: 'rtl',
                marginTop: '30px',
                paddingTop: '15px',
                pageBreakInside: 'avoid',
              }}
            >
              <div style={{ display: 'table-row' }}>
                <div style={{ display: 'table-cell', textAlign: 'center', width: '33%' }}>
                  <div style={{ borderBottom: '1px solid #000', width: '160px', margin: '0 auto 6px' }}></div>
                  <p className="font-urdu" style={{ margin: '0', fontWeight: 'bold' }}>چیف الیکشن کمشنر</p>
                  <p style={{ margin: '0', fontSize: '10px', color: '#475569' }}>Chief Election Commissioner</p>
                </div>
                <div style={{ display: 'table-cell', textAlign: 'center', width: '33%' }}>
                  <div
                    style={{
                      width: '75px',
                      height: '75px',
                      borderRadius: '50%',
                      border: '2px solid #047857',
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: '8px', color: '#047857', fontWeight: 'bold' }}>OFFICIAL SEAL</span>
                    <span className="font-urdu" style={{ fontSize: '9px', color: '#047857', lineHeight: '1.2' }}>مہر تصدیق</span>
                  </div>
                </div>
                <div style={{ display: 'table-cell', textAlign: 'center', width: '33%' }}>
                  <div style={{ borderBottom: '1px solid #000', width: '160px', margin: '0 auto 6px' }}></div>
                  <p className="font-urdu" style={{ margin: '0', fontWeight: 'bold' }}>سیکرٹری الیکشن کمیشن</p>
                  <p style={{ margin: '0', fontSize: '10px', color: '#475569' }}>Secretary Election Board</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. OFFICIAL VOTER CERTIFICATE PRINT LAYOUT                                 */}
        {/* ========================================================================= */}
        {mode === 'certificate' && voter && (
          <div className="certificate-print-page p-8 border-4 border-amber-600 rounded-xl relative text-black bg-white">
            <div className="text-center space-y-1 pb-4 border-b-2 border-amber-600">
              <h1 className="font-urdu text-3xl font-bold text-emerald-800">
                {settings.orgNameUr || 'چیف الیکشن کمیشن اردو بازار لاہور'}
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {settings.orgNameEn}
              </p>
              <div className="inline-block mt-2 px-6 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold text-sm rounded-full">
                تصدیق شدہ ووٹر سرٹیفکیٹ • OFFICIAL VOTER CERTIFICATE
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6 items-center my-6 p-6 border border-slate-300 rounded-lg">
              <div className="col-span-1 text-center">
                <img
                  src={getDirectImageUrl(voter.photoUrl, 'medium')}
                  alt={voter.fullName}
                  className="w-32 h-36 object-cover border-2 border-amber-600 rounded-md mx-auto shadow-md"
                />
                <p className="font-mono text-xs font-bold mt-1 text-slate-800">{voter.serialNumber}</p>
              </div>

              <div className="col-span-3 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Full Name (بنام ووٹر):</span>
                  <p className="font-bold text-sm text-slate-900">{voter.fullName}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Firm / Shop Name (نام فرم):</span>
                  <p className="font-bold text-sm text-emerald-800">{voter.firmName}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">CNIC (قومی شناختی کارڈ):</span>
                  <p className="font-mono font-bold text-sm">{voter.cnic}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Mobile (موبائل نمبر):</span>
                  <p className="font-mono font-bold text-sm">{voter.mobile}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">Address (مکمل پتہ):</span>
                  <p className="text-slate-800 font-medium">{voter.address}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Registration Date:</span>
                  <p className="text-slate-800">{formatDate(voter.registrationDate)}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Official Status:</span>
                  <p className="text-emerald-700 font-bold">ELIGIBLE TO VOTE &bull; تصدیق شدہ</p>
                </div>
              </div>
            </div>

            {/* Footer with QR Code & Signature */}
            <div className="pt-6 border-t-2 border-amber-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ELECTION-COMMISSION:${voter.serialNumber}:${voter.cnic}`}
                  alt="QR"
                  className="w-16 h-16 border border-slate-400 p-0.5"
                />
                <div className="text-[10px] text-slate-600">
                  <p className="font-mono font-bold">{voter.serialNumber}</p>
                  <p>Electronic Verification QR Code</p>
                  <p>{settings.orgNameEn}</p>
                </div>
              </div>

              <div className="text-center">
                <p className="font-urdu font-bold text-sm">{settings.commissionerNameUr || 'ملک محمد فاروق'}</p>
                <p className="font-urdu text-xs text-emerald-800">{settings.commissionerTitleUr || 'چیف الیکشن کمشنر'}</p>
                <div className="w-36 border-b border-black mt-2 mb-1"></div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Authorized Signature & Seal</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Standard 54mm x 86mm ID Card Component (Exact CR-80 physical dimensions)
 */
export const SingleIdCard: React.FC<{ voter: Voter; settings: SystemSettings }> = ({ voter, settings }) => {
  return (
    <div
      style={{
        width: '86mm',
        height: '54mm',
        boxSizing: 'border-box',
        border: '1.5px solid #0f172a',
        borderRadius: '5mm',
        background: '#ffffff',
        color: '#000000',
        padding: '2.5mm',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      {/* Top Header with CSS table layout for right-to-left precision */}
      <div
        style={{
          display: 'table',
          width: '100%',
          direction: 'rtl',
          borderBottom: '1.2px solid #047857',
          paddingBottom: '1mm',
        }}
      >
        <div style={{ display: 'table-row' }}>
          {/* Logo Right */}
          <div style={{ display: 'table-cell', width: '7mm', verticalAlign: 'middle' }}>
            <div
              style={{
                width: '6mm',
                height: '6mm',
                background: '#047857',
                borderRadius: '1.5mm',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '9px',
              }}
            >
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
          </div>

          {/* Title Center */}
          <div style={{ display: 'table-cell', verticalAlign: 'middle', textAlign: 'center' }}>
            <h4
              className="font-urdu"
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                margin: 0,
                color: '#047857',
                lineHeight: 1.1,
              }}
            >
              {settings.orgNameUr || 'چیف الیکشن کمیشن اردو بازار لاہور'}
            </h4>
            <p
              style={{
                fontSize: '6.5px',
                fontWeight: 'bold',
                margin: 0,
                letterSpacing: '0.3px',
                color: '#1e293b',
                textTransform: 'uppercase',
              }}
            >
              VOTER IDENTIFICATION CARD &bull; انتخابی شناختی کارڈ
            </p>
          </div>

          {/* Serial Number Left */}
          <div style={{ display: 'table-cell', width: '12mm', verticalAlign: 'middle', textAlign: 'left', direction: 'ltr' }}>
            <span
              style={{
                fontSize: '7px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: '#047857',
                color: 'white',
                padding: '0.8mm 1.2mm',
                borderRadius: '1mm',
              }}
            >
              {voter.serialNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body: Photo Left, Details Right */}
      <div style={{ display: 'flex', gap: '2.5mm', alignItems: 'center', flex: 1, padding: '1mm 0' }}>
        {/* Photo Container */}
        <div style={{ width: '20mm', height: '26mm', flexShrink: 0, position: 'relative' }}>
          <img
            src={getDirectImageUrl(voter.photoUrl, 'medium')}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '2mm',
              border: '1px solid #0f172a',
            }}
          />
        </div>

        {/* Voter Details */}
        <div style={{ flex: 1, fontSize: '7.5px', lineHeight: 1.35, overflow: 'hidden' }}>
          <div style={{ marginBottom: '0.8mm' }}>
            <span style={{ color: '#475569', fontSize: '6.5px' }}>Name: </span>
            <strong style={{ fontSize: '8.5px', color: '#0f172a' }}>{voter.fullName}</strong>
          </div>

          <div style={{ marginBottom: '0.8mm' }}>
            <span style={{ color: '#475569', fontSize: '6.5px' }}>Firm: </span>
            <span style={{ fontWeight: 'bold', color: '#047857' }}>{voter.firmName}</span>
          </div>

          <div style={{ marginBottom: '0.8mm', display: 'flex', gap: '3mm' }}>
            <div>
              <span style={{ color: '#475569', fontSize: '6.5px' }}>CNIC: </span>
              <strong style={{ fontFamily: 'monospace' }}>{voter.cnic}</strong>
            </div>
            <div>
              <span style={{ color: '#475569', fontSize: '6.5px' }}>Cell: </span>
              <span style={{ fontFamily: 'monospace' }}>{voter.mobile}</span>
            </div>
          </div>

          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#475569', fontSize: '6.5px' }}>Addr: </span>
            <span style={{ color: '#334155' }}>{voter.address}</span>
          </div>
        </div>
      </div>

      {/* Footer Bar: QR Code, Stamp & Signature */}
      <div
        style={{
          borderTop: '0.8px solid #cbd5e1',
          paddingTop: '0.8mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* QR Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=UB-VOTER:${voter.serialNumber}:${voter.cnic}`}
            alt="QR"
            style={{ width: '8.5mm', height: '8.5mm' }}
          />
          <span style={{ fontSize: '5.5px', color: '#64748b' }}>
            Scan to Verify &bull; مصدقہ ووٹر
          </span>
        </div>

        {/* Commissioner Signature Line */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '0.8px solid #000', width: '22mm', marginBottom: '0.5mm' }}></div>
          <span className="font-urdu" style={{ fontSize: '6.5px', color: '#047857', fontWeight: 'bold', display: 'block', lineHeight: 1 }}>
            {settings.commissionerTitleUr || 'چیف الیکشن کمشنر'}
          </span>
        </div>
      </div>
    </div>
  );
};
