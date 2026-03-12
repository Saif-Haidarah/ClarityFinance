/* ClarityFinance — Dashboard Screen */

const DashboardScreen = (() => {
let _tiltCleanup = null;
function onEnter() {
setTimeout(()=>{
_animateHealthCard();
UI.animateCounters(document.getElementById('s-dashboard'), 90);
UI.animateDonut(document.getElementById('s-dashboard'));
UI.watchCharts(document.getElementById('s-dashboard'));
}, 120);
_tiltCleanup?.();
_tiltCleanup = UI.initTilt(document.querySelector('#s-dashboard .health-card'));
}
function _animateHealthCard() {
const CIRC=188.5, SCORE=State.get('analysis.health')||76;
const ring=document.querySelector('.health-ring-fill');
const bar =document.querySelector('.health-bar-fill');
if(ring) ring.style.strokeDashoffset = CIRC-CIRC*SCORE/100;
if(bar)  bar.style.width = `${SCORE}%`;
const scoreEl=document.getElementById('health-score-num');
if(scoreEl) UI.countTo(scoreEl, SCORE, { duration:1100 });
}
return { onEnter };
})();
const DD = {
toggle(id) {
const body=document.getElementById(id); if(!body) return;
const hdr=body.previousElementSibling;
const open=body.style.display!=='none';
if(open){body.style.maxHeight=body.scrollHeight+'px';body.style.overflow='hidden';body.style.transition='max-height 0.28s var(--ease-out),opacity 0.2s';requestAnimationFrame(()=>{body.style.maxHeight='0';body.style.opacity='0';});body.addEventListener('transitionend',()=>{body.style.display='none';body.style.cssText='';},{once:true});}
else{body.style.display='block';body.style.maxHeight='0';body.style.opacity='0';body.style.overflow='hidden';body.style.transition='max-height 0.32s var(--ease-out),opacity 0.25s';requestAnimationFrame(()=>{body.style.maxHeight=body.scrollHeight+'px';body.style.opacity='1';});body.addEventListener('transitionend',()=>{body.style.maxHeight='';body.style.overflow='';},{once:true});}
hdr?.classList.toggle('open',!open);
}
};
/* ════ whatif-cfa.js ════ */
