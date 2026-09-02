import { ParsedCredential, OutlookAccount } from '../types';

export const DEFAULT_MICROSOFT_CLIENT_ID = 'd3590ed6-52b3-4102-aeff-aad2292ab01c';

// Known Microsoft Client IDs for automatic classification
export const KNOWN_CLIENT_IDS = [
  'd3590ed6-52b3-4102-aeff-aad2292ab01c', // Microsoft Office Universal
  '00000000402b5328', // Windows Live / Outlook Mail
  '00000000480728c5', // Outlook Android
  '000000004c12ae6f', // Outlook iOS
  '27922004-70b3-40fc-b692-a42068e4e221', // Outlook Web
  'e9b1050e-5418-4770-985a-063a5aa87cb2', // Outlook Core
  '29d9ed98-a469-4536-ade2-f981bc1d605e', // Outlook Desktop PC
  '000000004812ae68'  // Microsoft Authenticator
];

export function isGuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export function isHexClientId(str: string): boolean {
  return /^00000000[0-9a-f]{8}$/i.test(str.trim());
}

export function isEmail(str: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim());
}

export function isMsaToken(token: string): boolean {
  const t = token.trim();
  return (
    t.startsWith('M.C') ||
    t.startsWith('M.R') ||
    t.startsWith('MC54') ||
    t.startsWith('M.E') ||
    t.startsWith('EwB') ||
    t.startsWith('r.0.c')
  );
}

export function looksLikeRefreshToken(str: string): boolean {
  const trimmed = str.trim();
  if (isEmail(trimmed)) return false; // Email is NEVER a refresh token
  if (isGuid(trimmed) || isHexClientId(trimmed)) return false; // Client ID is not a refresh token

  if (
    isMsaToken(trimmed) ||
    trimmed.startsWith('0.AX') ||
    trimmed.startsWith('0.AR') ||
    trimmed.startsWith('0.AT') ||
    trimmed.startsWith('0.AS') ||
    trimmed.startsWith('OAQAB') ||
    trimmed.startsWith('AQAB') ||
    trimmed.startsWith('eyJ') // JWT format
  ) {
    return true;
  }
  // Long token string with typical base64url characters (> 30 characters)
  if (trimmed.length >= 25 && /[._\-]/.test(trimmed)) {
    return true;
  }
  return false;
}

