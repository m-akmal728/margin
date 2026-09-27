export const STORAGE_KEY = 'margin.library.v1';
export const KINDS = ['Article', 'Paper', 'Book', 'Video', 'Podcast', 'Other'];

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `src-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Use a web link that starts with http or https.');
  return url.href;
}

export function createSource(input, now = new Date().toISOString()) {
  const title = String(input.title ?? '').trim();
  if (!title || title.length > 140) throw new TypeError('A title between 1 and 140 characters is required.');
  const url = normalizeUrl(String(input.url ?? '').trim());
  const kind = KINDS.includes(input.kind) ? input.kind : 'Other';
  return {
    id: createId(), title, url, kind,
    collection: String(input.collection ?? 'Everything').trim() || 'Everything',
    description: String(input.description ?? '').trim().slice(0, 280),
    note: '', status: 'unread', starred: false,
    createdAt: now, updatedAt: now,
  };
}

export function validateLibrary(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.sources) || !Array.isArray(value.collections)) {
    throw new TypeError('This file is not a valid Margin library backup.');
  }
  const ids = new Set();
  const sources = value.sources.map((source) => {
    if (!source || typeof source.id !== 'string' || ids.has(source.id)) throw new TypeError('The backup contains an invalid or duplicate source.');
    ids.add(source.id);
    const title = String(source.title ?? '').trim();
    if (!title) throw new TypeError('The backup contains a source without a title.');
    return {
      id: source.id, title: title.slice(0, 140), url: normalizeUrl(String(source.url ?? '')),
      kind: KINDS.includes(source.kind) ? source.kind : 'Other',
      collection: String(source.collection ?? 'Everything').trim() || 'Everything',
      description: String(source.description ?? '').slice(0, 280), note: String(source.note ?? ''),
      status: source.status === 'read' ? 'read' : 'unread', starred: source.starred === true,
      createdAt: validDate(source.createdAt), updatedAt: validDate(source.updatedAt),
    };
  });
  const collections = [...new Set(value.collections.map((c) => String(c).trim()).filter(Boolean))];
  if (!collections.includes('Everything')) collections.unshift('Everything');
  return { schemaVersion: 1, collections, sources };
}

function validDate(input) {
  const date = new Date(input);
  return Number.isNaN(date.valueOf()) ? new Date(0).toISOString() : date.toISOString();
}

export function getStats(sources) {
  return {
    total: sources.length,
    unread: sources.filter((source) => source.status === 'unread').length,
    notes: sources.filter((source) => source.note.trim().length > 0).length,
    readPercent: sources.length ? Math.round((sources.filter((source) => source.status === 'read').length / sources.length) * 100) : 0,
  };
}

export function filterSources(sources, options = {}) {
  const query = (options.query ?? '').trim().toLocaleLowerCase();
  return sources.filter((source) => {
    if (options.view === 'unread' && source.status !== 'unread') return false;
    if (options.view === 'starred' && !source.starred) return false;
    if (options.collection && source.collection !== options.collection) return false;
    if (options.kinds?.size && !options.kinds.has(source.kind)) return false;
    const searchable = [source.title, source.url, source.kind, source.collection, source.description, source.note].join(' ').toLocaleLowerCase();
    return !query || searchable.includes(query);
  }).sort((a, b) => {
    const aDate = new Date(options.sort === 'updated' ? a.updatedAt : a.createdAt).valueOf();
    const bDate = new Date(options.sort === 'updated' ? b.updatedAt : b.createdAt).valueOf();
    return bDate - aDate;
  });
}
