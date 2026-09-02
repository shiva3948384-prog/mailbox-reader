import { OutlookAccount, EmailMessage } from '../types';

const ACCOUNTS_STORAGE_KEY = 'outlook_reader_accounts_v1';
const EMAILS_STORAGE_KEY = 'outlook_reader_cached_emails_v1';
const SETTINGS_STORAGE_KEY = 'outlook_reader_settings_v1';

export interface AppSettings {
  autoSyncInterval: number; // in seconds, 0 = disabled
  selectedFolder: string;
  theme: 'dark' | 'light';
  onlyShowOtpEmails: boolean;
  defaultClientId: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSyncInterval: 30, // 30 seconds default auto-refresh
  selectedFolder: 'inbox',
  theme: 'dark',
  onlyShowOtpEmails: false,
  defaultClientId: 'd3590ed6-52b3-4102-aeff-aad2292ab01c' // Microsoft official public client ID
};

// Initial sample accounts to help user understand the format instantly
export const SAMPLE_ACCOUNTS: OutlookAccount[] = [
  {
    id: 'demo-acc-1',
    email: 'demo.developer@outlook.com',
    password: 'Password123!',
    clientId: 'd3590ed6-52b3-4102-aeff-aad2292ab01c',
    refreshToken: '0.AXEA...sample_refresh_token_paste_real_credentials_here...',
    label: 'Demo QA Account',
    status: 'active',
    lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    unreadCount: 3,
    totalCount: 12
  }
];

export const SAMPLE_EMAILS: EmailMessage[] = [
  {
    id: 'sample-msg-1',
    accountId: 'demo-acc-1',
    accountEmail: 'demo.developer@outlook.com',
    subject: 'Your Steam Guard verification code is: 8K9F2',
    bodyPreview: 'Dear Steam User, Here is the Steam Guard code you need that will allow you to sign in: 8K9F2. If this was not you, please secure your account.',
    body: {
      contentType: 'html',
      content: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #171a21; color: #c6d4df; border-radius: 8px;">
          <h2 style="color: #66c0f4; margin-top: 0;">Steam Guard Verification</h2>
          <p>Hello demo.developer@outlook.com,</p>
          <p>We received a sign in attempt from your account.</p>
          <div style="background: #212b3b; padding: 18px 24px; border-radius: 6px; text-align: center; margin: 24px 0; border: 1px solid #38495f;">
            <span style="font-size: 14px; color: #8f98a0; display: block; margin-bottom: 6px;">YOUR VERIFICATION CODE</span>
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #ffffff; font-family: monospace;">8K9F2</span>
          </div>
          <p style="font-size: 13px; color: #8f98a0;">If you didn't request this code, someone might be attempting to access your account. Please change your password immediately.</p>
        </div>
      `
    },
    from: {
      emailAddress: {
        name: 'Steam Support',
        address: 'noreply@steampowered.com'
      }
    },
    toRecipients: [{ emailAddress: { name: 'Demo User', address: 'demo.developer@outlook.com' } }],
    receivedDateTime: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    hasAttachments: false,
    isRead: false,
    importance: 'high',
    extractedOtp: {
      code: '8K9F2',
      type: 'Verification Code',
      service: 'Steam'
    }
  },
  {
    id: 'sample-msg-2',
    accountId: 'demo-acc-1',
    accountEmail: 'demo.developer@outlook.com',
    subject: 'Discord Login Security Code: 492810',
    bodyPreview: 'Hey demo.developer, Your Discord verification passcode is 492810. Do not share this with anyone.',
    body: {
      contentType: 'html',
      content: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #313338; color: #dbdee1; border-radius: 8px;">
          <h2 style="color: #5865F2; margin-top: 0;">Discord Security Alert</h2>
          <p>Hey there,</p>
          <p>Use the following 6-digit confirmation code to finish signing into your Discord account:</p>
          <div style="background: #2b2d31; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #5865F2; font-family: monospace;">492810</span>
          </div>
          <p style="font-size: 12px; color: #949ba4;">Expires in 10 minutes. If you did not initiate this request, no action is needed.</p>
        </div>
      `
    },
    from: {
      emailAddress: {
        name: 'Discord Security',
        address: 'noreply@discord.com'
      }
    },
    toRecipients: [{ emailAddress: { name: 'Demo User', address: 'demo.developer@outlook.com' } }],
    receivedDateTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    hasAttachments: false,
    isRead: false,
    importance: 'normal',
    extractedOtp: {
      code: '492810',
      type: 'Verification Code',
      service: 'Discord'
    }
  },
  {
    id: 'sample-msg-3',
    accountId: 'demo-acc-1',
    accountEmail: 'demo.developer@outlook.com',
    subject: 'Epic Games Account Password Reset Code [718304]',
    bodyPreview: 'Your verification code for Epic Games is 718304. Enter this code to proceed with your verification request.',
    body: {
      contentType: 'text',
      content: `Hello,\n\nYour Epic Games two-factor authentication code is:\n\n718304\n\nThis code will expire in 10 minutes. If you did not request this code, please secure your account immediately at epicgames.com.\n\nThanks,\nEpic Games Team`
    },
    from: {
      emailAddress: {
        name: 'Epic Games Support',
        address: 'help@epicgames.com'
      }
    },
    toRecipients: [{ emailAddress: { name: 'Demo User', address: 'demo.developer@outlook.com' } }],
    receivedDateTime: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    hasAttachments: false,
    isRead: true,
    importance: 'normal',
    extractedOtp: {
      code: '718304',
      type: 'Verification Code',
      service: 'Epic Games'
    }
  }
];

export function getStoredAccounts(): OutlookAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return SAMPLE_ACCOUNTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SAMPLE_ACCOUNTS;
  } catch (e) {
    console.error('Failed to load accounts from storage', e);
    return SAMPLE_ACCOUNTS;
  }
}

export function saveStoredAccounts(accounts: OutlookAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts to storage', e);
  }
}

export function getStoredEmails(): EmailMessage[] {
  try {
    const raw = localStorage.getItem(EMAILS_STORAGE_KEY);
    if (!raw) return SAMPLE_EMAILS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SAMPLE_EMAILS;
  } catch (e) {
    console.error('Failed to load emails from storage', e);
    return SAMPLE_EMAILS;
  }
}

export function saveStoredEmails(emails: EmailMessage[]): void {
  try {
    localStorage.setItem(EMAILS_STORAGE_KEY, JSON.stringify(emails));
  } catch (e) {
    console.error('Failed to save emails to storage', e);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}
