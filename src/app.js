import { STORAGE_KEY, KINDS, createSource, filterSources, getStats, validateLibrary } from './library.js';

const seed = {
  schemaVersion: 1,
  collections: ['Everything', 'Design & craft', 'Ideas to explore', 'Coursework'],
  sources: [
    { id:'seed-1', title:'The web’s grain', url:'https://maggieappleton.com/garden-history', kind:'Article', collection:'Design & craft', description:'A history of personal publishing on the web, and why the garden metaphor still matters.', note:'What would a small, useful corner of the web look like for my own work?', status:'read', starred:true, createdAt:'2026-09-22T12:00:00.000Z', updatedAt:'2026-09-25T12:00:00.000Z' },
    { id:'seed-2', title:'A new medium for communicating ideas', url:'https://distill.pub/2017/communication/', kind:'Article', collection:'Ideas to explore', description:'An interactive essay about the craft of communicating research through the web.', note:'', status:'unread', starred:false, createdAt:'2026-09-24T12:00:00.000Z', updatedAt:'2026-09-24T12:00:00.000Z' },
    { id:'seed-3', title:'The design of everyday things', url:'https://jnd.org/the-design-of-everyday-things-revised-and-expanded-edition/', kind:'Book', collection:'Design & craft', description:'Don Norman’s classic guide to the principles behind intuitive design.', note:'Affordances, signifiers, feedback, and conceptual models.', status:'unread', starred:true, createdAt:'2026-09-25T12:00:00.000Z', updatedAt:'2026-09-25T12:00:00.000Z' },
    { id:'seed-4', title:'How to take smart notes', url:'https://takesmartnotes.com/', kind:'Book', collection:'Coursework', description:'A practical system for developing ideas through connected notes.', note:'', status:'unread', starred:false, createdAt:'2026-09-26T12:00:00.000Z', updatedAt:'2026-09-26T12:00:00.000Z' },
  ],
};

