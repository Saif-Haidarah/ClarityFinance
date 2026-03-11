// ============================================
// ClarityFinance – script.js (منظم وحديث)
// الإصدار: 3.0.0
// ============================================

// ========== App State ==========
const AppState = {
  language: 'ar',
  theme: 'light',
  currentScreen: 'login',
  validationExecuted: false,
  processingExecuted: false,
  uploadedFile: null,
  fileData: null,
  columns: [],
  errors: [],
  
  set(key, value) {
    this[key] = value;
    this.notify(key, value);
  },
  
  notify(key, value) {
    // يمكن إضافة listeners هنا مستقبلاً
    console.log(`State changed: ${key} =`, value);
  }
};

// ========== Storage Service ==========
const StorageService = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
};

// ========== I18n Service ==========
const I18n = {
  translations: {
    ar: {
      'hero.title': 'وضوح مالي حقيقي',
      'hero.subtitle': 'من بيانات خام إلى قرارات واضحة · أقل من 5 دقائق',
      'login.title': 'تسجيل الدخول',
      'login.email': 'البريد الإلكتروني',
      'login.password': 'كلمة المرور',
      'login.signin': 'دخول',
      'login.or': 'أو',
      'login.try': 'تجربة بدون حساب',
      'login.security': 'بياناتك مشفرة ومحمية · لن نشاركها مع أي جهة',
      'nav.home': 'الرئيسية',
      'nav.upload': 'رفع',
      'nav.reports': 'تقاريري',
      'upload.title': 'ارفع بياناتك المالية',
      'upload.desc': 'Excel أو CSV — النظام يقرأها ويحللها تلقائياً',
      'upload.drag': 'اسحب الملف هنا أو اضغط للرفع',
      'upload.maxsize': 'الحد الأقصى 10MB',
      'upload.preview': 'معاينة البيانات',
      'upload.filetype': 'نوع الملف',
      'upload.trial': 'ميزان المراجعة',
      'upload.income': 'قائمة الدخل',
      'upload.export': 'تصدير محاسبي',
      'upload.currency': 'العملة',
      'upload.analyze': 'تحليل البيانات',
      'upload.template': 'تحميل قالب Excel الرسمي ↓'
    },
    en: {
      'hero.title': 'Real Financial Clarity',
      'hero.subtitle': 'From raw numbers to clear decisions · under 5 minutes',
      'login.title': 'Sign In',
      'login.email': 'Email',
      'login.password': 'Password',
      'login.signin': 'Sign In',
      'login.or': 'or',
      'login.try': 'Try without account',
      'login.security': 'Your data is encrypted · never shared',
      'nav.home': 'Home',
      'nav.upload': 'Upload',
      'nav.reports': 'Reports',
      'upload.title': 'Upload Your Financial Data',
      'upload.desc': 'Excel or CSV — the system reads and analyzes automatically',
      'upload.drag': 'Drag file here or tap to upload',
      'upload.maxsize': 'Maximum 10MB',
      'upload.preview': 'Data Preview',
      'upload.filetype': 'FILE TYPE',
      'upload.trial': 'Trial Balance',
      'upload.income': 'Income Statement',
      'upload.export': 'Accounting Export',
      'upload.currency': 'CURRENCY',
      'upload.analyze': 'Analyze Data',
      'upload.template': 'Download official Excel template ↓'
    }
  },
  
  current: 'ar',
  
  init() {
    this.current = StorageService.get('language', 'ar');
    this.apply();
  },
  
  set(lang) {
    this.current = lang;
    StorageService.set('language', lang);
    this.apply();
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  },
  
  toggle() {
    this.set(this.current === 'ar' ? 'en' : 'ar');
  },
  
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (this.translations[this.current]?.[key]) {
        el.textContent = this.translations[this.current][key];
      }
    });
    
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.textContent = this.current === 'ar' ? 'EN' : 'ع';
    });
  }
};

