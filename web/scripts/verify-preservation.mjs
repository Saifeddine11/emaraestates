/**
 * Diffs each exported route against the legacy static page it replaces.
 *
 * Everything asserted here is a line item in MIGRATION-PRESERVATION-CHECKLIST.md.
 * Routes and their documented exceptions live in scripts/lib/routes.mjs.
 * Run after `next build`: `node scripts/verify-preservation.mjs`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { ROUTES } from './lib/routes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const webRoot = resolve(here, '..');

/* ------------------------------------------------------------- extractors */

const META_FIELDS = [
  ['meta description', 'meta[name="description"]'],
  ['meta robots', 'meta[name="robots"]'],
  ['canonical', 'link[rel="canonical"]'],
  ['og:title', 'meta[property="og:title"]'],
  ['og:description', 'meta[property="og:description"]'],
  ['og:url', 'meta[property="og:url"]'],
  ['og:image', 'meta[property="og:image"]'],
  ['og:type', 'meta[property="og:type"]'],
  ['og:locale', 'meta[property="og:locale"]'],
  ['og:site_name', 'meta[property="og:site_name"]'],
  ['twitter:card', 'meta[name="twitter:card"]'],
  ['twitter:title', 'meta[name="twitter:title"]'],
  ['twitter:description', 'meta[name="twitter:description"]'],
  ['twitter:image', 'meta[name="twitter:image"]'],
];

const jsonLdNodes = ($) => {
  const ids = new Set();
  $('script[type="application/ld+json"]').each((_, el) => {
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') {
        if (node['@type']) ids.add(`${node['@type']}${node['@id'] ? ` :: ${node['@id']}` : ''}`);
        Object.values(node).forEach(walk);
      }
    };
    walk(JSON.parse($(el).contents().text()));
  });
  return ids;
};

/**
 * Every JSON-LD node keyed by `@type :: @id`, with its keys sorted so the
 * comparison ignores property order. Node identity alone is not enough — a
 * graph can keep all its nodes while losing a price, a description or a
 * breadcrumb label.
 */
const jsonLdByNode = ($) => {
  const sortKeys = (value) => {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, sortKeys(value[key])]),
      );
    }
    return value;
  };

  const nodes = new Map();
  $('script[type="application/ld+json"]').each((_, el) => {
    const parsed = JSON.parse($(el).contents().text());
    for (const node of parsed['@graph'] ?? [parsed]) {
      const key = `${node['@type']}${node['@id'] ? ` :: ${node['@id']}` : ''}`;
      nodes.set(key, JSON.stringify(sortKeys(node), null, 1));
    }
  });
  return nodes;
};

const idsOf = ($) => new Set($('[id]').map((_, el) => $(el).attr('id')).get());

/**
 * Anchor links split by which page they land on.
 *
 * `#faq` is a jump within the current page; `/#faq` is a link to the homepage's
 * FAQ. Both used to be lumped together, which wrongly demanded that every page
 * carry the homepage's section ids. Cross-page targets are keyed by the route
 * they point at so they can be checked against that page instead.
 */
const anchorTargetsOf = ($) => {
  const samePage = new Set();
  const crossPage = new Map();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const hash = href.indexOf('#');
    if (hash < 0 || /^https?:/i.test(href)) return;

    const id = href.slice(hash + 1);
    if (!id) return;

    const path = href.slice(0, hash);
    if (!path) {
      samePage.add(id);
      return;
    }
    const route = path.replace(/\/+$/, '') || '/';
    if (!crossPage.has(route)) crossPage.set(route, new Set());
    crossPage.get(route).add(id);
  });

  return { samePage, crossPage };
};

const hrefsOf = ($) =>
  new Set(
    $('a[href]')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(Boolean),
  );

const headingsOf = ($) =>
  $('h1, h2, h3, h4')
    .map((_, el) => `${el.tagName.toLowerCase()}: ${$(el).text().replace(/\s+/g, ' ').trim()}`)
    .get();

const altsOf = ($) =>
  new Set(
    $('img[alt]')
      .map((_, el) => $(el).attr('alt').replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean),
  );

/**
 * Whitespace is deliberately ignored.
 *
 * Wording is the contract; spacing is not, and the two builds space things
 * differently for reasons that never reach the screen. The hand-written HTML
 * puts newlines between inline tags (which render as spaces) where JSX emits
 * none, and it splits some labels into one <span> per letter. Comparing the
 * text with every space stripped sidesteps all of that and leaves only real
 * changes in wording. Chunks are cut at sentence punctuation — on the
 * punctuation itself, since the whitespace after it is what differs — so a
 * mismatch points at a specific passage. Each chunk keeps a spaced copy purely
 * so the report stays readable.
 */
