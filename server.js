const http = require('http');
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const {
  handleRecruitmentApply,
  handleRecruitmentCv,
  isRecruitmentPath,
} = require('./recruitment-apply.cjs');

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 5502);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const CONTACT_WEBHOOK_URL = process.env.CONTACT_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/27111467/ujcbawh/';
const CONTACT_SUCCESS_MESSAGE = 'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.';
const MIN_SUBMIT_MS = 3000;
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach(function(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

const validBudgets = new Set(['1M - 1.5M MAD', '2M - 3M MAD', '+3M MAD']);
const blockedTerms = [
  'refonte', 'refondre', 'seo', 'referencement', 'backlink', 'agence web',
  'creation de site', 'site internet', 'marketing digital', 'audit gratuit',
  'devis gratuit', 'visibilite', 'ranking', 'google ads', 'wordpress',
  'shopify', 'web design', 'webdesign', 'traffic', 'trafic', 'lead generation',
  'guest post', 'link building'
];
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const longCacheExtensions = new Set([
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.ico'
]);

function cacheControlFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (longCacheExtensions.has(extension)) {
    return 'public, max-age=31536000, immutable';
  }
  if (extension === '.html') return 'public, max-age=0, must-revalidate';
  return 'public, max-age=86400';
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function sanitize(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, function(char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
  });
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());
}

function looksLikePhone(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return false;
  if (!/^\+?[0-9][0-9\s().-]{6,}[0-9]$/.test(raw)) return false;
  return !/^(\d)\1+$/.test(digits);
}

function phoneCountryOptions() {
  return {
    MA: { code: '+212', country: 'Morocco' },
    FR: { code: '+33', country: 'France' },
    BE: { code: '+32', country: 'Belgium' },
    CH: { code: '+41', country: 'Switzerland' },
    ES: { code: '+34', country: 'Spain' },
    NL: { code: '+31', country: 'Netherlands' },
    GB: { code: '+44', country: 'United Kingdom' },
    DE: { code: '+49', country: 'Germany' },
    IT: { code: '+39', country: 'Italy' },
    PT: { code: '+351', country: 'Portugal' },
    AE: { code: '+971', country: 'United Arab Emirates' },
    SA: { code: '+966', country: 'Saudi Arabia' },
    QA: { code: '+974', country: 'Qatar' },
    KW: { code: '+965', country: 'Kuwait' },
    US: { code: '+1', country: 'United States / Canada' },
    CA: { code: '+1', country: 'United States / Canada' },
    DZ: { code: '+213', country: 'Algeria' },
    TN: { code: '+216', country: 'Tunisia' },
    SN: { code: '+221', country: 'Senegal' },
    CI: { code: '+225', country: 'Cote d Ivoire' },
    EG: { code: '+20', country: 'Egypt' },
    TR: { code: '+90', country: 'Turkey' },
    IE: { code: '+353', country: 'Ireland' },
    LU: { code: '+352', country: 'Luxembourg' },
    MC: { code: '+377', country: 'Monaco' },
    AT: { code: '+43', country: 'Austria' },
    SE: { code: '+46', country: 'Sweden' },
    NO: { code: '+47', country: 'Norway' },
    DK: { code: '+45', country: 'Denmark' },
    FI: { code: '+358', country: 'Finland' },
    PL: { code: '+48', country: 'Poland' },
    GR: { code: '+30', country: 'Greece' },
    BR: { code: '+55', country: 'Brazil' },
    MX: { code: '+52', country: 'Mexico' },
    RU: { code: '+7', country: 'Russia' },
    CN: { code: '+86', country: 'China' },
    JP: { code: '+81', country: 'Japan' },
    IN: { code: '+91', country: 'India' },
    AU: { code: '+61', country: 'Australia' }
  };
}

