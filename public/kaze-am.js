(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

var AM_BASE = 'https://am.zervida.my.id';
var __amLoaded = { effects: false, shapes: false };

function isAMPresets(d){
  if (!d || typeof d !== 'object') return false;
  return !!(Array.isArray(d.presets) && Array.isArray(d.images));
}

function renderLoading(msg){
  return '<div style="padding:40px 20px;text-align:center;color:#22d3ee;font-size:13px">⏳ ' + (msg || 'Memuat...') + '</div>';
}

function presetUrl(name){ return AM_BASE + '/preset/' + encodeURIComponent(name); }

function loadAMTab(tab){
  if (__amLoaded[tab]) return;
  __amLoaded[tab] = true;
  var url = tab === 'effects' ? AM_BASE + '/runtime/effect-index.json' : AM_BASE + '/runtime/shape-index.json';
  var targetId = tab === 'effects' ? 'am-effects-content' : 'am-shapes-content';
  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(data){
      var el = document.getElementById(targetId);
      if (!el) return;
      // Build unique list — pakai key dengan prefix "com." sebagai download key
      var seen = {};
      var items = [];
      Object.keys(data).forEach(function(k){
        var v = data[k];
        if (typeof v !== 'string') return;
        if (seen[v]) return;
        // Prioritas: pakai key dengan "com.alightcreative"
        if (k.indexOf('com.') === 0) {
          seen[v] = true;
          items.push({ key: k, file: v });
        }
      });
      // Kalau gak ada com.*, pakai semua unique
      if (!items.length) {
        Object.keys(data).forEach(function(k){
          var v = data[k];
          if (typeof v !== 'string' || seen[v]) return;
          seen[v] = true;
          items.push({ key: k, file: v });
        });
      }

      var h = '';
      h += '<div style="font-size:11px;color:#94a3b8;line-height:1.5;padding:10px 12px;background:rgba(34,211,238,.05);border-radius:8px;border:1px solid rgba(34,211,238,.1);margin-bottom:12px">';
      if (tab === 'effects') h += '✨ <b>' + items.length + ' efek</b> Alight Motion. Klik untuk download.';
      else h += '🔷 <b>' + items.length + ' shape</b> Alight Motion. Klik untuk download.';
      h += '</div>';

      h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">';
      items.slice(0, 300).forEach(function(item){
        var name = item.key.replace(/^com\.alightcreative\.(effects\.|blend\.|shape\.|shapes\.)?/i, '').replace(/[-_.]/g, ' ').trim();
        if (!name) name = item.file.replace(/\.xml$/i, '');
        // Download URL: effect-bin untuk effect, shape-bin untuk shape
        var dlUrl;
        if (tab === 'effects') {
          dlUrl = AM_BASE + '/api/effect-bin?id=' + encodeURIComponent(item.key);
        } else {
          dlUrl = AM_BASE + '/shapes/' + encodeURIComponent(item.file);
        }
        h += '<a href="' + esc(dlUrl) + '" download target="_blank" rel="noopener" style="display:block;padding:10px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.12);border-radius:8px;text-decoration:none;overflow:hidden">';
        h += '<div style="font-size:11px;color:#e0f2fe;font-weight:600;line-height:1.3;word-break:break-word">' + esc(name) + '</div>';
        h += '<div style="font-size:9px;color:#22d3ee;margin-top:4px">⬇️ Download</div>';
        h += '</a>';
      });
      h += '</div>';
      el.innerHTML = h;
    })
    .catch(function(e){
      var el = document.getElementById(targetId);
      if (el) el.innerHTML = '<div style="padding:20px;text-align:center;color:#f87171;font-size:12px">❌ Gagal memuat: ' + esc(e.message) + '</div>';
    });
}

