// main.js - Application Entry Point
const App = (() => {
  'use strict';

  async function init() {
    // 1. Load components first
    await loadComponents();
    
    // 2. Apply saved preferences
    UI.applyTheme(State.get('theme'));
    UI.applyLang(State.get('lang'));

    // 3. Register screens & guards
    registerScreens();
    registerGuards();

    // 4. Wire reactive bindings
    wireReactivity();

    // 5. Init UI utilities
    UI.initRipple();

    // 6. Open DB in background
    DB.open().then(() => {
      DB.loadScenarios();
      DB.loadAnalysis();
    });

    // 7. Navigate to initial screen
    const hash = location.hash.replace('#', '');
    const start = ['upload','dashboard','whatif','insights','reports'].includes(hash) ? hash : 'login';
    Router.go(start, { silent: true });
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
    const needsFile = new Set(['validation','mapping','processing','dashboard','insights','reports']);
    Router.guard((to) => {
      if (needsFile.has(to) && !State.get('file.rows')?.length) {
        UI.toast(State.get('lang') === 'ar' ? 'يرجى رفع ملف أولاً' : 'Please upload a file first', 'warn');
        Router.go('upload');
        return false;
      }
    });
  }

  function toggleLang() {
    State.set('lang', State.get('lang') === 'ar' ? 'en' : 'ar');
  }

  function toggleTheme() {
    State.set('theme', State.get('theme') === 'light' ? 'dark' : 'light');
  }

  // Global CF object for backward compatibility
  window.CF = {
    show: id => Router.go(id),
    toggleLang,
    toggleTheme,
    get lang() { return State.get('lang'); },
    get theme() { return State.get('theme'); },
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init(), { once: true });
