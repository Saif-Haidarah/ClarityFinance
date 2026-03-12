/* ClarityFinance — What If / Sensitivity Analysis (CFA level) */

const WhatIfScreen = (() => {
  'use strict';

  /* ── Presets (% changes from base) ── */
  const PRESETS = {
    base:   { rev:0,  ebitda:20, wacc:10, capex:5  },
    bull:   { rev:25, ebitda:28, wacc:9,  capex:6  },
    bear:   { rev:-12,ebitda:14, wacc:13, capex:5  },
    stress: { rev:-25,ebitda:8,  wacc:18, capex:10 },
  };

  let _animRAFs = {};
  let _currentTab = 'sensitivity';

  /* ── Get base figures from State ── */
  function getBase() {
    const a = State.get('analysis');
    if (a?.ready && a.revenue > 0) {
      const depAmort   = a.expenses * 0.06;          // ~6% D&A assumption
      const ebitda     = a.profit + depAmort + (a.expenses * 0.03); // add back interest est.
      const ebitdaPct  = a.revenue > 0 ? (ebitda / a.revenue) * 100 : 20;
      const workingCap = a.revenue * 0.08;            // 8% of revenue (common SaaS/services)
      return {
        revenue:   a.revenue,
        expenses:  a.expenses,
        ebitda,
        ebitdaPct: Math.max(5, Math.round(ebitdaPct * 2) / 2),
        profit:    a.profit,
        runway:    a.runway,
        cashRes:   a.runway * (a.expenses / 12),
        headcount: State.get('file.headcount') || 50,
        workingCap,
        depAmort,
        interestExp: a.expenses * 0.03,
        taxRate:  0.20,  // 20% — zakat/corporate tax KSA
      };
    }
    // Fallback demo
    return {
      revenue:42.8, expenses:34.5, ebitda:9.8, ebitdaPct:22.9,
      profit:8.3, runway:7.2, cashRes:20.7, headcount:120,
      workingCap:3.4, depAmort:2.1, interestExp:1.0, taxRate:0.20,
    };
  }

  /* ══════════════════════════════════════
     CORE ENGINE — all metrics computed here
  ══════════════════════════════════════ */
  function compute(v) {
    const B = getBase();
    const N = 5; // projection years

    // ── Revenue projection ──────────────────────────────────────
    const revGrowth = v.rev / 100;
    const revY = Array.from({length:N}, (_,i) => B.revenue * Math.pow(1 + revGrowth, i + 1));

    // ── EBITDA & FCF per year ────────────────────────────────────
    const ebitdaMargin = v.ebitda / 100;
    const capexPct     = v.capex  / 100;
    const waccR        = v.wacc   / 100;

    const ebitdaY = revY.map(r => r * ebitdaMargin);
    const depY    = revY.map(r => r * 0.04);          // D&A ~4% rev (grows with revenue)
    const capexY  = revY.map(r => r * capexPct);
    const taxY    = ebitdaY.map((e,i) => Math.max(0, (e - depY[i]) * B.taxRate));
    const dwcY    = revY.map((r,i) => i===0 ? (r - B.revenue)*0.08 : (r - revY[i-1])*0.08);
    const fcfY    = ebitdaY.map((e,i) => e - taxY[i] - capexY[i] - dwcY[i]);

    // ── DCF / NPV ────────────────────────────────────────────────
    // Terminal value using Gordon Growth Model: TV = FCF_n × (1+g) / (WACC - g)
    const termGrowth = Math.min(revGrowth * 0.4, 0.03); // terminal growth = 40% of rev growth, max 3%
    const terminalFCF = fcfY[N-1];
    const terminalVal = waccR > termGrowth
      ? terminalFCF * (1 + termGrowth) / (waccR - termGrowth)
      : terminalFCF * 12; // fallback multiple if WACC ≤ g

    const pvFCF = fcfY.map((f,i) => f / Math.pow(1 + waccR, i + 1));
    const pvTerminal = terminalVal / Math.pow(1 + waccR, N);
    const npv = pvFCF.reduce((a,b) => a+b, 0) + pvTerminal - B.cashRes; // subtract initial investment proxy

    // Enterprise Value (simplified: sum of PV FCFs + terminal)
    const ev = pvFCF.reduce((a,b) => a+b, 0) + pvTerminal;
    const ebitdaCurrent = B.revenue * ebitdaMargin;
    const evEbitda = ebitdaCurrent > 0 ? ev / ebitdaCurrent : 0;

    // ── IRR (Newton-Raphson on 5-year FCF stream) ────────────────
    const initialInvestment = B.cashRes; // use current cash as proxy for investment
    const cashFlows = [-initialInvestment, ...fcfY];
    const irr = _calcIRR(cashFlows);

    // ── CAGR ─────────────────────────────────────────────────────
    const cagr = B.revenue > 0 ? Math.pow(revY[N-1] / B.revenue, 1/N) - 1 : 0;

    // ── Current period metrics ───────────────────────────────────
    const ebitdaNow  = B.revenue * ebitdaMargin;
    const capexNow   = B.revenue * capexPct;
    const taxNow     = Math.max(0, (ebitdaNow - B.depAmort) * B.taxRate);
    const fcfNow     = ebitdaNow - taxNow - capexNow - 0; // no WC change in current period
    const runway     = (B.expenses / 12) > 0 ? (B.cashRes + fcfNow) / (B.expenses / 12) : 99;

    // ── Break-even ───────────────────────────────────────────────
    // Fixed costs ≈ 60% of opex (rent, salaries, etc.)
    // Variable costs ≈ COGS + variable opex ≈ (1 - ebitdaMargin - 0.15) of revenue
    const fixedCosts      = B.expenses * 0.60;
    const variableCostPct = Math.max(0, 1 - ebitdaMargin - 0.15); // contribution margin = 1 - variableCostPct
    const contributionMargin = 1 - variableCostPct;
    const beRevenue       = contributionMargin > 0 ? fixedCosts / contributionMargin : Infinity;
    const marginOfSafety  = B.revenue > beRevenue ? ((B.revenue - beRevenue) / B.revenue) * 100 : 0;
    // DOL = Contribution Margin / EBIT
    const ebit = ebitdaNow - B.depAmort;
    const dol  = ebit > 0 ? (B.revenue * contributionMargin) / ebit : Infinity;

    // ── Financial Ratios (CFA Level 1) ──────────────────────────
    // Liquidity
    const currentRatio  = 1.8;  // would need balance sheet — show estimate
    const quickRatio    = 1.2;
    const cashRatio     = B.cashRes / (B.expenses / 12);
    // Profitability
    const grossMargin   = ebitdaMargin + 0.08;  // EBITDA margin + D&A ~8%
    const netMargin     = (fcfNow / B.revenue) * 100;
    const roe           = ebitdaMargin * 1.8;   // estimated, needs equity base
    const roa           = (ebitdaNow / (B.revenue * 1.5)) * 100; // assets ~1.5× revenue
    const ebitdaMarginPct = ebitdaMargin * 100;
    // Leverage
    const debtToEbitda  = (B.expenses * 0.2) / Math.max(ebitdaNow, 0.01); // est. debt = 20% opex
    const interestCoverage = ebit > 0 ? ebit / Math.max(B.interestExp, 0.01) : 0;
    const dscr          = fcfNow > 0 ? fcfNow / Math.max(B.interestExp * 1.2, 0.01) : 0;

    // ── Health Score (CFA-weighted) ──────────────────────────────
    // Weighted: FCF yield 25%, EBITDA margin 25%, DSCR 20%, Runway 20%, EV/EBITDA 10%
    let health = 0;
    health += Math.min(25, Math.max(0, (fcfNow / B.revenue) * 100 * 2));        // FCF yield ×2
    health += Math.min(25, Math.max(0, ebitdaMarginPct - 5));                    // EBITDA margin
    health += Math.min(20, Math.max(0, dscr * 5));                               // DSCR ×5
    health += Math.min(20, Math.max(0, (runway / 12) * 10));                     // Runway (12mo = 10pts)
    health += Math.min(10, Math.max(0, evEbitda >= 8 && evEbitda <= 15 ? 10 : 5)); // fair value range
    health  = Math.round(Math.min(100, health));

    return {
      // Sensitivity
      ebitdaNow, fcfNow, revY5: revY[N-1], cagr, runway,
      ebitdaMarginPct, health,
      // DCF
      npv, irr, ev, evEbitda, fcfY, revY, ebitdaY, pvFCF, terminalVal,
      // Break-even
      beRevenue, marginOfSafety, fixedCosts, contributionMargin, dol,
      // Ratios
      grossMargin: grossMargin*100, netMargin, roe, roa, ebitdaMarginPct,
      currentRatio, quickRatio, cashRatio, debtToEbitda, interestCoverage, dscr,
    };
  }

  /* ── IRR via Newton-Raphson ── */
  function _calcIRR(cashFlows, guess = 0.1) {
    let r = guess;
    for (let iter = 0; iter < 100; iter++) {
      const npv  = cashFlows.reduce((s, cf, t) => s + cf / Math.pow(1+r, t), 0);
      const dnpv = cashFlows.reduce((s, cf, t) => s - t * cf / Math.pow(1+r, t+1), 0);
      if (Math.abs(dnpv) < 1e-10) break;
      const rNew = r - npv / dnpv;
      if (Math.abs(rNew - r) < 1e-7) { r = rNew; break; }
      r = rNew;
    }
    return isNaN(r) || r < -1 || r > 10 ? null : r;
  }

  /* ══════════════════════════════════════
     UI UPDATE
  ══════════════════════════════════════ */
  function update() {
    const v    = _getVals();
    const res  = compute(v);
    const B    = getBase();
    const isAr = State.get('lang') === 'ar';

    State.merge('whatif', v);

    // Slider labels
    _setText('wi-rev-val',   `${v.rev>0?'+':''}${v.rev}%`);
    _setText('wi-ebitda-val',`${v.ebitda}%`);
    _setText('wi-wacc-val',  `${v.wacc}%`);
    _setText('wi-capex-val', `${v.capex}%`);

    // Fills
    _fill('wi-rev',   v.rev,   -30, 60,  'var(--green)');
    _fill('wi-ebitda',v.ebitda, 5,  50,  'var(--blue)');
    _fill('wi-wacc',  v.wacc,   6,  25,  'var(--amber)');
    _fill('wi-capex', v.capex,  0,  30,  'var(--red)');

    // Sensitivity tab outputs
    _animVal('wi-out-ebitda',  res.ebitdaNow, 1, 'M');
    _setText('wi-out-ebitda-margin', `${res.ebitdaMarginPct.toFixed(1)}%`);
    _animVal('wi-out-fcf',     res.fcfNow,    1, 'M');
    _animVal('wi-out-rev5',    res.revY5,     1, 'M');
    _setText('wi-out-cagr',    `CAGR ${(res.cagr*100).toFixed(1)}%`);
    _animVal('wi-out-runway',  res.runway,    1, '');
    _setText('wi-out-runway-d', isAr?'شهر':'months');

    // Health
    const scoreEl = document.getElementById('wi-out-score');
    const barEl   = document.getElementById('wi-out-bar');
    if (scoreEl) { scoreEl.textContent = res.health; scoreEl.style.color = _hColor(res.health); }
    if (barEl)   { barEl.style.width = res.health+'%'; barEl.style.background = _hGrad(res.health); }

    _verdict(res, isAr);

    // Data source label
    const ds = document.getElementById('wi-ds-label');
    if (ds) {
      const name = State.get('file.name') || '';
      ds.textContent = name
        ? (isAr ? `من: ${name}` : `From: ${name}`)
        : (isAr ? 'بيانات تجريبية' : 'Demo data');
    }

    // Update other tabs if visible
    if (_currentTab === 'dcf')       _renderDCF(res, isAr);
    if (_currentTab === 'breakeven') _renderBreakeven(res, isAr);
    if (_currentTab === 'ratios')    _renderRatios(res, isAr);
  }

  /* ── Tab switching ── */
  function switchTab(tab, btn) {
    _currentTab = tab;
    document.querySelectorAll('.wi-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.wi-tab-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.style.display = 'block';
    // Render tab content
    const v   = _getVals();
    const res = compute(v);
    const isAr = State.get('lang') === 'ar';
    if (tab === 'dcf')       _renderDCF(res, isAr);
    if (tab === 'breakeven') _renderBreakeven(res, isAr);
    if (tab === 'ratios')    _renderRatios(res, isAr);
  }

  /* ── DCF Tab ── */
  function _renderDCF(res, isAr) {
    const fmtM  = v => v.toFixed(1) + 'M';
    const fmtPct = v => (v*100).toFixed(1) + '%';

    _setText('dcf-npv', fmtM(res.npv));
    document.getElementById('dcf-npv')?.setAttribute('style',
      `font-family:'Bebas Neue',sans-serif;font-size:24px;color:${res.npv>=0?'var(--green)':'var(--red)'}`);

    if (res.irr !== null) {
      _setText('dcf-irr', fmtPct(res.irr));
      const irrEl = document.getElementById('dcf-irr');
      if (irrEl) irrEl.style.color = res.irr > 0.15 ? 'var(--green)' : res.irr > 0.08 ? 'var(--amber)' : 'var(--red)';
    } else {
      _setText('dcf-irr', isAr ? 'غير قابل للحساب' : 'N/A');
    }
    _setText('dcf-ev',         fmtM(res.ev));
    _setText('dcf-ev-ebitda',  res.evEbitda.toFixed(1) + '×');

    // FCF table
    const tbl = document.getElementById('dcf-table');
    if (tbl) {
      const yrs  = isAr ? ['السنة 1','السنة 2','السنة 3','السنة 4','السنة 5'] : ['Y1','Y2','Y3','Y4','Y5'];
      const rows = [
        { label: isAr?'الإيرادات':'Revenue',       vals: res.revY,    color:'var(--green)' },
        { label: isAr?'EBITDA':'EBITDA',            vals: res.ebitdaY, color:'var(--blue)'  },
        { label: isAr?'FCF':'FCF',                  vals: res.fcfY,    color:'var(--green)' },
        { label: isAr?'PV of FCF':'PV of FCF',      vals: res.pvFCF,   color:'var(--muted)' },
      ];
      tbl.innerHTML =
        `<tr style="background:var(--surface2)">${['', ...yrs].map(h=>`<th style="font-size:10px;padding:8px 10px;text-align:end;font-weight:700;color:var(--muted);letter-spacing:.5px">${h}</th>`).join('')}</tr>` +
        rows.map(row =>
          `<tr><td style="padding:8px 10px;font-size:11.5px;color:var(--ink2);font-weight:600">${row.label}</td>` +
          row.vals.map(v => `<td style="padding:8px 10px;text-align:end;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;color:${row.color}">${v.toFixed(1)}M</td>`).join('') +
          `</tr>`
        ).join('');
    }

    // Assumptions
    const B = getBase();
    const asmEl = document.getElementById('dcf-assumptions');
    if (asmEl) {
      const wv = _getVals();
      const items = [
        [isAr?'معدل الخصم (WACC)':'Discount Rate (WACC)', `${wv.wacc}%`],
        [isAr?'معدل النمو النهائي':'Terminal Growth Rate', `${(Math.min(wv.rev * 0.4, 3)).toFixed(1)}%`],
        [isAr?'فترة التوقع':'Projection Period', isAr?'5 سنوات':'5 years'],
        [isAr?'معدل الضريبة':'Tax Rate (Zakat/CIT)', `${(B.taxRate*100).toFixed(0)}%`],
        [isAr?'نموذج القيمة النهائية':'Terminal Value Model', 'Gordon Growth Model'],
      ];
      asmEl.innerHTML = items.map(([l,v]) =>
        `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed var(--border)">
          <span>${l}</span><span style="font-weight:700;color:var(--ink)">${v}</span>
        </div>`).join('');
    }
  }

  /* ── Break-even Tab ── */
  function _renderBreakeven(res, isAr) {
    const fmtM = v => isFinite(v) ? v.toFixed(1)+'M' : '∞';
    _setText('be-revenue', fmtM(res.beRevenue));
    _setText('be-mos',     `${res.marginOfSafety.toFixed(1)}%`);
    _setText('be-fixed',   res.fixedCosts.toFixed(1)+'M');
    _setText('be-cm',      `${(res.contributionMargin*100).toFixed(1)}%`);

    // Color margin of safety
    const mosEl = document.getElementById('be-mos');
    if (mosEl) mosEl.style.color = res.marginOfSafety > 20 ? 'var(--green)' : res.marginOfSafety > 10 ? 'var(--amber)' : 'var(--red)';

    // DOL
    const dolEl = document.getElementById('be-dol');
    const dolDesc = document.getElementById('be-dol-desc');
    if (dolEl) {
      const dol = isFinite(res.dol) ? res.dol : 99;
      dolEl.textContent = dol.toFixed(1) + '×';
      dolEl.style.color = dol < 2 ? 'var(--green)' : dol < 4 ? 'var(--amber)' : 'var(--red)';
    }
    if (dolDesc) {
      const dol = isFinite(res.dol) ? res.dol : 99;
      if (dol < 2)      dolDesc.textContent = isAr ? 'رافعة منخفضة — مخاطر تشغيلية منخفضة ونمو ربح معتدل' : 'Low leverage — lower operating risk, moderate profit growth';
      else if (dol < 4) dolDesc.textContent = isAr ? 'رافعة متوسطة — ربح ينمو بسرعة معقولة مع الإيرادات' : 'Moderate leverage — profits grow reasonably with revenue';
      else              dolDesc.textContent = isAr ? 'رافعة عالية — أي نمو في الإيرادات يُضاعف الأرباح (والخسائر)' : 'High leverage — revenue growth rapidly amplifies profits (and losses)';
    }

    // Break-even chart
    _renderBEChart(res);
  }

  function _renderBEChart(res) {
    const svg = document.getElementById('be-chart');
    if (!svg) return;
    const B = getBase();
    const W = 300, H = 120, padL = 36, padB = 20, padR = 10, padT = 10;
    const maxRev = B.revenue * 1.8;
    const pts = 60;
    const toX = v => padL + (v / maxRev) * (W - padL - padR);
    const toY = v => {
      const maxCost = res.fixedCosts + maxRev * (1 - res.contributionMargin);
      const range   = Math.max(maxCost, maxRev) * 1.1;
      return padT + H - padB - (v / range) * (H - padT - padB);
    };
    // Revenue line
    const revPts = [[0,0],[maxRev, maxRev]].map(([x,y]) => `${toX(x).toFixed(1)},${toY(y).toFixed(1)}`).join(' ');
    // Total cost line: FC + VC×revenue
    const cost0 = res.fixedCosts;
    const costMax = res.fixedCosts + maxRev * (1 - res.contributionMargin);
    const costPts = [[0,cost0],[maxRev,costMax]].map(([x,y]) => `${toX(x).toFixed(1)},${toY(y).toFixed(1)}`).join(' ');
    // BE point
    const beX = toX(isFinite(res.beRevenue) ? res.beRevenue : maxRev * 0.9);
    const beY = toY(isFinite(res.beRevenue) ? res.beRevenue : costMax * 0.9);
    // Current position
    const curX = toX(B.revenue);
    const curY = toY(B.revenue);
    svg.innerHTML = `
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB+padT}" stroke="var(--border)" stroke-width="1"/>
      <line x1="${padL}" y1="${H-padB+padT}" x2="${W-padR}" y2="${H-padB+padT}" stroke="var(--border)" stroke-width="1"/>
      <polyline points="${revPts}" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"/>
      <polyline points="${costPts}" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${beX.toFixed(1)}" cy="${beY.toFixed(1)}" r="5" fill="var(--amber)" stroke="white" stroke-width="1.5"/>
      <circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="4" fill="var(--blue)" stroke="white" stroke-width="1.5"/>
      <text x="${padL-2}" y="${H-padB+padT+12}" text-anchor="end" font-size="9" fill="var(--muted)">0</text>
      <text x="${W-padR}" y="${H-padB+padT+12}" text-anchor="end" font-size="9" fill="var(--muted)">${(maxRev).toFixed(0)}M</text>
    `;
  }

  /* ── Ratios Tab ── */
  function _renderRatios(res, isAr) {
    const bench = (val, low, high, isGood) => {
      const ok = isGood ? val >= low : val <= high;
      return ok ? 'var(--green)' : val >= low * 0.7 ? 'var(--amber)' : 'var(--red)';
    };
    const row = (label, val, fmt, benchLow, benchHigh, benchLabel, higherIsBetter=true) => {
      const fmtVal = typeof fmt === 'function' ? fmt(val) : val.toFixed(2) + fmt;
      const pct = Math.min(100, Math.max(0, (val / (benchHigh * 1.5)) * 100));
      const color = higherIsBetter
        ? (val >= benchHigh ? 'var(--green)' : val >= benchLow ? 'var(--amber)' : 'var(--red)')
        : (val <= benchLow ? 'var(--green)' : val <= benchHigh ? 'var(--amber)' : 'var(--red)');
      return `<div class="ratio-row">
        <span class="ratio-name">${label}</span>
        <div class="ratio-bar-wrap"><div class="ratio-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="ratio-val" style="color:${color}">${fmtVal}</span>
        <span class="ratio-bench">${benchLabel}</span>
      </div>`;
    };

    const liqEl = document.getElementById('ratios-liquidity');
    if (liqEl) liqEl.innerHTML =
      row(isAr?'نسبة التداول (Current Ratio)':'Current Ratio', res.currentRatio, v=>`${v.toFixed(2)}×`, 1.5, 2.5, '>1.5', true) +
      row(isAr?'النسبة السريعة (Quick Ratio)':'Quick Ratio',    res.quickRatio,   v=>`${v.toFixed(2)}×`, 1.0, 2.0, '>1.0', true) +
      row(isAr?'نسبة النقد (Cash Ratio)':'Cash Ratio',          res.cashRatio,    v=>`${v.toFixed(1)}mo`, 3, 6, '>3mo', true);

    const profEl = document.getElementById('ratios-profitability');
    if (profEl) profEl.innerHTML =
      row(isAr?'هامش EBITDA':'EBITDA Margin',    res.ebitdaMarginPct, v=>`${v.toFixed(1)}%`, 15, 25, '15-25%', true) +
      row(isAr?'هامش الربح الصافي':'Net Margin',  res.netMargin,       v=>`${v.toFixed(1)}%`, 10, 20, '>10%',  true) +
      row(isAr?'هامش الربح الإجمالي':'Gross Margin',res.grossMargin,   v=>`${v.toFixed(1)}%`, 30, 50, '>30%',  true) +
      row('ROA',                                   res.roa,             v=>`${v.toFixed(1)}%`, 8,  15, '>8%',   true) +
      row('ROE',                                   res.roe,             v=>`${v.toFixed(1)}%`, 12, 20, '>12%',  true);

    const levEl = document.getElementById('ratios-leverage');
    if (levEl) levEl.innerHTML =
      row(isAr?'Debt / EBITDA':'Debt / EBITDA',          res.debtToEbitda,    v=>`${v.toFixed(1)}×`, 0, 3.0, '<3.0×',  false) +
      row(isAr?'تغطية الفوائد (ICR)':'Interest Coverage', res.interestCoverage,v=>`${v.toFixed(1)}×`, 3, 8,   '>3×',   true) +
      row('DSCR',                                          res.dscr,            v=>`${v.toFixed(2)}×`, 1.25,2, '>1.25×', true);
  }

  /* ── Verdict ── */
  function _verdict(res, isAr) {
    const el = document.getElementById('wi-verdict');
    const ti = document.getElementById('wi-verdict-title');
    const bo = document.getElementById('wi-verdict-body');
    const ic = el?.querySelector('.wi-verdict-icon');
    if (!el||!ti||!bo) return;
    const h = res.health;
    const irrPct = res.irr !== null ? (res.irr*100).toFixed(1) : '—';
    let icon, title, body, bg, border;
    if (res.fcfNow < 0) {
      icon='🚨'; bg='var(--red2)'; border='var(--red)';
      title = isAr ? 'تدفق نقدي سلبي' : 'Negative Free Cash Flow';
      body  = isAr
        ? `FCF سالب (${res.fcfNow.toFixed(1)}M). راجع الـ CapEx أو ارفع هامش EBITDA.`
        : `FCF is negative (${res.fcfNow.toFixed(1)}M). Reduce CapEx or improve EBITDA margin.`;
    } else if (h >= 80) {
      icon='🚀'; bg='var(--green5)'; border='var(--green2)';
      title = isAr ? 'أداء مالي ممتاز' : 'Excellent Financial Performance';
      body  = isAr
        ? `FCF ${res.fcfNow.toFixed(1)}M · EBITDA ${res.ebitdaMarginPct.toFixed(1)}% · NPV ${res.npv.toFixed(1)}M · IRR ${irrPct}%`
        : `FCF ${res.fcfNow.toFixed(1)}M · EBITDA ${res.ebitdaMarginPct.toFixed(1)}% · NPV ${res.npv.toFixed(1)}M · IRR ${irrPct}%`;
    } else if (h >= 60) {
      icon='✅'; bg='var(--green5)'; border='var(--green3)';
      title = isAr ? 'وضع مالي جيد' : 'Solid Financial Position';
      body  = isAr
        ? `FCF ${res.fcfNow.toFixed(1)}M · EBITDA ${res.ebitdaMarginPct.toFixed(1)}% · Runway ${res.runway.toFixed(1)} شهر`
        : `FCF ${res.fcfNow.toFixed(1)}M · EBITDA ${res.ebitdaMarginPct.toFixed(1)}% · Runway ${res.runway.toFixed(1)} months`;
    } else if (h >= 40) {
      icon='⚠️'; bg='var(--amber2)'; border='var(--amber)';
      title = isAr ? 'يحتاج تحسين' : 'Needs Improvement';
      body  = isAr
        ? `EBITDA ${res.ebitdaMarginPct.toFixed(1)}% تحت المعيار. DSCR ${res.dscr.toFixed(2)}×.`
        : `EBITDA ${res.ebitdaMarginPct.toFixed(1)}% below benchmark. DSCR ${res.dscr.toFixed(2)}×.`;
    } else {
      icon='🔴'; bg='var(--red2)'; border='var(--red)';
      title = isAr ? 'مخاطر مالية عالية' : 'High Financial Risk';
      body  = isAr
        ? `درجة الصحة ${h}/100. ارفع EBITDA وخفّض CapEx وWACC فوراً.`
        : `Health score ${h}/100. Improve EBITDA, reduce CapEx and WACC urgently.`;
    }
    if (ic) ic.textContent = icon;
    ti.textContent = title;
    bo.textContent = body;
    el.style.background   = bg;
    el.style.borderColor  = border;
  }

  /* ── Helpers ── */
  function _getVals() {
    const g = id => parseFloat(document.getElementById(id)?.value ?? 0);
    return { rev:g('wi-rev'), ebitda:g('wi-ebitda'), wacc:g('wi-wacc'), capex:g('wi-capex') };
  }
  function _setText(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }
  function _fill(id, val, min, max, color) {
    const el=document.getElementById(id); if(!el) return;
    const pct = ((val-min)/(max-min))*100;
    el.style.background = `linear-gradient(to right,${color} 0%,${color} ${pct}%,var(--border) ${pct}%)`;
  }
  function _animVal(id, target, dec=1, sfx='M') {
    const el=document.getElementById(id); if(!el) return;
    const cur=parseFloat(el.textContent)||0;
    let t0=null;
    cancelAnimationFrame(_animRAFs[id]);
    const step=ts=>{ if(!t0)t0=ts; const p=Math.min((ts-t0)/400,1); const e=1-Math.pow(1-p,3); el.textContent=(cur+(target-cur)*e).toFixed(dec)+sfx; if(p<1)_animRAFs[id]=requestAnimationFrame(step); else el.textContent=target.toFixed(dec)+sfx; };
    _animRAFs[id]=requestAnimationFrame(step);
  }
  function _hColor(h){ return h>=70?'var(--green)':h>=50?'var(--amber)':'var(--red)'; }
  function _hGrad(h) { return h>=70?'linear-gradient(90deg,var(--green),#3DD68C)':h>=50?'linear-gradient(90deg,var(--amber),#FBBF24)':'linear-gradient(90deg,var(--red),#F87171)'; }

  function showTip(id) {
    const el = document.getElementById('tip-' + id);
    if (!el) return;
    const isAr = State.get('lang') === 'ar';
    if (!el.textContent) el.textContent = isAr ? (el.dataset.ar||'') : (el.dataset.en||'');
    el.classList.toggle('visible');
  }

  function loadPreset(key, btn) {
    document.querySelectorAll('.wi-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const p = PRESETS[key]; if (!p) return;
    const s = (id,v) => { const el=document.getElementById(id); if(el) el.value=v; };
    s('wi-rev', p.rev); s('wi-ebitda', p.ebitda); s('wi-wacc', p.wacc); s('wi-capex', p.capex);
    update();
  }

  function reset() {
    const btn = document.querySelector('.wi-preset');
    if (btn) loadPreset('base', btn);
  }

  async function saveScenario() {
    const isAr = State.get('lang') === 'ar';
    const label = prompt(isAr ? 'اسم السيناريو:' : 'Scenario name:', isAr ? 'سيناريو جديد' : 'New Scenario');
    if (!label) return;
    const v = _getVals(), res = compute(v);
    await DB.saveScenario(label, v, res);
    UI.toast(isAr ? `✅ تم حفظ "${label}"` : `✅ Saved "${label}"`, 'success');
  }

  function onEnter() { setTimeout(update, 80); }

  return { update, switchTab, loadPreset, reset, saveScenario, showTip, onEnter };
})();
