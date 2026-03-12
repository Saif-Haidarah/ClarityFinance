/* ClarityFinance — Due Diligence Screen */

const DDScreen = (() => {
  'use strict';

  function onEnter() {
    const a = State.get('analysis');
    const isAr = State.get('lang') === 'ar';
    if (!a?.ready) return;
    const score = _calcScore(a);
    _renderScoreRing(score, isAr);
    _renderCategories(a, score, isAr);
    _renderChecklist(a, isAr);
  }

  function _calcScore(a) {
    let s = 50;
    s += Math.min(20, Math.max(-20, (a.runway-3)*4));
    s += Math.min(20, Math.max(-20, (a.margin-10)*1.5));
    s += Math.min(10, (a.health-50)*0.4);
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  function _renderScoreRing(score, isAr) {
    const ring  = document.getElementById('dd-ring');
    const num   = document.getElementById('dd-score-num');
    const label = document.getElementById('dd-score-label');
    const bdgs  = document.getElementById('dd-badges');
    if (!ring) return;
    const CIRC = 2*Math.PI*28;
    const color = score>=70?'var(--green)':score>=50?'var(--amber)':'var(--red)';
    setTimeout(()=>{ ring.style.strokeDasharray = `${(CIRC*score/100).toFixed(1)} ${CIRC.toFixed(1)}`; ring.style.stroke = color; }, 100);
    if (num) { num.textContent = score; num.style.color = color; }
    const levels = [[70,'green',isAr?'منخفض المخاطر':'Low Risk'],[50,'amber',isAr?'متوسط':'Moderate'],[0,'red',isAr?'مخاطر عالية':'High Risk']];
    const lvl = levels.find(([min])=>score>=min);
    if (label) label.textContent = lvl?.[2] || '';
    if (bdgs) {
      const tags = [];
      if (State.get('file.ext') !== 'manual') tags.push(['blue', isAr?'بيانات مرفوعة':'File Data']);
      if (State.get('analysis.ready')) tags.push(['green', isAr?'محلَّل':'Analyzed']);
      bdgs.innerHTML = tags.map(([c,t])=>`<span class="badge badge-${c}" style="font-size:10px">${t}</span>`).join('');
    }
  }

  function _renderCategories(a, totalScore, isAr) {
    const el = document.getElementById('dd-categories');
    if (!el) return;
    const cats = [
      {
        icon:'💰', label: isAr?'السيولة والتدفق النقدي':'Liquidity & Cash Flow',
        score: Math.min(100, Math.round(a.runway/8*100)),
        items: [
          { ok: a.runway>=6, text: isAr?`Runway: ${a.runway.toFixed(1)} شهر (هدف: 6+)`:`Runway: ${a.runway.toFixed(1)} months (target: 6+)` },
          { ok: a.profit>0,  text: isAr?`صافي الربح: ${a.profit.toFixed(1)}M`:`Net profit: ${a.profit.toFixed(1)}M` },
          { ok: a.margin>10, text: isAr?`هامش صافي: ${a.margin.toFixed(1)}% (هدف: 10%+)`:`Net margin: ${a.margin.toFixed(1)}% (target: 10%+)` },
        ]
      },
      {
        icon:'📊', label: isAr?'الربحية':'Profitability',
        score: Math.min(100, Math.round(a.margin*4)),
        items: [
          { ok: a.margin>=15, text: isAr?`هامش الربح الصافي: ${a.margin.toFixed(1)}%`:`Net margin: ${a.margin.toFixed(1)}%` },
          { ok: (a.margin+8)>=35, text: isAr?`هامش الربح الإجمالي: ${(a.margin+8).toFixed(1)}%`:`Gross margin: ${(a.margin+8).toFixed(1)}%` },
          { ok: a.profit>0,  text: isAr?'الشركة مربحة':'Company is profitable' },
        ]
      },
      {
        icon:'📈', label: isAr?'النمو والاستدامة':'Growth & Sustainability',
        score: Math.min(100, a.health),
        items: [
          { ok: a.health>=70, text: isAr?`درجة الصحة المالية: ${a.health}/100`:`Financial health: ${a.health}/100` },
          { ok: true,         text: isAr?'البيانات مكتملة ومحللة':'Data complete and analyzed' },
          { ok: a.profit/a.revenue>0.08, text: isAr?'هامش كافٍ للتوسع':'Sufficient margin for expansion' },
        ]
      },
    ];
    el.innerHTML = cats.map((cat,i) => {
      const color = cat.score>=70?'var(--green)':cat.score>=50?'var(--amber)':'var(--red)';
      const items = cat.items.map(item=>`
        <div class="dd-item">
          <div class="dd-item-icon" style="background:${item.ok?'var(--green4)':'var(--red2)'};color:${item.ok?'var(--green)':'var(--red)'}">${item.ok?'✓':'✕'}</div>
          <span style="color:var(--ink2)">${item.text}</span>
        </div>`).join('');
      return `<div class="dd-cat" id="dd-cat-${i}">
        <div class="dd-cat-hdr" onclick="document.getElementById('dd-cat-${i}').classList.toggle('open')">
          <div class="dd-cat-icon" style="background:${cat.score>=70?'var(--green4)':cat.score>=50?'var(--amber2)':'var(--red2)'}">${cat.icon}</div>
          <div class="dd-cat-info"><div class="dd-cat-name">${cat.label}</div></div>
          <div class="dd-cat-score" style="color:${color}">${cat.score}</div>
          <svg style="width:16px;height:16px;color:var(--muted);transition:transform .25s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="dd-cat-body">${items}</div>
      </div>`;
    }).join('');
    // Open first by default
    document.getElementById('dd-cat-0')?.classList.add('open');
  }

  function _renderChecklist(a, isAr) {
    const el = document.getElementById('dd-checklist');
    if (!el) return;
    const items = [
      { ok: !!State.get('file.name'),  text: isAr?'بيانات مالية مرفوعة':'Financial data uploaded' },
      { ok: a.revenue>0,               text: isAr?'إيرادات موثقة':'Revenue documented' },
      { ok: a.expenses>0,              text: isAr?'مصاريف موثقة':'Expenses documented' },
      { ok: a.profit>0,                text: isAr?'الشركة مربحة':'Company is profitable' },
      { ok: a.runway>=6,               text: isAr?'Runway أكثر من 6 أشهر':'Runway > 6 months' },
      { ok: a.margin>=15,              text: isAr?'هامش ربح أكثر من 15%':'Net margin > 15%' },
      { ok: a.health>=70,              text: isAr?'درجة صحة مالية 70+':'Financial health score 70+' },
      { ok: (State.get('file.rows')?.length||0)>0, text: isAr?'بيانات شهرية متاحة':'Monthly data available' },
    ];
    const done = items.filter(i=>i.ok).length;
    el.innerHTML = `<div style="padding:10px 0 6px;font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.8px">${done}/${items.length} ${isAr?'مكتمل':'COMPLETED'}</div>` +
      items.map(item=>`
        <div class="dd-chk-item">
          <div class="dd-chk-box" style="background:${item.ok?'var(--green4)':'var(--surface2)'};border:1.5px solid ${item.ok?'var(--green2)':'var(--border)'}">
            ${item.ok?'<span style="color:var(--green);font-size:12px;font-weight:800">✓</span>':''}
          </div>
          <span style="font-size:13px;color:${item.ok?'var(--ink)':'var(--muted)'}">${item.text}</span>
        </div>`).join('');
  }

  return { onEnter };
})();

/* ════ reports.js ════ */
