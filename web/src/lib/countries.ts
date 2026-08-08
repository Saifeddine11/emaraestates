/**
 * Phone country list, ported verbatim from js/phone-input-country.js.
 *
 * `country` is the string submitted in the `phoneCountry` field and read
 * downstream by the lead handlers — it is a wire value, not a display label.
 * `label` is what users see. Do not swap them.
 */

export type Country = {
  countryCode: string;
  code: string;
  country: string;
  label: string;
  flag: string;
};

/** Final fallback when every detection signal fails. */
export const FALLBACK_COUNTRY = 'FR';

export const COUNTRIES: Country[] = [
  { countryCode: 'MA', code: '+212', country: 'Morocco', label: 'Maroc', flag: '🇲🇦' },
  { countryCode: 'FR', code: '+33', country: 'France', label: 'France', flag: '🇫🇷' },
  { countryCode: 'BE', code: '+32', country: 'Belgium', label: 'Belgique', flag: '🇧🇪' },
  { countryCode: 'CH', code: '+41', country: 'Switzerland', label: 'Suisse', flag: '🇨🇭' },
  { countryCode: 'ES', code: '+34', country: 'Spain', label: 'Espagne', flag: '🇪🇸' },
  { countryCode: 'NL', code: '+31', country: 'Netherlands', label: 'Pays-Bas', flag: '🇳🇱' },
  { countryCode: 'GB', code: '+44', country: 'United Kingdom', label: 'Royaume-Uni', flag: '🇬🇧' },
  { countryCode: 'DE', code: '+49', country: 'Germany', label: 'Allemagne', flag: '🇩🇪' },
  { countryCode: 'IT', code: '+39', country: 'Italy', label: 'Italie', flag: '🇮🇹' },
  { countryCode: 'PT', code: '+351', country: 'Portugal', label: 'Portugal', flag: '🇵🇹' },
  {
    countryCode: 'AE',
    code: '+971',
    country: 'United Arab Emirates',
    label: 'Emirats Arabes Unis',
    flag: '🇦🇪',
  },
  { countryCode: 'SA', code: '+966', country: 'Saudi Arabia', label: 'Arabie Saoudite', flag: '🇸🇦' },
  { countryCode: 'QA', code: '+974', country: 'Qatar', label: 'Qatar', flag: '🇶🇦' },
  { countryCode: 'KW', code: '+965', country: 'Kuwait', label: 'Koweit', flag: '🇰🇼' },
  {
    countryCode: 'US',
    code: '+1',
    country: 'United States / Canada',
    label: 'Etats-Unis / Canada',
    flag: '🇺🇸',
  },
  { countryCode: 'CA', code: '+1', country: 'United States / Canada', label: 'Canada', flag: '🇨🇦' },
  { countryCode: 'DZ', code: '+213', country: 'Algeria', label: 'Algerie', flag: '🇩🇿' },
  { countryCode: 'TN', code: '+216', country: 'Tunisia', label: 'Tunisie', flag: '🇹🇳' },
  { countryCode: 'SN', code: '+221', country: 'Senegal', label: 'Senegal', flag: '🇸🇳' },
  { countryCode: 'CI', code: '+225', country: 'Cote d Ivoire', label: 'Cote d Ivoire', flag: '🇨🇮' },
  { countryCode: 'EG', code: '+20', country: 'Egypt', label: 'Egypte', flag: '🇪🇬' },
  { countryCode: 'TR', code: '+90', country: 'Turkey', label: 'Turquie', flag: '🇹🇷' },
  { countryCode: 'IE', code: '+353', country: 'Ireland', label: 'Irlande', flag: '🇮🇪' },
  { countryCode: 'LU', code: '+352', country: 'Luxembourg', label: 'Luxembourg', flag: '🇱🇺' },
  { countryCode: 'MC', code: '+377', country: 'Monaco', label: 'Monaco', flag: '🇲🇨' },
  { countryCode: 'AT', code: '+43', country: 'Austria', label: 'Autriche', flag: '🇦🇹' },
  { countryCode: 'SE', code: '+46', country: 'Sweden', label: 'Suede', flag: '🇸🇪' },
  { countryCode: 'NO', code: '+47', country: 'Norway', label: 'Norvege', flag: '🇳🇴' },
  { countryCode: 'DK', code: '+45', country: 'Denmark', label: 'Danemark', flag: '🇩🇰' },
  { countryCode: 'FI', code: '+358', country: 'Finland', label: 'Finlande', flag: '🇫🇮' },
  { countryCode: 'PL', code: '+48', country: 'Poland', label: 'Pologne', flag: '🇵🇱' },
  { countryCode: 'GR', code: '+30', country: 'Greece', label: 'Grece', flag: '🇬🇷' },
  { countryCode: 'BR', code: '+55', country: 'Brazil', label: 'Bresil', flag: '🇧🇷' },
  { countryCode: 'MX', code: '+52', country: 'Mexico', label: 'Mexique', flag: '🇲🇽' },
  { countryCode: 'RU', code: '+7', country: 'Russia', label: 'Russie', flag: '🇷🇺' },
  { countryCode: 'CN', code: '+86', country: 'China', label: 'Chine', flag: '🇨🇳' },
  { countryCode: 'JP', code: '+81', country: 'Japan', label: 'Japon', flag: '🇯🇵' },
  { countryCode: 'IN', code: '+91', country: 'India', label: 'Inde', flag: '🇮🇳' },
  { countryCode: 'AU', code: '+61', country: 'Australia', label: 'Australie', flag: '🇦🇺' },
];

