import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Known Microsoft Client IDs for multi-fallback token exchange
const FALLBACK_CLIENT_IDS = [
  'd3590ed6-52b3-4102-aeff-aad2292ab01c', // Microsoft Office Universal (Windows / Mac)
  '00000000402b5328', // Windows Live / Outlook Mail
  '00000000480728c5', // Outlook Android App
  '000000004c12ae6f', // Outlook iOS App
  '27922004-70b3-40fc-b692-a42068e4e221', // Outlook Web App
  'e9b1050e-5418-4770-985a-063a5aa87cb2', // Outlook Core
  '29d9ed98-a469-4536-ade2-f981bc1d605e', // Microsoft Outlook Desktop
  '000000004812ae68'  // Microsoft Authenticator
];

const BANNED_WORDS = new Set([
  'with', 'your', 'from', 'this', 'that', 'here', 'into', 'when', 'html', 'http', 'https',
  'body', 'table', 'style', 'meta', 'link', 'font', 'head', 'help', 'view', 'send',
  'user', 'name', 'pass', 'auth', 'team', 'code', 'sign', 'free', 'only', 'page',
  'site', 'mail', 'post', 'note', 'form', 'click', 'enter', 'input', 'reset', 'below',
  'above', 'valid', 'hours', 'about', 'reply', 'login', 'using', 'please', 'thank',
  'terms', 'email', 'check', 'alert', 'order', 'state', 'group', 'guard', 'steam',
  'apple', 'google', 'facebook', 'meta', 'account', 'security', 'access', 'verify',
  'verification', 'action', 'needed', 'confirmation', 'device', 'password', 'protect',
  'message', 'change', 'request', 'temporary', 'service', 'system', 'online', 'number',
  'follow', 'button', 'support', 'center', 'privacy', 'policy', 'rights', 'reserved',
  'notification', 'recent', 'activity', 'identity', 'attempt', 'received', 'welcome',
  'success', 'failed', 'manage', 'update', 'status', 'detail', 'details', 'subject',
  'inbox', 'folder', 'select', 'active', 'connect', 'server', 'client', 'public', 'dtd',
  'true', 'false', 'null', 'undefined', 'class', 'width', 'align', 'center', 'color'
]);

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!DOCTYPE[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectServiceName(text: string): string | undefined {
  const serviceRegexes = [
    { regex: /steam/i, name: 'Steam' },
    { regex: /epic\s*games/i, name: 'Epic Games' },
    { regex: /discord/i, name: 'Discord' },
    { regex: /twitter|x\.com/i, name: 'Twitter / X' },
    { regex: /instagram/i, name: 'Instagram' },
    { regex: /facebook|meta/i, name: 'Facebook' },
    { regex: /google/i, name: 'Google' },
    { regex: /microsoft|xbox|live\.com/i, name: 'Microsoft / Xbox' },
    { regex: /apple|icloud/i, name: 'Apple' },
    { regex: /amazon/i, name: 'Amazon' },
    { regex: /netflix/i, name: 'Netflix' },
    { regex: /spotify/i, name: 'Spotify' },
    { regex: /binance|coinbase|bybit|crypto|kucoin|kraken/i, name: 'Crypto Exchange' },
    { regex: /paypal/i, name: 'PayPal' },
    { regex: /telegram/i, name: 'Telegram' },
    { regex: /whatsapp/i, name: 'WhatsApp' },
    { regex: /roblox/i, name: 'Roblox' },
    { regex: /openai|chatgpt/i, name: 'OpenAI' },
    { regex: /github/i, name: 'GitHub' },
    { regex: /riot\s*games|valorant|league\s*of\s*legends/i, name: 'Riot Games' },
    { regex: /ubisoft/i, name: 'Ubisoft' },
    { regex: /rockstar|social\s*club/i, name: 'Rockstar Games' },
    { regex: /playstation|sony/i, name: 'PlayStation' },
    { regex: /battlenet|blizzard/i, name: 'Battle.net' },
    { regex: /tiktok/i, name: 'TikTok' },
    { regex: /uber/i, name: 'Uber' }
  ];

  for (const s of serviceRegexes) {
    if (s.regex.test(text)) {
      return s.name;
    }
  }
  return undefined;
}

function isValidOtpCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim();
  if (clean.length < 4 || clean.length > 10) return false;

  // Disallow common 4-digit years
  if (/^(199\d|20[0-3]\d)$/.test(clean)) return false;

  // Check banned dictionary / HTML words
  if (BANNED_WORDS.has(clean.toLowerCase())) return false;

  // Pure digits of 4 to 8 length
  if (/^\d{4,8}$/.test(clean)) return true;

  // Formatted numeric (e.g. 123-456)
  if (/^\d{3}[-\s]\d{3}$/.test(clean)) return true;

  // Google G-123456
  if (/^G-\d{6}$/i.test(clean)) return true;

  // Steam 5-char alphanumeric (e.g. 5V4X9)
  if (/^[A-Z0-9]{5}$/i.test(clean) && /[0-9]/.test(clean)) return true;

  // Alphanumeric with both digits and letters (e.g. A93F1)
  if (/^[A-Z0-9]{4,8}$/i.test(clean) && /[0-9]/.test(clean) && /[A-Za-z]/.test(clean)) {
    return true;
  }

  return false;
}

