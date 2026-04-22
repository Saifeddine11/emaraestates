const http = require('http');
const fs = require('fs');
const path = require('path');

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 5601);
const ROOT = __dirname;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';
const CONTACT_WEBHOOK_URL = process.env.CONTACT_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/27111467/ujcbawh/';
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

function validatePayload(input) {
  const payload = {
    nom_complet: sanitize(input.nom_complet, 80),
    email: sanitize(input.email, 120),
    telephone: sanitize(input.telephone, 30),
    budget: sanitize(input.budget, 30),
    message: sanitize(input.message, 1200),
    company_website: sanitize(input.company_website, 120),
    form_token: sanitize(input.form_token, 128),
    cf_turnstile_response: sanitize(input['cf-turnstile-response'] || input.cf_turnstile_response, 2048),
    elapsed_ms: Number(input.elapsed_ms || 0)
  };
  const errors = {};

  if (payload.company_website) errors.form = 'Soumission refusée.';
  if (!payload.form_token || payload.form_token.length < 16) errors.form = 'Soumission refusée.';
  if (!payload.elapsed_ms || payload.elapsed_ms < 4000) errors.form = 'Soumission trop rapide.';
  if (!looksLikeName(payload.nom_complet)) errors.nom_complet = 'Indiquez un vrai nom complet, sans email ni numéro.';
  if (!looksLikeEmail(payload.email)) errors.email = 'Indiquez une adresse email valide.';
  if (looksLikePhone(payload.email)) errors.email = 'Le téléphone doit être dans le champ Téléphone.';
  if (!looksLikePhone(payload.telephone)) errors.telephone = 'Indiquez un vrai numéro de téléphone.';
  if (looksLikeEmail(payload.telephone)) errors.telephone = 'L’email doit être dans le champ Email.';
  if (!validBudgets.has(payload.budget)) errors.budget = 'Choisissez un budget dans la liste.';
  if (isWeakMessage(payload.message)) errors.message = 'Décrivez votre projet en au moins 20 caractères.';
  if (hasSpamContent(payload)) errors.message = 'Ce message ressemble à une prospection ou contient un lien non autorisé.';
  if (!payload.cf_turnstile_response) errors.form = 'Vérification anti-robot requise.';

  return { payload, errors };
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

async function verifyTurnstile(token, ip) {
  if (token === '__local_turnstile_bypass__' && isLocalIp(ip)) return true;
  if (!TURNSTILE_SECRET) return false;
  const body = new URLSearchParams({
    secret: TURNSTILE_SECRET,
    response: token,
    remoteip: ip
  });
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  });
  const result = await response.json();
  console.log('Turnstile siteverify response:', result);
  return Boolean(result.success);
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
      budget: escapeHtml(payload.budget),
      message: escapeHtml(payload.message),
      company_website: escapeHtml(payload.company_website),
      form_token: escapeHtml(payload.form_token),
      elapsed_ms: payload.elapsed_ms,
      source: 'emaraestates.com'
    })
  });
  if (!response.ok) throw new Error(`Zapier webhook failed: ${response.status}`);
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

  const result = validatePayload(input);
  if (Object.keys(result.errors).length) {
    sendJson(res, 422, { message: 'Corrigez les champs indiqués.', errors: result.errors });
    return;
  }

  try {
    const turnstileOk = await verifyTurnstile(result.payload.cf_turnstile_response, ip);
    if (!turnstileOk) {
      sendJson(res, 403, { message: 'Vérification anti-robot refusée.' });
      return;
    }
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
    sendJson(res, 200, { message: 'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.' });
  } catch (error) {
    sendJson(res, 500, { message: 'Erreur serveur. Contactez-nous directement par WhatsApp.' });
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const requestedPath = path.resolve(ROOT, urlPath === '/' ? 'index.html' : urlPath.slice(1));
  const htmlFallbackPath = path.extname(requestedPath) ? requestedPath : `${requestedPath}.html`;
  let filePath = requestedPath;
  if (!path.extname(requestedPath) && fs.existsSync(htmlFallbackPath)) {
    filePath = htmlFallbackPath;
  } else if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isDirectory()) {
    filePath = path.join(requestedPath, 'index.html');
  } else if (!fs.existsSync(requestedPath)) {
    filePath = htmlFallbackPath;
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
  if (req.method === 'POST' && req.url === '/api/contact') {
    handleContact(req, res);
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405, { 'Allow': 'GET, HEAD, POST' });
  res.end('Method Not Allowed');
});

server.listen(PORT, function() {
  console.log(`Emara Estates server running on http://localhost:${PORT}`);
});
