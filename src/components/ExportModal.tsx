import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, CheckCircle2 } from 'lucide-react';
import { OutlookAccount } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: OutlookAccount[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  accounts
}) => {
  const [copied, setCopied] = useState(false);
  const [formatType, setFormatType] = useState<'standard' | 'json' | 'pipe'>('standard');

  if (!isOpen) return null;

  const generateExportText = () => {
    if (formatType === 'json') {
      return JSON.stringify(accounts, null, 2);
    }

    if (formatType === 'pipe') {
      return accounts
        .map(a => `${a.email}|${a.password || ''}|${a.clientId}|${a.refreshToken}${a.clientSecret ? `|${a.clientSecret}` : ''}`)
        .join('\n');
    }

    // Default standard format: email:pass:client_id:refresh_token
    return accounts
      .map(a => `${a.email}:${a.password || ''}:${a.clientId}:${a.refreshToken}${a.clientSecret ? `:${a.clientSecret}` : ''}`)
      .join('\n');
  };

  const exportText = generateExportText();

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = formatType === 'json' ? 'json' : 'txt';
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outlook_accounts_${new Date().toISOString().split('T')[0]}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Account Credentials</h2>
              <p className="text-xs text-slate-400">{accounts.length} Accounts ready for export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Format Selection:</label>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFormatType('standard')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  formatType === 'standard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                mail:pass:id:token
              </button>
              <button
                onClick={() => setFormatType('pipe')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  formatType === 'pipe' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pipe (|)
              </button>
              <button
                onClick={() => setFormatType('json')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  formatType === 'json' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          <div>
            <textarea
              readOnly
              rows={8}
              value={exportText}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 select-all"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
