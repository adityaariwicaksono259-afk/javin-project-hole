// i18n Auto-Translate v2 — scan semua text otomatis
(function(){
  'use strict';

  var STORAGE_KEY = 'vinapiay_settings';
  var CACHE_KEY = 'javin_i18n_cache_v2';
  var BASE_LANG = 'id';
  var currentLang = BASE_LANG;
  var cache = {};
  var pending = {};
  var scanned = new WeakSet();

  // Elemen yang DI-SKIP (jangan di-translate)
  var SKIP_TAGS = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'SVG', 'PATH'];
  var SKIP_CLASSES = ['no-i18n', 'brand', 'logo', 'mono'];
  var SKIP_ATTRS = ['data-no-i18n'];

  function getLang() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var s = raw ? JSON.parse(raw) : {};
      return s.lang || BASE_LANG;
    } catch(e) { return BASE_LANG; }
  }

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      cache = raw ? JSON.parse(raw) : {};
    } catch(e) { cache = {}; }
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch(e) {}
  }

  function shouldSkip(el) {
    if (!el) return true;
    if (SKIP_TAGS.indexOf(el.tagName) !== -1) return true;
    if (el.classList) {
      for (var i = 0; i < SKIP_CLASSES.length; i++) {
        if (el.classList.contains(SKIP_CLASSES[i])) return true;
      }
    }
    for (var j = 0; j < SKIP_ATTRS.length; j++) {
      if (el.hasAttribute(SKIP_ATTRS[j])) return true;
    }
    // Input password/email/url gak usah di-translate
    if (el.tagName === 'INPUT') {
      var t = (el.type || '').toLowerCase();
      if (['password', 'email', 'url', 'number', 'date', 'time'].indexOf(t) !== -1) return true;
    }
    return false;
  }

  function getCacheKey(text, lang) {
    return lang + '::' + text;
  }

  function translate(text, lang) {
    if (lang === BASE_LANG) return Promise.resolve(text);
    var key = getCacheKey(text, lang);
    if (cache[key]) return Promise.resolve(cache[key]);
    if (pending[key]) return pending[key];

    var url = '/api/translate?text=' + encodeURIComponent(text) + '&to=' + encodeURIComponent(lang) + '&from=' + BASE_LANG;
    var p = fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function(r){ return r.json(); })
      .then(function(j){
        var result = (j && j.ok && j.text) ? j.text : text;
        cache[key] = result;
        saveCache();
        delete pending[key];
        return result;
      })
      .catch(function(){
        delete pending[key];
        return text;
      });
    pending[key] = p;
    return p;
  }

  // Simpan text asli di WeakMap (biar gak bisa diintip via DOM attribute)
  var originalTexts = new WeakMap();

  function collectTextNodes(root) {
    var items = [];
    var walker = document.createTreeWalker(
      root || document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          var parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
          var text = node.textContent.trim();
          if (!text) return NodeFilter.FILTER_REJECT;
          // Skip text yang cuma angka / simbol
          if (!/[a-zA-Z]/.test(text)) return NodeFilter.FILTER_REJECT;
          // Skip kalau cuma 1-2 char
          if (text.length < 3) return NodeFilter.FILTER_REJECT;
          // Skip kalau udah pernah di-scan
          if (scanned.has(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    var n;
    while (n = walker.nextNode()) {
      items.push(n);
      scanned.add(n);
      if (!originalTexts.has(n)) {
        originalTexts.set(n, n.textContent);
      }
    }
    return items;
  }

  function applyTranslations(lang) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);

    var nodes = collectTextNodes(document.body);
    if (lang === BASE_LANG) {
      // Balik ke text asli
      nodes.forEach(function(node) {
        var orig = originalTexts.get(node);
        if (orig && node.textContent !== orig) node.textContent = orig;
      });
      return Promise.resolve();
    }

    // Batch 5 concurrent
    var chunks = [];
    for (var i = 0; i < nodes.length; i += 5) {
      chunks.push(nodes.slice(i, i + 5));
    }
    var chain = Promise.resolve();
    chunks.forEach(function(chunk){
      chain = chain.then(function(){
        return Promise.all(chunk.map(function(node){
          var text = originalTexts.get(node) || node.textContent;
          text = text.trim();
          if (!text) return;
          return translate(text, lang).then(function(translated){
            // Preserve leading/trailing whitespace
            var orig = node.textContent;
            var lead = orig.match(/^\s*/)[0];
            var trail = orig.match(/\s*$/)[0];
            node.textContent = lead + translated + trail;
          });
        }));
      });
    });
    return chain;
  }

  function setLang(lang) {
    return applyTranslations(lang || BASE_LANG);
  }

  function init() {
    loadCache();
    var lang = getLang();
    // Delay dikit biar DOM siap
    setTimeout(function(){
      applyTranslations(lang);
    }, 500);

    window.addEventListener('storage', function(e){
      if (e.key === STORAGE_KEY) {
        var newLang = getLang();
        if (newLang !== currentLang) applyTranslations(newLang);
      }
    });
  }

  window.i18n = {
    init: init,
    setLang: setLang,
    getLang: function(){ return currentLang; },
    clearCache: function(){
      cache = {};
      try { localStorage.removeItem(CACHE_KEY); } catch(e) {}
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
