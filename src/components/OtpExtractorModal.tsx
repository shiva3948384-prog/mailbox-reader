import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Mail, 
  Clock, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { EmailMessage } from '../types';

interface OtpExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailMessage[];
  onSelectEmail: (emailId: string) => void;
}

export const OtpExtractorModal: React.FC<OtpExtractorModalProps> = ({
  isOpen,
  onClose,
  emails,
  onSelectEmail
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Filter all emails with OTPs
  const otpEmails = emails.filter(e => Boolean(e.extractedOtp && e.extractedOtp.code && e.extractedOtp.code.trim().length >= 4));

  const filteredOtps = otpEmails.filter(e => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.extractedOtp?.code.toLowerCase().includes(q) ||
      (e.extractedOtp?.service && e.extractedOtp.service.toLowerCase().includes(q)) ||
      e.accountEmail.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q)
    );
  });

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Live OTP & 2FA Extraction Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {filteredOtps.length} Detected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                All auto-extracted verification codes from across all connected Outlook accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code, service (Steam, Discord, Epic...), or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* OTP Cards Grid */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {filteredOtps.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-600">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No OTP codes detected yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                When you sync your accounts, any emails with verification codes (Steam, Discord, Microsoft, Google, etc.) will automatically appear here with 1-click copy.
              </p>
            </div>
          ) : (
            filteredOtps.map((email) => {
              const code = email.extractedOtp?.code || '';
              const service = email.extractedOtp?.service || 'Security Code';
              const isCopied = copiedId === email.id;

              return (
                <div
                  key={email.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      <KeyRound className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-amber-300 uppercase tracking-wide">
                          {service}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-slate-900 text-slate-400 font-mono">
                          {email.accountEmail}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(email.receivedDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 truncate mt-0.5 font-medium">
                        {email.subject}
                      </div>
                    </div>
                  </div>

                  {/* Code Block & Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-lg font-bold text-white tracking-widest">
                      {code}
                    </div>

                    <button
                      onClick={() => handleCopy(code, email.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        onSelectEmail(email.id);
                        onClose();
                      }}
                      title="Open full email"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Codes are detected automatically using regex pattern matching.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