const state = { data: null, view: 'all', collection: null, sort: 'recent', query: '', kinds: new Set(), list: false };
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Web source'; } };
const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso));

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return validateLibrary(JSON.parse(raw));
  } catch (error) { console.warn('Margin could not read saved data:', error); }
  return structuredClone(seed);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); $('.saved-status').innerHTML = '<span class="status-dot"></span> All changes saved'; }
  catch { toast('Could not save. Your browser storage may be full.'); }
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 2800);
}
function render() {
  renderNav(); renderStats(); renderSources(); renderMeta();
}
function renderNav() {
  const sources = state.data.sources;
  $('#all-count').textContent = sources.length;
  $('#unread-count').textContent = sources.filter((item) => item.status === 'unread').length;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === state.view && !state.collection));
  $('#collection-nav').innerHTML = state.data.collections.filter((name) => name !== 'Everything').map((name) => `<button class="collection-item ${state.collection === name ? 'active' : ''}" data-collection="${esc(name)}"><span class="collection-swatch"></span>${esc(name)}<span class="collection-number">${sources.filter((item) => item.collection === name).length}</span></button>`).join('');
}
function renderStats() {
  const stats = getStats(state.data.sources);
  $('#stat-total').textContent = stats.total; $('#stat-unread').textContent = stats.unread;
  $('#stat-notes').textContent = stats.notes; $('#stat-progress').textContent = `${stats.readPercent}%`;
  $('#progress-fill').style.width = `${stats.readPercent}%`;
}
function renderSources() {
  const sources = filterSources(state.data.sources, { view: state.view, collection: state.collection, sort: state.sort, query: state.query, kinds: state.kinds });
  $('#result-count').textContent = `Showing ${sources.length} ${sources.length === 1 ? 'source' : 'sources'}`;
  $('#filter-count').textContent = state.kinds.size ? state.kinds.size : '';
  $('#active-filters').hidden = state.kinds.size === 0;
  $('#active-filters').innerHTML = [...state.kinds].map((kind) => `<button class="filter-chip" data-remove-kind="${esc(kind)}">${esc(kind)} <span>×</span></button>`).join('');
  if (!sources.length) {
    const hasContent = state.data.sources.length > 0;
    $('#source-grid').innerHTML = `<div class="empty-state"><div class="empty-illustration"><span>✳</span><i>↗</i></div><h2>${hasContent ? 'Nothing in this corner yet' : 'Make room for a good idea'}</h2><p>${hasContent ? 'Try another search or clear the filters.' : 'Save an article, paper, or thought you want to return to.'}</p>${hasContent ? '<button class="quiet-button" id="reset-view">Clear search & filters</button>' : '<button class="add-button" id="empty-add">＋ Add your first source</button>'}</div>`;
    return;
  }
  $('#source-grid').classList.toggle('list-layout', state.list);
  $('#source-grid').innerHTML = sources.map((source, index) => cardTemplate(source, index)).join('');
}
function cardTemplate(source, index) {
  const palette = { Article:'article', Paper:'paper', Book:'book', Video:'video', Podcast:'podcast', Other:'other' };
  return `<article class="source-card" style="--card-order:${index}" data-open-source="${esc(source.id)}">
    <div class="card-topline"><span class="kind-label ${palette[source.kind]}"><span class="kind-glyph">${source.kind === 'Paper' ? '▤' : source.kind === 'Book' ? '▣' : source.kind === 'Video' ? '▷' : source.kind === 'Podcast' ? '◖' : '↗'}</span>${esc(source.kind)}</span><button class="star-button ${source.starred ? 'is-starred' : ''}" data-star="${esc(source.id)}" aria-label="${source.starred ? 'Remove star' : 'Star source'}">${source.starred ? '✳' : '✳'}</button></div>
    <div class="card-source">${esc(hostOf(source.url))}<span>·</span> ${formatDate(source.createdAt)}</div>
    <h2>${esc(source.title)}</h2><p class="card-description">${esc(source.description || 'A saved source, ready for your next idea.')}</p>
    <div class="card-bottom"><button class="collection-pill" data-pick-collection="${esc(source.collection)}"><span class="pill-dot"></span>${esc(source.collection)}</button><button class="read-toggle ${source.status === 'read' ? 'is-read' : ''}" data-read="${esc(source.id)}"><span>${source.status === 'read' ? '✓' : '○'}</span> ${source.status === 'read' ? 'Read' : 'To read'}</button></div>
  </article>`;
}
function renderMeta() {
  const title = state.collection || ({ all:'All sources', unread:'To read', starred:'Starred' })[state.view];
  $('#current-crumb').textContent = title; $('#page-title').innerHTML = `${esc(title)}<span class="title-period">.</span>`;
  const subs = { all:'A good idea is worth keeping a margin for.', unread:'A little curiosity goes a long way.', starred:'The things you want to find again.' };
  $('#page-subtitle').textContent = state.collection ? `A little space for ${state.collection.toLocaleLowerCase()}.` : subs[state.view];
}
function openSource(source) {
  $('#detail-content').innerHTML = `<div class="detail-top"><span class="kind-label article">${esc(source.kind)}</span><button type="button" class="modal-close" data-close="detail-dialog" aria-label="Close">×</button></div><div class="eyebrow detail-collection">${esc(source.collection)} · SAVED ${formatDate(source.createdAt).toUpperCase()}</div><h2 class="detail-title">${esc(source.title)}</h2><a class="detail-url" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(source.url))}<span>↗</span></a><p class="detail-description">${esc(source.description || 'No description added.')}</p><label class="field-label" for="note-editor">YOUR NOTES <span>autosaved</span></label><textarea id="note-editor" class="field note-editor" placeholder="What stood out? What questions did it raise?">${esc(source.note)}</textarea><div class="detail-actions"><button class="read-toggle detail-read ${source.status === 'read' ? 'is-read' : ''}" data-read="${esc(source.id)}"><span>${source.status === 'read' ? '✓' : '○'}</span> ${source.status === 'read' ? 'Mark unread' : 'Mark as read'}</button><button class="star-button ${source.starred ? 'is-starred' : ''}" data-star="${esc(source.id)}">✳</button><button class="danger-text" data-delete="${esc(source.id)}">Delete source</button><a class="add-button visit-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a></div>`;
  $('#detail-dialog').showModal();
  $('#note-editor').addEventListener('input', (event) => { source.note = event.target.value; source.updatedAt = new Date().toISOString(); save(); renderStats(); });
}
function setRead(id) { const source = state.data.sources.find((item) => item.id === id); if (!source) return; source.status = source.status === 'read' ? 'unread' : 'read'; source.updatedAt = new Date().toISOString(); save(); render(); if ($('#detail-dialog').open) openSource(source); }
function setStar(id) { const source = state.data.sources.find((item) => item.id === id); if (!source) return; source.starred = !source.starred; source.updatedAt = new Date().toISOString(); save(); render(); if ($('#detail-dialog').open) openSource(source); }
function fillCollections() { $('#source-collection').innerHTML = state.data.collections.map((name) => `<option>${esc(name)}</option>`).join(''); }
function openAdd() { fillCollections(); $('#source-form').reset(); $('#source-dialog').showModal(); setTimeout(() => $('#source-title').focus(), 50); }
function removeSource(id) { const source = state.data.sources.find((item) => item.id === id); if (!source || !confirm(`Remove “${source.title}” from your library?`)) return; state.data.sources = state.data.sources.filter((item) => item.id !== id); save(); $('#detail-dialog').close(); render(); toast('Source removed.'); }