const chunksOf = ($) => {
  const $body = $('body').clone();
  $body.find('script, style, noscript, template, svg, select').remove();

  const spaced = $body
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  const chunks = new Map();
  for (const piece of spaced.split(/(?<=[.!?])/)) {
    const stripped = piece.replace(/\s+/g, '');
    if (stripped) chunks.set(stripped, piece.trim());
  }
  return chunks;
};

/* ----------------------------------------------------------------- diffing */

/** Contiguous substrings present in `a` but not `b`, and vice versa, via LCS. */
function charDelta(a, b) {
  const n = a.length;
  const m = b.length;
  const table = new Int32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * (m + 1) + j] =
        a[i] === b[j]
          ? table[(i + 1) * (m + 1) + j + 1] + 1
          : Math.max(table[(i + 1) * (m + 1) + j], table[i * (m + 1) + j + 1]);
    }
  }

  const removed = [];
  const added = [];
  const push = (list, index, char) => {
    const last = list[list.length - 1];
    if (last && last.end === index - 1) {
      last.chars.push(char);
      last.end = index;
    } else list.push({ end: index, chars: [char] });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (table[(i + 1) * (m + 1) + j] >= table[i * (m + 1) + j + 1]) {
      push(removed, i, a[i++]);
    } else {
      push(added, j, b[j++]);
    }
  }
  while (i < n) push(removed, i, a[i++]);
  while (j < m) push(added, j, b[j++]);

  const flat = (list) => list.map((run) => run.chars.join(''));
  return { removed: flat(removed), added: flat(added) };
}

/** Trigram Jaccard — robust enough to pair a passage with its edited twin. */
const similarity = (a, b) => {
  const grams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return 0;
  let shared = 0;
  for (const gram of ga) if (gb.has(gram)) shared++;
  return shared / (ga.size + gb.size - shared);
};

/* ------------------------------------------------------------ route check */

