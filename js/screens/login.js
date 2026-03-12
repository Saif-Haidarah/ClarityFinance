/* ClarityFinance — Login Screen (3 paths) */

const LOGIN = (() => {
'use strict';
const DEMO = {
companyName: 'شركة النخبة للتقنية',
file: {
name: 'demo_data.xlsx',
ext: 'xlsx',
headers: ['الشهر','الإيرادات','تكلفة المنتج','الرواتب','الإيجار','التسويق','الإدارة'],
rows: [
['يناير',   3200000, 980000, 1200000, 280000, 450000, 180000],
['فبراير',  3450000, 1050000,1200000, 280000, 520000, 190000],
['مارس',   3600000, 1100000,1200000, 280000, 490000, 175000],
['أبريل',  3800000, 1160000,1250000, 280000, 510000, 185000],
['مايو',   4100000, 1250000,1250000, 280000, 600000, 195000],
['يونيو',  4350000, 1320000,1300000, 280000, 580000, 200000],
['يوليو',  4200000, 1280000,1300000, 280000, 560000, 195000],
['أغسطس',  4500000, 1380000,1350000, 280000, 620000, 210000],
['سبتمبر', 4700000, 1430000,1350000, 280000, 650000, 215000],
['أكتوبر', 4900000, 1490000,1400000, 280000, 670000, 220000],
['نوفمبر', 5100000, 1550000,1450000, 280000, 700000, 230000],
['ديسمبر', 5400000, 1650000,1500000, 280000, 750000, 245000],
],
errors: [],
currency: 'SAR',
},
analysis: {
ready:    true,
revenue:  51.3,
expenses: 43.2,
profit:   8.1,
runway:   7.6,
health:   79,
margin:   15.8,
monthly: [
{month:'يناير',rev:3.2,exp:3.1},{month:'فبراير',rev:3.45,exp:3.24},
{month:'مارس',rev:3.6,exp:3.25},{month:'أبريل',rev:3.8,exp:3.39},
{month:'مايو',rev:4.1,exp:3.77},{month:'يونيو',rev:4.35,exp:3.68},
{month:'يوليو',rev:4.2,exp:3.62},{month:'أغسطس',rev:4.5,exp:3.84},
{month:'سبتمبر',rev:4.7,exp:3.93},{month:'أكتوبر',rev:4.9,exp:4.06},
{month:'نوفمبر',rev:5.1,exp:4.16},{month:'ديسمبر',rev:5.4,exp:4.43},
],
},
mapping: {
items: {
'الشهر':'Date','الإيرادات':'Revenue','تكلفة المنتج':'Cost of Sales',
'الرواتب':'Salaries','الإيجار':'Rent','التسويق':'Marketing','الإدارة':'Admin',
},
progress: 100,
confirmed: 7,
},
};
function startDemo() {
const card  = document.querySelector('.login-card');
const isAr  = State.get('lang') === 'ar';
const overlay = document.createElement('div');
overlay.className = 'login-demo-loading';
overlay.innerHTML = `
<div class="demo-spinner"></div>
<div class="demo-label">${isAr ? '⚡ جاري تحميل البيانات التجريبية…' : '⚡ Loading demo data…'}</div>
`;
if (card) { card.style.position = 'relative'; card.appendChild(overlay); }
setTimeout(() => {
State.batch(() => {
State.merge('file',     DEMO.file);
State.merge('analysis', DEMO.analysis);
State.merge('mapping',  DEMO.mapping);
});
overlay.remove();
Router.go('dashboard');
UI.toast(isAr ? '✨ وضع التجربة — بيانات وهمية' : '✨ Demo mode — sample data', 'info', 4000);
}, 1100);
}
function openManual() {
document.getElementById('login-paths').style.display = 'none';
const man = document.getElementById('login-manual');
if (man) { man.style.display = 'block'; man.style.animation = 'screenIn 0.28s var(--ease-out) both'; }
}
function backToPaths() {
document.getElementById('login-manual').style.display = 'none';
const paths = document.getElementById('login-paths');
if (paths) { paths.style.display = 'block'; paths.style.animation = 'screenIn 0.28s var(--ease-out) both'; }
}
function submitManual() {
const g    = id => parseFloat(document.getElementById(id)?.value) || 0;
const isAr = State.get('lang') === 'ar';
const rev    = g('m-rev');
const exp    = g('m-exp');
const hc     = g('m-hc')     || 50;
const period = g('m-period') || 12;
const cash   = g('m-cash');
const growth = g('m-growth') || 0;
if (rev <= 0) {
UI.toast(isAr ? 'أدخل قيمة الإيرادات' : 'Enter revenue value', 'warn');
document.getElementById('m-rev')?.focus();
return;
}
if (exp <= 0) {
UI.toast(isAr ? 'أدخل قيمة المصاريف' : 'Enter expenses value', 'warn');
document.getElementById('m-exp')?.focus();
return;
}
const sal  = g('m-sal')  || exp * 0.42;
const rent = g('m-rent') || exp * 0.07;
const mkt  = g('m-mkt')  || exp * 0.10;
const cogs = g('m-cogs') || exp * 0.20;
const profit   = rev - exp;
const margin   = rev > 0 ? (profit / rev) * 100 : 0;
const burnRate = exp / 12;
const runway   = cash > 0 ? cash / burnRate : (profit > 0 ? 24 : 3);
let health = 50;
health += Math.min(25, Math.max(-25, margin * 0.8));
health += Math.min(15, Math.max(-15, runway - 3));
health += Math.min(10, Math.max(-10, growth * 0.4));
health  = Math.max(0, Math.min(100, Math.round(health)));
const monthly = [];
const months_ar = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const months_en = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
for (let i = 0; i < Math.min(period, 12); i++) {
const gFactor = 1 + (growth / 100) * (i / 11);
monthly.push({
month: isAr ? months_ar[i] : months_en[i],
rev: parseFloat((rev / 12 * gFactor).toFixed(2)),
exp: parseFloat((exp / 12).toFixed(2)),
});
}
const rows = monthly.map(m => [m.month, m.rev * 1e6, cogs / 12 * 1e6, sal / 12 * 1e6, rent / 12 * 1e6, mkt / 12 * 1e6, (exp - sal - rent - mkt - cogs) / 12 * 1e6]);
State.batch(() => {
State.merge('file', {
name: isAr ? 'بياناتك.manual' : 'your_data.manual',
ext: 'manual',
headers: isAr
? ['الشهر','الإيرادات','تكلفة المنتج','الرواتب','الإيجار','التسويق','الإدارة']
: ['Month','Revenue','COGS','Salaries','Rent','Marketing','Admin'],
rows,
errors: [],
currency: 'SAR',
headcount: hc,
});
State.merge('analysis', { ready:true, revenue:rev, expenses:exp, profit, runway, health, margin, monthly });
State.merge('mapping', { progress:100, confirmed: 7 });
});
// Manual entry: skip processing animation, go direct to dashboard
const isManual = State.get('file.ext') === 'manual';
if (isManual) {
  UI.toast(State.get('lang')==='ar' ? '⚡ جاري التحليل...' : '⚡ Analyzing...', 'info', 1200);
  setTimeout(() => Router.go('dashboard'), 900);
} else {
  Router.go('processing');
}
}
return { startDemo, openManual, backToPaths, submitManual };
})();

/* ════ insights.js ════ */
