// ============================================
// ClarityFinance – script.js (محسّن للأداء)
// الإصدار: Optimized v1.0
// ============================================

// ========== الحالة العامة ==========
const AppState = {
  lang: 'ar',
  theme: 'light',
  screen: 'login',
  validationExecuted: false,
  processingExecuted: false
};

// ========== دوال مساعدة محسّنة ==========
const formatNumber = (num) => {
  if (num === undefined || num === null) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const safeLocalStorage = (key, defaultValue) => {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch {
    return defaultValue;
  }
};

// ========== إدارة السمات (Theme) محسّنة ==========
const ThemeManager = {
  init() {
    AppState.theme = safeLocalStorage('cf_theme', 'light');
    this.set(AppState.theme);
  },

  set(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('cf_theme', theme); } catch {}
    this.updateIcons();
  },

  toggle() {
    this.set(AppState.theme === 'light' ? 'dark' : 'light');
  },

  updateIcons() {
    const icons = document.querySelectorAll('.theme-icon');
    const iconHtml = AppState.theme === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    icons.forEach(el => el.innerHTML = iconHtml);
  }
};

// ========== إدارة اللغة محسّنة ==========
const LangManager = {
  init() {
    AppState.lang = safeLocalStorage('cf_lang', 'ar');
    this.set(AppState.lang);
  },

  set(lang) {
    AppState.lang = lang;
    const isAr = lang === 'ar';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    
    requestAnimationFrame(() => {
      document.querySelectorAll('[data-ar]').forEach(el => {
        if (!el.matches('input, select, textarea')) {
          el.textContent = isAr ? (el.dataset.ar || '') : (el.dataset.en || el.dataset.ar || '');
        }
      });
      
      document.querySelectorAll('.lang-toggle').forEach(btn => {
        btn.textContent = isAr ? 'EN' : 'ع';
      });
    });
    
    try { localStorage.setItem('cf_lang', lang); } catch {}
  },

  toggle() {
    this.set(AppState.lang === 'ar' ? 'en' : 'ar');
  }
};

// ========== التنقل بين الشاشات محسّن ==========
const ScreenManager = {
  show(id) {
    const prev = document.getElementById('s-' + AppState.screen);
    if (prev) {
      prev.classList.remove('active');
      prev.style.display = 'none';
    }
    
    const next = document.getElementById('s-' + id);
    if (!next) return;
    
    next.style.display = 'block';
    next.classList.add('active');
    next.scrollTop = 0;
    AppState.screen = id;

    // تحديث الـ navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === id);
    });

    // تشغيل الدوال حسب الشاشة مع تأخير بسيط
    if (id === 'validation') {
      setTimeout(() => ValidationRunner.run(), 100);
    }
    if (id === 'processing') {
      setTimeout(() => ProcessingRunner.run(), 100);
    }
  }
};

// ========== تحميل القالب ==========
const downloadTemplate = (e) => {
  e.preventDefault();
  const content = 'الحساب,المبلغ\nإيرادات المبيعات,100000\nمصاريف إيجار,25000\nرواتب,45000\n';
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clarity_finance_template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
};

// ========== الترقية (مؤقت) ==========
const upgradePlan = (plan) => {
  alert(`شكراً لاهتمامك بخطة ${plan}! سيتم تفعيل الدفع قريباً.`);
};

// ========== رفع الملفات محسّن ==========
const UploadManager = {
  dragOver(e) {
    e.preventDefault();
    document.getElementById('drop-zone')?.classList.add('drag');
  },

  dragLeave() {
    document.getElementById('drop-zone')?.classList.remove('drag');
  },

  drop(e) {
    e.preventDefault();
    this.dragLeave();
    const f = e.dataTransfer.files[0];
    if (f) this.showFile(f);
  },

  fileChosen(input) {
    if (input.files && input.files[0]) this.showFile(input.files[0]);
  },

  showFile(file) {
    const nameEl = document.getElementById('file-name');
    const metaEl = document.getElementById('file-meta');
    const previewEl = document.getElementById('file-preview');
    
    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) {
      const size = (file.size / 1024 / 1024).toFixed(1);
      metaEl.textContent = size + ' MB - ' + file.name.split('.').pop().toUpperCase();
    }
    if (previewEl) previewEl.classList.add('show');
  },

  clearFile() {
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview')?.classList.remove('show');
  },

  setCurrency(cur, btn) {
    ['cur-sar', 'cur-usd', 'cur-eur'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'btn btn-sm ' + (el.id === btn.id ? 'btn-primary' : 'btn-ghost');
      }
    });
  },

  startAnalysis() {
    ScreenManager.show('validation');
  }
};

// ========== التحقق (Validation) محسّن ==========
const ValidationRunner = {
  run() {
    if (AppState.validationExecuted) return;
    
    const steps = document.querySelectorAll('#val-steps .val-step');
    const proc = document.getElementById('val-processing');
    const succ = document.getElementById('val-success');
    const err = document.getElementById('val-error');
    
    if (!proc || !steps.length) return;
    
    steps.forEach(s => {
      s.style.color = '';
      s.style.fontWeight = '';
      s.style.opacity = '0.45';
    });
    
    proc.style.display = 'block';
    if (succ) succ.style.display = 'none';
    if (err) err.style.display = 'none';
    
    let i = 0;
    
    const next = () => {
      if (i < steps.length) {
        steps[i].style.color = 'var(--green)';
        steps[i].style.fontWeight = '700';
        steps[i].style.opacity = '1';
        i++;
        requestAnimationFrame(() => setTimeout(next, 680));
      } else {
        setTimeout(() => {
          proc.style.display = 'none';
          if (succ) succ.style.display = 'block';
          AppState.validationExecuted = true;
        }, 450);
      }
    };
    
    setTimeout(next, 400);
  }
};