function verifyRoute(route, builtIdsByRoute) {
  const legacyPath = resolve(repoRoot, route.legacy);
  const builtPath = resolve(webRoot, route.built);

  if (!existsSync(legacyPath)) {
    return { route, fatal: `legacy page missing: ${route.legacy}` };
  }
  if (!existsSync(builtPath)) {
    return { route, fatal: `not exported yet: ${route.built} — run \`next build\`` };
  }

  const legacy = cheerio.load(readFileSync(legacyPath, 'utf8'));
  const built = cheerio.load(readFileSync(builtPath, 'utf8'));

  const passes = [];
  const warnings = [];
  const failures = [];

  /**
   * Sections the port adds that have no legacy counterpart are lifted out of
   * the built DOM before anything is extracted from it.
   *
   * This check exists to prove the legacy page lost nothing, and it does that
   * by pairing each legacy passage with its closest surviving twin. New content
   * sitting between two legacy sections breaks that pairing: it splits a
   * passage in half, and the half that no longer matches is reported as
   * deleted even though every word of it is still on the page. Removing the new
   * section first leaves the remaining document in exactly the shape the check
   * was written against, so headings, copy, links and alt text are all compared
   * as strictly as before — a real regression anywhere in the ported content
   * still fails.
   *
   * The trade-off is real and deliberate: whatever is excluded here is not
   * verified by this script at all. Keep the list to sections that are wholly
   * new, never use it to quiet a diff in ported content, and give each one a
   * reason.
   */
  for (const { selector, why } of route.addedSections ?? []) {
    const found = built(selector);
    if (found.length === 0) {
      warnings.push(`added-section "${selector}" matches nothing in the built page — drop it.`);
      continue;
    }
    found.remove();
    passes.push(`section "${selector}" is new, excluded from the diff — ${why}`);
  }

  /**
   * Mirror of `addedSections`: lifts intentionally removed legacy sections out
   * of the legacy DOM before the diff, so an approved deletion (heading, copy,
   * alts) is not reported as a regression. Same trade-off — anything listed
   * here is unverified; only use it for whole sections the user asked to drop.
   */
  for (const { selector, why } of route.removedSections ?? []) {
    const found = legacy(selector);
    if (found.length === 0) {
      warnings.push(`removed-section "${selector}" matches nothing in the legacy page — drop it.`);
      continue;
    }
    found.remove();
    passes.push(`section "${selector}" intentionally removed — ${why}`);
  }

  const check = (label, actual, expected) => {
    if (actual === expected) passes.push(label);
    else
      failures.push(
        `${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`,
      );
  };

  /* metadata */
  check('<title>', built('title').first().text(), legacy('title').first().text());
  for (const [label, selector] of META_FIELDS) {
    const attr = selector.startsWith('link') ? 'href' : 'content';
    check(label, built(selector).attr(attr), legacy(selector).attr(attr));
  }
  check('<html lang>', built('html').attr('lang'), legacy('html').attr('lang'));

  /* structured data */
  const legacyLd = jsonLdNodes(legacy);
  const builtLd = jsonLdNodes(built);
  const missingLd = [...legacyLd].filter((v) => !builtLd.has(v));
  if (missingLd.length) failures.push(`JSON-LD nodes missing:\n      ${missingLd.join('\n      ')}`);
  else passes.push(`JSON-LD nodes (${legacyLd.size})`);
  const newLd = [...builtLd].filter((v) => !legacyLd.has(v));
  if (newLd.length) warnings.push(`JSON-LD nodes added:\n      ${newLd.join('\n      ')}`);

  const legacyGraph = jsonLdByNode(legacy);
  const builtGraph = jsonLdByNode(built);
  const changedNodes = [...legacyGraph]
    .filter(([key, json]) => builtGraph.has(key) && builtGraph.get(key) !== json)
    .map(([key]) => key);
  if (changedNodes.length) {
    failures.push(
      changedNodes
        .map((key) => {
          const before = legacyGraph.get(key).split('\n');
          const after = new Set(builtGraph.get(key).split('\n'));
          const lost = before.filter((l) => !after.has(l));
          return `JSON-LD "${key}" fields changed:\n      ${lost.join('\n      ')}`;
        })
        .join('\n    '),
    );
  } else {
    passes.push(`JSON-LD field values (${legacyGraph.size} top-level nodes)`);
  }

  /* anchors */
  const legacyIds = idsOf(legacy);
  const builtIds = idsOf(built);
  const { samePage, crossPage } = anchorTargetsOf(legacy);

  const unreachable = [...samePage]
    .filter((id) => !builtIds.has(id))
    .map((id) => `#${id} (this page)`);
  let crossChecked = 0;

  for (const [route, ids] of crossPage) {
    const targetIds = builtIdsByRoute.get(route);
    if (!targetIds) {
      warnings.push(
        `anchor targets on ${route} not checked — that route is not ported yet:\n      ${[...ids]
          .map((id) => `#${id}`)
          .join(', ')}`,
      );
      continue;
    }
    crossChecked += ids.size;
    for (const id of ids) {
      if (!targetIds.has(id)) unreachable.push(`${route}#${id}`);
    }
  }

  if (unreachable.length) {
    failures.push(`anchor targets unreachable:\n      ${unreachable.join('\n      ')}`);
  } else {
    passes.push(
      `anchor targets reachable (${samePage.size} on this page, ${crossChecked} cross-page)`,
    );
  }

  const droppedIds = [...legacyIds].filter((id) => !builtIds.has(id) && !samePage.has(id));
  if (droppedIds.length) {
    warnings.push(`internal ids no longer present (verify nothing referenced them):\n      ${droppedIds.join('\n      ')}`);
  }

  /* links */
  const legacyHrefs = hrefsOf(legacy);
  const builtHrefs = hrefsOf(built);
  const missingHrefs = [...legacyHrefs].filter((h) => !builtHrefs.has(h));
  if (missingHrefs.length) {
    failures.push(`link destinations missing:\n      ${missingHrefs.join('\n      ')}`);
  } else {
    passes.push(`link destinations (${legacyHrefs.size})`);
  }
  const newHrefs = [...builtHrefs].filter((h) => !legacyHrefs.has(h));
  if (newHrefs.length) warnings.push(`link destinations added:\n      ${newHrefs.join('\n      ')}`);

  /* heading hierarchy */
  const legacyHeadings = headingsOf(legacy);
  const builtHeadings = headingsOf(built);
  if (legacyHeadings.length !== builtHeadings.length) {
    failures.push(
      `heading count — expected ${legacyHeadings.length}, got ${builtHeadings.length}\n` +
        `      only in legacy: ${legacyHeadings.filter((h) => !builtHeadings.includes(h)).join(' | ') || '—'}\n` +
        `      only in built:  ${builtHeadings.filter((h) => !legacyHeadings.includes(h)).join(' | ') || '—'}`,
    );
  } else {
    const diffs = legacyHeadings
      .map((h, i) => (h === builtHeadings[i] ? null : `      [${i}] ${h}  ->  ${builtHeadings[i]}`))
      .filter(Boolean);
    if (diffs.length) failures.push(`heading order/text differs:\n${diffs.join('\n')}`);
    else passes.push(`heading hierarchy (${legacyHeadings.length} headings, exact order)`);
  }

  /* visible copy */
  const legacyChunks = chunksOf(legacy);
  const builtChunks = chunksOf(built);
  const builtKeys = new Set(builtChunks.keys());
  const newKeys = [...builtChunks.keys()].filter((k) => !legacyChunks.has(k));
  const unpaired = new Set(newKeys);
  const copyProblems = [];
  const usedExceptions = new Set();

  const applyExceptions = (key) => {
    let out = key;
    for (const { text } of route.copyExceptions ?? []) {
      if (out.includes(text)) {
        // Global replace: the same waived string can repeat (e.g. four sold cards).
        out = out.split(text).join('');
        usedExceptions.add(text);
      }
    }
    return out;
  };

  for (const key of legacyChunks.keys()) {
    if (builtKeys.has(key)) continue;

    const reduced = applyExceptions(key);
    if (!reduced || builtKeys.has(reduced)) continue;

    let best = null;
    for (const candidate of newKeys) {
      const score = similarity(reduced, candidate);
      if (!best || score > best.score) best = { score, candidate };
    }

    if (!best || best.score < 0.5) {
      copyProblems.push(`passage no longer present:\n        ${legacyChunks.get(key)}`);
      continue;
    }
    unpaired.delete(best.candidate);

    const { removed, added } = charDelta(reduced, best.candidate);
    if (removed.length) copyProblems.push(`text removed: ${removed.map((r) => `"${r}"`).join(', ')}`);
    if (added.length) warnings.push(`visible copy — text added: ${added.map((r) => `"${r}"`).join(', ')}`);
  }
  for (const key of unpaired) {
    warnings.push(`visible copy — new passage:\n      ${builtChunks.get(key)}`);
  }

  if (copyProblems.length) {
    failures.push(`visible copy:\n      ${copyProblems.join('\n      ')}`);
  } else {
    passes.push(`visible copy (${legacyChunks.size} passages, wording intact)`);
    for (const { text, why } of route.copyExceptions ?? []) {
      if (usedExceptions.has(text)) {
        passes.push(`copy exception "${text.length > 40 ? `${text.slice(0, 40)}…` : text}" — ${why}`);
      }
    }
  }

  /* image alt */
  const legacyAlts = altsOf(legacy);
  const builtAlts = altsOf(built);
  const altExceptions = new Map(route.altExceptions ?? []);
  const missingAlts = [...legacyAlts].filter((a) => !builtAlts.has(a) && !altExceptions.has(a));
  if (missingAlts.length) {
    failures.push(`image alt text missing:\n      ${missingAlts.join('\n      ')}`);
  } else {
    passes.push(`image alt text (${legacyAlts.size} strings)`);
  }
  for (const [alt, reason] of altExceptions) {
    if (builtAlts.has(alt)) {
      warnings.push(`alt exception "${alt}" is stale — it is present again, so drop it from the list.`);
    } else if (!legacyAlts.has(alt)) {
      warnings.push(`alt exception "${alt}" matches nothing in the legacy page — drop it.`);
    } else {
      passes.push(`alt "${alt}" intentionally removed — ${reason}`);
    }
  }

  return { route, passes, warnings, failures };
}

