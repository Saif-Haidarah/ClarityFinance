/* ClarityFinance — Insights Screen */

const InsightsScreen = (() => {
  'use strict';

  function onEnter() {
    const a   = State.get('analysis');
    const isAr = State.get('lang') === 'ar';
    if (!a?.ready) { _renderEmpty(isAr); return; }
    _renderSubtitle(a, isAr);
    _renderAlerts(a, isAr);
    _renderIncomeTable(a, isAr);
    _renderRatios(a, isAr);
    _renderTrendChart(a);
    _renderDonut(a, isAr);
    _renderRecs(a, isAr);
  }

  function _renderEmpty(isAr) {
    const page = document.getElementById('insights-page');
    if (!page) return;
    const msg = isAr ? 'يرجى رفع بيانات أولاً للحصول على التحليل' : 'Please upload data first to see insights';
    page.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--muted)">${msg}</div>`;
  }

  function _fmt(n, dec=1) { return n.toFixed(dec) + 'M'; }
  function _pct(n, dec=1) { return n.toFixed(dec) + '%'; }

  function _renderSubtitle(a, isAr) {
    const el = document.getElementById('ins-subtitle');
    if (!el) return;
    const file = State.get('file.name') || '';
    el.textContent = isAr
      ? `${file} · إيرادات ${_fmt(a.revenue)} · ربح ${_fmt(a.profit)}`
      : `${file} · Revenue ${_fmt(a.revenue)} · Profit ${_fmt(a.profit)}`;
  }

  function _renderAlerts(a, isAr) {
    const el = document.getElementById('ins-alerts');
    if (!el) return;
    const alerts = _buildAlerts(a, isAr);
    el.innerHTML = alerts.map(al => `
      <div class="ins-alert ins-alert-${al.type}">
        <div class="ins-alert-icon">${al.icon}</div>
        <div style="flex:1">
          <div class="ins-alert-title">${al.title}</div>
          <div class="ins-alert-body">${al.body}</div>
        </div>
        <span class="badge badge-${al.type}" style="align-self:flex-start;font-size:10px">${al.badge}</span>
      </div>`).join('');
  }

  function _buildAlerts(a, isAr) {
    const alerts = [];
    // Runway
    if (a.runway < 3) alerts.push({type:'red', icon:'🚨', badge: isAr?'حرج':'Critical',
      title: isAr?'سيولة حرجة — تدخل فوري':'Critical Liquidity — Immediate Action',
      body: isAr?`مدة الاستمرارية ${a.runway.toFixed(1)} شهر فقط. الحد الأدنى الموصى به 6 أشهر.`:`Only ${a.runway.toFixed(1)} months runway. Minimum recommended: 6 months.`});
    else if (a.runway < 6) alerts.push({type:'amber', icon:'⚠️', badge: isAr?'تحذير':'Warning',
      title: isAr?`Runway منخفض — ${a.runway.toFixed(1)} شهر`:`Low Runway — ${a.runway.toFixed(1)} months`,
      body: isAr?'الهدف المُوصى به 6 أشهر. ابنِ احتياطيك النقدي.':'Target is 6 months. Build your cash reserve.'});
    else alerts.push({type:'green', icon:'✅', badge: isAr?'ممتاز':'Excellent',
      title: isAr?`Runway قوي — ${a.runway.toFixed(1)} شهر`:`Strong Runway — ${a.runway.toFixed(1)} months`,
      body: isAr?'احتياطيك النقدي صحي وأعلى من المعيار.':'Your cash buffer is healthy and above benchmark.'});
    // Margin
    if (a.margin < 10) alerts.push({type:'amber', icon:'📉', badge: isAr?'مراقبة':'Monitor',
      title: isAr?`هامش منخفض ${_pct(a.margin)}`:`Low Margin ${_pct(a.margin)}`,
      body: isAr?`المعيار للقطاع 15%+. خفّض التكاليف أو ارفع الأسعار.`:`Sector benchmark is 15%+. Cut costs or raise prices.`});
    else if (a.margin >= 20) alerts.push({type:'green', icon:'💰', badge: isAr?'قوي':'Strong',
      title: isAr?`هامش ممتاز ${_pct(a.margin)}`:`Excellent Margin ${_pct(a.margin)}`,
      body: isAr?'أعلى من متوسط القطاع. أداء تشغيلي قوي.':'Above sector average. Strong operational performance.'});
    // Growth (if monthly data)
    const monthly = a.monthly || [];
    if (monthly.length >= 2) {
      const first = monthly[0].rev, last = monthly[monthly.length-1].rev;
      const growth = first > 0 ? ((last-first)/first)*100 : 0;
      if (growth > 5) alerts.push({type:'green', icon:'📈', badge: isAr?'إيجابي':'Positive',
        title: isAr?`نمو إيرادات ${growth.toFixed(1)}%`:`Revenue Growth ${growth.toFixed(1)}%`,
        body: isAr?`الإيرادات ارتفعت من ${_fmt(first)} إلى ${_fmt(last)}.`:`Revenue grew from ${_fmt(first)} to ${_fmt(last)}.`});
    }
    return alerts.slice(0, 4); // max 4
  }

  function _renderIncomeTable(a, isAr) {
    const tbl = document.getElementById('ins-income-table');
    const bdg = document.getElementById('ins-period-badge');
    if (!tbl) return;
    const file = State.get('file.name') || '';
    if (bdg) bdg.textContent = file || (isAr?'بياناتك':'Your Data');
    const grossProfit = a.revenue - (a.expenses * 0.55);
    const grossMargin = a.revenue > 0 ? (grossProfit/a.revenue)*100 : 0;
    const rows = [
      [isAr?'إجمالي الإيرادات':'Total Revenue',      _fmt(a.revenue), 'var(--green)', ''],
      [isAr?'تكلفة المبيعات':'Cost of Sales',         `(${_fmt(a.expenses*0.55)})`, 'var(--red)', 'sub'],
      [isAr?'مجمل الربح':'Gross Profit',              _fmt(grossProfit), 'var(--green)', 'highlight'],
      [isAr?'المصاريف التشغيلية':'Operating Expenses',`(${_fmt(a.expenses*0.45)})`, 'var(--red)', 'sub'],
      [isAr?'صافي الربح':'Net Profit',               _fmt(a.profit), 'var(--green)', 'highlight'],
      [isAr?'هامش الربح الصافي':'Net Margin',         _pct(a.margin), 'var(--green)', 'meta'],
    ];
    tbl.innerHTML = rows.map(([label, val, color, type]) => {
      const bg = type==='highlight'?'background:var(--green5)':'';
      const lStyle = type==='sub'?'color:var(--ink2);padding-inline-start:20px':'font-weight:700;color:var(--ink)';
      const vStyle = `font-family:'Space Grotesk',sans-serif;font-weight:700;color:${color};text-align:end`;
      const meta = type==='meta'?'font-size:12px;color:var(--muted)':'';
      return `<tr style="${bg}"><td style="${lStyle};${meta}">${label}</td><td style="${vStyle};${meta}">${val}</td></tr>`;
    }).join('');
  }

  function _renderRatios(a, isAr) {
    const el = document.getElementById('ins-ratios');
    if (!el) return;
    const ratios = [
      { label: isAr?'هامش الربح الإجمالي':'Gross Margin', val: a.margin + 8, bench: 35, unit:'%' },
      { label: isAr?'هامش الربح الصافي':'Net Margin',     val: a.margin,       bench: 15, unit:'%' },
      { label: isAr?'معدل نمو الإيرادات':'Revenue Growth', val: 12.5,           bench: 5,  unit:'%' },
      { label: isAr?'مؤشر السيولة':'Liquidity Ratio',     val: Math.min(a.runway/6*100, 100), bench: 100, unit:'' },
    ];
    el.innerHTML = ratios.map(r => {
      const pct = Math.min(r.val/Math.max(r.bench*1.5,1)*100, 100);
      const ok  = r.val >= r.bench;
      const color = ok ? 'var(--green)' : r.val >= r.bench*0.7 ? 'var(--amber)' : 'var(--red)';
      const icon  = ok ? '✓' : '⚠';
      const bText = isAr ? `المعيار: ${r.bench}${r.unit} ${icon}` : `Benchmark: ${r.bench}${r.unit} ${icon}`;
      return `<div>
        <div class="ins-ratio-row"><span style="color:var(--ink2)">${r.label}</span><span class="ins-ratio-val" style="color:${color}">${r.val.toFixed(1)}${r.unit}</span></div>
        <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${bText}</div>
      </div>`;
    }).join('');
  }

  function _renderTrendChart(a) {
    const svg = document.getElementById('ins-trend-chart');
    const badge = document.getElementById('ins-trend-badge');
    if (!svg) return;
    const monthly = (a.monthly || []).slice(0, 12);
    if (monthly.length < 2) { svg.innerHTML = `<text x="150" y="40" text-anchor="middle" fill="var(--muted)" font-size="12">No monthly data</text>`; return; }
    const vals = monthly.map(m => m.rev);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const W = 300, H = 70, pad = 10;
    const pts = vals.map((v,i) => {
      const x = pad + (i/(vals.length-1))*(W-2*pad);
      const y = pad + (1-(v-min)/range)*(H-2*pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const growth = vals.length >= 2 ? ((vals[vals.length-1]-vals[0])/vals[0]*100) : 0;
    const color = growth >= 0 ? 'var(--green)' : 'var(--red)';
    if (badge) {
      badge.textContent = `${growth>=0?'+':''}${growth.toFixed(1)}%`;
      badge.className = `badge badge-${growth>=0?'green':'red'}`;
    }
    svg.innerHTML = `
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".25"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${pts} ${(W-pad).toFixed(1)},${H} ${pad},${H}" fill="url(#tg)"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${vals.map((v,i)=>{ const x=pad+(i/(vals.length-1))*(W-2*pad); const y=pad+(1-(v-min)/range)*(H-2*pad); return i===vals.length-1?`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}"/>`:``; }).join('')}`;
  }

  function _renderDonut(a, isAr) {
    const svg = document.getElementById('ins-donut');
    const leg = document.getElementById('ins-donut-legend');
    if (!svg || !leg) return;
    const cats = [
      { label: isAr?'رواتب':'Salaries',   pct: 0.42, color:'var(--green)' },
      { label: isAr?'تكلفة منتج':'COGS',  pct: 0.25, color:'var(--blue)' },
      { label: isAr?'تسويق':'Marketing',  pct: 0.12, color:'var(--amber)' },
      { label: isAr?'إيجار':'Rent',       pct: 0.09, color:'#A855F7' },
      { label: isAr?'إدارة':'Admin',      pct: 0.12, color:'var(--muted)' },
    ];
    const R=30, CX=40, CY=40, CIRC=2*Math.PI*R;
    let offset = 0;
    svg.innerHTML = cats.map(c => {
      const arc = CIRC * c.pct;
      const seg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${c.color}" stroke-width="10" stroke-dasharray="${arc.toFixed(2)} ${(CIRC-arc).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${CX} ${CY})"/>`;
      offset += arc;
      return seg;
    }).join('') + `<circle cx="${CX}" cy="${CY}" r="20" fill="var(--surface)"/><text x="${CX}" y="${CY+5}" text-anchor="middle" font-size="11" font-family="'Bebas Neue',sans-serif" fill="var(--ink)">${_fmt(a.expenses)}</text>`;
    leg.innerHTML = cats.map(c => `
      <div style="display:flex;align-items:center;gap:7px;font-size:11.5px">
        <span style="width:10px;height:10px;border-radius:3px;background:${c.color};flex-shrink:0"></span>
        <span style="color:var(--ink2);flex:1">${c.label}</span>
        <span style="font-weight:700;color:var(--ink);font-family:'Space Grotesk',sans-serif">${(c.pct*100).toFixed(0)}%</span>
      </div>`).join('');
  }

  function _renderRecs(a, isAr) {
    const el = document.getElementById('ins-recs');
    if (!el) return;
    const recs = [];
    if (a.runway < 6) recs.push({ priority:1, color:'var(--red)',
      title: isAr?'ابنِ احتياطيك النقدي':'Build cash reserve',
      body: isAr?`Runway ${a.runway.toFixed(1)} شهر — خطر. وجّه 15% من الإيرادات للاحتياطي.`:`${a.runway.toFixed(1)} months runway is risky. Direct 15% of revenue to reserves.` });
    if (a.margin < 15) recs.push({ priority: a.runway<6?2:1, color:'var(--amber)',
      title: isAr?'حسّن هامش الربح':'Improve profit margin',
      body: isAr?`الهامش ${_pct(a.margin)} أقل من المعيار 15%. راجع التكاليف أو أعِد تسعير منتجاتك.`:`Margin ${_pct(a.margin)} below 15% benchmark. Review costs or reprice products.` });
    recs.push({ priority: recs.length+1, color:'var(--green)',
      title: isAr?'استثمر في النمو':'Invest in growth',
      body: isAr?'الإيرادات تنمو. زيادة ميزانية التسويق 20% قد ترفع الأرباح بشكل ملحوظ.':'Revenue is growing. Increasing marketing budget 20% could significantly boost profits.' });
    if (a.profit > 0) recs.push({ priority: recs.length+1, color:'var(--blue)',
      title: isAr?'خطط لتوزيع الأرباح':'Plan profit distribution',
      body: isAr?`ربح ${_fmt(a.profit)} — فكّر في: توزيع أرباح، استثمار، أو توسع.`:`Profit ${_fmt(a.profit)} — consider: dividends, reinvestment, or expansion.` });
    el.innerHTML = recs.slice(0,4).map(r => `
      <div class="ins-rec-item">
        <div class="ins-rec-num" style="background:${r.color}">${r.priority}</div>
        <div><div class="ins-rec-title">${r.title}</div><div class="t-small">${r.body}</div></div>
      </div>`).join('');
  }

  return { onEnter };
})();

/* ════ duediligence.js ════ */
