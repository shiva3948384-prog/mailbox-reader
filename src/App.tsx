import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getStoredAccounts, 
  saveStoredAccounts, 
  getStoredEmails, 
  saveStoredEmails, 
  getStoredSettings, 
  saveStoredSettings,
  AppSettings
} from './lib/storage';
import { api } from './lib/api';
import { OutlookAccount, EmailMessage } from './types';
import { Header } from './components/Header';
import { AccountSidebar } from './components/AccountSidebar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { AddAccountModal } from './components/AddAccountModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { OtpExtractorModal } from './components/OtpExtractorModal';
import { ExportModal } from './components/ExportModal';
import { extractOtpFromText } from './lib/otpExtractor';

function sanitizeEmail(email: EmailMessage, index?: number): EmailMessage {
  let uniqueId = email.id;
  // If the id starts with imap- and does not contain the account email yet, prefix it
  if (uniqueId && uniqueId.startsWith('imap-') && email.accountEmail && !uniqueId.includes(email.accountEmail)) {
    uniqueId = `imap-${email.accountEmail}-${uniqueId.replace(/^imap-/, '')}`;
  } else if (!uniqueId) {
    uniqueId = `msg-${email.accountEmail || 'acc'}-${email.receivedDateTime || Date.now()}-${index ?? Math.random().toString(36).substring(2, 6)}`;
  }

  const extracted = extractOtpFromText(email.subject, email.body?.content || email.bodyPreview || '');
  let extractedOtp = extracted;
  if (!extractedOtp && email.extractedOtp && (!email.extractedOtp.code || email.extractedOtp.code.toLowerCase() === 'with' || email.extractedOtp.code.toLowerCase().includes('html'))) {
    extractedOtp = undefined;
  } else if (!extractedOtp) {
    extractedOtp = email.extractedOtp;
  }

  return {
    ...email,
    id: uniqueId,
    extractedOtp
  };
}

function deduplicateEmails(list: EmailMessage[]): EmailMessage[] {
  const seen = new Set<string>();
  const result: EmailMessage[] = [];
  for (const m of list) {
    if (m.id && !seen.has(m.id)) {
      seen.add(m.id);
      result.push(m);
    } else if (!m.id) {
      result.push(m);
    }
  }
  return result;
}