function normalizePhoneNumber(value, code) {
  let number = String(value || '').replace(/\D/g, '');
  const codeDigits = String(code || '').replace(/\D/g, '');
  if (number.startsWith('00')) number = number.slice(2);
  if (codeDigits && number.startsWith(codeDigits) && number.length > codeDigits.length + 3) {
    number = number.slice(codeDigits.length);
  }
  number = number.replace(/^0+/, '');
  return number.slice(0, 20);
}

function findPhoneCountry(countries, phoneCode, countryCode) {
  const normalizedCountryCode = String(countryCode || '').toUpperCase();
  if (normalizedCountryCode && countries[normalizedCountryCode]) {
    return [normalizedCountryCode, countries[normalizedCountryCode]];
  }
  const phoneCodeAsIso = String(phoneCode || '').toUpperCase();
  if (phoneCodeAsIso && countries[phoneCodeAsIso]) {
    return [phoneCodeAsIso, countries[phoneCodeAsIso]];
  }
  const match = Object.keys(countries).find(function(iso) {
    return phoneCode && countries[iso].code === phoneCode;
  });
  return match ? [match, countries[match]] : ['MA', countries.MA];
}

function normalizePhonePayload(input) {
  const countries = phoneCountryOptions();
  const phoneCodeInput = sanitize(input.phoneCode, 8);
  const countryCodeInput = sanitize(input.phoneCountryCode, 3);
  const phoneFullInput = sanitize(input.phoneFull, 40);
  const telephoneInput = sanitize(input.telephone, 40);
  let [phoneCountryCode, countryMeta] = findPhoneCountry(countries, phoneCodeInput, countryCodeInput);
  let phoneCode = countryMeta.code;
  let phoneNumber = normalizePhoneNumber(sanitize(input.phoneNumber, 30), phoneCode);

  if (!phoneNumber) {
    const candidate = phoneFullInput || telephoneInput;
    const candidateDigits = candidate.replace(/\D/g, '');
    Object.keys(countries).some(function(code) {
      const codeDigits = countries[code].code.replace(/\D/g, '');
      if (candidate.trim().startsWith(countries[code].code) || (codeDigits && candidateDigits.startsWith(codeDigits))) {
        phoneCountryCode = code;
        countryMeta = countries[code];
        phoneCode = countryMeta.code;
        phoneNumber = normalizePhoneNumber(candidate, phoneCode);
        return true;
      }
      return false;
    });
  }

  const phoneFull = phoneNumber ? `${phoneCode}${phoneNumber}` : '';
  return {
    telephone: phoneFull,
    phoneFull,
    phoneCode,
    phoneCountry: countryMeta.country,
    phoneCountryCode,
    phoneNumber
  };
}