function renderAMPresets(d){
  var presets = d.presets || [];
  var images = d.images || [];
  var audio = d.audio || [];
  var files = d.files || [];

  // Gabung presets + files (semua XML)
  var allXml = presets.slice();
  files.forEach(function(f){
    var exists = allXml.some(function(p){ return p.name === f.name; });
    if (!exists) allXml.push(f);
  });

  var h = '';
  h += '<div id="am-kit" style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden">';
  h += '<div style="display:flex;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08);overflow-x:auto">';
  h += '<button class="kz-am-tab active" data-tab="presets" style="flex:1;padding:12px 8px;border:0;background:transparent;color:#22d3ee;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;border-bottom:2px solid #22d3ee;white-space:nowrap">📦 Preset (' + allXml.length + ')</button>';
  h += '<button class="kz-am-tab" data-tab="effects" style="flex:1;padding:12px 8px;border:0;background:transparent;color:#64748b;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;white-space:nowrap">✨ Efek</button>';
  h += '<button class="kz-am-tab" data-tab="shapes" style="flex:1;padding:12px 8px;border:0;background:transparent;color:#64748b;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;white-space:nowrap">🔷 Shape</button>';
  h += '</div>';

  // TAB PRESET
  h += '<div class="kz-am-panel active" data-panel="presets" style="padding:14px">';
  h += '<div style="font-size:11px;color:#94a3b8;line-height:1.5;padding:10px 12px;background:rgba(34,211,238,.05);border-radius:8px;border:1px solid rgba(34,211,238,.1);margin-bottom:12px">💡 Klik preset → download XML → import ke Alight Motion. Semua preset udah include efek premium.</div>';

  // Audio
  if (audio.length) {
    h += '<div style="font-size:11px;color:#22d3ee;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🎵 Audio</div>';
    audio.forEach(function(a){
      h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.15);border-radius:8px;margin-bottom:8px">';
      h += '<div style="flex:1;min-width:0">';
      h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe;word-break:break-word">' + esc(a.name) + '</div>';
      h += '<div style="font-size:10px;color:#64748b;margin-top:2px">' + (a.size ? Math.round(a.size/1024)+' KB' : '') + '</div>';
      h += '</div>';
      h += '<a href="' + esc(presetUrl(a.name)) + '" download style="padding:8px 14px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border-radius:8px;color:#06111f;font-size:11px;font-weight:700;text-decoration:none;flex-shrink:0">⬇️</a>';
      h += '</div>';
      h += '<audio controls preload="none" style="width:100%;margin-bottom:12px" src="' + esc(presetUrl(a.name)) + '"></audio>';
    });
  }

  // Images
  if (images.length) {
    h += '<div style="font-size:11px;color:#22d3ee;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🖼️ Thumbnail</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:16px">';
    images.slice(0, 12).forEach(function(img){
      var imgUrl = presetUrl(img.name);
      h += '<a href="' + esc(imgUrl) + '" target="_blank" rel="noopener" style="display:block;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#06111f">';
      h += '<img src="' + esc(imgUrl) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover">';
      h += '</a>';
    });
    h += '</div>';
  }

  // XML presets
  h += '<div style="font-size:11px;color:#22d3ee;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📦 Preset XML</div>';
  h += '<div style="display:flex;flex-direction:column;gap:6px">';
  allXml.forEach(function(p){
    var fname = p.name || '';
    var size = p.size ? Math.round(p.size / 1024) + ' KB' : '';
    h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.15);border-radius:8px">';
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe;line-height:1.3;word-break:break-word">' + esc(fname) + '</div>';
    if (size) h += '<div style="font-size:10px;color:#64748b;margin-top:2px">' + size + '</div>';
    h += '</div>';
    h += '<a href="' + esc(presetUrl(fname)) + '" download style="padding:8px 14px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border-radius:8px;color:#06111f;font-size:11px;font-weight:700;text-decoration:none;flex-shrink:0">⬇️</a>';
    h += '</div>';
  });
  h += '</div>';
  h += '</div>';

  h += '<div class="kz-am-panel" data-panel="effects" style="display:none;padding:14px"><div id="am-effects-content">' + renderLoading('Memuat efek...') + '</div></div>';
  h += '<div class="kz-am-panel" data-panel="shapes" style="display:none;padding:14px"><div id="am-shapes-content">' + renderLoading('Memuat shapes...') + '</div></div>';
  h += '</div>';

  setTimeout(function(){
    loadAMTab('effects');
    loadAMTab('shapes');
  }, 500);

  return h;
}

document.addEventListener('click', function(e){
  var tab = e.target.closest('.kz-am-tab');
  if (!tab) return;
  var target = tab.getAttribute('data-tab');
  var kit = tab.closest('#am-kit');
  if (!kit) return;
  kit.querySelectorAll('.kz-am-tab').forEach(function(t){
    var isActive = t === tab;
    t.style.color = isActive ? '#22d3ee' : '#64748b';
    t.style.borderBottom = isActive ? '2px solid #22d3ee' : '2px solid transparent';
    t.style.fontWeight = isActive ? '700' : '600';
  });
  kit.querySelectorAll('.kz-am-panel').forEach(function(p){
    p.style.display = (p.getAttribute('data-panel') === target) ? 'block' : 'none';
  });
});

window.KazeAM = { isAMPresets: isAMPresets, render: renderAMPresets };
console.log('BETOx1: KazeAM v2 siap');
})();