export default function App() {
  // Accounts and Emails State
  const [accounts, setAccounts] = useState<OutlookAccount[]>(() => getStoredAccounts());
  const [emails, setEmails] = useState<EmailMessage[]>(() => {
    const raw = getStoredEmails();
    const sanitized = raw.map((m, idx) => sanitizeEmail(m, idx));
    return deduplicateEmails(sanitized);
  });
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());

  // Refs for non-stale access in async functions
  const accountsRef = useRef<OutlookAccount[]>(accounts);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  // Navigation State - defaults to null so no intrusive side view auto-opens!
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>(settings.selectedFolder || 'inbox');

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [syncCountdown, setSyncCountdown] = useState<number>(settings.autoSyncInterval);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<OutlookAccount | null>(null);

  // Persist accounts
  useEffect(() => {
    saveStoredAccounts(accounts);
  }, [accounts]);

  // Persist emails
  useEffect(() => {
    saveStoredEmails(emails);
  }, [emails]);

  // Persist settings
  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
  };

  // Sync Single Account
  const handleSyncAccount = async (accountId: string) => {
    const acc = accountsRef.current.find(a => a.id === accountId);
    if (!acc) return;

    setIsSyncing(true);
    setSyncingAccountId(accountId);

    // Update status to syncing
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, status: 'syncing' } : a));

    try {
      const res = await api.syncSingleAccount(acc, selectedFolder);

      if (res.success) {
        const tagged = (res.messages || []).map((m, idx) => sanitizeEmail({
          ...m,
          accountId: acc.id,
          accountEmail: acc.email
        }, idx));

        // Merge messages: keep existing messages of other accounts, update this account's messages
        setEmails(prev => {
          const others = prev.filter(m => m.accountId !== accountId);
          const combined = deduplicateEmails([...tagged, ...others]);
          combined.sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime());
          return combined;
        });

        // Update account state
        setAccounts(prev => prev.map(a => {
          if (a.id === accountId) {
            return {
              ...a,
              status: 'active',
              lastSync: new Date().toISOString(),
              unreadCount: res.unreadCount,
              totalCount: res.totalCount,
              errorMessage: undefined,
              cachedAccessToken: res.cachedAccessToken,
              refreshToken: res.newRefreshToken || a.refreshToken,
              authMethod: res.method
            };
          }
          return a;
        }));

        const otpFound = tagged.filter(m => Boolean(m.extractedOtp && m.extractedOtp.code)).length;
        showToast(`Synced ${tagged.length} emails for ${acc.email}${otpFound > 0 ? ` (${otpFound} OTP found)` : ''}`, 'success');
      } else {
        setAccounts(prev => prev.map(a => {
          if (a.id === accountId) {
            return {
              ...a,
              status: 'error',
              errorMessage: res.error || 'Failed to sync'
            };
          }
          return a;
        }));
        showToast(`Sync failed: ${res.error || 'Please check credentials'}`, 'error');
      }
    } catch (e: any) {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, status: 'error', errorMessage: e.message } : a));
      showToast(`Error syncing account: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
      setSyncingAccountId(null);
    }
  };

  // Sync All Accounts (Progressive parallel chunked sync)
  const handleSyncAll = useCallback(async (targetAccounts?: OutlookAccount[]) => {
    const activeAccounts = targetAccounts || accountsRef.current;
    if (activeAccounts.length === 0) return;

    setIsSyncing(true);
    setSyncingAccountId(null);

    // Set all target accounts to syncing
    setAccounts(prev => prev.map(a => {
      const isTarget = activeAccounts.some(target => target.id === a.id);
      return isTarget ? { ...a, status: 'syncing' } : a;
    }));

    let successCount = 0;
    let failCount = 0;
    let totalMessagesFetched = 0;
    const CONCURRENCY = 4;

    try {
      for (let i = 0; i < activeAccounts.length; i += CONCURRENCY) {
        const chunk = activeAccounts.slice(i, i + CONCURRENCY);
        
        await Promise.all(chunk.map(async (acc) => {
          try {
            const res = await api.syncSingleAccount(acc, selectedFolder);

            if (res.success) {
              successCount++;
              const tagged = (res.messages || []).map((m, idx) => sanitizeEmail({
                ...m,
                accountId: acc.id,
                accountEmail: acc.email
              }, idx));

              totalMessagesFetched += tagged.length;

              setEmails(prev => {
                const filtered = prev.filter(m => m.accountEmail !== acc.email);
                const combined = deduplicateEmails([...filtered, ...tagged]);
                combined.sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime());
                return combined;
              });

              setAccounts(prev => prev.map(a => {
                if (a.id === acc.id) {
                  return {
                    ...a,
                    status: 'active',
                    lastSync: new Date().toISOString(),
                    unreadCount: res.unreadCount,
                    totalCount: res.totalCount,
                    errorMessage: undefined,
                    cachedAccessToken: res.cachedAccessToken,
                    refreshToken: res.newRefreshToken || a.refreshToken,
                    authMethod: res.method
                  };
                }
                return a;
              }));
            } else {
              failCount++;
              setAccounts(prev => prev.map(a => {
                if (a.id === acc.id) {
                  return {
                    ...a,
                    status: 'error',
                    errorMessage: res.error || 'Failed to sync'
                  };
                }
                return a;
              }));
            }
          } catch (singleErr: any) {
            failCount++;
            setAccounts(prev => prev.map(a => {
              if (a.id === acc.id) {
                return {
                  ...a,
                  status: 'error',
                  errorMessage: singleErr.message || 'Network error'
                };
              }
              return a;
            }));
          }
        }));
      }

      showToast(
        `Sync complete: ${successCount} accounts active (${failCount} errors), ${totalMessagesFetched} emails`,
        successCount > 0 ? 'success' : 'error'
      );
    } catch (e: any) {
      showToast(`Sync error: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
      setSyncingAccountId(null);
      setSyncCountdown(settings.autoSyncInterval);
    }
  }, [selectedFolder, settings.autoSyncInterval]);

  // Auto-sync Interval Timer
  useEffect(() => {
    if (settings.autoSyncInterval <= 0) return;

    const timer = setInterval(() => {
      setSyncCountdown(prev => {
        if (prev <= 1) {
          handleSyncAll();
          return settings.autoSyncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.autoSyncInterval, handleSyncAll]);

  // Add Accounts Handler
  const handleAddAccounts = (newAccounts: OutlookAccount[]) => {
    const existingNonDemo = accounts.filter(a => a.id !== 'demo-acc-1');
    const existingEmails = new Set(existingNonDemo.map(a => a.email.toLowerCase()));
    
    // Filter out true duplicates by email
    const filteredNew = newAccounts.filter(a => !existingEmails.has(a.email.toLowerCase()));

    if (filteredNew.length === 0 && newAccounts.length > 0) {
      showToast('Account is already in your active list', 'info');
      return;
    }

    const updated = [...existingNonDemo, ...filteredNew];
    setAccounts(updated);
    accountsRef.current = updated;

    // Clear demo emails if any
    if (existingNonDemo.length === 0) {
      setEmails([]);
    }

    if (filteredNew.length > 0) {
      setSelectedAccountId(filteredNew[0].id);
    }

    showToast(`Added ${filteredNew.length} Outlook account${filteredNew.length === 1 ? '' : 's'}! Connecting to mailbox...`, 'success');

    // Trigger immediate live sync with the updated account list!
    setTimeout(() => {
      handleSyncAll(updated);
    }, 150);
  };

  // Update Account Handler
  const handleUpdateAccount = (updated: OutlookAccount) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    showToast(`Updated credentials for ${updated.email}`, 'success');
  };

  // Delete Account Handler
  const handleDeleteAccount = (accountId: string) => {
    const updated = accounts.filter(a => a.id !== accountId);
    setAccounts(updated);
    accountsRef.current = updated;
    setEmails(prev => prev.filter(e => e.accountId !== accountId));
    if (selectedAccountId === accountId) {
      setSelectedAccountId(null);
    }
    showToast('Account removed', 'info');
  };

  // Mark single email as read/unread
  const handleToggleRead = async (emailId: string, currentStatus: boolean) => {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    const newStatus = !currentStatus;
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isRead: newStatus } : e));

    const acc = accounts.find(a => a.id === email.accountId);
    if (acc && acc.cachedAccessToken) {
      try {
        await api.markAsRead(emailId, acc.cachedAccessToken, newStatus);
      } catch {
        // silent fallback
      }
    }
  };

  // Mark all currently filtered emails as read
  const handleMarkAllAsRead = () => {
    setEmails(prev => {
      if (selectedAccountId) {
        return prev.map(e => e.accountId === selectedAccountId ? { ...e, isRead: true } : e);
      }
      return prev.map(e => ({ ...e, isRead: true }));
    });
    showToast('Marked messages as read', 'success');
  };

  // Auto-sync interval change
  const handleIntervalChange = (newInterval: number) => {
    setSettings(prev => ({ ...prev, autoSyncInterval: newInterval }));
    setSyncCountdown(newInterval);
  };

  // Selected email object
  const selectedEmail = emails.find(e => e.id === selectedEmailId) || null;
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2.5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/50'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-950/50'
              : 'bg-slate-900/90 text-slate-200 border-slate-700 shadow-slate-950/50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              toastMessage.type === 'success' ? 'bg-emerald-400 animate-ping' :
              toastMessage.type === 'error' ? 'bg-rose-400' : 'bg-blue-400'
            }`} />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main App Header */}
      <Header
        accounts={accounts}
        emails={emails}
        isSyncing={isSyncing}
        onSyncAll={() => handleSyncAll()}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenOtpModal={() => setIsOtpModalOpen(true)}
        autoSyncInterval={settings.autoSyncInterval}
        onIntervalChange={handleIntervalChange}
        syncCountdown={syncCountdown}
      />

      {/* Main 3-Pane Responsive Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Accounts Sidebar */}
        <AccountSidebar
          accounts={accounts}
          emails={emails}
          selectedAccountId={selectedAccountId}
          onSelectAccount={(accId) => {
            setSelectedAccountId(accId);
          }}
          onSyncAccount={handleSyncAccount}
          onEditAccount={(acc) => setEditingAccount(acc)}
          onDeleteAccount={handleDeleteAccount}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onExportAccounts={() => setIsExportModalOpen(true)}
          isSyncing={isSyncing}
          syncingAccountId={syncingAccountId}
        />

        {/* Center Pane: Email Stream List */}
        <div className={`flex-1 flex flex-col min-w-0 ${selectedEmailId ? 'hidden lg:flex' : 'flex'}`}>
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={(id) => {
              setSelectedEmailId(id);
              setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
            }}
            selectedAccountId={selectedAccountId}
            accounts={accounts}
            selectedFolder={selectedFolder}
            onSelectFolder={(folder) => {
              setSelectedFolder(folder);
              setSettings(prev => ({ ...prev, selectedFolder: folder }));
            }}
            onMarkAllAsRead={handleMarkAllAsRead}
            isLoading={isSyncing}
            onSyncCurrentAccount={() => {
              if (selectedAccountId) {
                handleSyncAccount(selectedAccountId);
              }
            }}
            onSyncAllAccounts={() => handleSyncAll()}
            onEditCurrentAccount={(acc) => setEditingAccount(acc)}
            isSyncing={isSyncing}
            syncingAccountId={syncingAccountId}
          />
        </div>

        {/* Right Pane: Full Email Detail (Only visible when user explicitly opens an email) */}
        {selectedEmailId && (
          <div className="flex-1 lg:max-w-xl xl:max-w-2xl flex flex-col min-w-0">
            <EmailDetail
              email={selectedEmail}
              account={selectedAccount}
              onToggleRead={handleToggleRead}
              onClose={() => setSelectedEmailId(null)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAccounts={handleAddAccounts}
      />

      <AccountSettingsModal
        account={editingAccount}
        isOpen={Boolean(editingAccount)}
        onClose={() => setEditingAccount(null)}
        onUpdateAccount={handleUpdateAccount}
        onDeleteAccount={handleDeleteAccount}
      />

      <OtpExtractorModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        emails={emails}
        onSelectEmail={(emailId) => {
          setSelectedEmailId(emailId);
          setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isRead: true } : e));
        }}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        accounts={accounts}
      />
    </div>
  );
}
