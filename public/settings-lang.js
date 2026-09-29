// Settings Language Picker — dropdown searchable (modern)
(function(){
  'use strict';
  var STORAGE_KEY = 'vinapiay_settings';
  var LANGS = {};
  var currentLang = 'id';

  function getSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  function loadLangs() {
    return fetch('/i18n/languages.json').then(function(r){ return r.json(); });
  }

  function renderList(filter) {
    var list = document.getElementById('langList');
    if (!list) return;
    filter = (filter || '').toLowerCase().trim();
    var html = '';
    var count = 0;
    Object.keys(LANGS).forEach(function(code){
      var name = LANGS[code];
      if (filter && code.toLowerCase().indexOf(filter) === -1 && name.toLowerCase().indexOf(filter) === -1) return;
      var active = code === currentLang ? ' active' : '';
      html += '<div class="lang-row' + active + '" data-code="' + code + '">'
        + '<span>' + name + '</span>'
        + '<span class="lang-code">' + code + '</span>'
        + '</div>';
      count++;
    });
    if (!html) html = '<div class="lang-empty">Tidak ada hasil untuk "' + filter + '"</div>';
    list.innerHTML = html;

    list.querySelectorAll('.lang-row').forEach(function(el){
      el.onclick = function(){ setLang(el.dataset.code); };
    });
  }

  function updateCurrentLabel() {
    var el = document.getElementById('langCurrent');
    if (el) el.textContent = LANGS[currentLang] || currentLang;
  }

  function setLang(code) {
    if (!LANGS[code]) return;
    currentLang = code;
    var s = getSettings();
    s.lang = code;
    saveSettings(s);
    document.documentElement.setAttribute('lang', code);
    updateCurrentLabel();
    renderList(document.getElementById('langSearch') ? document.getElementById('langSearch').value : '');
    if (window.i18n && window.i18n.setLang) {
      window.i18n.setLang(code);
    }
    console.log('[Lang] Set ke:', code);
  }

  function init() {
    var s = getSettings();
    currentLang = s.lang || 'id';
    loadLangs().then(function(data){
      LANGS = data;
      updateCurrentLabel();
      renderList('');
      var search = document.getElementById('langSearch');
      if (search) {
        search.oninput = function(){ renderList(search.value); };
      }
    }).catch(function(e){
      console.error('[Lang] Gagal load languages.json:', e);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
