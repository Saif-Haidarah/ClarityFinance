/* ClarityFinance — State Manager (reactive store) */

const State = (() => {
'use strict';
const INITIAL = {
lang:   localStorage.getItem('cf_lang')  || 'ar',
theme:  localStorage.getItem('cf_theme') || 'light',
screen: 'login',
file: {
name:     null,
size:     null,
ext:      null,
raw:      null,
rows:     [],
headers:  [],
errors:   [],
currency: 'SAR',
},
mapping: {
items:    {},
progress: 0,
confirmed: 0,
manual:   0,
},
analysis: {
ready:    false,
revenue:  42.8,
expenses: 34.5,
profit:   8.3,
runway:   7.2,
health:   76,
margin:   19.4,
monthly:  [],
},
whatif: {
rev:   12,
exp:   3.8,
hc:    0,
price: 0,
preset: 'base',
},
scenarios: JSON.parse(localStorage.getItem('cf_scenarios') || '[]'),
ui: {
navVisible: false,
loading:    false,
toasts:     [],
},
};
let _state = deepClone(INITIAL);
const _subs = new Map();
let _batchDepth = 0;
let _pendingNotify = new Set();
function deepClone(obj) {
if (obj === null || typeof obj !== 'object') return obj;
if (obj instanceof Uint8Array) return new Uint8Array(obj);
if (Array.isArray(obj)) return obj.map(deepClone);
return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepClone(v)]));
}
function getPath(obj, path) {
return path.split('.').reduce((o, k) => o?.[k], obj);
}
function setPath(obj, path, value) {
const keys = path.split('.');
const last = keys.pop();
const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
target[last] = value;
}
function notify(keys) {
if (_batchDepth > 0) {
keys.forEach(k => _pendingNotify.add(k));
return;
}
keys.forEach(key => {
// Notify exact key AND parent keys AND '*'
const parts = key.split('.');
const toNotify = new Set(['*', key]);
for (let i = 1; i < parts.length; i++) {
toNotify.add(parts.slice(0, i).join('.'));
}
toNotify.forEach(k => {
_subs.get(k)?.forEach(fn => {
try { fn(getPath(_state, key), key); }
catch (e) { console.error(`[State] subscriber error (${k}):`, e); }
});
});
});
}
function get(path) {
return path ? getPath(_state, path) : deepClone(_state);
}
function set(path, value) {
setPath(_state, path, value);
notify([path]);
}
function merge(path, partial) {
const current = getPath(_state, path) || {};
setPath(_state, path, { ...current, ...partial });
notify([path, ...Object.keys(partial).map(k => `${path}.${k}`)]);
}
function batch(fn) {
_batchDepth++;
try { fn(); }
finally {
_batchDepth--;
if (_batchDepth === 0 && _pendingNotify.size > 0) {
const keys = [..._pendingNotify];
_pendingNotify.clear();
notify(keys);
}
}
}
function on(path, fn) {
if (!_subs.has(path)) _subs.set(path, new Set());
_subs.get(path).add(fn);
return () => _subs.get(path)?.delete(fn);
}
function persist(path, storageKey) {
on(path, val => {
try { localStorage.setItem(storageKey || path, JSON.stringify(val)); }
catch (e) { console.warn('[State] persist failed:', e); }
});
}
function reset() {
const { lang, theme } = _state;
_state = deepClone(INITIAL);
_state.lang  = lang;
_state.theme = theme;
notify(['*']);
}
persist('lang',  'cf_lang');
persist('theme', 'cf_theme');
on('scenarios', val => {
try { localStorage.setItem('cf_scenarios', JSON.stringify(val)); }
catch (e) {}
});
return { get, set, merge, batch, on, reset, _raw: () => _state };
})();
