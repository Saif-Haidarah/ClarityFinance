/* ClarityFinance — Router (SPA navigation + guards) */

const Router = (() => {
'use strict';
const _screens = new Map();
const NAV_SCREENS = new Set([
'upload','validation','mapping','dashboard',
'insights','duediligence','reports','whatif',
]);
const _guards = [];
let _current  = null;
let _previous = null;
let _transitioning = false;
function register(id, config = {}) {
const el = document.getElementById(`s-${id}`);
if (!el) { console.warn(`[Router] screen #s-${id} not found`); return; }
_screens.set(id, { el, initialized: false, ...config });
}
function guard(fn) { _guards.push(fn); }
async function go(id, opts = {}) {
if (_transitioning) return;
if (id === _current && !opts.force) return;
for (const g of _guards) {
const ok = await Promise.resolve(g(id, _current));
if (ok === false) return;
}
const screen = _screens.get(id);
if (!screen) { console.error(`[Router] unknown screen: ${id}`); return; }
_transitioning = true;
try {
if (_current) {
const cur = _screens.get(_current);
cur?.onLeave?.(_current);
cur?.el?.classList.remove('active');
cur?.el && (cur.el.style.display = 'none');
}
_previous = _current;
_current  = id;
if (!screen.initialized) {
screen.init?.();
screen.initialized = true;
}
screen.el.style.display = 'block';
void screen.el.offsetWidth;
screen.el.classList.add('active');
screen.el.scrollTop = 0;
screen.onEnter?.(id, _previous);
State.set('screen', id);
State.set('ui.navVisible', NAV_SCREENS.has(id));
_syncNav(id);
_syncNavVisibility(id);
if (!opts.silent && id !== 'login') {
history.pushState({ screen: id }, '', `#${id}`);
}
} finally {
_transitioning = false;
}
}
function _syncNav(id) {
document.querySelectorAll('.nav-item[data-screen]').forEach(btn => {
btn.classList.toggle('active', btn.dataset.screen === id);
});
}
function _syncNavVisibility(id) {
const nav = document.getElementById('global-nav');
if (!nav) return;
const visible = NAV_SCREENS.has(id);
nav.style.display = visible ? 'flex' : 'none';
nav.style.transform = visible ? 'translateY(0)' : 'translateY(100%)';
}
window.addEventListener('popstate', e => {
const id = e.state?.screen || 'login';
go(id, { silent: true });
});
return {
register,
guard,
go,
back: () => {
if (_previous) go(_previous);
else history.back();
},
get current()  { return _current; },
get previous() { return _previous; },
};
})();
'use strict';
const FileScreen = (() => {
const CATS = [
{ label:'Revenue',       re:/revenue|sales|income|إيراد|مبيع/i,      bg:'var(--green4)', color:'var(--green)',  border:'var(--green3)' },
{ label:'Cost of Sales', re:/cost|cogs|تكلفة/i,                      bg:'#FFF7ED',       color:'#9A3412',       border:'#FED7AA' },
{ label:'Salaries',      re:/salary|salaries|wage|راتب|رواتب/i,       bg:'var(--blue2)',  color:'var(--blue)',   border:'#BFDBFE' },
{ label:'Rent',          re:/rent|إيجار/i,                            bg:'var(--amber2)', color:'var(--amber)',  border:'#FDE68A' },
{ label:'Marketing',     re:/market|تسويق/i,                          bg:'#F5F3FF',       color:'#6D28D9',       border:'#DDD6FE' },
{ label:'Admin',         re:/admin|إدار/i,                            bg:'var(--surface2)',color:'var(--ink2)', border:'var(--border)' },
{ label:'Date',          re:/date|تاريخ|period|فترة/i,               bg:'var(--surface2)',color:'var(--muted)',border:'var(--border)' },
{ label:'Amount',        re:/amount|value|total|مبلغ|قيمة|إجمالي/i,  bg:'var(--green4)', color:'var(--green)',  border:'var(--green3)' },
];
const FALLBACK = { label:'Other', bg:'var(--surface2)', color:'var(--muted)', border:'var(--border)' };
const HIGH_CONF = new Set(['Revenue','Amount','Cost of Sales','Salaries','Rent']);
function guessCategory(h) {
return CATS.find(c => c.re.test(h)) || FALLBACK;
}
function onDragOver(e)  { e.preventDefault(); document.getElementById('drop-zone')?.classList.add('drag'); }
function onDragLeave()  { document.getElementById('drop-zone')?.classList.remove('drag'); }
function onDrop(e)      { e.preventDefault(); onDragLeave(); const f=e.dataTransfer.files[0]; if(f) processFile(f); }
function onFileInput(i) { if(i.files?.[0]) processFile(i.files[0]); }
function processFile(f) {
const isAr = State.get('lang') === 'ar';
if (f.size > 10*1024*1024) { UI.toast(isAr?'الملف أكبر من 10MB':'File exceeds 10MB','error'); return; }
const ext = f.name.split('.').pop().toLowerCase();
if (!['xlsx','xls','csv'].includes(ext)) { UI.toast(isAr?'يُقبل xlsx,xls,csv فقط':'Only xlsx,xls,csv','error'); return; }
State.merge('file', { name: f.name, size: f.size, ext });
_showFilePreview(f);
const reader = new FileReader();
reader.onload = e => {
try {
const wb   = XLSX.read(new Uint8Array(e.target.result), { type:'array' });
const ws   = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
_onParsed(rows);
} catch(err) {
UI.toast(`Parse error: ${err.message}`, 'error');
}
};
reader.readAsArrayBuffer(f);
}
function _showFilePreview(f) {
const nameEl = document.getElementById('file-name');
const metaEl = document.getElementById('file-meta');
const prevEl = document.getElementById('file-preview');
if (nameEl) nameEl.textContent = f.name;
if (metaEl) metaEl.textContent = `${(f.size/1024).toFixed(0)} KB · ${f.name.split('.').pop().toUpperCase()}`;
if (prevEl) prevEl.style.display = 'flex';
}
function _onParsed(rows) {
const isAr   = State.get('lang') === 'ar';
if (!rows || rows.length < 2) { UI.toast(isAr?'الملف فارغ':'File empty','warn'); return; }
const headers  = rows[0].map(h => String(h).trim());
const dataRows = rows.slice(1).filter(r => r.some(c => c!==''&&c!==null));
const mapping = {};
headers.forEach(h => { mapping[h] = guessCategory(h).label; });
State.batch(() => {
State.merge('file', { headers, rows: dataRows, errors: _validate(headers, dataRows) });
State.merge('mapping', { items: mapping, progress: 0, confirmed: 0, manual: 0 });
});
_renderPreview(headers, dataRows);
const wrap = document.getElementById('data-preview-wrap');
if (wrap) { wrap.style.display='block'; wrap.scrollIntoView({behavior:'smooth',block:'nearest'}); }
DB.saveFileState();
}
function _validate(headers, rows) {
const isAr = State.get('lang')==='ar';
const errs=[], warns=[];
const seen={};
headers.forEach((h,i)=>{
if(!h) errs.push({type:'error',msg:isAr?`عمود بلا اسم موضع ${i+1}`:`Unnamed col at ${i+1}`});
if(h&&seen[h]) errs.push({type:'error',msg:isAr?`عمود مكرر: ${h}`:`Duplicate: ${h}`});
seen[h]=true;
});
const numCols = headers.filter((_,ci)=>{
const vals=rows.map(r=>r[ci]);
return vals.filter(v=>v!==''&&!isNaN(parseFloat(String(v).replace(/,/g,'')))).length/vals.length>.65;
}).length;
if(!numCols) warns.push({type:'warn',msg:isAr?'لا أعمدة أرقام':'No numeric columns'});
const emptyRows=rows.filter(r=>r.every(c=>c===''||c===null)).length;
if(emptyRows) warns.push({type:'warn',msg:isAr?`${emptyRows} صف فارغ`:`${emptyRows} empty rows`});
return [...errs,...warns];
}
function _renderPreview(headers, rows) {
const badge = document.getElementById('preview-rows-badge');
const chips = document.getElementById('col-chips');
const tbl   = document.getElementById('preview-table');
const sum   = document.getElementById('parse-summary');
const isAr  = State.get('lang')==='ar';
if(badge) badge.textContent = `${rows.length} ${isAr?'صف':'rows'}`;
if(chips) chips.innerHTML = headers.map(h=>{
const c=guessCategory(h);
return `<span class="file-chip" style="background:${c.bg};color:${c.color};border:1px solid ${c.border}">${UI.esc(h)}</span>`;
}).join('');
if(tbl) tbl.innerHTML =
`<thead><tr>${headers.map(h=>`<th>${UI.esc(h)}</th>`).join('')}</tr></thead>`+
`<tbody>${rows.slice(0,7).map(row=>
`<tr>${headers.map((_,ci)=>`<td>${UI.esc(String(row[ci]??''))}</td>`).join('')}</tr>`
).join('')}${rows.length>7?`<tr><td colspan="${headers.length}" class="tbl-more">…${rows.length-7} ${isAr?'صف إضافي':'more rows'}</td></tr>`:''}</tbody>`;
if(sum) {
const errors = State.get('file.errors') || [];
const numCols = headers.filter((_,ci)=>{
const vals=rows.map(r=>r[ci]);
return vals.filter(v=>v!==''&&!isNaN(parseFloat(String(v).replace(/,/g,'')))).length/vals.length>.65;
}).length;
sum.innerHTML = [
`<span class="badge badge-green">${rows.length} ${isAr?'صف':'rows'}</span>`,
`<span class="badge badge-blue">${headers.length} ${isAr?'عمود':'cols'}</span>`,
`<span class="badge badge-green">${numCols} ${isAr?'عمود أرقام':'numeric'}</span>`,
...errors.filter(e=>e.type==='error').map(e=>`<span class="badge badge-red">${UI.esc(e.msg)}</span>`),
...errors.filter(e=>e.type==='warn').map(e=>`<span class="badge badge-amber">${UI.esc(e.msg)}</span>`),
...(!errors.length?[`<span class="badge badge-green">✓ ${isAr?'الملف سليم':'File OK'}</span>`]:[]),
].join('');
}
}
function clearFile() {
const inp=document.getElementById('file-input'), prev=document.getElementById('file-preview'), wrap=document.getElementById('data-preview-wrap');
if(inp)  inp.value='';
if(prev) prev.style.display='none';
if(wrap) wrap.style.display='none';
State.merge('file',{name:null,size:null,ext:null,raw:null,rows:[],headers:[],errors:[]});
}
function setCurrency(cur, btn) {
State.set('file.currency', cur);
['cur-sar','cur-usd','cur-eur'].forEach(id=>{
const el=document.getElementById(id);
if(el) el.className=`btn btn-sm ${el.id===btn.id?'btn-primary':'btn-ghost'}`;
});
}
function start() {
const errors = State.get('file.errors')?.filter(e=>e.type==='error') || [];
const rows   = State.get('file.rows') || [];
const isAr   = State.get('lang')==='ar';
if(!rows.length) { Router.go('validation'); return; }
if(errors.length) {
const msg = (isAr?'أخطاء:\n':'Errors:\n') + errors.map(e=>`• ${e.msg}`).join('\n') + '\n\n' + (isAr?'هل تريد المتابعة؟':'Continue anyway?');
if(!confirm(msg)) return;
}
MappingScreen.inject();
Router.go('validation');
}
function onEnter() {
const { headers, rows } = State.get('file');
if(headers?.length && rows?.length) _renderPreview(headers, rows);
}
return { onDragOver, onDragLeave, onDrop, onFileInput, clearFile, setCurrency, start, onEnter, guessCategory };
})();
const UPLOAD = {
dragOver:   e   => FileScreen.onDragOver(e),
dragLeave:  ()  => FileScreen.onDragLeave(),
drop:       e   => FileScreen.onDrop(e),
fileChosen: i   => FileScreen.onFileInput(i),
clearFile:  ()  => FileScreen.clearFile(),
setCur:     (c,b)=> FileScreen.setCurrency(c,b),
start:      ()  => FileScreen.start(),
};
const ValidationScreen = (() => {
function run() {
const steps = [...document.querySelectorAll('#val-steps .val-step')];
const proc  = document.getElementById('val-processing');
const succ  = document.getElementById('val-success');
if(!proc) return;
steps.forEach(s=>{ s.classList.remove('active','done'); s.style.opacity='0.35'; });
proc.style.display='block';
if(succ) succ.style.display='none';
let i=0;
function next(){
if(i<steps.length){
if(i>0){ steps[i-1].classList.remove('active'); steps[i-1].classList.add('done'); steps[i-1].style.opacity='1'; }
steps[i].classList.add('active'); steps[i].style.opacity='1'; i++;
setTimeout(next, 660);
} else {
steps[i-1]?.classList.add('done');
setTimeout(()=>{
proc.style.display='none';
if(succ){ succ.style.display='block'; succ.style.animation='scaleIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both'; }
}, 380);
}
}
setTimeout(next, 360);
}
return { run };
})();
const VALIDATE = ValidationScreen;
const MappingScreen = (() => {
const CATS=['Revenue','Cost of Sales','Salaries','Rent','Marketing','Admin','Assets','Liabilities','Other'];
function inject() {
const list = document.getElementById('map-list');
if(!list) return;
const headers = State.get('file.headers') || [];
const isAr    = State.get('lang')==='ar';
if(!headers.length) return;
let autoN=0, reviewN=0, manualN=0;
const items = headers.map((col,i)=>{
const cat    = FileScreen.guessCategory(col);
const isHigh = ['Revenue','Amount','Cost of Sales','Salaries','Rent'].includes(cat.label);
const conf   = isHigh ? 85+Math.floor(Math.random()*13) : 45+Math.floor(Math.random()*38);
const status = conf>=84?'auto':conf>=62?'review':'manual';
const id     = `mri-${i}`;
if(status==='auto')   autoN++;
if(status==='review') reviewN++;
if(status==='manual') manualN++;
if(status==='auto') return `
<div class="map-item" data-status="auto">
<div class="map-item-main"><div class="map-item-name">${UI.esc(col)}</div><div class="map-item-cat">${cat.label}</div></div>
<div class="map-item-end"><span class="conf-pill conf-high">${conf}%</span><span class="map-check">✓</span></div>
</div>`;
if(status==='review') return `
<div class="map-item map-item-review" data-status="review" id="${id}">
<div class="map-review-header">
<div class="map-item-main"><div class="map-item-name">${UI.esc(col)}</div><div class="map-item-cat">${isAr?'مقترح:':'Suggested:'} ${cat.label}</div></div>
<span class="conf-pill conf-medium">${conf}%</span>
</div>
<div class="map-review-actions">
<button class="btn btn-sm btn-primary" onclick="MappingScreen.confirm(this,'${id}')">${isAr?'تأكيد ✓':'Confirm ✓'}</button>
<select class="map-select">${CATS.map(c=>`<option${c===cat.label?' selected':''}>${c}</option>`).join('')}</select>
</div>
</div>`;
return `
<div class="map-item map-item-manual" data-status="manual" id="${id}">
<div class="map-review-header">
<div class="map-item-main"><div class="map-item-name">${UI.esc(col)}</div><div class="map-item-cat" style="color:var(--red)">${isAr?'غير معروف':'Unknown'}</div></div>
<span class="conf-pill conf-low">${conf}%</span>
</div>
<select class="map-select" onchange="MappingScreen.manualSelect(this,'${id}')">
<option value="">${isAr?'— اختر الفئة —':'— Select category —'}</option>
${CATS.map(c=>`<option>${c}</option>`).join('')}
</select>
</div>`;
});
list.innerHTML=`
<div class="map-cat-header open" onclick="MappingScreen.toggleCat(this)">
<div class="map-cat-icon" style="background:var(--green4);color:var(--green)">📂</div>
<div class="map-cat-info"><div class="map-cat-name">${isAr?'الأعمدة المكتشفة':'Detected Columns'}</div><div class="map-cat-sub">${headers.length} ${isAr?'عمود':'columns'}</div></div>
<svg class="map-cat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
</div>
<div class="map-cat-body">${items.join('')}</div>`;
const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
s('map-count-auto',autoN); s('map-count-review',reviewN); s('map-count-manual',manualN);
const pct=Math.round(autoN/headers.length*100);
const bar=document.getElementById('map-progress');
const lbl=document.getElementById('map-pct-label');
if(bar)bar.style.width=`${pct}%`;
if(lbl)lbl.textContent=`${autoN} / ${headers.length}`;
State.merge('mapping',{progress:pct,confirmed:0,manual:0});
}
function _resolveItem(itemId, catText) {
const item=document.getElementById(itemId);
if(!item) return;
item.className='map-item map-item-done'; item.dataset.status='auto';
item.style.animation='scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both';
item.innerHTML=`<div style="display:flex;align-items:center;gap:12px"><div class="map-item-main"><div class="map-item-name">${itemId.replace(/mri-/,'Col ')}</div><div class="map-item-cat">${catText}</div></div><div class="map-item-end"><span class="conf-pill conf-high">✓</span><span class="map-check">✓</span></div></div>`;
_updateProgress();
}
function confirm(btn, itemId) {
const item=document.getElementById(itemId);
const sel=item?.querySelector('select');
const cat=sel?.options[sel.selectedIndex]?.textContent||'';
State.set('mapping.confirmed', State.get('mapping.confirmed')+1);
_resolveItem(itemId, cat);
}
function manualSelect(sel, itemId) {
if(!sel.value) return;
State.set('mapping.manual', State.get('mapping.manual')+1);
_resolveItem(itemId, sel.options[sel.selectedIndex].textContent);
}
function _updateProgress() {
const { confirmed, manual } = State.get('mapping');
const headers = State.get('file.headers') || [];
const done  = Math.min(confirmed+manual+Math.floor(headers.length*.7), headers.length);
const pct   = Math.min(Math.round(done/Math.max(headers.length,1)*100),100);
const bar=document.getElementById('map-progress');
const lbl=document.getElementById('map-pct-label');
if(bar)bar.style.width=`${pct}%`;
if(lbl)lbl.textContent=`${done} / ${headers.length}`;
State.set('mapping.progress', pct);
}
function filter(type, btn) {
document.querySelectorAll('.map-item').forEach(el=>{el.style.display=(type==='all'||el.dataset.status===type)?'':'none';});
document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));
btn.classList.add('active');
}
function toggleCat(hdr) {
const body=hdr.nextElementSibling; if(!body) return;
const open=body.style.display!=='none';
if(open){ body.style.maxHeight=body.scrollHeight+'px'; body.style.overflow='hidden'; body.style.transition='max-height 0.28s var(--ease-out),opacity 0.2s'; requestAnimationFrame(()=>{body.style.maxHeight='0';body.style.opacity='0';}); body.addEventListener('transitionend',()=>{body.style.display='none';body.style.cssText='';},{once:true}); }
else { body.style.display='block'; body.style.maxHeight='0'; body.style.opacity='0'; body.style.overflow='hidden'; body.style.transition='max-height 0.32s var(--ease-out),opacity 0.25s'; requestAnimationFrame(()=>{body.style.maxHeight=body.scrollHeight+'px';body.style.opacity='1';}); body.addEventListener('transitionend',()=>{body.style.maxHeight='';body.style.overflow='';},{once:true}); }
hdr.classList.toggle('open',!open);
}
function onEnter() { inject(); }
return { inject, confirm, manualSelect, filter, toggleCat, onEnter };
})();
const MAPPING = MappingScreen;
const ProcessingScreen = (() => {
const CIRC=314;
function _spring(from, to, stiffness, damping, onUpdate, onDone) {
let pos=from, vel=0, rafId;
function tick(){
vel=(vel+(to-pos)*stiffness)*damping; pos+=vel;
onUpdate(pos);
if(Math.abs(to-pos)<0.08&&Math.abs(vel)<0.08){onUpdate(to);onDone?.();}
else rafId=requestAnimationFrame(tick);
}
rafId=requestAnimationFrame(tick);
return ()=>cancelAnimationFrame(rafId);
}
function run() {
const ring=document.getElementById('proc-ring');
const pctEl=document.getElementById('proc-pct');
const steps=[...document.querySelectorAll('#proc-list .proc-step')];
if(!steps.length) return;
steps.forEach(s=>s.classList.remove('active','done'));
if(ring)  ring.style.strokeDashoffset=CIRC;
if(pctEl) pctEl.textContent='0%';
const targets=[22,48,74,100];
let step=0;
function nextStep(){
if(step>=steps.length){ setTimeout(()=>Router.go('dashboard'),550); return; }
steps[step].classList.add('active');
const pctTarget  = targets[step];
const prevOffset = step===0?CIRC:CIRC*(1-targets[step-1]/100);
const stop=_spring(prevOffset,CIRC*(1-pctTarget/100),.045,.82,
v=>{ if(ring)ring.style.strokeDashoffset=v; if(pctEl)pctEl.textContent=`${Math.round((1-v/CIRC)*100)}%`; },
()=>{ steps[step].classList.remove('active'); steps[step].classList.add('done'); step++; setTimeout(nextStep,320); }
);
}
setTimeout(nextStep,400);
}
return { run };
})();
const PROC = ProcessingScreen;
