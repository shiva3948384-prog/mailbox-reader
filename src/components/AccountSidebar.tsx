import React, { useState } from 'react';
import { 
  Inbox, 
  Mail, 
  Plus, 
  RefreshCw, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  AlertCircle, 
  Search, 
  Download
} from 'lucide-react';
import { OutlookAccount, EmailMessage } from '../types';

interface AccountSidebarProps {
  accounts: OutlookAccount[];
  emails: EmailMessage[];
  selectedAccountId: string | null; // null = Unified Inbox
  onSelectAccount: (accountId: string | null) => void;
  onSyncAccount: (accountId: string) => void;
  onEditAccount: (account: OutlookAccount) => void;
  onDeleteAccount: (accountId: string) => void;
  onOpenAddModal: () => void;
  onExportAccounts: () => void;
  isSyncing: boolean;
  syncingAccountId: string | null;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({
  accounts,
  emails,
  selectedAccountId,
  onSelectAccount,
  onSyncAccount,
  onEditAccount,
  onDeleteAccount,
  onOpenAddModal,
  onExportAccounts,
  isSyncing,
  syncingAccountId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalUnread = emails.filter(e => !e.isRead).length;
  const activeCount = accounts.filter(a => a.status === 'active').length;
  const syncPercentage = accounts.length > 0 ? Math.round((activeCount / accounts.length) * 100) : 0;

  const filteredAccounts = accounts.filter(acc => 
    acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (acc.label && acc.label.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopyCredentials = (acc: OutlookAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    const credString = `${acc.email}:${acc.password || ''}:${acc.clientId}:${acc.refreshToken}${acc.clientSecret ? `:${acc.clientSecret}` : ''}`;
    navigator.clipboard.writeText(credString);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2000);
    setMenuOpenId(null);
  };

  return (
    <aside className="w-full md:w-72 lg:w-80 bg-[#020617] border-r border-slate-800 flex flex-col shrink-0 h-auto md:h-[calc(100vh-80px)] overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-600/30">
              OS
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">Outlook Sentinel</h1>
              <p className="text-[10px] text-slate-500 font-mono">Live OAuth2 & IMAP Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {accounts.length > 0 && (
              <button
                id="btn-export-accounts-sidebar"
                onClick={onExportAccounts}
                title="Export all credentials"
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              id="btn-add-account-sidebar-plus"
              onClick={onOpenAddModal}
              title="Add Outlook Account"
              className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-md transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Unified Mailbox Button */}
      <div className="px-3 pt-3 pb-1">
        <button
          id="btn-unified-inbox"
          onClick={() => onSelectAccount(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
            selectedAccountId === null
              ? 'bg-blue-900/30 text-white font-medium border border-blue-500/40 shadow-sm'
              : 'hover:bg-slate-900 text-slate-300 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-md ${selectedAccountId === null ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Inbox className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold leading-tight">Unified Mailbox</div>
              <div className="text-[10px] text-slate-500 font-normal">All {accounts.length} accounts</div>
            </div>
          </div>
          {totalUnread > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-1.5">
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-accounts"
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-7 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Section Header */}
      <div className="px-3 pt-2 pb-1 flex justify-between items-center">
        <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
          Accounts ({filteredAccounts.length})
        </span>
        <button
          onClick={onOpenAddModal}
          className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium"
        >
          <span>+ Add Account</span>
        </button>
      </div>

      {/* Accounts List */}
      <div className="flex-1 py-1 px-2 space-y-1 overflow-y-auto">
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-8 px-3">
            <Mail className="w-7 h-7 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">No Outlook accounts added</p>
            <p className="text-[10px] text-slate-500 mt-1 mb-3">Paste credentials (mail:pass:token) to start reading live mail</p>
            <button
              onClick={onOpenAddModal}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors shadow-md shadow-blue-600/20"
            >
              Add Outlook Account
            </button>
          </div>
        ) : (
          filteredAccounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            const isThisSyncing = isSyncing && (syncingAccountId === acc.id || syncingAccountId === null);
            const accountUnread = emails.filter(e => e.accountId === acc.id && !e.isRead).length;

            return (
              <div
                key={acc.id}
                id={`account-card-${acc.id}`}
                onClick={() => onSelectAccount(acc.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-900/25 border-blue-500/40 text-white'
                    : 'bg-transparent hover:bg-slate-900/90 border-transparent text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Glowing Status Dot */}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isThisSyncing
                        ? 'bg-amber-400 animate-ping'
                        : acc.status === 'error'
                        ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                        : acc.status === 'active'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : 'bg-slate-500'
                    }`}
                  />

                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {acc.email}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1.5">
                      {acc.status === 'error' ? (
                        <span className="text-rose-400 font-medium flex items-center gap-0.5 truncate" title={acc.errorMessage}>
                          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                          <span>Sync Error</span>
                        </span>
                      ) : acc.status === 'active' ? (
                        <span className="text-emerald-400 font-medium">Live Active</span>
                      ) : (
                        <span>Ready to sync</span>
                      )}
                      {acc.totalCount !== undefined && acc.totalCount > 0 && (
                        <span>• {acc.totalCount} msgs</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {accountUnread > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {accountUnread}
                    </span>
                  )}

                  <button
                    id={`btn-sync-single-${acc.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSyncAccount(acc.id);
                    }}
                    disabled={isThisSyncing}
                    title="Sync this mailbox"
                    className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isThisSyncing ? 'animate-spin text-blue-400' : ''}`} />
                  </button>

                  <div className="relative">
                    <button
                      id={`btn-account-menu-${acc.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === acc.id ? null : acc.id);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {menuOpenId === acc.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-40 text-xs font-normal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            onEditAccount(acc);
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-300 hover:bg-slate-800 text-left"
                        >
                          <Edit3 className="w-3 h-3 text-slate-400" />
                          <span>Edit / Test Token</span>
                        </button>

                        <button
                          onClick={(e) => handleCopyCredentials(acc, e)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-300 hover:bg-slate-800 text-left"
                        >
                          {copiedId === acc.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy mail:pass:token</span>
                            </>
                          )}
                        </button>

                        <div className="border-t border-slate-800 my-1" />

                        <button
                          onClick={() => {
                            onDeleteAccount(acc.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 text-left"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove Account</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Sync Status Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#020617]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Accounts Health</span>
          <span className="text-emerald-400 font-mono text-[11px] font-medium">{activeCount} / {accounts.length} Active</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 mt-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full transition-all duration-500" 
            style={{ width: `${accounts.length > 0 ? (activeCount / accounts.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
