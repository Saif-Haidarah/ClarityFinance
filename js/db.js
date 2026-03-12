/* ClarityFinance — IndexedDB Layer */

const DB = (() => {
'use strict';
const DB_NAME    = 'ClarityFinanceDB';
const DB_VERSION = 1;
const STORES     = {
files:     'files',
scenarios: 'scenarios',
settings:  'settings',
cache:     'cache',
};
let _db = null;
let _ready = false;
let _fallback = false;
async function open() {
if (_db) return _db;
return new Promise((resolve, reject) => {
if (!window.indexedDB) {
console.warn('[DB] IndexedDB not available, using localStorage fallback');
_fallback = true;
_ready = true;
resolve(null);
return;
}
const req = indexedDB.open(DB_NAME, DB_VERSION);
req.onupgradeneeded = e => {
const db = e.target.result;
Object.values(STORES).forEach(name => {
if (!db.objectStoreNames.contains(name)) {
db.createObjectStore(name, { keyPath: 'id' });
}
});
};
req.onsuccess = e => {
_db = e.target.result;
_ready = true;
resolve(_db);
};
req.onerror = e => {
console.warn('[DB] open error, fallback to localStorage', e);
_fallback = true;
_ready = true;
resolve(null);
};
});
}
function tx(storeName, mode = 'readonly') {
if (!_db) throw new Error('[DB] not initialized');
return _db.transaction(storeName, mode).objectStore(storeName);
}
function promisify(req) {
return new Promise((res, rej) => {
req.onsuccess = e => res(e.target.result);
req.onerror   = e => rej(e.target.error);
});
}
function lsKey(store, id) { return `cf_${store}_${id}`; }
function lsGet(store, id) {
try { return JSON.parse(localStorage.getItem(lsKey(store, id))); }
catch { return null; }
}
function lsSet(store, id, data) {
try { localStorage.setItem(lsKey(store, id), JSON.stringify(data)); return true; }
catch { return false; }
}
function lsDel(store, id) {
localStorage.removeItem(lsKey(store, id));
}
function lsGetAll(store) {
const results = [];
const prefix  = lsKey(store, '');
for (let i = 0; i < localStorage.length; i++) {
const key = localStorage.key(i);
if (key.startsWith(prefix)) {
try { results.push(JSON.parse(localStorage.getItem(key))); }
catch {}
}
}
return results;
}
async function put(store, data) {
await open();
if (_fallback) return lsSet(store, data.id, data);
try { return await promisify(tx(store, 'readwrite').put(data)); }
catch (e) { console.error('[DB] put error', e); return false; }
}
async function get(store, id) {
await open();
if (_fallback) return lsGet(store, id);
try { return await promisify(tx(store).get(id)); }
catch (e) { console.error('[DB] get error', e); return null; }
}
async function getAll(store) {
await open();
if (_fallback) return lsGetAll(store);
try { return await promisify(tx(store).getAll()); }
catch (e) { console.error('[DB] getAll error', e); return []; }
}
async function del(store, id) {
await open();
if (_fallback) { lsDel(store, id); return; }
try { return await promisify(tx(store, 'readwrite').delete(id)); }
catch (e) { console.error('[DB] delete error', e); }
}
async function clear(store) {
await open();
if (_fallback) {
const prefix = lsKey(store, '');
Object.keys(localStorage)
.filter(k => k.startsWith(prefix))
.forEach(k => localStorage.removeItem(k));
return;
}
try { return await promisify(tx(store, 'readwrite').clear()); }
catch (e) { console.error('[DB] clear error', e); }
}
async function saveScenario(label, values, results) {
const id = `scenario_${Date.now()}`;
const item = {
id, label, values, results,
savedAt: new Date().toISOString(),
};
await put(STORES.scenarios, item);
const all = await getAll(STORES.scenarios);
State.set('scenarios', all);
return item;
}
async function loadScenarios() {
const all = await getAll(STORES.scenarios);
State.set('scenarios', all || []);
return all;
}
async function saveFileState() {
const file = State.get('file');
const { raw, ...saveable } = file;
await put(STORES.files, { id: 'last_file', ...saveable, savedAt: new Date().toISOString() });
}
async function loadFileState() {
const saved = await get(STORES.files, 'last_file');
if (saved) State.merge('file', saved);
return saved;
}
async function saveAnalysis() {
const analysis = State.get('analysis');
await put(STORES.cache, { id: 'analysis', ...analysis, savedAt: new Date().toISOString() });
}
async function loadAnalysis() {
const saved = await get(STORES.cache, 'analysis');
if (saved?.ready) State.merge('analysis', saved);
return saved;
}
return {
open, put, get, getAll, del, clear,
saveScenario, loadScenarios,
saveFileState, loadFileState,
saveAnalysis, loadAnalysis,
STORES,
get ready() { return _ready; },
get fallback() { return _fallback; },
};
})();
