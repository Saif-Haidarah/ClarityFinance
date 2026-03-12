/* ClarityFinance — Reports Screen */

const ReportsScreen = (() => {
  'use strict';

  function onEnter() {
    const a = State.get('analysis');
    const isAr = State.get('lang') === 'ar';
    _renderSummary(a, isAr);
    _renderTypes(isAr);
    _renderScenarios(isAr);
  }

  function _fmt(n) { return n.toFixed(1)+'M'; }

  function _renderSummary(a, isAr) {
    const el = document.getElementById('rep-summary');
    if (!el || !a?.ready) return;
    const rows = [
      [isAr?'الإيرادات':'Revenue',    _fmt(a.revenue), 'var(--green)'],
      [isAr?'المصاريف':'Expenses',    _fmt(a.expenses),'var(--red)'  ],
      [isAr?'صافي الربح':'Net Profit',_fmt(a.profit),  a.profit>=0?'var(--green)':'var(--red)'],
      [isAr?'الهامش':'Net Margin',    a.margin.toFixed(1)+'%', a.margin>=15?'var(--green)':'var(--amber)'],
      ['Runway',                       a.runway.toFixed(1)+(isAr?' شهر':' mo'), a.runway>=6?'var(--green)':'var(--amber)'],
      [isAr?'درجة الصحة':'Health',    a.health+'/100', a.health>=70?'var(--green)':'var(--amber)'],
    ];
    el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">` +
      rows.map(([l,v,c])=>`<div style="background:var(--surface2);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--muted);text-transform:uppercase;margin-bottom:4px">${l}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.5px;color:${c}">${v}</div>
      </div>`).join('') + '</div>';
  }

  function _renderTypes(isAr) {
    const el = document.getElementById('rep-types');
    if (!el) return;
    const types = [
      { icon:'📊', color:'linear-gradient(135deg,#1A5C40,#3DD68C)', label: isAr?'تقرير مالي كامل':'Full Financial Report', sub: isAr?'إيرادات، مصاريف، أرباح، نسب':'Revenue, expenses, profits, ratios' },
      { icon:'💡', color:'linear-gradient(135deg,#1D4ED8,#60A5FA)', label: isAr?'تقرير الرؤى والتوصيات':'Insights & Recommendations', sub: isAr?'تحليل ذكي وتوصيات قابلة للتنفيذ':'Smart analysis and actionable advice' },
      { icon:'🔍', color:'linear-gradient(135deg,#7C3AED,#C084FC)', label: isAr?'تقرير تقييم المخاطر':'Risk Assessment Report', sub: isAr?'للمستثمرين والبنوك':'For investors and banks' },
    ];
    el.innerHTML = types.map(t=>`
      <div class="rep-type-card" onclick="ReportsScreen.exportHTML()">
        <div class="rep-type-icon" style="background:${t.color}">${t.icon}</div>
        <div style="flex:1">
          <div style="font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;color:var(--ink)">${t.label}</div>
          <div class="t-small" style="color:var(--muted)">${t.sub}</div>
        </div>
        <svg style="width:16px;height:16px;color:var(--muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`).join('');
  }

  function _renderScenarios(isAr) {
    const el = document.getElementById('rep-scenarios');
    if (!el) return;
    const scenarios = State.get('scenarios') || [];
    if (!scenarios.length) return;
    el.innerHTML = scenarios.slice(-5).reverse().map(s=>`
      <div class="rep-scenario-item">
        <div style="width:32px;height:32px;border-radius:9px;background:var(--green4);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📋</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--ink)">${s.label}</div>
          <div style="font-size:11px;color:var(--muted)">${s.results?.profit?.toFixed(1)||'—'}M ${isAr?'ربح':'profit'} · ${s.results?.health||'—'} ${isAr?'صحة':'health'}</div>
        </div>
        <span class="badge badge-muted" style="font-size:10px">${new Date(s.savedAt).toLocaleDateString(isAr?'ar-SA':'en-US')}</span>
      </div>`).join('');
  }

  function exportCSV() {
    const a = State.get('analysis');
    const isAr = State.get('lang') === 'ar';
    if (!a?.ready) { UI.toast(isAr?'لا توجد بيانات':'No data', 'warn'); return; }
    const rows = [
      [isAr?'البند':'Item', isAr?'القيمة (مليون ريال)':'Value (SAR M)'],
      [isAr?'الإيرادات':'Revenue', a.revenue.toFixed(2)],
      [isAr?'المصاريف':'Expenses', a.expenses.toFixed(2)],
      [isAr?'صافي الربح':'Net Profit', a.profit.toFixed(2)],
      [isAr?'الهامش %':'Margin %', a.margin.toFixed(2)],
      ['Runway', a.runway.toFixed(1)],
      [isAr?'درجة الصحة':'Health Score', a.health],
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement('a');
    a2.href=url; a2.download='ClarityFinance_Report.csv'; a2.click();
    URL.revokeObjectURL(url);
    UI.toast(isAr?'✅ تم تحميل CSV':'✅ CSV downloaded', 'success');
  }

  function exportHTML() {
    const an = State.get('analysis');
    const isAr = State.get('lang') === 'ar';
    if (!an?.ready) { UI.toast(isAr?'لا توجد بيانات':'No data', 'warn'); return; }
    const incInc = document.getElementById('rep-inc-summary')?.checked;
    const incRat = document.getElementById('rep-inc-ratios')?.checked;
    const date   = new Date().toLocaleDateString(isAr?'ar-SA':'en-US');
    const file   = State.get('file.name') || '';
    const report = `<!DOCTYPE html>
<html lang="${isAr?'ar':'en'}" dir="${isAr?'rtl':'ltr'}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${isAr?'تقرير مالي':'Financial Report'} — ClarityFinance</title>

</head>
<body>
<div class="logo">Clarity<em>Finance</em></div>
<div style="font-size:13px;color:#6B7280;margin-bottom:20px">${isAr?'وضوح مالي حقيقي':'Real Financial Clarity'}</div>
<h1>${isAr?'التقرير المالي':'Financial Report'}</h1>
<div class="meta">${isAr?'الملف':'File'}: ${file} &nbsp;·&nbsp; ${isAr?'التاريخ':'Date'}: ${date}</div>
${incInc!==false?`<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">${isAr?'الإيرادات':'Revenue'}</div><div class="kpi-value">${an.revenue.toFixed(1)}M</div></div>
  <div class="kpi"><div class="kpi-label">${isAr?'صافي الربح':'Net Profit'}</div><div class="kpi-value" style="color:${an.profit>=0?'#1A5C40':'#EF4444'}">${an.profit.toFixed(1)}M</div></div>
  <div class="kpi"><div class="kpi-label">${isAr?'الهامش':'Margin'}</div><div class="kpi-value">${an.margin.toFixed(1)}%</div></div>
</div>`:''}
${incRat!==false?`<table>
  <tr><th>${isAr?'المؤشر':'Metric'}</th><th>${isAr?'القيمة':'Value'}</th><th>${isAr?'الحالة':'Status'}</th></tr>
  <tr><td>${isAr?'الإيرادات':'Revenue'}</td><td>${an.revenue.toFixed(1)}M</td><td style="color:#1A5C40">—</td></tr>
  <tr><td>${isAr?'المصاريف':'Expenses'}</td><td>${an.expenses.toFixed(1)}M</td><td style="color:#EF4444">—</td></tr>
  <tr><td>${isAr?'صافي الربح':'Net Profit'}</td><td>${an.profit.toFixed(1)}M</td><td style="color:${an.profit>=0?'#1A5C40':'#EF4444'}">${an.profit>=0?(isAr?'ربح':'Profit'):(isAr?'خسارة':'Loss')}</td></tr>
  <tr><td>${isAr?'هامش الربح':'Net Margin'}</td><td>${an.margin.toFixed(1)}%</td><td style="color:${an.margin>=15?'#1A5C40':'#F59E0B'}">${an.margin>=15?(isAr?'جيد':'Good'):(isAr?'تحسين':'Improve')}</td></tr>
  <tr><td>Runway</td><td>${an.runway.toFixed(1)} ${isAr?'شهر':'months'}</td><td style="color:${an.runway>=6?'#1A5C40':'#F59E0B'}">${an.runway>=6?(isAr?'آمن':'Safe'):(isAr?'مراقبة':'Watch')}</td></tr>
</table>`:''}
<div class="footer">Generated by ClarityFinance &nbsp;·&nbsp; ${date}</div>
</body>
</html>`;
    const blob = new Blob([report], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement('a');
    a2.href=url; a2.download='ClarityFinance_Report.html'; a2.click();
    URL.revokeObjectURL(url);
    UI.toast(isAr?'✅ تم تحميل التقرير':'✅ Report downloaded', 'success');
  }

  return { onEnter, exportCSV, exportHTML };
})();