function looksLikeName(value) {
  const raw = String(value || '').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (raw.length < 3 || raw.length > 80) return false;
  if (looksLikeEmail(raw) || looksLikePhone(raw)) return false;
  if (/\d/.test(raw)) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/.test(raw)) return false;
  if (parts.length < 2) return false;
  return parts.every(function(part) { return part.replace(/[-']/g, '').length >= 2; });
}

function isWeakMessage(value) {
  const text = normalize(value).replace(/\s+/g, ' ');
  if (text.length < 20) return true;
  if (/^(test|hello|bonjour|salut|aaaa+|12345+|ok|merci)$/i.test(text)) return true;
  return /^(.)\1{5,}$/.test(text.replace(/\s/g, ''));
}

function hasSpamContent(payload) {
  const text = normalize([
    payload.nom_complet,
    payload.email,
    payload.telephone,
    payload.budget,
    payload.message
  ].join(' '));
  const hasBlockedTerm = blockedTerms.some(function(term) {
    return text.includes(normalize(term));
  });
  const hasLink = /(https?:\/\/|www\.|\.ru\b|\.xyz\b|\.top\b|\.click\b)/i.test(text);
  return hasBlockedTerm || hasLink;
}

function hasLeadContent(payload) {
  return Boolean(
    payload.nom_complet ||
    payload.email ||
    payload.telephone ||
    payload.budget ||
    payload.message
  );
}

function shouldSilentlyAccept(payload) {
  if (payload.company_website) return true;
  if (payload.elapsed_ms > 0 && payload.elapsed_ms < MIN_SUBMIT_MS) return true;
  if (!hasLeadContent(payload)) return true;
  return false;
}

function validatePayload(input) {
  const phonePayload = normalizePhonePayload(input);
  const payload = {
    nom_complet: sanitize(input.nom_complet, 80),
    email: sanitize(input.email, 120),
    telephone: phonePayload.telephone,
    phoneFull: phonePayload.phoneFull,
    phoneCode: phonePayload.phoneCode,
    phoneCountry: phonePayload.phoneCountry,
    phoneCountryCode: phonePayload.phoneCountryCode,
    phoneNumber: phonePayload.phoneNumber,
    budget: sanitize(input.budget, 30),
    message: sanitize(input.message, 1200),
    jour_visite: sanitize(input.jour_visite, 80),
    source: sanitize(input.source, 120),
    company_website: sanitize(input.company_website, 120),
    elapsed_ms: Number(input.elapsed_ms || 0)
  };
  return { payload, errors: {} };
}

function readJsonBody(req) {
  return new Promise(function(resolve, reject) {
    let body = '';
    req.on('data', function(chunk) {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', function() {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim();
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (entry.resetAt <= now) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count += 1;
  rateLimitStore.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function isLocalIp(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

async function forwardLead(payload) {
  if (!CONTACT_WEBHOOK_URL) return;
  const response = await fetch(CONTACT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nom_complet: escapeHtml(payload.nom_complet),
      email: escapeHtml(payload.email),
      telephone: escapeHtml(payload.telephone),
      phoneFull: escapeHtml(payload.phoneFull),
      phoneCode: escapeHtml(payload.phoneCode),
      phoneCountry: escapeHtml(payload.phoneCountry),
      phoneCountryCode: escapeHtml(payload.phoneCountryCode),
      phoneNumber: escapeHtml(payload.phoneNumber),
      budget: escapeHtml(payload.budget),
      message: escapeHtml(payload.message),
      jour_visite: escapeHtml(payload.jour_visite),
      company_website: escapeHtml(payload.company_website),
      elapsed_ms: payload.elapsed_ms,
      source: escapeHtml(payload.source || 'emaraestates.com')
    })
  });
  if (!response.ok) throw new Error(`Zapier webhook failed: ${response.status}`);
}

/* ═══════════════════════════════════════════════════════════════════════
   LANDING ADS « OFFRE GUÉLIZ » — /api/lead-gueliz
   Endpoint sécurisé côté serveur. Aucun token privé n'est exposé au client.
   Réutilise l'intégration existante (webhook Zapier) et ajoute une soumission
   HubSpot configurable. Le mapping des champs est centralisé ci-dessous.
   ═══════════════════════════════════════════════════════════════════════ */

// Correspondance UNIQUE label métier -> nom interne de propriété HubSpot.
// Adaptez ces valeurs aux noms internes réels de votre portail HubSpot.
const GUELIZ_HUBSPOT_FIELD_MAP = {
  fullName: 'full_name',
  phone: 'phone',
  projectType: 'project_type',
  apartmentType: 'apartment_type',
  timeframe: 'acquisition_timeframe',
  leadSource: 'lead_source',
  adPlatform: 'advertising_platform',
  campaign: 'campaign',
  adset: 'ad_set',
  ad: 'advertisement',
  landingPageUrl: 'landing_page_url',
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
  utmContent: 'utm_content',
  utmTerm: 'utm_term',
  referrer: 'referrer',
  submissionDate: 'submission_date'
};

const GUELIZ_LEAD_SOURCE = 'Ads Landing Page';

function buildGuelizLead(input) {
  const clean = function (value, max) { return sanitize(value, max || 200); };
  return {
    fullName: clean(input.fullName, 80),
    phone: clean(input.phone, 30),
    phoneCountry: clean(input.phoneCountry, 40),
    phoneCountryCode: clean(input.phoneCountryCode, 3),
    projectType: clean(input.projectType, 60),
    apartmentType: clean(input.apartmentType, 60),
    timeframe: clean(input.timeframe, 60),
    leadSource: GUELIZ_LEAD_SOURCE,
    adPlatform: clean(input.adPlatform, 40),
    campaign: clean(input.campaign, 200),
    adset: clean(input.adset, 200),
    ad: clean(input.ad, 200),
    landingPageUrl: clean(input.landingPageUrl, 500),
    utmSource: clean(input.utmSource, 200),
    utmMedium: clean(input.utmMedium, 200),
    utmCampaign: clean(input.utmCampaign, 200),
    utmContent: clean(input.utmContent, 200),
    utmTerm: clean(input.utmTerm, 200),
    referrer: clean(input.referrer, 500),
    submissionDate: clean(input.submissionDate, 40) || new Date().toISOString()
  };
}

function guelizHubspotFields(lead) {
  return Object.keys(GUELIZ_HUBSPOT_FIELD_MAP)
    .map(function (key) {
      return { name: GUELIZ_HUBSPOT_FIELD_MAP[key], value: String(lead[key] || '') };
    })
    .filter(function (field) { return field.value !== ''; });
}

async function submitGuelizToHubspotForm(lead) {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_FORM_GUID;
  if (!portalId || !formGuid) return false;

  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: guelizHubspotFields(lead),
      context: {
        pageUri: lead.landingPageUrl || 'https://emaraestates.com/offre-gueliz',
        pageName: 'Offre Guéliz'
      }
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(function () { return ''; });
    throw new Error(`HubSpot Forms API ${response.status}: ${detail.slice(0, 200)}`);
  }
  return true;
}

async function submitGuelizToHubspotCrm(lead) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return false;

  const nameParts = String(lead.fullName || '').trim().split(/\s+/);
  const firstname = nameParts.shift() || '';
  const lastname = nameParts.join(' ');

  const properties = {
    firstname: firstname,
    lastname: lastname,
    phone: lead.phone
  };
  Object.keys(GUELIZ_HUBSPOT_FIELD_MAP).forEach(function (key) {
    if (key === 'fullName' || key === 'phone') return;
    if (lead[key]) properties[GUELIZ_HUBSPOT_FIELD_MAP[key]] = lead[key];
  });

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ properties: properties })
  });
  if (!response.ok) {
    const detail = await response.text().catch(function () { return ''; });
    throw new Error(`HubSpot CRM API ${response.status}: ${detail.slice(0, 200)}`);
  }
  return true;
}

