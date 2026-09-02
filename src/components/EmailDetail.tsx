import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar, 
  Eye, 
  EyeOff, 
  FileText, 
  Code,
  X,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { EmailMessage, OutlookAccount } from '../types';

interface EmailDetailProps {
  email: EmailMessage | null;
  account?: OutlookAccount;
  onToggleRead: (emailId: string, currentStatus: boolean) => void;
  onClose?: () => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onToggleRead,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'raw'>('html');
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  useEffect(() => {
    setCopiedOtp(false);
    setCopiedBody(false);
  }, [email?.id]);

  if (!email) {
    return (
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#0f172a] p-8 text-center h-auto md:h-[calc(100vh-80px)] border-l border-slate-800/50">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-xs font-semibold text-slate-400">No message selected</h3>
        <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
          Click any email in the stream table to inspect its full content or headers.
        </p>
      </div>
    );
  }

  const senderName = email.from?.emailAddress?.name || 'Unknown Sender';
  const senderAddress = email.from?.emailAddress?.address || '';
  const hasOtp = Boolean(email.extractedOtp && email.extractedOtp.code && email.extractedOtp.code.trim().length >= 4);

  const handleCopyOtp = () => {
    if (email.extractedOtp?.code) {
      navigator.clipboard.writeText(email.extractedOtp.code);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const handleCopyBody = () => {
    const textToCopy = email.body?.content || email.bodyPreview || '';
    navigator.clipboard.writeText(textToCopy);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const formattedDate = () => {
    try {
      return new Date(email.receivedDateTime).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium'
      });
    } catch {
      return email.receivedDateTime;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f172a] h-auto md:h-[calc(100vh-80px)] overflow-hidden border-l border-slate-800">
      {/* Top Action Bar with prominent Back Button */}
      <div className="p-3 sm:px-4 border-b border-slate-800 bg-[#0f172a]/95 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back Button */}
          {onClose && (
            <button
              id="btn-back-to-inbox"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all active:scale-95 shrink-0"
              title="Back to inbox"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider hidden sm:inline">Mailbox</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-[11px] border border-slate-700 truncate">
              {email.accountEmail}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Read / Unread toggle */}
          <button
            id="btn-toggle-read"
            onClick={() => onToggleRead(email.id, email.isRead)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            {email.isRead ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Unread</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Read</span>
              </>
            )}
          </button>

          {/* Copy Body */}
          <button
            id="btn-copy-body"
            onClick={handleCopyBody}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            {copiedBody ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Copy Text</span>
              </>
            )}
          </button>

          {/* Web link */}
          {email.webLink && (
            <a
              href={email.webLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded transition-colors"
              title="Open in Outlook Web"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Close button icon */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs ml-0.5 transition-colors"
              title="Close email details"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Email Scrollable View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
        {/* Email Subject Header */}
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-snug">
            {email.subject || '(No Subject)'}
          </h1>

          {/* Sender & Recipient Bar */}
          <div className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                {senderName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-200 truncate">
                  {senderName}
                </div>
                <div className="text-slate-500 text-[11px] font-mono truncate">
                  {senderAddress}
                </div>
              </div>
            </div>

            <div className="text-slate-500 text-[11px] font-mono flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>{formattedDate()}</span>
            </div>
          </div>
        </div>

        {/* Prominent OTP Card with Big Copy Button */}
        {hasOtp && email.extractedOtp && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-xs shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs uppercase font-bold text-amber-300">
                <KeyRound className="w-4 h-4" />
                <span>{email.extractedOtp.service || 'Security'} Verification Code</span>
              </span>
              <span className="text-[10px] text-amber-200/80 font-mono">Instant OTP</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-amber-500/30 gap-3">
              <span className="font-mono font-black text-amber-400 text-xl tracking-widest truncate">
                {email.extractedOtp.code}
              </span>
              <button
                id="btn-copy-otp-main"
                onClick={handleCopyOtp}
                className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-md"
              >
                {copiedOtp ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('html')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'html'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Plain Text</span>
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'raw'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON Raw</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            {email.hasAttachments ? 'Has Attachments' : 'No Attachments'}
          </span>
        </div>

        {/* Content Box */}
        <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[300px]">
          {activeTab === 'html' ? (
            email.body?.contentType === 'html' || email.body?.content?.includes('<') ? (
              <div className="p-4 bg-white text-slate-900 rounded-xl overflow-x-auto min-h-[300px]">
                <div
                  className="prose prose-sm max-w-none text-slate-900"
                  dangerouslySetInnerHTML={{ __html: email.body?.content || email.bodyPreview || '' }}
                />
              </div>
            ) : (
              <div className="p-4 text-xs font-sans text-slate-200 whitespace-pre-wrap leading-relaxed">
                {email.body?.content || email.bodyPreview || '(No content)'}
              </div>
            )
          ) : activeTab === 'text' ? (
            <div className="p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
              {email.body?.content?.replace(/<[^>]*>?/gm, '') || email.bodyPreview || '(No text content)'}
            </div>
          ) : (
            <div className="p-4 text-xs font-mono text-emerald-400 bg-slate-950 overflow-x-auto select-text">
              <pre>{JSON.stringify(email, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
