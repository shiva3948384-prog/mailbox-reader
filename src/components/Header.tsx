import React from 'react';
import { 
  Mail, 
  RefreshCw, 
  Plus, 
  KeyRound, 
  Clock, 
  Radio
} from 'lucide-react';
import { OutlookAccount, EmailMessage } from '../types';

interface HeaderProps {
  accounts: OutlookAccount[];
  emails: EmailMessage[];
  isSyncing: boolean;
  onSyncAll: () => void;
  onOpenAddModal: () => void;
  onOpenOtpModal: () => void;
  autoSyncInterval: number;
  onIntervalChange: (interval: number) => void;
  syncCountdown: number;
}

export const Header: React.FC<HeaderProps> = ({
  accounts,
  emails,
  isSyncing,
  onSyncAll,
  onOpenAddModal,
  onOpenOtpModal,
  autoSyncInterval,
  onIntervalChange,
  syncCountdown
}) => {
  const activeCount = accounts.filter(a => a.status === 'active' || a.status === 'idle').length;
  const otpCount = emails.filter(e => Boolean(e.extractedOtp && e.extractedOtp.code)).length;

  const latestEmailTime = emails.length > 0 
    ? new Date(emails[0].receivedDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'None';

  return (
    <header className="h-20 border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
      {/* Metrics Section */}
      <div className="flex items-center gap-4 sm:gap-8">
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Total Inbound</p>
          <p className="text-xl sm:text-2xl font-semibold text-slate-100">{emails.length.toLocaleString()}</p>
        </div>

        <div className="h-8 w-px bg-slate-800"></div>

        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Active Mailboxes</p>
          <p className="text-xl sm:text-2xl font-semibold text-slate-100 flex items-center gap-2">
            <span>{activeCount}</span>
            <span className="text-xs font-normal text-slate-500">/ {accounts.length}</span>
          </p>
        </div>

        <div className="h-8 w-px bg-slate-800 hidden md:block"></div>

        <div className="hidden md:block">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Last Inbound</p>
          <p className="text-xl sm:text-2xl font-semibold text-slate-100">{latestEmailTime}</p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* OTP Hub Quick Button */}
        <button
          id="btn-header-otp-hub"
          onClick={onOpenOtpModal}
          className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-full px-3.5 py-1.5 text-xs text-amber-300 font-medium transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>OTP Hub</span>
          {otpCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-full">
              {otpCount}
            </span>
          )}
        </button>

        {/* Live Monitoring Indicator & Interval */}
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-full px-3 sm:px-4 py-1.5 text-xs">
          <span className="text-slate-400 mr-2 text-[11px] hidden sm:inline">Live Stream</span>
          <div className={`w-2 h-2 rounded-full mr-2.5 ${autoSyncInterval > 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-slate-500'}`}></div>
          <select
            id="select-auto-sync-interval"
            value={autoSyncInterval}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
            className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer pr-1"
          >
            <option value={0} className="bg-slate-900 text-slate-200">Manual</option>
            <option value={15} className="bg-slate-900 text-slate-200">15s</option>
            <option value={30} className="bg-slate-900 text-slate-200">30s</option>
            <option value={60} className="bg-slate-900 text-slate-200">1m</option>
            <option value={300} className="bg-slate-900 text-slate-200">5m</option>
          </select>
          {autoSyncInterval > 0 && (
            <span className="text-[10px] font-mono text-blue-400 ml-1">
              ({syncCountdown}s)
            </span>
          )}
        </div>

        {/* Sync All Action Button */}
        <button
          id="btn-sync-all"
          onClick={onSyncAll}
          disabled={isSyncing || accounts.length === 0}
          className={`bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 sm:px-6 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
            isSyncing ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync All'}</span>
        </button>

        {/* Add Accounts Action Button */}
        <button
          id="btn-add-accounts-header"
          onClick={onOpenAddModal}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold px-3.5 sm:px-4 py-2 rounded-full transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">+ Add Account</span>
        </button>
      </div>
    </header>
  );
};
