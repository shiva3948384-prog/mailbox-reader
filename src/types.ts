export interface OutlookAccount {
  id: string;
  email: string;
  password?: string;
  clientId: string;
  refreshToken: string;
  clientSecret?: string;
  tenant?: string;
  recoveryEmail?: string;
  authMethod?: string;
  label?: string;
  status: 'idle' | 'syncing' | 'active' | 'error';
  lastSync?: string;
  errorMessage?: string;
  unreadCount?: number;
  totalCount?: number;
  cachedAccessToken?: string;
  accessTokenExpiry?: number;
}

export interface EmailRecipient {
  emailAddress?: {
    name?: string;
    address?: string;
  };
}

export interface EmailMessage {
  id: string;
  accountId: string;
  accountEmail: string;
  subject: string;
  bodyPreview: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  from?: EmailRecipient;
  toRecipients?: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
  receivedDateTime: string;
  hasAttachments: boolean;
  isRead: boolean;
  importance?: 'low' | 'normal' | 'high';
  webLink?: string;
  folderId?: string;
  folderName?: string;
  extractedOtp?: {
    code: string;
    type: string;
    service?: string;
  };
}

export interface MailFolder {
  id: string;
  displayName: string;
  totalItemCount: number;
  unreadItemCount: number;
  wellKnownName?: string;
}

export interface BatchSyncResult {
  accountId: string;
  email: string;
  success: boolean;
  messages: EmailMessage[];
  unreadCount: number;
  totalCount: number;
  error?: string;
  cachedAccessToken?: string;
  newRefreshToken?: string;
}

export interface ParsedCredential {
  raw: string;
  email: string;
  password?: string;
  clientId: string;
  refreshToken: string;
  clientSecret?: string;
  recoveryEmail?: string;
  isValid: boolean;
  error?: string;
}
