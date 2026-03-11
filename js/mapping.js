/* ClarityFinance — Mapping Module (mapping.js) */

var MAPPING = {
  confirmed: 0,
  manual: 0,

  filter: function(type, btn) {
    document.querySelectorAll('.map-item').forEach(function(el) {
      el.style.display = (type === 'all' || el.dataset.status === type) ? '' : 'none';
    });
    
    document.querySelectorAll('.tabs .tab').forEach(function(t) {
      t.classList.remove('active');
    });
    btn.classList.add('active');
  },

  toggleCat: function(hdr) {
    const body = hdr.nextElementSibling;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    hdr.classList.toggle('open', !open);
  },

  confirm: function(btn, itemId) {
    const item = document.getElementById(itemId);
    if (!item) return;
    
    const sel = item.querySelector('select');
    const catText = sel ? sel.options[sel.selectedIndex].textContent : '';
    
    item.classList.remove('map-item-review');
    item.classList.add('map-item-done');
    item.dataset.status = 'auto';
    
    item.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px">' +
      '<div class="map-item-main">' +
      '<div class="map-item-name">' + itemId.replace('map-real-', 'Col ') + '</div>' +
      '<div class="map-item-cat">' + catText + '</div></div>' +
      '<div class="map-item-end">' +
      '<span class="conf-pill conf-high">✓</span>' +
      '<span class="map-check">✓</span></div></div>';
    
    MAPPING.confirmed++;
    MAPPING.updateProgress();
  },

  manualSelect: function(sel, itemId) {
    if (!sel.value && sel.selectedIndex === 0) return;
    
    const item = document.getElementById(itemId);
    if (!item) return;
    
    const catText = sel.options[sel.selectedIndex].textContent;
    
    item.classList.remove('map-item-manual');
    item.classList.add('map-item-done');
    item.dataset.status = 'auto';
    
    item.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px">' +
      '<div class="map-item-main">' +
      '<div class="map-item-name">' + itemId.replace('map-real-', 'Col ') + '</div>' +
      '<div class="map-item-cat">' + catText + '</div></div>' +
      '<div class="map-item-end">' +
      '<span class="conf-pill conf-high">✓</span>' +
      '<span class="map-check">✓</span></div></div>';
    
    MAPPING.manual++;
    MAPPING.updateProgress();
  },

  updateProgress: function() {
    const done = 18 + MAPPING.confirmed + MAPPING.manual;
    const total = 24;
    const pct = Math.round(done / total * 100);
    const bar = document.getElementById('map-progress');
    const lbl = document.getElementById('map-pct-label');
    
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = done + ' / ' + total;
  }
};

var DD = {
  toggle: function(id) {
    const body = document.getElementById(id);
    if (!body) return;
    
    const hdr = body.previousElementSibling;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (hdr) hdr.classList.toggle('open', !isOpen);
  }
};
