/* ClarityFinance — App Controller + CF Shim */

const WHATIF = WhatIfScreen;
const App = (() => {
'use strict';
function initParticles() {
const canvas = document.getElementById('particle-canvas');
if (!canvas) return;
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
gl ? _webglParticles(canvas, gl) : _canvas2dParticles(canvas);
}
function _webglParticles(canvas, gl) {
let W = 0, H = 0;
const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; gl.viewport(0,0,W,H); };
resize(); window.addEventListener('resize', resize, { passive: true });
const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; };
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, `
attribute vec2 a_pos; attribute float a_size,a_alpha;
uniform vec2 u_res; varying float v_alpha;
void main(){vec2 c=(a_pos/u_res)*2.-1.; gl_Position=vec4(c*vec2(1,-1),0,1); gl_PointSize=a_size; v_alpha=a_alpha;}`));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, `
precision mediump float; varying float v_alpha; uniform vec3 u_col;
void main(){vec2 c=gl_PointCoord-.5; if(length(c)>.5)discard;
gl_FragColor=vec4(u_col,v_alpha*smoothstep(.5,.25,length(c)));}`));
gl.linkProgram(prog); gl.useProgram(prog);
const N=60, pos=new Float32Array(N*2), sz=new Float32Array(N), al=new Float32Array(N), vel=new Float32Array(N*2);
for(let i=0;i<N;i++){pos[i*2]=Math.random()*innerWidth;pos[i*2+1]=Math.random()*innerHeight;sz[i]=Math.random()*3.5+1;al[i]=Math.random()*.5+.08;vel[i*2]=(Math.random()-.5)*.4;vel[i*2+1]=(Math.random()-.5)*.4;}
const [pb,sb,ab]=[gl.createBuffer(),gl.createBuffer(),gl.createBuffer()];
const aPos=gl.getAttribLocation(prog,'a_pos'),aSz=gl.getAttribLocation(prog,'a_size'),aAl=gl.getAttribLocation(prog,'a_alpha');
const uRes=gl.getUniformLocation(prog,'u_res'),uCol=gl.getUniformLocation(prog,'u_col');
gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
const bind=(buf,data,attr,n)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,n,gl.FLOAT,false,0,0);};
function frame(){
for(let i=0;i<N;i++){pos[i*2]=(pos[i*2]+vel[i*2]+W)%W;pos[i*2+1]=(pos[i*2+1]+vel[i*2+1]+H)%H;}
gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
bind(pb,pos,aPos,2); bind(sb,sz,aSz,1); bind(ab,al,aAl,1);
gl.uniform2f(uRes,W,H);
const dk=document.documentElement.dataset.theme==='dark';
gl.uniform3f(uCol,dk?.24:.14,dk?.65:.40,dk?.40:.26);
gl.drawArrays(gl.POINTS,0,N);
requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}
function _canvas2dParticles(canvas) {
const ctx=canvas.getContext('2d'); let W,H;
const N=40, ps=Array.from({length:N},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.38,vy:(Math.random()-.5)*.38,r:Math.random()*2.2+.8,a:Math.random()*.45+.1}));
const resize=()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight;};
resize(); window.addEventListener('resize',resize,{passive:true});
function frame(){
ctx.clearRect(0,0,W,H);
const dk=document.documentElement.dataset.theme==='dark', col=dk?'93,214,138':'26,92,64';
ps.forEach(p=>{p.x=(p.x+p.vx+W)%W;p.y=(p.y+p.vy+H)%H;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${col},${p.a})`;ctx.fill();});
for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const dx=ps[i].x-ps[j].x,dy=ps[i].y-ps[j].y,d=Math.hypot(dx,dy);if(d<115){ctx.beginPath();ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);ctx.strokeStyle=`rgba(${col},${(1-d/115)*.14})`;ctx.lineWidth=.7;ctx.stroke();}}
requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}
function registerScreens() {
Router.register('login', {
onEnter: () => {
initParticles();
}
});
Router.register('upload', {
onEnter: () => FileScreen.onEnter(),
});
Router.register('validation', {
onEnter: () => ValidationScreen.run(),
});
Router.register('mapping', {
onEnter: () => MappingScreen.onEnter(),
});
Router.register('processing', {
onEnter: () => ProcessingScreen.run(),
});
Router.register('dashboard', {
onEnter: () => DashboardScreen.onEnter(),
});
Router.register('insights', { onEnter: () => InsightsScreen.onEnter() });
Router.register('duediligence', { onEnter: () => DDScreen.onEnter() });
Router.register('reports', { onEnter: () => ReportsScreen.onEnter() });
Router.register('whatif', {
onEnter: () => WhatIfScreen.onEnter(),
});
}
function wireReactivity() {
State.on('lang', lang => UI.applyLang(lang));
State.on('theme', theme => UI.applyTheme(theme));
State.on('ui.navVisible', visible => {
const nav = document.getElementById('global-nav');
if (nav) nav.style.display = visible ? 'flex' : 'none';
});
}
function registerGuards() {
const needsFile = new Set(['validation','mapping','processing','dashboard','insights','reports','duediligence','whatif']);
Router.guard((to) => {
if (needsFile.has(to) && !State.get('file.rows')?.length && !State.get('analysis.ready')) {
UI.toast(State.get('lang') === 'ar' ? 'يرجى رفع ملف أولاً' : 'Please upload a file first', 'warn');
Router.go('upload');
return false;
}
});
}
function toggleLang() {
const next = State.get('lang') === 'ar' ? 'en' : 'ar';
State.set('lang', next);
UI.applyLang(next);
const cur = State.get('screen');
if (cur === 'insights')          InsightsScreen.onEnter();
else if (cur === 'duediligence') DDScreen.onEnter();
else if (cur === 'reports')      ReportsScreen.onEnter();
else if (cur === 'whatif')       WHATIF.update();
}
function toggleTheme() {
const next = State.get('theme') === 'light' ? 'dark' : 'light';
State.set('theme', next);
}
async function init() {
UI.applyTheme(State.get('theme'));
UI.applyLang(State.get('lang'));
registerScreens();
registerGuards();
wireReactivity();
UI.initRipple();
DB.open().then(() => {
DB.loadScenarios();
DB.loadAnalysis();
});
const hash = location.hash.replace('#', '');
const validDeep = ['upload','dashboard','whatif','insights','reports'];
const hasData   = State.get('file.rows')?.length > 0 || State.get('analysis.ready');
const start     = (validDeep.includes(hash) && hasData) ? hash : 'login';
Router.go(start, { silent: true });
}
return { init, toggleLang, toggleTheme };
})();
// These allow onclick="CF.show('x')" in HTML to still work
const CF = {
show:        id  => Router.go(id),
toggleLang:  ()  => App.toggleLang(),
toggleTheme: ()  => App.toggleTheme(),
get lang()   { return State.get('lang'); },
get theme()  { return State.get('theme'); },
};
document.addEventListener('DOMContentLoaded', () => App.init(), { once: true });
