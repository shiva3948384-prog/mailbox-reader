import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  Key, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck,
  Zap,
  UploadCloud,
  FileText,
  Trash2
} from 'lucide-react';
import { parseCredentialsText, convertParsedToAccount, DEFAULT_MICROSOFT_CLIENT_ID } from '../lib/parser';
import { api } from '../lib/api';
import { OutlookAccount, ParsedCredential } from '../types';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccounts: (accounts: OutlookAccount[]) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAddAccounts
}) => {
  const [activeTab, setActiveTab] = useState<'bulk' | 'single'>('bulk');

  // Bulk state
  const [bulkText, setBulkText] = useState('');
  const [parsedList, setParsedList] = useState<ParsedCredential[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single form state
  const [singleEmail, setSingleEmail] = useState('');
  const [singlePassword, setSinglePassword] = useState('');
  const [singleClientId, setSingleClientId] = useState(DEFAULT_MICROSOFT_CLIENT_ID);
  const [singleRefreshToken, setSingleRefreshToken] = useState('');
  const [singleClientSecret, setSingleClientSecret] = useState('');
  const [singleLabel, setSingleLabel] = useState('');

  // Single testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message?: string;
    inboxCount?: number;
    method?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    const parsed = parseCredentialsText(text);
    setParsedList(parsed);
  };

  const handleFileProcess = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setUploadedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        handleBulkTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleClearBulk = () => {
    setBulkText('');
    setParsedList([]);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInsertSampleColon = () => {
    const sample = `account1@outlook.com:Pass123!:d3590ed6-52b3-4102-aeff-aad2292ab01c:M.C546_8.0.U.sample_token_here
account2@hotmail.com:SecretPass456:M.C546_sample_token_two_here
account3@outlook.fr:abuwg691220:0_CVA8_8.2:M.C546_8.0.U.sample_token_three_here`;
    setUploadedFileName(null);
    handleBulkTextChange(sample);
  };

  const handleInsertSamplePipe = () => {
    const sample = `account1@outlook.com|Pass123!|d3590ed6-52b3-4102-aeff-aad2292ab01c|M.C546_8.0.U.sample_token_here
account2@hotmail.com|SecretPass456|d3590ed6-52b3-4102-aeff-aad2292ab01c|M.C546_sample_token_two_here
account3@outlook.com|MyPass789|M.C546_8.0.U.sample_token_three_here`;
    setUploadedFileName(null);
    handleBulkTextChange(sample);
  };

  const handleImportBulk = () => {
    const valid = parsedList.filter(p => p.isValid);
    if (valid.length === 0) return;

    const newAccounts = valid.map(convertParsedToAccount);
    onAddAccounts(newAccounts);
    handleClearBulk();
    onClose();
  };

  const handleTestSingle = async () => {
    if (!singleEmail && !singleRefreshToken) {
      setTestResult({
        tested: true,
        success: false,
        message: 'Email and either Refresh Token or Password are required'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testAccount({
        email: singleEmail.trim(),
        password: singlePassword.trim() || undefined,
        clientId: singleClientId.trim() || DEFAULT_MICROSOFT_CLIENT_ID,
        refreshToken: singleRefreshToken.trim(),
        clientSecret: singleClientSecret.trim() || undefined
      });

      if (res.success) {
        setTestResult({
          tested: true,
          success: true,
          message: `Connected successfully as ${res.displayName || res.email}!`,
          inboxCount: res.inboxTotal,
          method: res.method
        });
        if (!singleEmail && res.email) {
          setSingleEmail(res.email);
        }
      } else {
        setTestResult({
          tested: true,
          success: false,
          message: res.error || 'Failed to authenticate with Microsoft'
        });
      }
    } catch (e: any) {
      setTestResult({
        tested: true,
        success: false,
        message: e.message || 'Network error during test'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSingle = () => {
    if (!singleEmail || (!singleRefreshToken && !singlePassword)) return;

    const newAccount: OutlookAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: singleEmail.trim(),
      password: singlePassword.trim() || undefined,
      clientId: singleClientId.trim() || DEFAULT_MICROSOFT_CLIENT_ID,
      refreshToken: singleRefreshToken.trim(),
      clientSecret: singleClientSecret.trim() || undefined,
      label: singleLabel.trim() || singleEmail.split('@')[0],
      status: testResult?.success ? 'active' : 'idle',
      unreadCount: 0,
      totalCount: testResult?.inboxCount || 0
    };

    onAddAccounts([newAccount]);
    onClose();
  };

  const validCount = parsedList.filter(p => p.isValid).length;
  const invalidCount = parsedList.filter(p => !p.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Outlook / Hotmail Accounts</h2>
              <p className="text-xs text-slate-400">Direct OAuth2 & IMAP Real-time Mailbox Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4">
          <button
            id="tab-bulk-import"
            onClick={() => setActiveTab('bulk')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'bulk'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bulk / .TXT File Import</span>
          </button>
          <button
            id="tab-single-account"
            onClick={() => setActiveTab('single')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Single Account Form</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'bulk' ? (
            <div className="space-y-4">
              {/* File Upload Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,.csv,.tsv,.log,text/plain"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload-input"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : uploadedFileName
                    ? 'border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/30'
                    : 'border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950'
                }`}
              >
                {uploadedFileName ? (
                  <div className="flex items-center justify-between w-full px-2">
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-emerald-300">{uploadedFileName}</div>
                        <div className="text-[11px] text-slate-400">File loaded • Click to replace file</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearBulk();
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Clear file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Upload or drag & drop a <span className="text-blue-400 font-mono">.txt</span> file
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Accepts any file with account credentials line-by-line
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Textarea or sample helpers */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Or paste text manually (Colon <span className="font-mono text-blue-400">:</span> or Pipe <span className="font-mono text-blue-400">|</span>):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleInsertSampleColon}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Sample ( : )</span>
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleInsertSamplePipe}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Sample ( | )</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    id="textarea-bulk-credentials"
                    rows={5}
                    value={bulkText}
                    onChange={(e) => {
                      setUploadedFileName(null);
                      handleBulkTextChange(e.target.value);
                    }}
                    placeholder={`Supported formats (one per line):
mail:pass:clientid:refreshtoken
mail|pass|clientid|refreshtoken
mail:pass:refreshtoken
mail|pass|refreshtoken
mail:pass:auth_code:refreshtoken
mail:pass
mail|pass`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Live Parsing Table Preview */}
              {parsedList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Parsed Accounts Preview:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-medium">✓ {validCount} Valid</span>
                      {invalidCount > 0 && (
                        <span className="text-rose-400 font-medium">✗ {invalidCount} Invalid</span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-slate-950">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 text-[11px] sticky top-0">
                        <tr>
                          <th className="p-2">Status</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Client ID / Mode</th>
                          <th className="p-2">Refresh Token / Auth</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300 text-[11px]">
                        {parsedList.map((item, idx) => (
                          <tr key={idx} className={item.isValid ? 'hover:bg-slate-900/40' : 'bg-rose-950/20'}>
                            <td className="p-2">
                              {item.isValid ? (
                                <span className="inline-flex items-center text-emerald-400" title="Valid account format">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-rose-400" title={item.error}>
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-medium truncate max-w-[170px] text-white">{item.email || '-'}</td>
                            <td className="p-2 text-slate-400 truncate max-w-[120px]">
                              {item.clientId ? `${item.clientId.substring(0, 8)}...` : 'Default MS Office'}
                            </td>
                            <td className="p-2 text-slate-400 truncate max-w-[140px]">
                              {item.refreshToken ? (
                                <span className="text-emerald-400/90 font-mono">
                                  {item.refreshToken.substring(0, 12)}...
                                </span>
                              ) : item.password ? (
                                <span className="text-blue-400/90">IMAP Password</span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Format Hint Box */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supports all delimiters (: or |) and .txt files</span>
                </div>
                <p>
                  Both <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">mail:pass:clientid:refreshtoken</code> and <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">mail|pass|clientid|refreshtoken</code> are automatically recognized.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  id="input-single-email"
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="e.g. your_account@outlook.com or hotmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password (Optional / Fallback)
                  </label>
                  <input
                    id="input-single-password"
                    type="password"
                    value={singlePassword}
                    onChange={(e) => setSinglePassword(e.target.value)}
                    placeholder="Optional reference password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Account Label / Tag
                  </label>
                  <input
                    id="input-single-label"
                    type="text"
                    value={singleLabel}
                    onChange={(e) => setSingleLabel(e.target.value)}
                    placeholder="e.g. Primary, Steam, Discord Bot"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Microsoft Client ID (App ID)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSingleClientId(DEFAULT_MICROSOFT_CLIENT_ID)}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    Reset to default MS Office ID
                  </button>
                </div>
                <input
                  id="input-single-client-id"
                  type="text"
                  value={singleClientId}
                  onChange={(e) => setSingleClientId(e.target.value)}
                  placeholder={DEFAULT_MICROSOFT_CLIENT_ID}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  OAuth Refresh Token (Starts with M.C, 0.AX, etc.)
                </label>
                <textarea
                  id="input-single-refresh-token"
                  rows={3}
                  value={singleRefreshToken}
                  onChange={(e) => setSingleRefreshToken(e.target.value)}
                  placeholder="Paste OAuth refresh token (e.g. M.C546_8.0.U... or 0.AXEA...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Test status banner */}
              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold flex items-center justify-between">
                      <span>{testResult.success ? 'Connection Successful!' : 'Connection Failed'}</span>
                      {testResult.method && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          {testResult.method}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">{testResult.message}</div>
                    {testResult.inboxCount !== undefined && (
                      <div className="text-[11px] text-emerald-400 font-medium mt-1">
                        Found {testResult.inboxCount} emails in Inbox.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          {activeTab === 'bulk' ? (
            <button
              id="btn-confirm-import-bulk"
              onClick={handleImportBulk}
              disabled={validCount === 0}
              className={`px-5 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-md flex items-center gap-1.5 ${
                validCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-emerald-600/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Import & Sync {validCount} Account{validCount === 1 ? '' : 's'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-test-single-connection"
                onClick={handleTestSingle}
                disabled={isTesting || (!singleRefreshToken && !singlePassword)}
                className="px-3.5 py-2 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors cursor-pointer"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                id="btn-confirm-save-single"
                onClick={handleSaveSingle}
                disabled={!singleEmail || (!singleRefreshToken && !singlePassword)}
                className={`px-5 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-md ${
                  singleEmail && (singleRefreshToken || singlePassword)
                    ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer shadow-blue-600/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Save Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
