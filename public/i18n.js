// i18n Auto-Translate v3 — MyMemory direct (bypass Worker)
(function(){
  'use strict';

  var STORAGE_KEY = 'vinapiay_settings';
  var CACHE_KEY = 'javin_i18n_cache_v3';
  var BASE_LANG = 'id';
  var currentLang = BASE_LANG;
  var cache = {};
  var pending = {};
  var scanned = new WeakSet();

  var SKIP_TAGS = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'SVG', 'PATH'];
  var SKIP_CLASSES = ['no-i18n', 'brand', 'logo', 'mono'];
  var SKIP_ATTRS = ['data-no-i18n'];

  // Mapping kode bahasa → MyMemory code
  // MyMemory pakai ISO 639-1 (2 huruf)
  function toMyMemoryCode(code) {
    if (!code) return 'en';
    // Kalau ada dash (zh-CN, zh-TW), ambil bagian pertama
    if (code.indexOf('-') !== -1) return code.split('-')[0];
    return code;
  }

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
    if (el.tagName === 'INPUT') {
      var t = (el.type || '').toLowerCase();
      if (['password', 'email', 'url', 'number', 'date', 'time'].indexOf(t) !== -1) return true;
    }
    return false;
  }

  function getCacheKey(text, lang) {
    return lang + '::' + text;
  }

  // Translate via MyMemory (langsung dari browser)
  function translate(text, lang) {
    if (lang === BASE_LANG) return Promise.resolve(text);

    var key = getCacheKey(text, lang);
    if (cache[key]) return Promise.resolve(cache[key]);
    if (pending[key]) return pending[key];

    var memLang = toMyMemoryCode(lang);
    // Kalau bahasa sama, gak perlu translate
    if (memLang === BASE_LANG) {
      cache[key] = text;
      saveCache();
      return Promise.resolve(text);
    }

    var url = 'https://api.mymemory.translated.net/get'
      + '?q=' + encodeURIComponent(text)
      + '&langpair=' + encodeURIComponent(BASE_LANG + '|' + memLang)
      + '&de=translate@jvin.pages.dev';

    var p = fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(j){
        var result = text;
        if (j && j.responseData && j.responseData.translatedText) {
          var t = j.responseData.translatedText;
          // Filter pesan warning MyMemory
          if (!/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) {
            result = t;
          }
        }
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
          if (!/[a-zA-Z]/.test(text)) return NodeFilter.FILTER_REJECT;
          if (text.length < 3) return NodeFilter.FILTER_REJECT;
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
      nodes.forEach(function(node) {
        var orig = originalTexts.get(node);
        if (orig && node.textContent !== orig) node.textContent = orig;
      });
      return Promise.resolve();
    }

    // Batch 3 concurrent (MyMemory lebih ketat)
    var chunks = [];
    for (var i = 0; i < nodes.length; i += 3) {
      chunks.push(nodes.slice(i, i + 3));
    }
    var chain = Promise.resolve();
    chunks.forEach(function(chunk){
      chain = chain.then(function(){
        return Promise.all(chunk.map(function(node){
          var text = originalTexts.get(node) || node.textContent;
          text = text.trim();
          if (!text) return;
          return translate(text, lang).then(function(translated){
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
