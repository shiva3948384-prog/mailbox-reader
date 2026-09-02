import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Copy, 
  RefreshCw, 
  Shield, 
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { OutlookAccount } from '../types';

interface AccountSettingsModalProps {
  account: OutlookAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateAccount: (updated: OutlookAccount) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  account,
  isOpen,
  onClose,
  onUpdateAccount,
  onDeleteAccount
}) => {
  if (!isOpen || !account) return null;

  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState(account.password || '');
  const [clientId, setClientId] = useState(account.clientId);
  const [refreshToken, setRefreshToken] = useState(account.refreshToken);
  const [clientSecret, setClientSecret] = useState(account.clientSecret || '');
  const [label, setLabel] = useState(account.label || '');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message?: string;
    folders?: any[];
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testAccount({
        email,
        clientId,
        refreshToken,
        clientSecret
      });

      if (res.success) {
        setTestResult({
          tested: true,
          success: true,
          message: `Connected successfully! Display Name: ${res.displayName || res.email}`,
          folders: res.folders
        });
      } else {
        setTestResult({
          tested: true,
          success: false,
          message: res.error || 'Token verification failed'
        });
      }
    } catch (e: any) {
      setTestResult({
        tested: true,
        success: false,
        message: e.message || 'Network test error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onUpdateAccount({
      ...account,
      email: email.trim(),
      password: password.trim() || undefined,
      clientId: clientId.trim(),
      refreshToken: refreshToken.trim(),
      clientSecret: clientSecret.trim() || undefined,
      label: label.trim() || undefined,
      status: testResult?.success ? 'active' : account.status
    });
    onClose();
  };

  const handleCopyFormatted = () => {
    const format = `${email}:${password}:${clientId}:${refreshToken}${clientSecret ? `:${clientSecret}` : ''}`;
    navigator.clipboard.writeText(format);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Account Diagnostics & Edit</h2>
              <p className="text-xs text-slate-400 font-mono">{account.email}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                id="modal-edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Label</label>
              <input
                id="modal-edit-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password (Reference)</label>
            <input
              id="modal-edit-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Microsoft Client ID</label>
            <input
              id="modal-edit-clientid"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">OAuth Refresh Token</label>
            <textarea
              id="modal-edit-refresh-token"
              rows={3}
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Client Secret (Optional)</label>
            <input
              id="modal-edit-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Leave empty if public app"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{testResult.success ? 'Graph API Connected' : 'Connection Error'}</div>
                <div className="text-[11px] opacity-90 mt-0.5">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Copy Credential String */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCopyFormatted}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied mail:pass:cred!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy mail:pass:client_id:refresh_token</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onDeleteAccount(account.id);
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-modal-test-conn"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3.5 py-2 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
            >
              {isTesting ? 'Testing...' : 'Test Token'}
            </button>

            <button
              id="btn-modal-save-changes"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
