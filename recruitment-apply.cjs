/**
 * Shared recruitment apply handler (Node) for local preview / server.js.
 * Mirrors production recruitment.php: PHP-mail-equivalent plain text email,
 * private CV storage + download link. No SMTP.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_CV_BYTES = 5 * 1024 * 1024;
const MIN_SUBMIT_MS = 2500;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const RECRUITMENT_TO_DEFAULT = 'contact@emaraestates.com';
const RECRUITMENT_FROM_DEFAULT = 'contact@emaraestates.com';
const rateLimitStore = new Map();

const ENUMS = {
  sales_experience: ['Non', "Moins d'un an", '1 à 3 ans', 'Plus de 3 ans'],
  real_estate_experience: ['Oui', 'Non'],
  sales_closed_12m: ['Aucune', '1 à 5', '6 à 15', 'Plus de 15'],
  closing_level: ['Débutant', 'Intermédiaire', 'Confirmé', 'Excellent'],
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile(path.join(ROOT, '.env'));

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function sanitize(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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

function looksLikeNamePart(value) {
  const raw = String(value || '').trim();
  if (raw.length < 2 || raw.length > 60) return false;
  if (looksLikeEmail(raw) || looksLikePhone(raw) || /\d/.test(raw)) return false;
  return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/.test(raw);
}

function asciiSlug(value) {
  const transliterated = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return transliterated || 'Candidat';
}

function buildCvFilename(firstName, lastName) {
  return 'CV-' + asciiSlug(firstName) + '-' + asciiSlug(lastName) + '.pdf';
}

function clientIp(req) {
  return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim();
}

function isRateLimited(ip) {
  const now = Date.now();
  const key = 'recruitment:' + ip;
  const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (entry.resetAt <= now) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count += 1;
  rateLimitStore.set(key, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function readRawBody(req, maxBytes) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function parseMultipartFormData(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(String(contentType || ''));
  if (!match) throw new Error('Missing boundary');
  const boundary = match[1] || match[2];
  const delim = Buffer.from('--' + boundary);
  const fields = {};
  let file = null;
  let offset = 0;

  while (offset < buffer.length) {
    const start = buffer.indexOf(delim, offset);
    if (start === -1) break;
    let partStart = start + delim.length;
    if (buffer[partStart] === 45 && buffer[partStart + 1] === 45) break;
    if (buffer[partStart] === 13 && buffer[partStart + 1] === 10) partStart += 2;
    else if (buffer[partStart] === 10) partStart += 1;

    const next = buffer.indexOf(delim, partStart);
    if (next === -1) break;
    let partEnd = next;
    if (partEnd >= 2 && buffer[partEnd - 2] === 13 && buffer[partEnd - 1] === 10) partEnd -= 2;
    else if (partEnd >= 1 && buffer[partEnd - 1] === 10) partEnd -= 1;

    const part = buffer.slice(partStart, partEnd);
    const headerSep = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerSep === -1) {
      offset = next;
      continue;
    }
    const headersText = part.slice(0, headerSep).toString('utf8');
    const body = part.slice(headerSep + 4);
    const nameMatch = /name="([^"]+)"/i.exec(headersText);
    if (!nameMatch) {
      offset = next;
      continue;
    }
    const name = nameMatch[1];
    const filenameMatch = /filename="([^"]*)"/i.exec(headersText);
    if (filenameMatch) {
      const contentTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headersText);
      file = {
        field: name,
        filename: filenameMatch[1] || '',
        mime: (contentTypeMatch && contentTypeMatch[1].trim()) || 'application/octet-stream',
        bytes: body,
      };
    } else {
      fields[name] = body.toString('utf8');
    }
    offset = next;
  }

  return { fields, file };
}

function recruitmentToEmail() {
  return String(process.env.RECRUITMENT_EMAIL_TO || '').trim() || RECRUITMENT_TO_DEFAULT;
}

function recruitmentFromEmail() {
  return String(process.env.CONTACT_FROM || process.env.CONTACT_TO || '').trim() || RECRUITMENT_FROM_DEFAULT;
}

function fieldOrDash(value) {
  return String(value || '').trim() || '—';
}

function recruitmentTeamEmailBody(payload) {
  return [
    'NOUVELLE CANDIDATURE EMARA ESTATES',
    '',
    'Nom :',
    payload.last_name,
    '',
    'Prénom :',
    payload.first_name,
    '',
    'Téléphone :',
    payload.telephone,
    '',
    'Email :',
    payload.email,
    '',
    'EXPÉRIENCE',
    '',
    'Expérience commerciale :',
    payload.sales_experience,
    '',
    'Expérience immobilière :',
    payload.real_estate_experience,
    '',
    'Ventes conclues sur les 12 derniers mois :',
    payload.sales_closed_12m,
    '',
    'NIVEAU COMMERCIAL',
    '',
    'Niveau de closing :',
    payload.closing_level,
    '',
    'CV (PDF)',
    '',
    'Fichier :',
    payload.cv_filename,
    '',
    'Télécharger le CV :',
    payload.cv_download_url,
    '',
    'SOURCE',
    '',
    'URL de la page :',
    fieldOrDash(payload.page_url),
    '',
    'Source :',
    payload.source,
    '',
    'utm_source :',
    fieldOrDash(payload.utm_source),
    '',
    'utm_medium :',
    fieldOrDash(payload.utm_medium),
    '',
    'utm_campaign :',
    fieldOrDash(payload.utm_campaign),
    '',
    'utm_content :',
    fieldOrDash(payload.utm_content),
    '',
    'utm_term :',
    fieldOrDash(payload.utm_term),
    '',
    'Referrer :',
    fieldOrDash(payload.referrer),
    '',
    'Date de candidature :',
    payload.submitted_at,
  ].join('\r\n');
}

function candidateConfirmationBody(payload) {
  return [
    'Bonjour ' + payload.first_name + ',',
    '',
    'Nous avons bien reçu votre candidature pour rejoindre l’équipe commerciale Emara Estates à Marrakech.',
    '',
    'Notre équipe va étudier votre profil. Si votre candidature correspond aux profils recherchés, nous vous contacterons prochainement.',
    '',
    'À bientôt,',
    '',
    'L’équipe Emara Estates',
  ].join('\r\n');
}

function cvStorageDir() {
  return path.join(ROOT, 'recruitment-private', 'cvs');
}

function storeCvPrivately(payload, baseUrl) {
  const dir = cvStorageDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const token = crypto.randomBytes(24).toString('hex');
  const pdfPath = path.join(dir, token + '.pdf');
  const metaPath = path.join(dir, token + '.json');
  fs.writeFileSync(pdfPath, payload.cv_bytes, { mode: 0o600 });
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        token,
        filename: payload.cv_filename,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        created_at: new Date().toISOString(),
        bytes: payload.cv_bytes.length,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  return {
    token,
    url: baseUrl.replace(/\/$/, '') + '/recruitment-cv.php?t=' + encodeURIComponent(token),
    path: pdfPath,
  };
}

/**
 * Local stand-in for PHP mail(): try sendmail, else write outbox files.
 * Never uses SMTP.
 */