async function forwardGuelizWebhook(lead) {
  const url = process.env.GUELIZ_WEBHOOK_URL || CONTACT_WEBHOOK_URL;
  if (!url) return false;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ form_type: 'gueliz_landing' }, lead))
  });
  if (!response.ok) throw new Error(`Gueliz webhook failed: ${response.status}`);
  return true;
}

function guelizPhoneValid(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15;
}

async function handleGuelizLead(req, res) {
  const ip = clientIp(req);
  let input;
  try {
    input = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { success: false, message: 'Données invalides.' });
    return;
  }

  // Piège anti-spam : on accepte silencieusement sans traiter.
  if (sanitize(input.company_website, 120)) {
    sendJson(res, 200, { success: true, message: 'Votre demande a bien été envoyée.' });
    return;
  }

  const lead = buildGuelizLead(input);

  if (String(lead.fullName || '').trim().length < 2 || !guelizPhoneValid(lead.phone)) {
    sendJson(res, 422, {
      success: false,
      message: 'Merci d’indiquer votre nom et un numéro de téléphone valide.'
    });
    return;
  }

  if (isRateLimited(ip)) {
    sendJson(res, 429, { success: false, message: 'Trop de demandes. Réessayez plus tard.' });
    return;
  }

  const sinks = [
    { name: 'hubspot-form', run: submitGuelizToHubspotForm },
    { name: 'hubspot-crm', run: submitGuelizToHubspotCrm },
    { name: 'webhook', run: forwardGuelizWebhook }
  ];

  let attempted = 0;
  let succeeded = 0;
  for (const sink of sinks) {
    try {
      const handled = await sink.run(lead);
      if (handled) { attempted += 1; succeeded += 1; }
    } catch (error) {
      attempted += 1;
      // Journalisation sûre : on ne perd jamais l'information de l'échec.
      console.error(`[gueliz-lead] ${sink.name} failed:`, error.message);
    }
  }

  // Aucun connecteur configuré (dev/local) : on journalise le lead sans le perdre.
  if (attempted === 0) {
    console.warn('[gueliz-lead] Aucun connecteur configuré. Lead journalisé :', JSON.stringify(lead));
    sendJson(res, 200, { success: true, message: 'Votre demande a bien été envoyée.' });
    return;
  }

  if (succeeded > 0) {
    sendJson(res, 200, { success: true, message: 'Votre demande a bien été envoyée.' });
    return;
  }

  // Tous les connecteurs configurés ont échoué : on ne masque pas l'erreur.
  console.error('[gueliz-lead] Tous les connecteurs ont échoué. Lead :', JSON.stringify(lead));
  sendJson(res, 502, {
    success: false,
    message: 'Votre demande n’a pas pu être transmise. Contactez-nous directement sur WhatsApp.'
  });
}