// ========== المعالجة (Processing) محسّنة ==========
const ProcessingRunner = {
  run() {
    if (AppState.processingExecuted) return;
    
    const steps = document.querySelectorAll('#proc-list .proc-step');
    const ring = document.getElementById('proc-ring');
    const pct = document.getElementById('proc-pct');
    
    if (!steps.length) return;
    
    const pcts = [25, 50, 75, 100];
    const circumference = 226;
    let i = 0;
    
    steps.forEach(s => {
      const dot = s.querySelector('.proc-dot');
      const span = s.querySelector('span');
      if (dot) { dot.style.borderColor = ''; dot.style.background = ''; dot.style.color = ''; }
      if (span) { span.style.color = ''; span.style.fontWeight = ''; }
    });
    
    if (ring) ring.style.strokeDashoffset = circumference;
    if (pct) pct.textContent = '0%';
    
    const tick = (timestamp) => {
      if (i < steps.length) {
        const dot = steps[i].querySelector('.proc-dot');
        const span = steps[i].querySelector('span');
        
        if (dot) {
          dot.style.background = 'var(--green)';
          dot.style.borderColor = 'var(--green)';
          dot.style.color = '#fff';
        }
        if (span) {
          span.style.color = 'var(--ink)';
          span.style.fontWeight = '600';
        }
        
        const p = pcts[i];
        const offset = circumference - (circumference * p / 100);
        if (ring) ring.style.strokeDashoffset = offset;
        if (pct) pct.textContent = p + '%';
        
        i++;
        requestAnimationFrame(() => setTimeout(() => tick(), 900));
      } else {
        AppState.processingExecuted = true;
        setTimeout(() => ScreenManager.show('dashboard'), 600);
      }
    };
    
    setTimeout(() => requestAnimationFrame(tick), 500);
  }
};

// ========== التصنيف (Mapping) محسّن ==========
const MappingManager = {
  filter(type, btn) {
    document.querySelectorAll('.map-item').forEach(el => {
      el.style.display = (type === 'all' || el.dataset.status === type) ? 'flex' : 'none';
    });
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  },

  toggleCategory(header) {
    const body = header.nextElementSibling;
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    header.classList.toggle('open', !open);
  },

  confirm(btn, itemId) {
    const item = document.getElementById(itemId);
    if (!item) return;
    
    const select = item.querySelector('select');
    const catText = select ? select.options[select.selectedIndex].text : 'مؤكد';
    
    item.classList.remove('map-item-review', 'map-item-manual');
    item.classList.add('map-item-done');
    item.dataset.status = 'auto';
    
    const mainDiv = item.querySelector('.map-item-main');
    if (mainDiv) {
      const catSpan = mainDiv.querySelector('.map-item-cat');
      if (catSpan) catSpan.textContent = catText;
    }
    
    const actionsDiv = item.querySelector('.map-review-actions');
    if (actionsDiv) {
      actionsDiv.innerHTML = '<span class="badge badge-green">مؤكد ✓</span>';
    }
  },

  manualSelect(select, itemId) {
    if (!select.value && select.selectedIndex === 0) return;
    
    const item = document.getElementById(itemId);
    if (!item) return;
    
    const catText = select.options[select.selectedIndex].text;
    
    item.classList.remove('map-item-manual');
    item.classList.add('map-item-done');
    item.dataset.status = 'auto';
    
    const mainDiv = item.querySelector('.map-item-main');
    if (mainDiv) {
      const catSpan = mainDiv.querySelector('.map-item-cat');
      if (catSpan) catSpan.textContent = catText;
    }
    
    const actionsDiv = item.querySelector('.map-review-actions');
    if (actionsDiv) {
      actionsDiv.innerHTML = '<span class="badge badge-green">مؤكد ✓</span>';
    }
  }
};

// ========== Due Diligence ==========
const toggleSection = (id) => {
  const body = document.getElementById(id);
  if (!body) return;
  const hdr = body.previousElementSibling;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (hdr) hdr.classList.toggle('open', !isOpen);
};

// ========== التهيئة الرئيسية ==========
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  LangManager.init();
  ScreenManager.show('login');
});

// ========== تصدير الدوال للاستخدام العام ==========
window.toggleTheme = () => ThemeManager.toggle();
window.toggleLang = () => LangManager.toggle();
window.showScreen = (id) => ScreenManager.show(id);
window.downloadTemplate = downloadTemplate;
window.upgradePlan = upgradePlan;
window.dragOver = (e) => UploadManager.dragOver(e);
window.dragLeave = () => UploadManager.dragLeave();
window.dropFile = (e) => UploadManager.drop(e);
window.fileChosen = (input) => UploadManager.fileChosen(input);
window.clearFile = () => UploadManager.clearFile();
window.setCurrency = (cur, btn) => UploadManager.setCurrency(cur, btn);
window.startAnalysis = () => UploadManager.startAnalysis();
window.filterMapping = (type, btn) => MappingManager.filter(type, btn);
window.toggleCategory = (header) => MappingManager.toggleCategory(header);
window.confirmMapping = (btn, itemId) => MappingManager.confirm(btn, itemId);
window.manualSelect = (select, itemId) => MappingManager.manualSelect(select, itemId);
window.toggleSection = toggleSection;