/* ----------------------------------------------------------------- report */

const line = '─'.repeat(74);
console.log(`\n${line}\nPRESERVATION VERIFICATION\n${line}`);

/**
 * Ids available on each exported route, indexed before verifying so that a link
 * like `/#faq` can be checked against the homepage rather than its own page.
 * Keys are route urls with the trailing slash removed, except `/` itself.
 */
const builtIdsByRoute = new Map();
for (const route of ROUTES) {
  const builtPath = resolve(webRoot, route.built);
  if (!existsSync(builtPath)) continue;
  const key = route.url.replace(/\/+$/, '') || '/';
  builtIdsByRoute.set(key, idsOf(cheerio.load(readFileSync(builtPath, 'utf8'))));
}

let totalPasses = 0;
let totalFailures = 0;

for (const route of ROUTES) {
  const result = verifyRoute(route, builtIdsByRoute);
  console.log(`\n  ${route.url}  (${route.name})\n`);

  if (result.fatal) {
    console.log(`    FAIL  ${result.fatal}\n`);
    totalFailures++;
    continue;
  }

  for (const p of result.passes) console.log(`    PASS  ${p}`);
  for (const w of result.warnings) console.log(`    WARN  ${w}`);
  for (const f of result.failures) console.log(`    FAIL  ${f}`);

  totalPasses += result.passes.length;
  totalFailures += result.failures.length;
}

console.log(`\n${line}`);
if (totalFailures) {
  console.log(`${totalFailures} failure(s) across ${ROUTES.length} route(s).\n`);
  process.exit(1);
}
console.log(`All ${totalPasses} checks passed across ${ROUTES.length} route(s).\n`);