const NEWSLETTER_SUCCESS = 'Merci. Votre inscription à la newsletter Emara Estates a bien été prise en compte.';
const NEWSLETTER_INVALID = 'Veuillez entrer une adresse email valide.';
const NEWSLETTER_ERROR = 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement.';

function newsletterEmailBody(email, pageUrl) {
  const dateStr = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' });
  return [
    'Nouvelle inscription à la newsletter Emara Estates.',
    '',
    'Email abonné :',
    email,
    '',
    'Page :',
    pageUrl,
    '',
    'Date :',
    dateStr
  ].join('\r\n');
}

function smtpReadResponse(socket) {
  return new Promise(function(resolve, reject) {
    let data = '';
    function onData(chunk) {
      data += chunk;
      const lines = data.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';
      if (lastLine.length >= 4 && lastLine[3] === ' ') {
        socket.removeListener('data', onData);
        socket.removeListener('error', reject);
        resolve(data);
      }
    }
    socket.on('data', onData);
    socket.on('error', reject);
  });
}

async function smtpCommand(socket, command, expectedCodes) {
  if (command) socket.write(command + '\r\n');
  const response = await smtpReadResponse(socket);
  const code = Number(response.slice(0, 3));
  if (!expectedCodes.includes(code)) {
    throw new Error('SMTP command failed: ' + code);
  }
  return response;
}

async function sendNewsletterEmail(email, pageUrl) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const to = process.env.CONTACT_TO || 'contact@emaraestates.com';
  const from = process.env.CONTACT_FROM || user;

  if (!host || !port || !user || !pass || !from) {
    throw new Error('SMTP configuration missing.');
  }

  const subject = 'Nouvelle inscription newsletter — Emara Estates';
  const body = newsletterEmailBody(email, pageUrl);
  const message = [
    'From: Emara Estates <' + from + '>',
    'To: ' + to,
    'Reply-To: ' + email,
    'Subject: ' + subject,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'Date: ' + new Date().toUTCString(),
    '',
    body,
    ''
  ].join('\r\n').replace(/\r\n\./g, '\r\n..');

  const socket = tls.connect({ host, port, servername: host });
  await new Promise(function(resolve, reject) {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });

  try {
    await smtpCommand(socket, null, [220]);
    await smtpCommand(socket, 'EHLO emaraestates.com', [250]);
    await smtpCommand(socket, 'AUTH LOGIN', [334]);
    await smtpCommand(socket, Buffer.from(user).toString('base64'), [334]);
    await smtpCommand(socket, Buffer.from(pass).toString('base64'), [235]);
    await smtpCommand(socket, 'MAIL FROM:<' + from + '>', [250]);
    await smtpCommand(socket, 'RCPT TO:<' + to + '>', [250, 251]);
    await smtpCommand(socket, 'DATA', [354]);
    socket.write(message + '\r\n.\r\n');
    await smtpCommand(socket, null, [250]);
    await smtpCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
}