// ========== Theme Service ==========
const Theme = {
  init() {
    const saved = StorageService.get('theme', 'light');
    this.set(saved);
  },
  
  set(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    StorageService.set('theme', theme);
    this.updateIcons(theme);
  },
  
  toggle() {
    this.set(AppState.theme === 'light' ? 'dark' : 'light');
  },
  
  updateIcons(theme) {
    const icons = document.querySelectorAll('.theme-icon use');
    icons.forEach(icon => {
      icon.setAttribute('href', theme === 'light' ? '#icon-moon' : '#icon-sun');
    });
  }
};

// ========== Screen Manager ==========
const ScreenManager = {
  show(screenId) {
    const currentScreen = document.querySelector('.screen--active');
    const nextScreen = document.getElementById(`${screenId}-screen`);
    
    if (!nextScreen) return;
    
    if (currentScreen) {
      currentScreen.classList.remove('screen--active');
    }
    
    nextScreen.classList.add('screen--active');
    AppState.currentScreen = screenId;
    
    // تحديث الـ navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      const isActive = btn.dataset.screen === screenId;
      btn.classList.toggle('nav-item--active', isActive);
    });
    
    // تشغيل دوال خاصة بالشاشة
    if (screenId === 'validation') {
      ValidationService.run();
    }
    if (screenId === 'processing') {
      ProcessingService.run();
    }
  },
  
  showLogin() { this.show('login'); },
  showUpload() { this.show('upload'); },
  showValidation() { this.show('validation'); },
  showMapping() { this.show('mapping'); },
  showProcessing() { this.show('processing'); },
  showDashboard() { this.show('dashboard'); },
  showInsights() { this.show('insights'); },
  showDueDiligence() { this.show('duediligence'); },
  showReports() { this.show('reports'); }
};

// ========== Validation Service ==========
const ValidationService = {
  run() {
    if (AppState.validationExecuted) return;
    
    const steps = document.querySelectorAll('#val-steps .val-step');
    const processing = document.getElementById('val-processing');
    const success = document.getElementById('val-success');
    const error = document.getElementById('val-error');
    
    if (!processing || !steps.length) return;
    
    // Reset
    steps.forEach(s => {
      s.style.color = '';
      s.style.fontWeight = '';
      s.style.opacity = '0.45';
    });
    
    processing.style.display = 'block';
    if (success) success.style.display = 'none';
    if (error) error.style.display = 'none';
    
    let i = 0;
    
    const runStep = () => {
      if (i < steps.length) {
        steps[i].style.color = 'var(--green-600)';
        steps[i].style.fontWeight = '700';
        steps[i].style.opacity = '1';
        i++;
        setTimeout(runStep, 680);
      } else {
        setTimeout(() => {
          processing.style.display = 'none';
          if (success) success.style.display = 'block';
          AppState.validationExecuted = true;
        }, 450);
      }
    };
    
    setTimeout(runStep, 400);
  }
};

// ========== Processing Service ==========
const ProcessingService = {
  run() {
    if (AppState.processingExecuted) return;
    
    const steps = document.querySelectorAll('#proc-list .proc-step');
    const ring = document.getElementById('proc-ring');
    const pct = document.getElementById('proc-pct');
    
    if (!steps.length) return;
    
    const percentages = [25, 50, 75, 100];
    const circumference = 226;
    let i = 0;
    
    // Reset
    steps.forEach(s => {
      const dot = s.querySelector('.proc-dot');
      const span = s.querySelector('span');
      if (dot) {
        dot.style.borderColor = '';
        dot.style.background = '';
        dot.style.color = '';
      }
      if (span) {
        span.style.color = '';
        span.style.fontWeight = '';
      }
    });
    
    if (ring) ring.style.strokeDashoffset = circumference;
    if (pct) pct.textContent = '0%';
    
    const tick = () => {
      if (i < steps.length) {
        const dot = steps[i].querySelector('.proc-dot');
        const span = steps[i].querySelector('span');
        
        if (dot) {
          dot.style.background = 'var(--green-600)';
          dot.style.borderColor = 'var(--green-600)';
          dot.style.color = '#fff';
        }
        if (span) {
          span.style.color = 'var(--neutral-900)';
          span.style.fontWeight = '600';
        }
        
        const p = percentages[i];
        const offset = circumference - (circumference * p / 100);
        if (ring) ring.style.strokeDashoffset = offset;
        if (pct) pct.textContent = p + '%';
        
        i++;
        setTimeout(tick, 900);
      } else {
        AppState.processingExecuted = true;
        setTimeout(() => ScreenManager.showDashboard(), 600);
      }
    };
    
    setTimeout(tick, 500);
  }
};