export function parseCredentialsText(text: string): ParsedCredential[] {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const results: ParsedCredential[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // Try parsing as JSON first
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const json = JSON.parse(trimmed);
        const email = json.email || json.mail || json.user || json.username || '';
        const password = json.password || json.pass || '';
        const clientId = json.clientId || json.client_id || json.appId || DEFAULT_MICROSOFT_CLIENT_ID;
        const refreshToken = json.refreshToken || json.refresh_token || json.token || '';
        const clientSecret = json.clientSecret || json.client_secret || '';
        const recoveryEmail = json.recoveryEmail || json.recovery || json.backup_email || '';

        const isValid = Boolean(isEmail(email) && (refreshToken || password));
        results.push({
          raw: trimmed,
          email,
          password: password || undefined,
          clientId: clientId || DEFAULT_MICROSOFT_CLIENT_ID,
          refreshToken: looksLikeRefreshToken(refreshToken) ? refreshToken : '',
          clientSecret: clientSecret || undefined,
          recoveryEmail: isEmail(recoveryEmail) ? recoveryEmail : undefined,
          isValid,
          error: isValid ? undefined : 'Missing valid email or token/password'
        });
        continue;
      } catch {
        // Fallback to text splitting
      }
    }

    // Determine separator: support | : ---- ; \t , or double colon ::
    let separator: string | RegExp = ':';
    if (trimmed.includes('----')) {
      separator = '----';
    } else if (trimmed.includes('::')) {
      separator = '::';
    } else if (trimmed.includes('|')) {
      separator = '|';
    } else if (trimmed.includes(';')) {
      separator = ';';
    } else if (trimmed.includes('\t')) {
      separator = '\t';
    } else if (trimmed.includes(',')) {
      separator = ',';
    } else if (trimmed.includes(':')) {
      separator = ':';
    } else {
      separator = /\s+/;
    }

    const parts = trimmed.split(separator).map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length === 0) continue;

    let email = '';
    let password = '';
    let clientId = DEFAULT_MICROSOFT_CLIENT_ID;
    let refreshToken = '';
    let clientSecret = '';
    let recoveryEmail = '';

    // Direct positional parsing if first part is an email
    if (isEmail(parts[0]) || parts[0].includes('@')) {
      email = parts[0];

      if (parts.length === 2) {
        // Format: mail:pass OR mail:refreshToken
        if (looksLikeRefreshToken(parts[1])) {
          refreshToken = parts[1];
        } else {
          password = parts[1];
        }
      } else if (parts.length === 3) {
        // Formats:
        // 1. mail:pass:recovery_email
        // 2. mail:pass:refreshToken
        // 3. mail:clientId:refreshToken
        password = parts[1];

        if (isEmail(parts[2])) {
          recoveryEmail = parts[2];
        } else if (looksLikeRefreshToken(parts[2])) {
          refreshToken = parts[2];
        } else if (isGuid(parts[2]) || isHexClientId(parts[2])) {
          clientId = parts[2];
        } else if (parts[2].length > 30) {
          refreshToken = parts[2];
        }
      } else if (parts.length === 4) {
        // Formats:
        // 1. mail:pass:clientId:refreshToken
        // 2. mail:pass:recovery_email:recovery_pass
        // 3. mail:pass:recovery_email:refreshToken
        // 4. mail:pass:auth_code:refreshToken
        password = parts[1];

        if (isEmail(parts[2])) {
          recoveryEmail = parts[2];
          if (looksLikeRefreshToken(parts[3])) {
            refreshToken = parts[3];
          }
        } else if (isGuid(parts[2]) || isHexClientId(parts[2])) {
          clientId = parts[2];
          if (looksLikeRefreshToken(parts[3]) || parts[3].length > 20) {
            refreshToken = parts[3];
          }
        } else if (looksLikeRefreshToken(parts[3])) {
          refreshToken = parts[3];
        } else if (looksLikeRefreshToken(parts[2])) {
          refreshToken = parts[2];
          if (isGuid(parts[3]) || isHexClientId(parts[3])) {
            clientId = parts[3];
          }
        }
      } else if (parts.length >= 5) {
        // 5+ parts
        // e.g. mail:pass:recovery:recovery_pass:clientId:refreshToken
        password = parts[1];

        // Find recovery email
        for (let i = 2; i < parts.length; i++) {
          if (isEmail(parts[i]) && !recoveryEmail) {
            recoveryEmail = parts[i];
          }
        }

        // Find refreshToken
        for (let i = 2; i < parts.length; i++) {
          if (looksLikeRefreshToken(parts[i])) {
            refreshToken = parts[i];
            break;
          }
        }

        // Find clientId
        for (let i = 2; i < parts.length; i++) {
          if ((isGuid(parts[i]) || isHexClientId(parts[i])) && parts[i] !== refreshToken) {
            clientId = parts[i];
            break;
          }
        }
      }
    } else {
      // Heuristic parsing if email is not the first token
      const emailIndex = parts.findIndex(p => isEmail(p) || p.includes('@'));
      if (emailIndex !== -1) {
        email = parts[emailIndex];
        const remaining = parts.filter((_, idx) => idx !== emailIndex);

        // Find refreshToken
        const tokenIdx = remaining.findIndex(p => looksLikeRefreshToken(p));
        if (tokenIdx !== -1) {
          refreshToken = remaining[tokenIdx];
          remaining.splice(tokenIdx, 1);
        }

        // Find clientId
        const guidIdx = remaining.findIndex(p => isGuid(p) || isHexClientId(p));
        if (guidIdx !== -1) {
          clientId = remaining[guidIdx];
          remaining.splice(guidIdx, 1);
        }

        // First remaining item is password
        if (remaining.length > 0) {
          password = remaining[0];
          remaining.splice(0, 1);
        }

        // Check for recovery email
        const recIdx = remaining.findIndex(p => isEmail(p));
        if (recIdx !== -1) {
          recoveryEmail = remaining[recIdx];
          remaining.splice(recIdx, 1);
        }

        if (remaining.length > 0 && !clientSecret) {
          clientSecret = remaining[0];
        }
      }
    }

    // Default Client ID if missing or invalid
    if (!clientId || (!isGuid(clientId) && !isHexClientId(clientId))) {
      clientId = isMsaToken(refreshToken) ? '00000000402b5328' : DEFAULT_MICROSOFT_CLIENT_ID;
    }

    const hasValidEmail = Boolean(email && email.includes('@'));
    const hasAuthMethod = Boolean(refreshToken && refreshToken.length > 6) || Boolean(password && password.length > 0);
    const isValid = Boolean(hasValidEmail && hasAuthMethod);

    let error: string | undefined;
    if (!hasValidEmail) {
      error = 'Invalid or missing email address';
    } else if (!hasAuthMethod) {
      error = 'Missing refresh_token or password';
    }

    results.push({
      raw: trimmed,
      email,
      password: password || undefined,
      clientId: clientId || (isMsaToken(refreshToken) ? '00000000402b5328' : DEFAULT_MICROSOFT_CLIENT_ID),
      refreshToken: refreshToken || '',
      clientSecret: clientSecret || undefined,
      recoveryEmail: recoveryEmail || undefined,
      isValid,
      error
    });
  }

  return results;
}

export function convertParsedToAccount(parsed: ParsedCredential): OutlookAccount {
  const fallbackClientId = isMsaToken(parsed.refreshToken) ? '00000000402b5328' : DEFAULT_MICROSOFT_CLIENT_ID;
  return {
    id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: parsed.email.trim(),
    password: parsed.password?.trim() || undefined,
    clientId: parsed.clientId?.trim() || fallbackClientId,
    refreshToken: parsed.refreshToken?.trim() || '',
    clientSecret: parsed.clientSecret?.trim() || undefined,
    recoveryEmail: parsed.recoveryEmail?.trim() || undefined,
    label: parsed.email.split('@')[0],
    status: 'idle',
    unreadCount: 0,
    totalCount: 0
  };
}