async function handleNewsletter(req, res) {
  const ip = clientIp(req);
  let input;
  try {
    input = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { success: false, message: NEWSLETTER_ERROR });
    return;
  }

  const honeypot = sanitize(input.website, 120);
  if (honeypot) {
    sendJson(res, 200, { success: true, message: NEWSLETTER_SUCCESS });
    return;
  }

  const email = sanitize(input.email, 254);
  const pageUrl = sanitize(input.page_url || req.headers.referer || '', 500) || 'emaraestates.com';

  if (!looksLikeEmail(email)) {
    sendJson(res, 422, { success: false, message: NEWSLETTER_INVALID });
    return;
  }

  if (isRateLimited(ip)) {
    sendJson(res, 429, { success: false, message: NEWSLETTER_ERROR });
    return;
  }

  try {
    await sendNewsletterEmail(email, pageUrl);
    sendJson(res, 200, { success: true, message: NEWSLETTER_SUCCESS });
  } catch (error) {
    console.error('Newsletter send failed:', error.message);
    sendJson(res, 500, { success: false, message: NEWSLETTER_ERROR });
  }
}

function parseSimulatorBudget(value) {
  const normalized = String(value || '').replace(/[^\d.,]/g, '').replace(',', '.');
  const budget = Number(normalized);
  return Number.isFinite(budget) && budget > 0 ? budget : 0;
}

