// Enhanced High-Precision OTP / Security Code Extractor
export interface ExtractedOtp {
  code: string;
  type: string;
  service?: string;
}

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

export function stripHtml(html: string): string {
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

export function detectServiceName(text: string): string | undefined {
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

export function isValidOtpCode(code: string): boolean {
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

export function extractOtpFromText(subject: string = '', body: string = ''): ExtractedOtp | undefined {
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
