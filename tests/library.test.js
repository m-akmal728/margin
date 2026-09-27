import test from 'node:test';
import assert from 'node:assert/strict';
import { createSource, filterSources, getStats, normalizeUrl, validateLibrary } from '../src/library.js';

const date = '2026-01-01T00:00:00.000Z';
const sample = (id, extra = {}) => ({ id, title:`Source ${id}`, url:`https://example.com/${id}`, kind:'Article', collection:'Everything', description:'', note:'', status:'unread', starred:false, createdAt:date, updatedAt:date, ...extra });

test('normalizes secure web addresses and rejects unsafe URL schemes', () => {
  assert.equal(normalizeUrl('https://example.com'), 'https://example.com/');
  assert.throws(() => normalizeUrl('javascript:alert(1)'), /http or https/);
});

test('creates a source with validated URL, defaults, and bounded text', () => {
  const source = createSource({ title:' A paper ', url:'https://example.com/paper', description:' hello ' }, date);
  assert.equal(source.title, 'A paper'); assert.equal(source.status, 'unread');
  assert.equal(source.collection, 'Everything'); assert.equal(source.description, 'hello');
  assert.equal(source.createdAt, date); assert.ok(source.id);
  assert.throws(() => createSource({ title:'', url:'https://example.com' }), /title/);
});

test('computes library reading and note statistics', () => {
  const stats = getStats([sample('1', { status:'read', note:'A note' }), sample('2')]);
  assert.deepEqual(stats, { total:2, unread:1, notes:1, readPercent:50 });
  assert.deepEqual(getStats([]), { total:0, unread:0, notes:0, readPercent:0 });
});

test('filters by view, collection, kind, and text then sorts by selected date', () => {
  const sources = [sample('old', { title:'Design systems', collection:'Design', kind:'Paper' }), sample('new', { title:'Research notes', updatedAt:'2026-03-01T00:00:00.000Z', status:'read', starred:true })];
  assert.deepEqual(filterSources(sources, { view:'unread' }).map((s) => s.id), ['old']);
  assert.deepEqual(filterSources(sources, { view:'starred' }).map((s) => s.id), ['new']);
  assert.deepEqual(filterSources(sources, { collection:'Design', kinds:new Set(['Paper']) }).map((s) => s.id), ['old']);
  assert.deepEqual(filterSources(sources, { query:'research', sort:'updated' }).map((s) => s.id), ['new']);
});

test('validates portable backups and rejects duplicate IDs or unsafe links', () => {
  const valid = validateLibrary({ schemaVersion:1, collections:['Everything','Design'], sources:[sample('one')] });
  assert.equal(valid.sources.length, 1); assert.ok(valid.collections.includes('Everything'));
  assert.throws(() => validateLibrary({ schemaVersion:1, collections:[], sources:[sample('same'),sample('same')] }), /duplicate/);
  assert.throws(() => validateLibrary({ schemaVersion:1, collections:[], sources:[sample('bad', { url:'javascript:alert(1)' })] }), /http or https/);
  assert.throws(() => validateLibrary({ schemaVersion:2, collections:[], sources:[] }), /valid Margin/);
});