// Enhanced OTP / Security Code Extractor
function extractOtpFromText(subject: string = '', body: string = ''): { code: string; type: string; service?: string } | undefined {
  const cleanSubject = stripHtml(subject);
  const cleanBody = stripHtml(body);
  const combined = `${cleanSubject} \n ${cleanBody}`;

  const detectedService = detectServiceName(combined);

  // --- Step 1: Check Subject line first (highest priority) ---
  if (cleanSubject) {
    // 1. Starts with code: "11367 is your confirmation code" or "11367 is your Facebook confirmation code"
    const startMatch = cleanSubject.match(/^\s*([0-9]{4,8})\s+(?:is\s+your|to\s+verify|for\s+|is\s+the|confirmation|verification|security|login|access|code)/i);
    if (startMatch && isValidOtpCode(startMatch[1])) {
      return { code: startMatch[1].trim(), type: 'Verification Code', service: detectedService };
    }

    // 2. "...is your verification code: 11367" or "Your code is 11367"
    const subMatch1 = cleanSubject.match(/(?:your|the)?\s*(?:confirmation|verification|security|login|access|one-time|auth|otp|pin)\s*(?:code|pin|passcode|token)?\s*(?:is|:|=|-|–|—|\s)\s*([0-9]{4,8})\b/i);
    if (subMatch1 && isValidOtpCode(subMatch1[1])) {
      return { code: subMatch1[1].trim(), type: 'Verification Code', service: detectedService };
    }

    // 3. "11367 is your code"
    const subMatch2 = cleanSubject.match(/\b([0-9]{4,8})\b(?:\s+is\s+your|\s+is\s+the)/i);
    if (subMatch2 && isValidOtpCode(subMatch2[1])) {
      return { code: subMatch2[1].trim(), type: 'Verification Code', service: detectedService };
    }

    // 4. Google G-123456
    const googleMatch = cleanSubject.match(/\b(G-[0-9]{6})\b/i);
    if (googleMatch && isValidOtpCode(googleMatch[1])) {
      return { code: googleMatch[1].trim().toUpperCase(), type: 'Verification Code', service: detectedService || 'Google' };
    }

    // 5. Steam Guard
    const steamMatch = cleanSubject.match(/(?:Steam Guard code|Steam Guard)[\s:=#\-–—]+([A-Z0-9]{5})\b/i);
    if (steamMatch && isValidOtpCode(steamMatch[1])) {
      return { code: steamMatch[1].trim().toUpperCase(), type: 'Verification Code', service: detectedService || 'Steam' };
    }

    // 6. If subject clearly mentions code/verification and contains a standalone 4-8 digit number
    if (/(?:code|confirm|verif|secur|login|pin|otp|passcode|token)/i.test(cleanSubject)) {
      const genericSubjectDigit = cleanSubject.match(/\b([0-9]{4,8})\b/);
      if (genericSubjectDigit && isValidOtpCode(genericSubjectDigit[1])) {
        return { code: genericSubjectDigit[1].trim(), type: 'Verification Code', service: detectedService };
      }
    }
  }

  // --- Step 2: Check Email Body ---
  if (cleanBody) {
    // 1. "Security code: 11367", "Your verification code is: 11367", "Confirmation code: 11367"
    const bodyMatch1 = cleanBody.match(/(?:your\s+)?(?:security|verification|confirmation|login|access|one-time|activation|authorization|auth|otp|pin|passcode)?\s*(?:code|pin|passcode|token|otp|código|kod)\s*(?:is|:|=|-|–|—|\s)\s*([0-9]{4,8})\b/i);
    if (bodyMatch1 && isValidOtpCode(bodyMatch1[1])) {
      return { code: bodyMatch1[1].trim(), type: 'Verification Code', service: detectedService };
    }

    // 2. "Enter 11367 to verify", "Use 11367 to log in", "Here is your code: 11367"
    const bodyMatch2 = cleanBody.match(/(?:enter|use|input|here\s+is\s+your)\s+(?:the\s+)?(?:code\s+|security\s+code\s+|verification\s+code\s+)?([0-9]{4,8})\s+(?:to\s+verify|to\s+confirm|to\s+log\s*in|to\s+continue|to\s+access|as\s+your|in\s+the|below)/i);
    if (bodyMatch2 && isValidOtpCode(bodyMatch2[1])) {
      return { code: bodyMatch2[1].trim(), type: 'Verification Code', service: detectedService };
    }

    // 3. "11367 is your confirmation code"
    const bodyMatch3 = cleanBody.match(/\b([0-9]{4,8})\b(?:\s+is\s+your\s+(?:confirmation|verification|login|security|access|activation|auth|one-time|otp|code))/i);
    if (bodyMatch3 && isValidOtpCode(bodyMatch3[1])) {
      return { code: bodyMatch3[1].trim(), type: 'Verification Code', service: detectedService };
    }

    // 4. Google G-123456
    const bodyGoogle = cleanBody.match(/\b(G-[0-9]{6})\b/i);
    if (bodyGoogle && isValidOtpCode(bodyGoogle[1])) {
      return { code: bodyGoogle[1].trim().toUpperCase(), type: 'Verification Code', service: detectedService || 'Google' };
    }

    // 5. Formatted 6-digit code like 123-456
    const formattedNum = cleanBody.match(/\b([0-9]{3}[-\s][0-9]{3})\b/);
    if (formattedNum && isValidOtpCode(formattedNum[1])) {
      return { code: formattedNum[1].trim(), type: 'Verification Code', service: detectedService };
    }

    // 6. Steam Guard alphanumeric
    const steamBody = cleanBody.match(/(?:Steam Guard code|special code)[\s:=]+([A-Z0-9]{5})\b/i);
    if (steamBody && isValidOtpCode(steamBody[1])) {
      return { code: steamBody[1].trim().toUpperCase(), type: 'Verification Code', service: detectedService || 'Steam' };
    }

    // 7. Standalone 6-digit code in emails from recognized verification providers
    if (detectedService) {
      const standAlone6Digit = cleanBody.match(/\b([0-9]{6})\b/);
      if (standAlone6Digit && isValidOtpCode(standAlone6Digit[1])) {
        return { code: standAlone6Digit[1].trim(), type: 'Verification Code', service: detectedService };
      }
    }
  }

  return undefined;
}

// Helper to translate cryptic Microsoft error codes to human-readable explanations
function formatMicrosoftError(error: string, errorDesc: string = ''): string {
  const combined = `${error} ${errorDesc}`.toLowerCase();

  if (combined.includes('aadsts50126') || combined.includes('invalid username or password')) {
    return 'Invalid credentials: Email or password is incorrect.';
  }
  if (combined.includes('aadsts50076') || combined.includes('aadsts50079') || combined.includes('mfa') || combined.includes('two-factor') || combined.includes('security check')) {
    return '2FA / Verification Required: Microsoft requires SMS, App, or Security Code confirmation.';
  }
  if (combined.includes('aadsts700084') || combined.includes('aadsts700082') || combined.includes('aadsts70000') || combined.includes('token has expired') || combined.includes('token was revoked')) {
    return 'Refresh Token Expired/Revoked: Please re-authorize or paste an active refresh token.';
  }
  if (combined.includes('aadsts50034') || combined.includes('aadsts50059') || combined.includes('user account does not exist')) {
    return 'Account does not exist in Microsoft identity directory.';
  }
  if (combined.includes('aadsts50053') || combined.includes('account is locked')) {
    return 'Account temporarily locked out by Microsoft due to too many failed sign-in attempts.';
  }
  if (combined.includes('aadsts7000218') || combined.includes('client_secret')) {
    return 'Client configuration error: Application requires client secret or alternate Client ID.';
  }
  if (combined.includes('basic auth') || combined.includes('authenticate failed') || combined.includes('login failed')) {
    return 'Basic Auth blocked: Microsoft requires Modern Auth Refresh Token.';
  }

  return errorDesc || error || 'Authentication failed. Please verify credentials.';
}

interface TokenAttemptConfig {
  endpoint: string;
  clientId: string;
  scope?: string;
  redirectUri?: string;
}

// Multi-endpoint Microsoft Token Refresh & Password Grant Exchange
async function refreshMicrosoftToken(
  clientId: string,
  refreshToken: string,
  clientSecret?: string,
  tenant: string = 'common',
  email?: string,
  password?: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  error?: string;
  errorDescription?: string;
  endpointUsed?: string;
}> {
  let lastError = '';
  let lastErrorDesc = '';

  const cleanToken = (refreshToken || '').trim();

  // 1. If refresh token is available, attempt optimized prioritized refresh
  if (cleanToken.length > 10) {
    const isMsa = cleanToken.startsWith('M.C') || 
                  cleanToken.startsWith('M.R') || 
                  cleanToken.startsWith('MC54') || 
                  cleanToken.startsWith('EwB') || 
                  cleanToken.startsWith('M.E') ||
                  cleanToken.startsWith('r.0.c');

    const attempts: TokenAttemptConfig[] = [];

    // If a custom/explicit client ID was provided, test it first
    if (clientId && clientId.trim() && clientId.trim() !== 'd3590ed6-52b3-4102-aeff-aad2292ab01c') {
      const cid = clientId.trim();
      if (isMsa) {
        attempts.push({ endpoint: 'https://login.live.com/oauth20_token.srf', clientId: cid, redirectUri: 'https://login.live.com/oauth20_desktop.srf' });
        attempts.push({ endpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token', clientId: cid, scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access' });
      } else {
        attempts.push({ endpoint: `https://login.microsoftonline.com/${tenant || 'common'}/oauth2/v2.0/token`, clientId: cid, scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access' });
      }
    }

    if (isMsa) {
      // MSA Tokens: Primary target is Live SDK & Consumers v2
      attempts.push(
        { endpoint: 'https://login.live.com/oauth20_token.srf', clientId: '00000000402b5328', redirectUri: 'https://login.live.com/oauth20_desktop.srf', scope: 'service::https://mail.live.com::MBI_SSL wl.imap wl.emails wl.basic offline_access' },
        { endpoint: 'https://login.live.com/oauth20_token.srf', clientId: '00000000402b5328', redirectUri: 'https://login.live.com/oauth20_desktop.srf' },
        { endpoint: 'https://login.live.com/oauth20_token.srf', clientId: '00000000480728c5', redirectUri: 'https://login.live.com/oauth20_desktop.srf' },
        { endpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token', clientId: '00000000480728c5', scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access' },
        { endpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token', clientId: 'd3590ed6-52b3-4102-aeff-aad2292ab01c', scope: 'https://graph.microsoft.com/Mail.Read offline_access' }
      );
    } else {
      // Azure AD / Graph v2 Tokens
      attempts.push(
        { endpoint: `https://login.microsoftonline.com/${tenant || 'common'}/oauth2/v2.0/token`, clientId: 'd3590ed6-52b3-4102-aeff-aad2292ab01c', scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access' },
        { endpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token', clientId: 'd3590ed6-52b3-4102-aeff-aad2292ab01c', scope: 'https://graph.microsoft.com/Mail.Read offline_access' },
        { endpoint: 'https://login.live.com/oauth20_token.srf', clientId: '00000000402b5328', redirectUri: 'https://login.live.com/oauth20_desktop.srf' },
        { endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token', clientId: '00000000480728c5', scope: 'https://graph.microsoft.com/Mail.Read offline_access' }
      );
    }

    for (const plan of attempts) {
      try {
        const params = new URLSearchParams();
        params.append('client_id', plan.clientId);
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', cleanToken);
        if (clientSecret?.trim()) {
          params.append('client_secret', clientSecret.trim());
        }
        if (plan.redirectUri) {
          params.append('redirect_uri', plan.redirectUri);
        }
        if (plan.scope) {
          params.append('scope', plan.scope);
        }

        const res = await fetch(plan.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          signal: AbortSignal.timeout(4000)
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.access_token) {
          return {
            success: true,
            accessToken: data.access_token,
            refreshToken: data.refresh_token || cleanToken,
            expiresIn: data.expires_in,
            scope: data.scope,
            endpointUsed: `${plan.endpoint} (${plan.clientId})`
          };
        }

        if (data.error) {
          lastError = data.error;
          lastErrorDesc = data.error_description || data.error;
        }
      } catch (err: any) {
        lastError = 'NETWORK_ERROR';
        lastErrorDesc = err.message;
      }
    }
  }

  // 2. Fallback to OAuth2 ROPC Password grant if password is provided
  if (email && password && password.trim().length > 0) {
    for (const curClientId of ['00000000480728c5', '00000000402b5328', 'd3590ed6-52b3-4102-aeff-aad2292ab01c']) {
      for (const endpoint of [`https://login.microsoftonline.com/consumers/oauth2/v2.0/token`, `https://login.microsoftonline.com/common/oauth2/v2.0/token`]) {
        try {
          const ropcParams = new URLSearchParams();
          ropcParams.append('client_id', curClientId);
          ropcParams.append('grant_type', 'password');
          ropcParams.append('username', email.trim());
          ropcParams.append('password', password.trim());
          ropcParams.append('scope', 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access');

          const ropcRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: ropcParams.toString(),
            signal: AbortSignal.timeout(4000)
          });

          const ropcData = await ropcRes.json().catch(() => ({}));
          if (ropcRes.ok && ropcData.access_token) {
            return {
              success: true,
              accessToken: ropcData.access_token,
              refreshToken: ropcData.refresh_token,
              expiresIn: ropcData.expires_in,
              scope: ropcData.scope,
              endpointUsed: `${endpoint} (ROPC)`
            };
          }

          if (ropcData.error_description) {
            lastError = ropcData.error;
            lastErrorDesc = ropcData.error_description;
          }
        } catch (ropcErr: any) {
          // Continue
        }
      }
    }
  }

  const humanFriendlyMsg = formatMicrosoftError(lastError, lastErrorDesc);

  return {
    success: false,
    error: lastError || 'auth_failed',
    errorDescription: humanFriendlyMsg
  };
}

// Fetch messages via Microsoft Graph API
async function fetchMessagesFromGraph(accessToken: string, folder: string = 'inbox', top: number = 30, search?: string) {
  let url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead,importance,webLink`;

  if (folder === 'all') {
    url = `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead,importance,webLink`;
  }

  if (search && search.trim()) {
    url += `&$search="${encodeURIComponent(search.trim())}"`;
  }

  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  // Fallback to /me/messages if folder endpoint returns 404 or error
  if (!response.ok && folder !== 'all') {
    const fallbackUrl = `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead,importance,webLink`;
    response = await fetch(fallbackUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorData.error?.message || `Microsoft Graph error (${response.status})`,
      status: response.status
    };
  }

  const data = await response.json();
  const rawMessages = data.value || [];

  const messages = rawMessages.map((m: any) => {
    const otp = extractOtpFromText(m.subject, m.bodyPreview || m.body?.content || '');
    return {
      id: m.id,
      subject: m.subject || '(No Subject)',
      bodyPreview: m.bodyPreview || '',
      body: m.body ? {
        contentType: m.body.contentType || 'text',
        content: m.body.content || ''
      } : undefined,
      from: m.from,
      toRecipients: m.toRecipients || [],
      ccRecipients: m.ccRecipients || [],
      receivedDateTime: m.receivedDateTime,
      hasAttachments: Boolean(m.hasAttachments),
      isRead: Boolean(m.isRead),
      importance: m.importance || 'normal',
      webLink: m.webLink,
      extractedOtp: otp
    };
  });

  return {
    success: true,
    messages
  };
}

// Fetch messages via Outlook REST API v2.0 (fallback for Live SDK / Outlook tokens)
async function fetchMessagesFromOutlookRest(accessToken: string, top: number = 30) {
  const endpoints = [
    `https://outlook.office.com/api/v2.0/me/messages?$top=${top}&$orderby=DateTimeReceived desc`,
    `https://outlook.office365.com/api/v2.0/me/messages?$top=${top}&$orderby=DateTimeReceived desc`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const messages = (data.value || []).map((m: any) => {
          const otp = extractOtpFromText(m.Subject, m.BodyPreview || m.Body?.Content || '');
          return {
            id: m.Id || m.id,
            subject: m.Subject || '(No Subject)',
            bodyPreview: m.BodyPreview || '',
            body: m.Body ? {
              contentType: m.Body.ContentType === 'HTML' ? 'html' : 'text',
              content: m.Body.Content || ''
            } : undefined,
            from: m.From ? { emailAddress: { name: m.From.EmailAddress?.Name, address: m.From.EmailAddress?.Address } } : undefined,
            toRecipients: (m.ToRecipients || []).map((r: any) => ({ emailAddress: { name: r.EmailAddress?.Name, address: r.EmailAddress?.Address } })),
            receivedDateTime: m.DateTimeReceived || new Date().toISOString(),
            hasAttachments: Boolean(m.HasAttachments),
            isRead: Boolean(m.IsRead),
            importance: m.Importance || 'normal',
            webLink: m.WebLink,
            extractedOtp: otp
          };
        });

        return { success: true, messages };
      }
    } catch {
      // Continue to next endpoint
    }
  }

  return { success: false, error: 'Outlook REST API returned no data' };
}

// Fetch messages via IMAP (Supports password and XOAUTH2)
async function fetchMessagesFromImap(
  email: string,
  authConfig: { password?: string; accessToken?: string },
  folderName: string = 'INBOX',
  limit: number = 30
): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  const hosts = ['outlook.office365.com', 'imap-mail.outlook.com'];

  for (const host of hosts) {
    let client: ImapFlow | null = null;
    try {
      const authOptions: any = {
        user: email
      };

      if (authConfig.accessToken) {
        authOptions.accessToken = authConfig.accessToken;
      } else if (authConfig.password) {
        authOptions.pass = authConfig.password;
      } else {
        return { success: false, error: 'No password or access token for IMAP' };
      }

      client = new ImapFlow({
        host,
        port: 993,
        secure: true,
        auth: authOptions,
        logger: false,
        tls: { rejectUnauthorized: false }
      });

      await client.connect();

      // Open Mailbox
      const lock = await client.getMailboxLock(folderName.toUpperCase() === 'INBOX' ? 'INBOX' : folderName);
      try {
        const status = client.mailbox;
        if (!status || status.exists === 0) {
          return { success: true, messages: [] };
        }

        const total = status.exists;
        const startSeq = Math.max(1, total - limit + 1);
        const sequence = `${startSeq}:${total}`;

        const messages: any[] = [];

        for await (const message of client.fetch(sequence, {
          envelope: true,
          flags: true,
          source: true,
          uid: true
        })) {
          try {
            const parsed = await simpleParser(message.source);
            const bodyPreview = (parsed.text || '').substring(0, 200).replace(/\s+/g, ' ').trim();
            const otp = extractOtpFromText(parsed.subject || '', parsed.html || parsed.text || '');

            messages.unshift({
              id: `imap-${email}-${message.uid}`,
              subject: parsed.subject || '(No Subject)',
              bodyPreview,
              body: {
                contentType: parsed.html ? 'html' : 'text',
                content: parsed.html || parsed.text || ''
              },
              from: parsed.from?.value?.[0] ? {
                emailAddress: {
                  name: parsed.from.value[0].name || parsed.from.value[0].address,
                  address: parsed.from.value[0].address
                }
              } : undefined,
              toRecipients: (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : []).flatMap(t => 
                (t.value || []).map(v => ({ emailAddress: { name: v.name || v.address, address: v.address } }))
              ),
              receivedDateTime: (parsed.date || new Date()).toISOString(),
              hasAttachments: Boolean(parsed.attachments && parsed.attachments.length > 0),
              isRead: message.flags ? message.flags.has('\\Seen') : false,
              importance: 'normal',
              extractedOtp: otp
            });
          } catch (parseErr) {
            // Ignore single message parse error
          }
        }

        return { success: true, messages };
      } finally {
        lock.release();
      }
    } catch (imapErr: any) {
      // Continue to next host if available
    } finally {
      if (client) {
        try { await client.logout(); } catch {}
      }
    }
  }

  return { success: false, error: 'IMAP connection failed on all Outlook endpoints' };
}

// Master Unified Mailbox Message Fetcher
async function fetchMailboxUnified(account: {
  email: string;
  password?: string;
  clientId?: string;
  refreshToken?: string;
  clientSecret?: string;
  tenant?: string;
  cachedAccessToken?: string;
}, folder: string = 'inbox', top: number = 30, search?: string) {
  let token = account.cachedAccessToken;
  let newRefreshToken: string | undefined;
  let lastAuthError = '';

  // 1. Try Refresh Token & ROPC Password authentication
  if (!token || token.length < 20) {
    const tokenRes = await refreshMicrosoftToken(
      account.clientId || FALLBACK_CLIENT_IDS[0],
      account.refreshToken || '',
      account.clientSecret,
      account.tenant,
      account.email,
      account.password
    );

    if (tokenRes.success && tokenRes.accessToken) {
      token = tokenRes.accessToken;
      newRefreshToken = tokenRes.refreshToken;
    } else {
      lastAuthError = tokenRes.errorDescription || tokenRes.error || 'Token exchange failed';
    }
  }

  // 2. If token is available, attempt Graph API
  if (token) {
    const graphRes = await fetchMessagesFromGraph(token, folder, top, search);
    if (graphRes.success && graphRes.messages) {
      return {
        success: true,
        messages: graphRes.messages,
        accessToken: token,
        newRefreshToken,
        method: 'Microsoft Graph API'
      };
    }

    // Fallback to Outlook REST API
    const restRes = await fetchMessagesFromOutlookRest(token, top);
    if (restRes.success && restRes.messages) {
      return {
        success: true,
        messages: restRes.messages,
        accessToken: token,
        newRefreshToken,
        method: 'Outlook REST API'
      };
    }

    // Fallback to IMAP XOAUTH2
    const imapOauthRes = await fetchMessagesFromImap(account.email, { accessToken: token }, folder, top);
    if (imapOauthRes.success && imapOauthRes.messages) {
      return {
        success: true,
        messages: imapOauthRes.messages,
        accessToken: token,
        newRefreshToken,
        method: 'IMAP XOAUTH2'
      };
    }
  }

  // 3. If account has password, fallback to IMAP Direct Login
  if (account.password && account.password.trim().length > 0) {
    const imapPassRes = await fetchMessagesFromImap(account.email, { password: account.password }, folder, top);
    if (imapPassRes.success && imapPassRes.messages) {
      return {
        success: true,
        messages: imapPassRes.messages,
        method: 'IMAP TLS'
      };
    }
  }

  return {
    success: false,
    error: lastAuthError || 'Authentication failed. Please verify credentials or refresh token.',
    messages: []
  };
}

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Refresh Token Route
app.post('/api/outlook/token/refresh', async (req, res) => {
  try {
    const { clientId, refreshToken, clientSecret, tenant, email, password } = req.body;

    if (!refreshToken && !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required refreshToken or password'
      });
    }

    const result = await refreshMicrosoftToken(
      clientId || FALLBACK_CLIENT_IDS[0],
      refreshToken || '',
      clientSecret,
      tenant,
      email,
      password
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Account Route
app.post('/api/outlook/test-account', async (req, res) => {
  try {
    const { email, password, clientId, refreshToken, clientSecret, tenant } = req.body;

    if (!email && !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Email or Refresh Token is required to test connection'
      });
    }

    const syncResult = await fetchMailboxUnified(
      { email, password, clientId, refreshToken, clientSecret, tenant },
      'inbox',
      10
    );

    if (syncResult.success) {
      return res.json({
        success: true,
        email: email || 'outlook_account@outlook.com',
        displayName: email ? email.split('@')[0] : 'Outlook User',
        inboxTotal: syncResult.messages?.length || 0,
        accessToken: syncResult.accessToken,
        newRefreshToken: syncResult.newRefreshToken,
        method: syncResult.method
      });
    }

    res.status(400).json({
      success: false,
      error: syncResult.error || 'Connection failed'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error testing account' });
  }
});

// Single Account Sync Route (Fast, dedicated endpoint)
app.post('/api/outlook/sync-single', async (req, res) => {
  try {
    const { account, folder = 'inbox', top = 30, search } = req.body;

    if (!account || !account.email) {
      return res.status(400).json({
        success: false,
        error: 'Valid account object with email is required'
      });
    }

    const fetchRes = await fetchMailboxUnified(
      {
        email: account.email,
        password: account.password,
        clientId: account.clientId,
        refreshToken: account.refreshToken,
        clientSecret: account.clientSecret,
        tenant: account.tenant,
        cachedAccessToken: account.cachedAccessToken
      },
      folder,
      Number(top) || 30,
      search
    );

    if (!fetchRes.success) {
      return res.status(400).json({
        success: false,
        accountId: account.id,
        email: account.email,
        messages: [],
        unreadCount: 0,
        totalCount: 0,
        error: fetchRes.error || 'Sync failed for account'
      });
    }

    const taggedMessages = (fetchRes.messages || []).map((m: any) => ({
      ...m,
      accountId: account.id,
      accountEmail: account.email
    }));

    const unreadCount = taggedMessages.filter((m: any) => !m.isRead).length;

    res.json({
      success: true,
      accountId: account.id,
      email: account.email,
      messages: taggedMessages,
      unreadCount,
      totalCount: taggedMessages.length,
      cachedAccessToken: fetchRes.accessToken,
      newRefreshToken: fetchRes.newRefreshToken,
      method: fetchRes.method
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Single sync failed'
    });
  }
});

// Fetch Messages Route
app.post('/api/outlook/messages', async (req, res) => {
  try {
    const { email, password, accessToken, clientId, refreshToken, clientSecret, tenant, folder = 'inbox', top = 30, search } = req.body;

    const result = await fetchMailboxUnified({
      email,
      password,
      clientId,
      refreshToken,
      clientSecret,
      tenant,
      cachedAccessToken: accessToken
    }, folder, Number(top) || 30, search);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching messages' });
  }
});

// Batch Sync Route with Chunked Concurrency to prevent rate limits & socket exhaustion
app.post('/api/outlook/batch-sync', async (req, res) => {
  try {
    const { accounts, folder = 'inbox', top = 25, search } = req.body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Accounts array is required'
      });
    }

    const results: any[] = [];
    const CHUNK_SIZE = 4; // Process 4 accounts in parallel per chunk

    for (let i = 0; i < accounts.length; i += CHUNK_SIZE) {
      const chunk = accounts.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (acc: any) => {
          try {
            const fetchRes = await fetchMailboxUnified(
              {
                email: acc.email,
                password: acc.password,
                clientId: acc.clientId,
                refreshToken: acc.refreshToken,
                clientSecret: acc.clientSecret,
                tenant: acc.tenant,
                cachedAccessToken: acc.cachedAccessToken
              },
              folder,
              Number(top) || 25,
              search
            );

            if (!fetchRes.success) {
              return {
                accountId: acc.id,
                email: acc.email,
                success: false,
                messages: [],
                unreadCount: 0,
                totalCount: 0,
                error: fetchRes.error || 'Sync failed'
              };
            }

            const taggedMessages = (fetchRes.messages || []).map((m: any) => ({
              ...m,
              accountId: acc.id,
              accountEmail: acc.email
            }));

            const unreadCount = taggedMessages.filter((m: any) => !m.isRead).length;

            return {
              accountId: acc.id,
              email: acc.email,
              success: true,
              messages: taggedMessages,
              unreadCount,
              totalCount: taggedMessages.length,
              cachedAccessToken: fetchRes.accessToken,
              newRefreshToken: fetchRes.newRefreshToken
            };
          } catch (accountErr: any) {
            return {
              accountId: acc.id,
              email: acc.email,
              success: false,
              messages: [],
              unreadCount: 0,
              totalCount: 0,
              error: accountErr.message || 'Unexpected sync error'
            };
          }
        })
      );

      results.push(...chunkResults);

      // Brief 50ms pause between chunks if more remain
      if (i + CHUNK_SIZE < accounts.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      results
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Batch sync failed'
    });
  }
});