function formatFrenchNumber(value) {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function calculateSimulatorApport(budget, currency) {
  if (currency === 'EUR') {
    const apportEur = Math.round(budget * 0.3);
    const apportMad = Math.round(apportEur * 10);
    return { apportMad, apportEur };
  }
  const apportMad = Math.round(budget * 0.3);
  const apportEur = Math.round(apportMad / 10);
  return { apportMad, apportEur };
}

function apportSimulatorEmailBody(payload) {
  const dateStr = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' });
  return [
    'Nouvelle simulation d’apport depuis le site Emara Estates.',
    '',
    'Email client :',
    payload.email,
    '',
    'Budget saisi :',
    payload.budget_display,
    '',
    'Typologie :',
    payload.typologie || 'Non renseigné',
    '',
    'Apport estimé :',
    payload.apport_mad_display + ' / ' + payload.apport_eur_display,
    '',
    'Page source :',
    payload.source_page,
    '',
    'Date :',
    dateStr
  ].join('\r\n');
}

async function sendApportSimulatorEmail(payload) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const to = process.env.CONTACT_TO || 'contact@emaraestates.com';
  const from = process.env.CONTACT_FROM || user;

  if (!host || !port || !user || !pass || !from) {
    throw new Error('SMTP configuration missing.');
  }

  const subject = 'Nouveau lead simulateur d’apport — Emara Estates';
  const body = apportSimulatorEmailBody(payload);
  const message = [
    'From: Emara Estates <' + from + '>',
    'To: ' + to,
    'Reply-To: ' + payload.email,
    'Subject: ' + subject,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'Date: ' + new Date().toUTCString(),
    '',
    body,
    ''
  ].join('\r\n').replace(/\r\n\./g, '\r\n..');

  const socket = tls.connect({ host, port, servername: host });
  await new Promise(function(resolve, reject) {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });

  try {
    await smtpCommand(socket, null, [220]);
    await smtpCommand(socket, 'EHLO emaraestates.com', [250]);
    await smtpCommand(socket, 'AUTH LOGIN', [334]);
    await smtpCommand(socket, Buffer.from(user).toString('base64'), [334]);
    await smtpCommand(socket, Buffer.from(pass).toString('base64'), [235]);
    await smtpCommand(socket, 'MAIL FROM:<' + from + '>', [250]);
    await smtpCommand(socket, 'RCPT TO:<' + to + '>', [250, 251]);
    await smtpCommand(socket, 'DATA', [354]);
    socket.write(message + '\r\n.\r\n');
    await smtpCommand(socket, null, [250]);
    await smtpCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
}

async function handleApportSimulator(req, res, input, ip) {
  const honeypot = sanitize(input.company_website, 120);
  if (honeypot) {
    sendJson(res, 200, {
      message: 'Estimation calculée.',
      result: {
        budget_display: '0 MAD',
        apport_mad_display: '0 MAD',
        apport_eur_display: '0 €'
      }
    });
    return;
  }

  if (isRateLimited(ip)) {
    sendJson(res, 429, { message: 'Trop de demandes envoyées. Réessayez plus tard.' });
    return;
  }

  const email = sanitize(input.email, 120);
  let currency = sanitize(input.currency, 3).toUpperCase();
  if (currency !== 'EUR') currency = 'MAD';
  const budget = parseSimulatorBudget(input.budget_value);
  const typologie = sanitize(input.typologie, 60);
  const errors = {};

  if (!budget) {
    errors.budget = 'Indiquez votre budget pour calculer l’apport.';
  }
  if (!email) {
    errors.email = 'Indiquez votre email pour recevoir votre estimation.';
  } else if (!looksLikeEmail(email)) {
    errors.email = 'Indiquez une adresse email valide.';
  }

  if (Object.keys(errors).length) {
    sendJson(res, 422, { message: 'Corrigez les champs indiqués.', errors });
    return;
  }

  const { apportMad, apportEur } = calculateSimulatorApport(budget, currency);
  const budgetDisplay = formatFrenchNumber(budget) + ' ' + currency;
  const payload = {
    email,
    budget_display: budgetDisplay,
    typologie,
    apport_mad_display: formatFrenchNumber(apportMad) + ' MAD',
    apport_eur_display: formatFrenchNumber(apportEur) + ' €',
    source_page: sanitize(input.source_page || req.headers.referer || '', 500) || 'emaraestates.com'
  };

  try {
    await sendApportSimulatorEmail(payload);
  } catch (error) {
    console.error('Apport simulator send failed:', error.message);
    sendJson(res, 500, { message: 'Une erreur est survenue. Vous pouvez nous contacter directement.' });
    return;
  }

  sendJson(res, 200, {
    message: 'Estimation calculée.',
    result: {
      budget_display: budgetDisplay,
      apport_mad: apportMad,
      apport_eur: apportEur,
      apport_mad_display: payload.apport_mad_display,
      apport_eur_display: payload.apport_eur_display,
      typologie
    }
  });
}

async function handleContact(req, res) {
  const ip = clientIp(req);
  let input;
  try {
    input = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { message: 'Données invalides.' });
    return;
  }

  if (sanitize(input.form_type, 40) === 'apport_simulator') {
    await handleApportSimulator(req, res, input, ip);
    return;
  }

  const result = validatePayload(input);

  if (shouldSilentlyAccept(result.payload)) {
    sendJson(res, 200, { message: CONTACT_SUCCESS_MESSAGE });
    return;
  }

  if (Object.keys(result.errors).length) {
    sendJson(res, 422, { message: 'Corrigez les champs indiqués.', errors: result.errors });
    return;
  }

  try {
    if (isRateLimited(ip)) {
      sendJson(res, 429, { message: 'Trop de demandes envoyées. Réessayez plus tard.' });
      return;
    }
    try {
      await forwardLead(result.payload);
    } catch (error) {
      console.error('Contact form Zapier error:', error.message);
      throw error;
    }
    sendJson(res, 200, { message: CONTACT_SUCCESS_MESSAGE });
  } catch (error) {
    sendJson(res, 500, { message: 'Erreur serveur. Contactez-nous directement par WhatsApp.' });
  }
}

