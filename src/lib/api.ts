import { OutlookAccount, EmailMessage, MailFolder, BatchSyncResult } from '../types';

export interface RefreshTokenResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  error?: string;
  errorDescription?: string;
}

export interface MessagesResponse {
  success: boolean;
  messages: EmailMessage[];
  accessToken?: string;
  newRefreshToken?: string;
  method?: string;
  error?: string;
}

export interface TestAccountResponse {
  success: boolean;
  email?: string;
  displayName?: string;
  folders?: MailFolder[];
  inboxUnread?: number;
  inboxTotal?: number;
  accessToken?: string;
  newRefreshToken?: string;
  method?: string;
  error?: string;
}

export interface BatchSyncResponse {
  success: boolean;
  syncedAt: string;
  results: BatchSyncResult[];
  error?: string;
}

export const api = {
  async refreshToken(account: {
    clientId: string;
    refreshToken: string;
    clientSecret?: string;
    tenant?: string;
  }): Promise<RefreshTokenResponse> {
    const res = await fetch('/api/outlook/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    return res.json();
  },

  async testAccount(account: {
    email?: string;
    password?: string;
    clientId?: string;
    refreshToken?: string;
    clientSecret?: string;
    tenant?: string;
  }): Promise<TestAccountResponse> {
    const res = await fetch('/api/outlook/test-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    return res.json();
  },

  async fetchMessages(params: {
    email?: string;
    password?: string;
    accessToken?: string;
    clientId?: string;
    refreshToken?: string;
    clientSecret?: string;
    tenant?: string;
    folder?: string;
    top?: number;
    search?: string;
  }): Promise<MessagesResponse> {
    const res = await fetch('/api/outlook/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async fetchMessageDetails(id: string, credentials: {
    accessToken?: string;
    clientId?: string;
    refreshToken?: string;
    clientSecret?: string;
    tenant?: string;
  }): Promise<{ success: boolean; message?: EmailMessage; error?: string }> {
    const res = await fetch(`/api/outlook/message/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return res.json();
  },

  async markAsRead(id: string, accessToken: string, isRead: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`/api/outlook/message/${id}/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, isRead })
    });
    return res.json();
  },

  async batchSync(accounts: OutlookAccount[], folder: string = 'inbox', search?: string): Promise<BatchSyncResponse> {
    const res = await fetch('/api/outlook/batch-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accounts: accounts.map(a => ({
          id: a.id,
          email: a.email,
          password: a.password,
          clientId: a.clientId,
          refreshToken: a.refreshToken,
          clientSecret: a.clientSecret,
          tenant: a.tenant,
          cachedAccessToken: a.cachedAccessToken
        })),
        folder,
        top: 25,
        search
      })
    });
    return res.json();
  },

  async syncSingleAccount(account: OutlookAccount, folder: string = 'inbox', search?: string): Promise<{
    success: boolean;
    accountId: string;
    email: string;
    messages: EmailMessage[];
    unreadCount: number;
    totalCount: number;
    cachedAccessToken?: string;
    newRefreshToken?: string;
    method?: string;
    error?: string;
  }> {
    const res = await fetch('/api/outlook/sync-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: {
          id: account.id,
          email: account.email,
          password: account.password,
          clientId: account.clientId,
          refreshToken: account.refreshToken,
          clientSecret: account.clientSecret,
          tenant: account.tenant,
          cachedAccessToken: account.cachedAccessToken
        },
        folder,
        top: 30,
        search
      })
    });
    return res.json();
  }
};
