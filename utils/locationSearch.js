import localLocations from '../data/locations.json';

const zipcodes = require('zipcodes');

/**
 * Supabase: create a table `locations` with at least:
 *   id (uuid/text), name (text), zip (text), optional city, state
 * RLS must allow anon read if using the anon key.
 *
 * US ZIP codes (~42k) come from the `zipcodes` npm package (bundled DB), not a hand-written file.
 */

const MAX_US_RESULTS = 80;

let cachedUsZipKeys = null;

function getUsZipKeys() {
  if (!cachedUsZipKeys) {
    const { codes } = zipcodes;
    cachedUsZipKeys = Object.keys(codes).filter(
      k => /^\d{5}$/.test(k) && codes[k].country === 'US'
    );
  }
  return cachedUsZipKeys;
}

function escapeIlike(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function matchesLocation(row, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const name = (row.name || '').toLowerCase();
  const zipStr = String(row.zip ?? '');
  if (name.includes(q)) return true;
  const qDigits = q.replace(/\D/g, '');
  if (qDigits.length > 0) {
    const zipDigits = zipStr.replace(/\D/g, '');
    if (zipDigits.includes(qDigits)) return true;
  }
  return zipStr.toLowerCase().includes(q);
}

export function filterLocalLocations(query) {
  const q = query.trim();
  const rows = !q
    ? [...localLocations].slice(0, 12)
    : localLocations.filter(row => matchesLocation(row, q));
  return rows.map(row => normalizeRow(row, 'bundled'));
}

function normalizeRow(row, source) {
  return {
    id: String(row.id ?? `${row.name}-${row.zip}`),
    name: row.name || 'Unknown',
    zip: String(row.zip ?? ''),
    city: row.city || '',
    state: row.state || '',
    source,
  };
}

function normalizeUsZipEntry(entry) {
  if (!entry || entry.country !== 'US') return null;
  return {
    id: `usz-${entry.zip}`,
    name: `${entry.city}, ${entry.state}`,
    zip: String(entry.zip),
    city: entry.city || '',
    state: entry.state || '',
    source: 'uszips',
  };
}

/**
 * Search all US ZIP codes from the `zipcodes` package (tens of thousands of records).
 * Matches: exact ZIP, 3–4 digit prefix, city name, or 2-letter state code.
 */
export function searchUsZipCodes(query) {
  const raw = query.trim();
  if (!raw) return [];

  const ql = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');
  const hasLetters = /[a-zA-Z]/.test(raw);
  const out = [];
  const seen = new Set();

  function add(entry) {
    const row = normalizeUsZipEntry(entry);
    if (!row || seen.has(row.zip)) return;
    seen.add(row.zip);
    out.push(row);
  }

  const { codes } = zipcodes;
  const keys = getUsZipKeys();

  if (digits.length === 5 && !hasLetters) {
    const hit = zipcodes.lookup(digits);
    if (hit) add(hit);
    return out;
  }

  if (digits.length >= 3 && digits.length < 5) {
    for (let i = 0; i < keys.length && out.length < MAX_US_RESULTS; i++) {
      const z = keys[i];
      if (z.startsWith(digits)) add(codes[z]);
    }
    return out;
  }

  if (!hasLetters && digits.length > 0 && digits.length < 3) {
    return [];
  }

  for (let i = 0; i < keys.length && out.length < MAX_US_RESULTS; i++) {
    const z = keys[i];
    const e = codes[z];
    const city = (e.city || '').toLowerCase();
    const st = (e.state || '').toLowerCase();
    if (city.includes(ql) || st === ql) {
      add(e);
    }
  }

  return out;
}

/**
 * Bundled sample stores + full US ZIP search (no query → only bundled samples, not 42k rows).
 */
export function searchBundledAndUsZips(query) {
  const bundled = filterLocalLocations(query);
  const q = query.trim();
  if (!q) return bundled;
  const us = searchUsZipCodes(q);
  return mergePlaceSources(bundled, us, []);
}

/**
 * Merge sources in order: bundled stores win over US-ZIP rows over Supabase when the same 5-digit ZIP appears.
 */
export function mergePlaceSources(bundledRows, usZipRows, remoteRows) {
  const seen = new Set();
  const out = [];

  for (const r of [...bundledRows, ...usZipRows, ...remoteRows]) {
    const d = String(r.zip ?? '').replace(/\D/g, '');
    if (d.length === 5) {
      if (seen.has(d)) continue;
      seen.add(d);
    } else {
      const k = `${String(r.name).toLowerCase()}|${d}`;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    out.push(r);
  }
  return out;
}

function dedupeByNameZip(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = `${String(row.name).toLowerCase()}|${row.zip}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/**
 * Query Supabase `locations` by name OR zip (partial match).
 * Returns [] if env is missing, table missing, or on error.
 */
export async function searchLocationsRemote(query) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  const q = query.trim();
  if (!url || !key || !q) return [];

  try {
    const { supabase } = await import('../src/lib/supabase');
    const like = `%${escapeIlike(q)}%`;

    const [{ data: byName, error: e1 }, { data: byZip, error: e2 }] = await Promise.all([
      supabase.from('locations').select('id, name, zip, city, state').ilike('name', like),
      supabase.from('locations').select('id, name, zip, city, state').ilike('zip', like),
    ]);

    if (e1) console.warn('locations name search:', e1.message);
    if (e2) console.warn('locations zip search:', e2.message);

    const merged = [...(byName || []), ...(byZip || [])].map(r =>
      normalizeRow(r, 'database')
    );
    return dedupeByNameZip(merged);
  } catch (e) {
    console.warn('searchLocationsRemote:', e?.message || e);
    return [];
  }
}

export function mergeLocationResults(localRows, remoteRows) {
  return dedupeByNameZip([...localRows, ...remoteRows]);
}

export { matchesLocation };