function sendMailLikePhp(to, subject, body, extraHeaders) {
  const from = recruitmentFromEmail();
  const headers = [
    'From: Emara Estates <' + from + '>',
    'To: ' + to,
    'Subject: ' + subject,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ].concat(extraHeaders || []);
  const raw = headers.join('\r\n') + '\r\n\r\n' + body + '\r\n';

  const sendmail = spawnSync('sendmail', ['-t', '-i'], {
    input: raw,
    encoding: 'utf8',
    timeout: 8000,
  });
  if (!sendmail.error && sendmail.status === 0) {
    return { ok: true, method: 'sendmail' };
  }

  const outbox = path.join(ROOT, 'recruitment-private', 'outbox');
  fs.mkdirSync(outbox, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(outbox, stamp + '-' + to.replace(/[^A-Za-z0-9@._+-]/g, '_') + '.eml');
  fs.writeFileSync(file, raw, { mode: 0o600 });
  console.info('[recruitment] mail outbox (no SMTP):', file);
  return { ok: true, method: 'outbox', file };
}

function validateCv(file, firstName, lastName) {
  if (!file || file.field !== 'cv') {
    return { ok: false, error: 'Veuillez joindre votre CV (PDF).' };
  }
  const bytes = file.bytes || Buffer.alloc(0);
  if (!bytes.length) return { ok: false, error: 'Veuillez joindre votre CV (PDF).' };
  if (bytes.length > MAX_CV_BYTES) return { ok: false, error: 'Le CV ne doit pas dépasser 5 MB.' };
  const extension = String(file.filename || '').split('.').pop().toLowerCase();
  if (extension !== 'pdf') return { ok: false, error: 'Le CV doit être un fichier PDF.' };
  if (bytes.slice(0, 4).toString('utf8') !== '%PDF') {
    return { ok: false, error: 'Le fichier CV n’est pas un PDF valide.' };
  }
  const mime = String(file.mime || '').toLowerCase();
  const allowed = new Set([
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',
    'application/octet-stream',
  ]);
  if (mime && !allowed.has(mime)) return { ok: false, error: 'Le CV doit être un fichier PDF.' };
  return {
    ok: true,
    cv_bytes: bytes,
    cv_filename: buildCvFilename(firstName, lastName),
  };
}

function validatePayload(fields, file) {
  const errors = {};
  const payload = {
    sales_experience: sanitize(fields.sales_experience, 80),
    real_estate_experience: sanitize(fields.real_estate_experience, 40),
    sales_closed_12m: sanitize(fields.sales_closed_12m, 40),
    closing_level: sanitize(fields.closing_level, 40),
    first_name: sanitize(fields.first_name, 60),
    last_name: sanitize(fields.last_name, 60),
    email: sanitize(fields.email, 120),
    telephone: sanitize(fields.telephone || fields.phone, 40),
    utm_source: sanitize(fields.utm_source, 120),
    utm_medium: sanitize(fields.utm_medium, 120),
    utm_campaign: sanitize(fields.utm_campaign, 120),
    utm_content: sanitize(fields.utm_content, 120),
    utm_term: sanitize(fields.utm_term, 120),
    page_url: sanitize(fields.page_url, 500),
    referrer: sanitize(fields.referrer, 500),
    source: 'recruitment_website',
    elapsed_ms: Number(fields.elapsed_ms || 0) || 0,
    submitted_at: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' }),
    company_website: sanitize(fields.company_website, 120),
  };

  Object.keys(ENUMS).forEach(function (key) {
    if (!ENUMS[key].includes(payload[key])) {
      errors[key] = 'Veuillez sélectionner une option.';
    }
  });
  if (!looksLikeNamePart(payload.first_name)) errors.first_name = 'Prénom invalide.';
  if (!looksLikeNamePart(payload.last_name)) errors.last_name = 'Nom invalide.';
  if (!looksLikeEmail(payload.email)) errors.email = 'Email invalide.';
  if (!looksLikePhone(payload.telephone)) errors.telephone = 'Téléphone invalide.';

  const cv = validateCv(file, payload.first_name, payload.last_name);
  if (!cv.ok) errors.cv = cv.error;
  else {
    payload.cv_bytes = cv.cv_bytes;
    payload.cv_filename = cv.cv_filename;
  }

  return { payload, errors };
}

function requestBaseUrl(req) {
  const host = String(req.headers.host || 'localhost:5601');
  const proto = String(req.headers['x-forwarded-proto'] || 'http');
  return proto + '://' + host;
}

async function handleRecruitmentApply(req, res) {
  const ip = clientIp(req);
  const contentType = String(req.headers['content-type'] || '');
  if (!/multipart\/form-data/i.test(contentType)) {
    sendJson(res, 400, { success: false, error: 'Format de requête invalide.' });
    return;
  }

  let parsed;
  try {
    const raw = await readRawBody(req, MAX_BODY_BYTES);
    parsed = parseMultipartFormData(raw, contentType);
  } catch (error) {
    console.error('Recruitment parse error:', error.message);
    sendJson(res, 400, { success: false, error: 'Données invalides.' });
    return;
  }

  if (sanitize(parsed.fields.company_website, 120)) {
    sendJson(res, 200, { success: true });
    return;
  }

  const result = validatePayload(parsed.fields, parsed.file);
  if (result.payload.elapsed_ms > 0 && result.payload.elapsed_ms < MIN_SUBMIT_MS) {
    sendJson(res, 200, { success: true });
    return;
  }
  if (Object.keys(result.errors).length) {
    const firstError = Object.values(result.errors)[0];
    sendJson(res, 422, {
      success: false,
      error: firstError || 'Corrigez les champs indiqués.',
      errors: result.errors,
    });
    return;
  }
  if (isRateLimited(ip)) {
    sendJson(res, 429, {
      success: false,
      error: 'Trop de candidatures envoyées. Réessayez plus tard.',
    });
    return;
  }

  try {
    const teamTo = recruitmentToEmail();
    if (!looksLikeEmail(teamTo)) {
      throw new Error('RECRUITMENT_EMAIL_TO is invalid.');
    }

    const stored = storeCvPrivately(result.payload, requestBaseUrl(req));
    result.payload.cv_token = stored.token;
    result.payload.cv_download_url = stored.url;

    const fullName = (result.payload.first_name + ' ' + result.payload.last_name).trim();
    const teamSubject = 'Nouvelle candidature — ' + fullName + ' — Commercial Marrakech';
    sendMailLikePhp(teamTo, teamSubject, recruitmentTeamEmailBody(result.payload), [
      'Reply-To: ' + fullName + ' <' + result.payload.email + '>',
    ]);
    sendMailLikePhp(
      result.payload.email,
      'Votre candidature chez Emara Estates a bien été reçue',
      candidateConfirmationBody(result.payload),
    );

    sendJson(res, 200, { success: true, first_name: result.payload.first_name });
  } catch (error) {
    console.error('Recruitment apply error:', error.message);
    sendJson(res, 500, {
      success: false,
      error: error.message || 'Votre candidature n’a pas pu être envoyée. Réessayez dans un moment.',
    });
  }
}

function isRecruitmentPath(urlPath) {
  const clean = String(urlPath || '').split('?')[0];
  return clean === '/api/recruitment/apply' || clean === '/recruitment.php';
}

function handleRecruitmentCv(req, res, urlPath) {
  const clean = String(urlPath || '').split('?')[0];
  if (clean !== '/recruitment-cv.php' && clean !== '/api/recruitment/cv') {
    return false;
  }
  const query = String(urlPath || '').split('?')[1] || '';
  const params = new URLSearchParams(query);
  const token = String(params.get('t') || '').replace(/[^a-f0-9]/gi, '');
  if (token.length < 32) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('CV introuvable.');
    return true;
  }
  const pdfPath = path.join(cvStorageDir(), token + '.pdf');
  const metaPath = path.join(cvStorageDir(), token + '.json');
  if (!fs.existsSync(pdfPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('CV introuvable.');
    return true;
  }
  let filename = 'CV.pdf';
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta && typeof meta.filename === 'string' && meta.filename.toLowerCase().endsWith('.pdf')) {
        filename = meta.filename.replace(/[^A-Za-z0-9._-]+/g, '-');
      }
    } catch (_) {
      /* ignore */
    }
  }
  const bytes = fs.readFileSync(pdfPath);
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="' + filename + '"',
    'Cache-Control': 'private, no-store',
    'Content-Length': String(bytes.length),
  });
  res.end(bytes);
  return true;
}

module.exports = {
  handleRecruitmentApply,
  handleRecruitmentCv,
  isRecruitmentPath,
};