const TIMEZONE_COUNTRIES: Record<string, string> = {
  'Africa/Casablanca': 'MA',
  'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT',
  'Europe/Lisbon': 'PT',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
};

function isKnownCountry(code: string) {
  return COUNTRIES.some((country) => country.countryCode === code);
}

/** Lowercase and strip diacritics so search matches "Algerie" and "Algérie". */
export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function findCountry(value: string | undefined): Country {
  const raw = String(value ?? '').toUpperCase();
  return (
    COUNTRIES.find((country) => country.countryCode === raw || country.code === value) ??
    COUNTRIES.find((country) => country.countryCode === FALLBACK_COUNTRY) ??
    COUNTRIES[0]
  );
}

/**
 * Sync locale/timezone guess.
 *
 * When `allowNorthAmerica` is false, language regions US/CA are skipped so an
 * English browser in Morocco/France does not briefly flash +1 before IP/TZ
 * resolve. Timezone can still return US/CA (real North-American visitors).
 */
export function detectCountryCodeFromLocale(options?: { allowNorthAmerica?: boolean }): string {
  const allowNorthAmerica = options?.allowNorthAmerica !== false;

  if (typeof navigator === 'undefined') return FALLBACK_COUNTRY;

  const languages = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const language of languages) {
    const parts = String(language).split('-');
    const region = parts.length > 1 ? parts.pop()!.toUpperCase() : '';
    if (!region || !isKnownCountry(region)) continue;
    if (!allowNorthAmerica && (region === 'US' || region === 'CA')) continue;
    return region;
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_COUNTRIES[timezone]) return TIMEZONE_COUNTRIES[timezone];
  } catch {
    return FALLBACK_COUNTRY;
  }

  return FALLBACK_COUNTRY;
}

/** Sync best-effort guess (locale → timezone → MA). Kept for callers/tests. */
export function detectCountryCode(): string {
  return detectCountryCodeFromLocale({ allowNorthAmerica: true });
}

/**
 * Silent IP country lookup. No GPS, no permission prompt.
 * Returns a known ISO code or null on timeout/failure.
 */
export async function detectCountryCodeFromIp(timeoutMs = 1500): Promise<string | null> {
  if (typeof fetch === 'undefined') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.country.is/', {
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { country?: string };
    const code = String(data?.country ?? '').toUpperCase();
    return isKnownCountry(code) ? code : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Full visitor country resolution:
 * 1. IP geolocation (fast timeout)
 * 2. navigator.language region
 * 3. IANA timezone
 * 4. France (+33)
 */
export async function detectVisitorCountryCode(timeoutMs = 1500): Promise<string> {
  const fromIp = await detectCountryCodeFromIp(timeoutMs);
  if (fromIp) return fromIp;
  return detectCountryCodeFromLocale({ allowNorthAmerica: true });
}

/**
 * Reduce a typed number to its national significant digits: drop an
 * international prefix, a duplicated country code, and any leading zeros.
 */
export function normalizeLocalNumber(value: string, code: string) {
  let number = value.replace(/\D/g, '');
  const codeDigits = code.replace(/\D/g, '');

  if (number.startsWith('00')) number = number.slice(2);
  if (codeDigits && number.startsWith(codeDigits) && number.length > codeDigits.length + 3) {
    number = number.slice(codeDigits.length);
  }
  return number.replace(/^0+/, '');
}