state.data = load();
$('#date-label').textContent = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'short', day:'numeric' }).format(new Date());
render();

document.addEventListener('click', (event) => {
  const target = event.target.closest('button, [data-open-source]'); if (!target) return;
  if (target.matches('[data-view]')) { state.view = target.dataset.view; state.collection = null; render(); }
  else if (target.matches('[data-collection]')) { state.collection = target.dataset.collection; state.view = 'all'; render(); }
  else if (target.matches('[data-open-source]')) { const source = state.data.sources.find((item) => item.id === target.dataset.openSource); if (source) openSource(source); }
  else if (target.matches('[data-star]')) { event.stopPropagation(); setStar(target.dataset.star); }
  else if (target.matches('[data-read]')) { event.stopPropagation(); setRead(target.dataset.read); }
  else if (target.matches('[data-delete]')) removeSource(target.dataset.delete);
  else if (target.matches('[data-close]')) $(`#${target.dataset.close}`).close();
  else if (target.id === 'top-add' || target.id === 'empty-add') openAdd();
  else if (target.id === 'add-collection') { const name = prompt('Name this collection'); if (name?.trim() && !state.data.collections.some((item) => item.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) { state.data.collections.push(name.trim().slice(0, 36)); save(); render(); } }
  else if (target.matches('[data-pick-collection]')) { state.collection = target.dataset.pickCollection; state.view = 'all'; render(); }
  else if (target.matches('[data-remove-kind]')) { state.kinds.delete(target.dataset.removeKind); renderSources(); renderFilterChecks(); }
  else if (target.id === 'filter-button') { renderFilterChecks(); $('#filter-dialog').show(); }
  else if (target.id === 'clear-filters') { state.kinds.clear(); renderSources(); renderFilterChecks(); }
  else if (target.id === 'reset-view') { state.query = ''; state.kinds.clear(); $('#search-input').value = ''; renderSources(); }
  else if (target.matches('[data-filter]')) { state.sort = target.dataset.filter; document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === target)); renderSources(); }
  else if (target.id === 'view-toggle') { state.list = !state.list; renderSources(); }
  else if (target.id === 'open-settings') $('#settings-dialog').showModal();
  else if (target.id === 'export-data') exportLibrary();
  else if (target.id === 'import-trigger') $('#import-file').click();
  else if (target.id === 'clear-library') clearLibrary();
  else if (target.id === 'help-button') toast('Tip: press ⌘ K to search, or click any source to add a note.');
});

$('#source-form').addEventListener('submit', (event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget);
  try {
    const source = createSource({ title:form.get('title'), url:form.get('url'), kind:$('#source-type').value, collection:$('#source-collection').value, description:$('#source-description').value });
    state.data.sources.unshift(source); save(); $('#source-dialog').close(); render(); toast('Saved to your library.');
  } catch (error) { toast(error.message); }
});
$('#search-input').addEventListener('input', (event) => { state.query = event.target.value; renderSources(); });
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try { const imported = validateLibrary(JSON.parse(await file.text())); if (!confirm(`Replace this library with ${imported.sources.length} sources from the backup?`)) return; state.data = imported; save(); render(); $('#settings-dialog').close(); toast('Library restored.'); }
  catch (error) { toast(error instanceof SyntaxError ? 'That file is not readable JSON.' : error.message); }
  finally { event.target.value = ''; }
});
function exportLibrary() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type:'application/json' }); const link = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`margin-library-${new Date().toISOString().slice(0,10)}.json` }); link.click(); URL.revokeObjectURL(link.href); toast('Your backup is ready.');
}
function clearLibrary() {
  if (!confirm('Remove every source and note from this browser? This cannot be undone. Export a backup first if you may want these later.')) return;
  state.data = { schemaVersion:1, collections:['Everything'], sources:[] }; save(); render(); $('#settings-dialog').close(); toast('Library cleared.');
}
function renderFilterChecks() {
  $('#kind-filters').innerHTML = KINDS.map((kind) => `<label><input type="checkbox" value="${esc(kind)}" ${state.kinds.has(kind) ? 'checked' : ''}> ${esc(kind)}</label>`).join('');
  $('#kind-filters').querySelectorAll('input').forEach((input) => input.addEventListener('change', () => { input.checked ? state.kinds.add(input.value) : state.kinds.delete(input.value); renderSources(); }));
}
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); }
  if (event.key === 'Escape') { for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); }
});
