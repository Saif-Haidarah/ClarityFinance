/* ClarityFinance — UI Utilities (toast, animations, i18n) */

const UI = (() => {
'use strict';
const ease = {
outExpo:  t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
outCubic: t => 1 - Math.pow(1 - t, 3),
spring:   t => t <= 0 ? 0 : t >= 1 ? 1
: Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
};
const lerp = (a, b, t) => a + (b - a) * t;
const _rafMap = new Map();
function countTo(el, target, { duration = 900, decimals = 0, suffix = '', prefix = '', easeFn = ease.outExpo } = {}) {
if (!el) return;
const key = el;
cancelAnimationFrame(_rafMap.get(key));
let start = null;
function step(ts) {
if (!start) start = ts;
const t   = Math.min((ts - start) / duration, 1);
const val = target * easeFn(t);
el.textContent = prefix + val.toFixed(decimals) + suffix;
if (t < 1) _rafMap.set(key, requestAnimationFrame(step));
else el.textContent = prefix + target.toFixed(decimals) + suffix;
}
_rafMap.set(key, requestAnimationFrame(step));
}
function animateCounters(container, delayStep = 80) {
container.querySelectorAll('[data-target]').forEach((el, i) => {
setTimeout(() => countTo(el, parseFloat(el.dataset.target), {
decimals: parseInt(el.dataset.decimals || 0),
suffix:   el.dataset.suffix  || '',
prefix:   el.dataset.prefix  || '',
}), i * delayStep);
});
}
function animateBars(svg, { duration = 700, stagger = 55 } = {}) {
svg.querySelectorAll('[data-h]').forEach((bar, i) => {
const targetH = parseFloat(bar.dataset.h);
const targetY = parseFloat(bar.dataset.y);
bar.setAttribute('height', 0);
bar.setAttribute('y', 122);
let start = null;
setTimeout(() => {
function step(ts) {
if (!start) start = ts;
const t = Math.min((ts - start) / duration, 1);
const e = ease.outExpo(t);
bar.setAttribute('height', (targetH * e).toFixed(1));
bar.setAttribute('y',      (122 - targetH * e).toFixed(1));
if (t < 1) requestAnimationFrame(step);
else { bar.setAttribute('height', targetH); bar.setAttribute('y', targetY); }
}
requestAnimationFrame(step);
}, i * stagger);
});
}
function animateDonut(container, { duration = 900, stagger = 140 } = {}) {
container.querySelectorAll('circle[stroke-dasharray]').forEach((seg, i) => {
const parts = seg.getAttribute('stroke-dasharray').split(/\s+/);
if (parts.length < 2) return;
const fill  = parseFloat(parts[0]);
const total = parseFloat(parts[1]) + fill;
seg.setAttribute('stroke-dasharray', `0 ${total}`);
let start = null;
setTimeout(() => {
function step(ts) {
if (!start) start = ts;
const t = Math.min((ts - start) / duration, 1);
const v = fill * ease.outCubic(t);
seg.setAttribute('stroke-dasharray', `${v.toFixed(1)} ${total}`);
if (t < 1) requestAnimationFrame(step);
else seg.setAttribute('stroke-dasharray', `${fill} ${total - fill}`);
}
requestAnimationFrame(step);
}, i * stagger);
});
}
function watchCharts(container) {
const charts = container.querySelectorAll('.live-chart');
if (!charts.length) return;
const io = new IntersectionObserver(entries => {
entries.forEach(e => {
if (e.isIntersecting) {
animateBars(e.target);
io.unobserve(e.target);
}
});
}, { threshold: 0.25 });
charts.forEach(c => io.observe(c));
}
let _toastContainer = null;
function _getToastContainer() {
if (_toastContainer) return _toastContainer;
_toastContainer = document.createElement('div');
_toastContainer.id = 'toast-container';
_toastContainer.style.cssText = [
'position:fixed',
'bottom:calc(var(--nav-h, 64px) + 16px)',
'left:50%',
'transform:translateX(-50%)',
'z-index:9999',
'display:flex',
'flex-direction:column-reverse',
'gap:8px',
'align-items:center',
'pointer-events:none',
'width:min(92vw, 340px)',
].join(';');
document.body.appendChild(_toastContainer);
return _toastContainer;
}
const _toastColors = {
success: ['var(--green5)',   'var(--green2)',  'var(--green)' ],
error:   ['var(--red2)',     'var(--red)',     'var(--red)'   ],
warn:    ['var(--amber2)',   'var(--amber)',   'var(--amber)' ],
info:    ['var(--surface)',  'var(--border)',  'var(--ink2)'  ],
};
function toast(msg, type = 'info', duration = 3500) {
const c    = _toastColors[type] || _toastColors.info;
const t    = document.createElement('div');
const icon = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' }[type] || 'ℹ';
t.style.cssText = [
`background:${c[0]}`,
`border:1.5px solid ${c[1]}`,
`color:${c[2]}`,
'padding:11px 16px',
'border-radius:12px',
'font-size:13px',
'font-weight:600',
'box-shadow:0 4px 20px rgba(0,0,0,0.12)',
'display:flex',
'align-items:center',
'gap:8px',
'width:100%',
'pointer-events:auto',
'cursor:pointer',
'animation:toastIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
].join(';');
t.innerHTML = `<span style="font-size:16px;flex-shrink:0">${icon}</span><span>${msg}</span>`;
t.onclick = () => dismiss(t);
_getToastContainer().prepend(t);
const timer = setTimeout(() => dismiss(t), duration);
t._timer = timer;
return t;
}
function dismiss(el) {
if (!el || el._dismissed) return;
el._dismissed = true;
clearTimeout(el._timer);
el.style.cssText += ';animation:toastOut 0.22s ease-in forwards';
el.addEventListener('animationend', () => el.remove(), { once: true });
}
function initRipple() {
document.addEventListener('pointerdown', e => {
const el = e.target.closest('.btn, .nav-item, .card-hover, [data-ripple]');
if (!el) return;
const r    = document.createElement('span');
r.className = 'ripple';
const rect = el.getBoundingClientRect();
const sz   = Math.max(rect.width, rect.height) * 1.6;
Object.assign(r.style, {
width:  `${sz}px`, height: `${sz}px`,
top:    `${e.clientY - rect.top  - sz / 2}px`,
left:   `${e.clientX - rect.left - sz / 2}px`,
});
el.appendChild(r);
r.addEventListener('animationend', () => r.remove(), { once: true });
});
}
function applyLang(lang) {
const isAr = lang === 'ar';
document.documentElement.lang = lang;
document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
document.querySelectorAll('[data-ar]').forEach(el => {
if (['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return;
if ([...el.childNodes].some(n => n.nodeType === 1)) return;
el.textContent = isAr ? el.dataset.ar : (el.dataset.en || el.dataset.ar || '');
});
document.querySelectorAll('[data-ar-placeholder]').forEach(el => {
el.placeholder = isAr ? el.dataset.arPlaceholder : (el.dataset.enPlaceholder || '');
});
document.querySelectorAll('.lang-toggle').forEach(b => b.textContent = isAr ? 'EN' : 'ع');
}
const _moonSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const _sunSVG  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
function applyTheme(theme) {
document.documentElement.dataset.theme = theme;
document.querySelectorAll('.theme-icon').forEach(el => {
el.style.cssText = 'transform:rotate(90deg) scale(0.4);transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1)';
setTimeout(() => {
el.innerHTML     = theme === 'dark' ? _sunSVG : _moonSVG;
el.style.transform = 'rotate(0deg) scale(1)';
}, 140);
});
}
function initTilt(el) {
if (!el || window.matchMedia('(hover:none)').matches) return;
let tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, running = false;
function tick() {
cur.x = lerp(cur.x, tgt.x, 0.07);
cur.y = lerp(cur.y, tgt.y, 0.07);
el.style.transform = `perspective(900px) rotateX(${-cur.y * 7}deg) rotateY(${cur.x * 7}deg) translateY(-2px)`;
if (Math.hypot(cur.x - tgt.x, cur.y - tgt.y) > 0.005) requestAnimationFrame(tick);
else { running = false; el.style.transform = ''; }
}
const onMove = e => {
const r  = el.getBoundingClientRect();
const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
tgt = Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5 ? { x: dx, y: dy } : { x: 0, y: 0 };
if (!running) { running = true; requestAnimationFrame(tick); }
};
document.addEventListener('mousemove', onMove, { passive: true });
return () => document.removeEventListener('mousemove', onMove);
}
function initReveal(root = document) {
const io = new IntersectionObserver(entries => {
entries.forEach(e => {
if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
});
}, { threshold: 0.1 });
root.querySelectorAll('.reveal').forEach(el => io.observe(el));
return io;
}
const esc = s => String(s)
.replace(/&/g,'&amp;').replace(/</g,'&lt;')
.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function fmtNum(n, { decimals = 1, suffix = 'M', threshold = 1000 } = {}) {
if (Math.abs(n) >= threshold) return (n / threshold).toFixed(decimals) + 'B';
return n.toFixed(decimals) + suffix;
}
return {
ease, lerp,
countTo, animateCounters,
animateBars, animateDonut, watchCharts,
toast, dismiss,
initRipple,
applyLang, applyTheme,
initTilt, initReveal,
esc, fmtNum,
};
})();