// ========== Upload Service ==========
const UploadService = {
  init() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const clearBtn = document.getElementById('clear-file');
    const analyzeBtn = document.getElementById('analyze-btn');
    
    if (dropZone) {
      dropZone.addEventListener('click', () => fileInput?.click());
      dropZone.addEventListener('dragover', this.dragOver.bind(this));
      dropZone.addEventListener('dragleave', this.dragLeave.bind(this));
      dropZone.addEventListener('drop', this.drop.bind(this));
    }
    
    if (fileInput) {
      fileInput.addEventListener('change', this.fileChosen.bind(this));
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', this.clearFile.bind(this));
    }
    
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => ScreenManager.showValidation());
    }
    
    // Currency buttons
    document.getElementById('cur-sar')?.addEventListener('click', (e) => this.setCurrency('SAR', e.target));
    document.getElementById('cur-usd')?.addEventListener('click', (e) => this.setCurrency('USD', e.target));
    document.getElementById('cur-eur')?.addEventListener('click', (e) => this.setCurrency('EUR', e.target));
    
    // Template download
    document.getElementById('download-template')?.addEventListener('click', this.downloadTemplate);
  },
  
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
    const file = e.dataTransfer.files[0];
    if (file) this.processFile(file);
  },
  
  fileChosen(e) {
    const file = e.target.files[0];
    if (file) this.processFile(file);
  },
  
  processFile(file) {
    // Check size
    if (file.size > 10 * 1024 * 1024) {
      alert('الملف أكبر من 10MB');
      return;
    }
    
    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('يُقبل فقط xlsx, xls, csv');
      return;
    }
    
    // Update UI
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-meta').textContent = `${(file.size / 1024).toFixed(0)} KB · ${ext.toUpperCase()}`;
    document.getElementById('file-preview').classList.add('show');
    
    AppState.uploadedFile = file;
    
    // Parse with XLSX
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        this.onParsed(rows);
      } catch (err) {
        this.showError(err);
      }
    };
    reader.readAsArrayBuffer(file);
  },
  
  onParsed(rows) {
    if (!rows || rows.length < 2) {
      this.showError('الملف فارغ أو لا يحتوي على بيانات كافية');
      return;
    }
    
    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => c !== '' && c !== null));
    
    AppState.columns = headers;
    AppState.fileData = dataRows;
    
    this.renderPreview(headers, dataRows);
    this.validateFile(headers, dataRows);
    
    document.getElementById('data-preview').hidden = false;
  },
  
  renderPreview(headers, rows) {
    // Update badge
    document.getElementById('preview-rows-badge').textContent = `${rows.length} rows`;
    
    // Render column chips
    const columnsEl = document.getElementById('preview-columns');
    columnsEl.innerHTML = '';
    headers.forEach(h => {
      const chip = document.createElement('span');
      chip.className = 'file-chip';
      chip.textContent = h;
      columnsEl.appendChild(chip);
    });
    
    // Render preview table (first 5 rows)
    const tableEl = document.getElementById('preview-table');
    let html = '<thead><tr>';
    headers.forEach(h => {
      html += `<th>${this.escapeHtml(h)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    rows.slice(0, 5).forEach(row => {
      html += '<tr>';
      headers.forEach((_, i) => {
        const val = row[i] !== undefined ? row[i] : '';
        html += `<td>${this.escapeHtml(String(val))}</td>`;
      });
      html += '</tr>';
    });
    
    if (rows.length > 5) {
      html += `<tr><td colspan="${headers.length}" style="text-align:center;color:var(--neutral-500)">... ${rows.length - 5} more rows</td></tr>`;
    }
    
    html += '</tbody>';
    tableEl.innerHTML = html;
  },
  
  validateFile(headers, rows) {
    const errors = [];
    const warns = [];
    
    // Check for empty headers
    headers.forEach((h, i) => {
      if (!h) errors.push({ type: 'error', msg: `Unnamed column at position ${i+1}` });
    });
    
    // Check for numeric columns
    const numericCols = headers.filter((_, ci) => {
      const nums = rows.filter(r => {
        const val = r[ci];
        return val !== '' && !isNaN(parseFloat(String(val).replace(/,/g, '')));
      }).length;
      return nums / rows.length > 0.7;
    });
    
    if (numericCols.length === 0) {
      warns.push({ type: 'warn', msg: 'No numeric columns detected' });
    }
    
    // Render summary
    const summaryEl = document.getElementById('preview-summary');
    summaryEl.innerHTML = '';
    
    summaryEl.innerHTML += `<span class="badge badge--green">${rows.length} rows</span>`;
    summaryEl.innerHTML += `<span class="badge badge--blue">${headers.length} cols</span>`;
    summaryEl.innerHTML += `<span class="badge badge--green">${numericCols.length} numeric</span>`;
    
    errors.forEach(e => {
      summaryEl.innerHTML += `<span class="badge badge--red">${e.msg}</span>`;
    });
    
    warns.forEach(w => {
      summaryEl.innerHTML += `<span class="badge badge--amber">${w.msg}</span>`;
    });
    
    if (errors.length === 0 && warns.length === 0) {
      summaryEl.innerHTML += `<span class="badge badge--green">✓ Valid</span>`;
    }
    
    AppState.errors = errors;
  },
  
  setCurrency(cur, btn) {
    ['cur-sar', 'cur-usd', 'cur-eur'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = `btn btn--sm ${el === btn ? 'btn--primary' : 'btn--ghost'}`;
      }
    });
  },
  
  downloadTemplate(e) {
    e.preventDefault();
    const content = 'Account,Amount\nSales Revenue,100000\nRent Expense,25000\nSalaries,45000\n';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clarity_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },
  
  clearFile() {
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').classList.remove('show');
    document.getElementById('data-preview').hidden = true;
    AppState.uploadedFile = null;
    AppState.fileData = null;
    AppState.columns = [];
  },
  
  showError(err) {
    const summary = document.getElementById('preview-summary');
    if (summary) {
      summary.innerHTML = `<span class="badge badge--red">Error: ${this.escapeHtml(String(err))}</span>`;
    }
  },
  
  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

// ========== Event Listeners Setup ==========
function setupEventListeners() {
  // Theme toggle buttons
  document.querySelectorAll('#theme-toggle, #theme-toggle-upload').forEach(btn => {
    btn?.addEventListener('click', () => Theme.toggle());
  });
  
  // Language toggle buttons
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn?.addEventListener('click', () => I18n.toggle());
  });
  
  // Logout buttons
  document.querySelectorAll('.power-btn, #logout-upload').forEach(btn => {
    btn?.addEventListener('click', () => ScreenManager.showLogin());
  });
  
  // Back buttons
  document.querySelectorAll('.back-btn, #upload-back').forEach(btn => {
    btn?.addEventListener('click', () => ScreenManager.showLogin());
  });
  
  // Login and try buttons
  document.getElementById('login-btn')?.addEventListener('click', () => ScreenManager.showUpload());
  document.getElementById('try-btn')?.addEventListener('click', () => ScreenManager.showUpload());
}

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
  I18n.init();
  Theme.init();
  UploadService.init();
  setupEventListeners();
  ScreenManager.show('login');
});

// ========== Export for debugging ==========
window.AppState = AppState;
window.ScreenManager = ScreenManager;