// Single message details endpoint
app.post('/api/outlook/message/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { accessToken, clientId, refreshToken, clientSecret, tenant } = req.body;

    let token = accessToken;
    if (!token && refreshToken) {
      const tokenRes = await refreshMicrosoftToken(clientId || FALLBACK_CLIENT_IDS[0], refreshToken, clientSecret, tenant);
      if (tokenRes.success) token = tokenRes.accessToken;
    }

    if (token) {
      const msgUrl = `https://graph.microsoft.com/v1.0/me/messages/${id}?$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,replyTo,receivedDateTime,sentDateTime,hasAttachments,isRead,importance,webLink`;
      const msgRes = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (msgRes.ok) {
        const msg = await msgRes.json();
        const otp = extractOtpFromText(msg.subject, msg.body?.content || msg.bodyPreview || '');
        return res.json({
          success: true,
          message: {
            id: msg.id,
            subject: msg.subject || '(No Subject)',
            bodyPreview: msg.bodyPreview || '',
            body: msg.body || { contentType: 'text', content: '' },
            from: msg.from,
            toRecipients: msg.toRecipients || [],
            ccRecipients: msg.ccRecipients || [],
            receivedDateTime: msg.receivedDateTime,
            hasAttachments: Boolean(msg.hasAttachments),
            isRead: Boolean(msg.isRead),
            importance: msg.importance || 'normal',
            webLink: msg.webLink,
            extractedOtp: otp
          }
        });
      }
    }

    res.status(404).json({ success: false, error: 'Message not found' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark Read Endpoint
app.post('/api/outlook/message/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    const { accessToken, isRead = true } = req.body;

    if (!accessToken) {
      return res.json({ success: true, isRead });
    }

    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isRead: Boolean(isRead) })
    }).catch(() => {});

    res.json({ success: true, isRead });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Outlook Multi-Mailbox Reader Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