const CANONICAL_REDIRECTS = {
  '/residences-honest-678': '/residences-honest-678/',
  '/residences-honest-678.html': '/residences-honest-678/',
  '/contact/': '/contact',
  '/contact.html': '/contact',
  '/formulaire/': '/formulaire',
  '/formulaire.html': '/formulaire',
  '/index.html': '/',
  '/immobilier-luxe-marrakech.html': '/immobilier-luxe-marrakech',
  '/appartement-neuf-gueliz-marrakech.html': '/appartement-neuf-gueliz-marrakech',
  '/investissement-immobilier-marrakech.html': '/investissement-immobilier-marrakech',
  '/recrutement-commercial-marrakech.html': '/recrutement-commercial-marrakech',
  '/recrutement-commercial-marrakech/': '/recrutement-commercial-marrakech'
};

const CANONICAL_PAGES = {
  '/': 'index.html',
  '/contact': 'contact.html',
  '/formulaire': 'formulaire.html',
  '/residences-honest-678/': path.join('residences-honest-678', 'index.html'),
  '/immobilier-luxe-marrakech': 'immobilier-luxe-marrakech.html',
  '/appartement-neuf-gueliz-marrakech': 'appartement-neuf-gueliz-marrakech.html',
  '/investissement-immobilier-marrakech': 'investissement-immobilier-marrakech.html',
  '/offre-gueliz': 'offre-gueliz.html',
  '/recrutement-commercial-marrakech': 'recrutement-commercial-marrakech.html'
};

function redirectTo(res, location) {
  res.writeHead(301, { Location: location });
  res.end();
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (CANONICAL_REDIRECTS[urlPath]) {
    redirectTo(res, CANONICAL_REDIRECTS[urlPath]);
    return;
  }
  if (urlPath.endsWith('.html') && urlPath !== '/404.html') {
    const basePath = urlPath.slice(0, -5) || '/';
    const target = basePath === '/residences-honest-678' ? '/residences-honest-678/' : basePath;
    redirectTo(res, target);
    return;
  }
  let filePath;
  if (CANONICAL_PAGES[urlPath]) {
    filePath = path.join(ROOT, CANONICAL_PAGES[urlPath]);
  } else {
    const requestedPath = path.resolve(ROOT, urlPath.slice(1));
    const htmlFallbackPath = path.extname(requestedPath) ? requestedPath : `${requestedPath}.html`;
    filePath = requestedPath;
    if (!path.extname(requestedPath) && fs.existsSync(htmlFallbackPath)) {
      filePath = htmlFallbackPath;
    } else if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isDirectory()) {
      filePath = path.join(requestedPath, 'index.html');
    } else if (!fs.existsSync(requestedPath)) {
      filePath = htmlFallbackPath;
    }
  }
  if (!filePath.startsWith(ROOT) || filePath.includes(`${path.sep}node_modules${path.sep}`)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, function(error, data) {
    if (error) {
      fs.readFile(path.join(ROOT, '404.html'), function(notFoundError, notFoundData) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(notFoundError ? 'Not found' : notFoundData);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': cacheControlFor(filePath)
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(data);
  });
}

const server = http.createServer(function(req, res) {
  if (req.method === 'POST' && (req.url === '/api/contact' || req.url === '/contact.php')) {
    handleContact(req, res);
    return;
  }
  if (req.method === 'POST' && (req.url === '/newsletter.php' || req.url === '/api/newsletter')) {
    handleNewsletter(req, res);
    return;
  }
  if (req.method === 'POST' && (req.url === '/api/lead-gueliz' || req.url === '/lead-gueliz.php')) {
    handleGuelizLead(req, res);
    return;
  }
  if (req.method === 'POST' && isRecruitmentPath(req.url)) {
    handleRecruitmentApply(req, res);
    return;
  }
  if (req.method === 'GET' && handleRecruitmentCv(req, res, req.url || '')) {
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405, { 'Allow': 'GET, HEAD, POST' });
  res.end('Method Not Allowed');
});

server.listen(PORT, HOST, function() {
  console.log(`Emara Estates server running on http://127.0.0.1:${PORT}`);
});
