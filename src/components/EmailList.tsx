import React, { useState } from 'react';
import { 
  Search, 
  KeyRound, 
  Paperclip, 
  Mail, 
  CheckCheck, 
  Inbox, 
  AlertOctagon, 
  Send, 
  Archive, 
  Trash2, 
  Copy, 
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { EmailMessage, OutlookAccount } from '../types';

interface EmailListProps {
  emails: EmailMessage[];
  selectedEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
  selectedAccountId: string | null;
  accounts: OutlookAccount[];
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
  onMarkAllAsRead: () => void;
  isLoading: boolean;
  onSyncCurrentAccount?: () => void;
  onSyncAllAccounts?: () => void;
  onEditCurrentAccount?: (acc: OutlookAccount) => void;
  isSyncing: boolean;
  syncingAccountId: string | null;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  selectedAccountId,
  accounts,
  selectedFolder,
  onSelectFolder,
  onMarkAllAsRead,
  isLoading,
  onSyncCurrentAccount,
  onSyncAllAccounts,
  onEditCurrentAccount,
  isSyncing,
  syncingAccountId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'otp' | 'attachments'>('all');
  const [copiedOtpId, setCopiedOtpId] = useState<string | null>(null);

  const activeAccount = accounts.find(a => a.id === selectedAccountId);
  const isCurrentSyncing = isSyncing && (syncingAccountId === selectedAccountId || syncingAccountId === null);

  // Filter emails for active account if selected
  const accountScopedEmails = selectedAccountId
    ? emails.filter(e => e.accountId === selectedAccountId)
    : emails;

  // Filter by search and type
  const filteredEmails = accountScopedEmails.filter(e => {
    // Filter type
    if (filterType === 'unread' && e.isRead) return false;
    if (filterType === 'otp' && (!e.extractedOtp || !e.extractedOtp.code || e.extractedOtp.code.trim().length < 4)) return false;
    if (filterType === 'attachments' && !e.hasAttachments) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = e.subject.toLowerCase().includes(q);
      const matchSender = e.from?.emailAddress?.name?.toLowerCase().includes(q) || e.from?.emailAddress?.address?.toLowerCase().includes(q);
      const matchBody = e.bodyPreview.toLowerCase().includes(q);
      const matchOtp = e.extractedOtp?.code?.toLowerCase().includes(q) || e.extractedOtp?.service?.toLowerCase().includes(q);
      const matchAccount = e.accountEmail.toLowerCase().includes(q);
      return matchSubject || matchSender || matchBody || matchOtp || matchAccount;
    }

    return true;
  });

  const handleCopyOtp = (e: React.MouseEvent, msgId: string, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedOtpId(msgId);
    setTimeout(() => setCopiedOtpId(null), 2000);
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'junkemail', label: 'Junk', icon: AlertOctagon },
    { id: 'sentitems', label: 'Sent', icon: Send },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'deleteditems', label: 'Trash', icon: Trash2 },
    { id: 'all', label: 'All', icon: Mail }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0f172a] border-r border-slate-800 h-auto md:h-[calc(100vh-80px)] overflow-hidden">
      {/* Account Info / Scope Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {activeAccount ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isCurrentSyncing
                  ? 'bg-amber-400 animate-ping'
                  : activeAccount.status === 'error'
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  : activeAccount.status === 'active'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : 'bg-slate-500'
              }`} />
              <div className="truncate">
                <span className="text-xs font-bold text-slate-100 truncate block">
                  {activeAccount.email}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeAccount.status === 'error' ? (
                    <span className="text-rose-400 font-medium">Authentication required</span>
                  ) : activeAccount.status === 'active' ? (
                    <span className="text-emerald-400">Live Connected • {accountScopedEmails.length} messages</span>
                  ) : (
                    'Ready to sync'
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div>
                <span className="text-xs font-bold text-slate-100">Unified Mailbox</span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Aggregated across {accounts.length} accounts ({emails.length} total)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls for Selected Scope */}
        <div className="flex items-center gap-2">
          {activeAccount ? (
            <>
              {onEditCurrentAccount && (
                <button
                  id="btn-edit-current-account"
                  onClick={() => onEditCurrentAccount(activeAccount)}
                  title="Edit credentials or refresh token"
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
              {onSyncCurrentAccount && (
                <button
                  id="btn-sync-current-account"
                  onClick={onSyncCurrentAccount}
                  disabled={isCurrentSyncing}
                  className={`px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${
                    isCurrentSyncing ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isCurrentSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCurrentSyncing ? 'Syncing...' : 'Sync This Account'}</span>
                </button>
              )}
            </>
          ) : (
            onSyncAllAccounts && (
              <button
                id="btn-sync-all-from-list"
                onClick={onSyncAllAccounts}
                disabled={isSyncing || accounts.length === 0}
                className={`px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${
                  isSyncing ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing All...' : 'Sync All Accounts'}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Sync Error Diagnostic Callout if active account has error */}
      {activeAccount && activeAccount.status === 'error' && (
        <div className="p-3 bg-rose-950/40 border-b border-rose-500/30 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-rose-300">Sync Error Detected</h4>
            <p className="text-[11px] text-rose-200/90 mt-0.5 font-mono">
              {activeAccount.errorMessage || 'Authentication failed. Microsoft requires a valid refresh token or modern auth.'}
            </p>
          </div>
          {onSyncCurrentAccount && (
            <button
              onClick={onSyncCurrentAccount}
              disabled={isCurrentSyncing}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors shrink-0"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* Stream Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0f172a]/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Incoming Stream</span>
              <span className="text-xs font-normal text-slate-500">
                ({activeAccount ? activeAccount.email : `Across ${accounts.length} active mailboxes`})
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-emails"
                type="text"
                placeholder="Filter by subject, sender, or OTP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              id="btn-mark-all-read"
              onClick={onMarkAllAsRead}
              title="Mark all as read"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md transition-colors shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Folders & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Folders */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
            {folders.map((f) => {
              const Icon = f.icon;
              const isFolderActive = selectedFolder === f.id;
              return (
                <button
                  key={f.id}
                  id={`folder-tab-${f.id}`}
                  onClick={() => onSelectFolder(f.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    isFolderActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              id="filter-pill-all"
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              id="filter-pill-unread"
              onClick={() => setFilterType('unread')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                filterType === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread
            </button>
            <button
              id="filter-pill-otp"
              onClick={() => setFilterType('otp')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                filterType === 'otp'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              <KeyRound className="w-2.5 h-2.5" />
              <span>OTP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stream Table Head */}
      <div className="hidden sm:grid grid-cols-[110px_180px_1fr_80px_90px] bg-slate-800/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
        <div>Account Origin</div>
        <div>Sender</div>
        <div>Subject Summary</div>
        <div className="text-center">Status</div>
        <div className="text-right">Received</div>
      </div>

      {/* Stream Messages List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {isLoading && (
          <div className="p-3 text-center bg-blue-900/10 border-b border-blue-500/20">
            <span className="text-[11px] text-blue-400 font-mono animate-pulse">
              Live sync in progress...
            </span>
          </div>
        )}

        {filteredEmails.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-300">No stream messages found</h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery ? 'No emails match your filter criteria' : 'Click "Sync This Account" or "Sync All" to fetch messages.'}
            </p>
          </div>
        ) : (
          filteredEmails.map((msg) => {
            const isSelected = selectedEmailId === msg.id;
            const senderName = msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Unknown Sender';
            const senderEmail = msg.from?.emailAddress?.address || '';
            const hasOtp = Boolean(msg.extractedOtp && msg.extractedOtp.code && msg.extractedOtp.code.trim().length >= 4);
            const shortAccount = msg.accountEmail ? msg.accountEmail.split('@')[0] : 'account';

            return (
              <div
                key={msg.id}
                id={`email-item-${msg.id}`}
                onClick={() => onSelectEmail(msg.id)}
                className={`p-3.5 sm:px-4 sm:py-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-900/20 border-l-2 border-l-blue-500'
                    : 'bg-slate-900/40 hover:bg-slate-800/50'
                }`}
              >
                {/* Desktop Grid Layout */}
                <div className="hidden sm:grid grid-cols-[110px_180px_1fr_80px_90px] items-center gap-2 text-sm">
                  {/* Account Origin */}
                  <div className="text-xs font-mono text-blue-400 truncate">
                    {shortAccount}
                  </div>

                  {/* Sender */}
                  <div className="truncate min-w-0 pr-2">
                    <div className="font-medium text-slate-200 text-xs truncate">{senderName}</div>
                    {senderEmail && (
                      <span className="text-[10px] text-slate-500 truncate block">{senderEmail}</span>
                    )}
                  </div>

                  {/* Subject & OTP Callout */}
                  <div className="truncate min-w-0 pr-4">
                    <div className={`text-xs truncate ${!msg.isRead ? 'font-semibold text-white' : 'text-slate-300'}`}>
                      {msg.subject || '(No Subject)'}
                    </div>

                    {hasOtp && msg.extractedOtp && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono font-bold">
                          OTP: {msg.extractedOtp.code}
                        </span>
                        <button
                          onClick={(e) => handleCopyOtp(e, msg.id, msg.extractedOtp!.code)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium"
                        >
                          {copiedOtpId === msg.id ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="text-center">
                    {!msg.isRead ? (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold border border-blue-500/30 font-mono">
                        UNREAD
                      </span>
                    ) : hasOtp ? (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold border border-amber-500/30 font-mono">
                        OTP
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] border border-emerald-500/20 font-mono">
                        FETCHED
                      </span>
                    )}
                  </div>

                  {/* Received Time */}
                  <div className="text-xs text-slate-500 font-mono text-right truncate">
                    {formatTime(msg.receivedDateTime)}
                  </div>
                </div>

                {/* Mobile View Layout */}
                <div className="sm:hidden space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-blue-400 text-[11px]">{shortAccount}</span>
                    <span className="text-slate-500 text-[10px] font-mono">{formatTime(msg.receivedDateTime)}</span>
                  </div>
                  <div className="font-medium text-slate-200 text-xs">{senderName}</div>
                  <div className={`text-xs truncate ${!msg.isRead ? 'font-semibold text-white' : 'text-slate-300'}`}>
                    {msg.subject || '(No Subject)'}
                  </div>
                  {hasOtp && msg.extractedOtp && (
                    <div className="flex items-center justify-between mt-1 bg-amber-500/10 p-1.5 rounded border border-amber-500/30">
                      <span className="text-xs font-mono font-bold text-amber-300">{msg.extractedOtp.code}</span>
                      <button
                        onClick={(e) => handleCopyOtp(e, msg.id, msg.extractedOtp!.code)}
                        className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded"
                      >
                        {copiedOtpId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

