(function(){
'use strict';

var STORAGE_READ = 'javin_inbox_read_v1';
var $ = function(id){ return document.getElementById(id); };
var listEl = $('inboxList');
var emptyEl = $('inboxEmpty');
var tabsEl = $('inboxTabs');
var modal = $('inboxModal');
var modalIcon = $('modalIcon');
var modalTitle = $('modalTitle');
var modalTime = $('modalTime');
var modalBody = $('modalBody');

var allItems = [];
var currentFilter = 'all';

function getReadIds(){ try { return JSON.parse(localStorage.getItem(STORAGE_READ)||'[]'); } catch(e){ return []; } }
function markRead(id){ var ids=getReadIds(); if(ids.indexOf(id)===-1){ ids.push(id); try{localStorage.setItem(STORAGE_READ,JSON.stringify(ids));}catch(e){} } }
function isRead(id){ return getReadIds().indexOf(id)!==-1; }

function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
function relTime(ts){
  if(!ts) return '';
  var d=Date.now()-ts;
  if(d<60000) return 'baru saja';
  if(d<3600000) return Math.floor(d/60000)+' menit lalu';
  if(d<86400000) return Math.floor(d/3600000)+' jam lalu';
  if(d<604800000) return Math.floor(d/86400000)+' hari lalu';
  var dt=new Date(ts);
  return dt.getDate()+'/'+(dt.getMonth()+1)+'/'+dt.getFullYear();
}
function pickIcon(t){
  return t==='announce'?'📢':t==='warning'?'⚠️':t==='success'?'✅':'ℹ️';
}

function fetchInbox(){
  return fetch('/api/announce',{credentials:'same-origin',cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(j){
      var arr=[];
      if(j&&Array.isArray(j.items)) arr=j.items;
      else if(j&&Array.isArray(j.announcements)) arr=j.announcements;
      else if(Array.isArray(j)) arr=j;
      else if(j&&j.ok&&Array.isArray(j.data)) arr=j.data;
      return arr.map(function(item,idx){
        return {
          id: item.id||('ann-'+idx),
          type: item.type||'info',
          title: item.title||item.name||'Notifikasi',
          message: item.message||item.body||item.content||item.text||'',
          time: item.time||item.created_at||item.timestamp||Date.now()
        };
      });
    })
    .catch(function(){
      return [
        {id:'welcome',type:'announce',title:'Selamat Datang di Javin Codex',message:'Hai Tuan! Selamat datang di Javin Codex.\n\nSemua info update, maintenance, dan fitur baru bakal muncul di sini.\n\nGaskeun eksplor endpoint-nya 🔥',time:Date.now()},
        {id:'tips',type:'info',title:'Tips Pakai API Key',message:'Simpan API Key kamu di tempat yang aman.\n\nJangan share ke orang lain, karena API Key terhubung dengan tier dan limit kamu.',time:Date.now()-3600000}
      ];
    });
}

function render(){
  var visible = allItems.slice();
  if(currentFilter==='unread') visible=visible.filter(function(x){return !isRead(x.id);});
  if(currentFilter==='read') visible=visible.filter(function(x){return isRead(x.id);});
  visible.sort(function(a,b){return (b.time||0)-(a.time||0);});

  listEl.innerHTML='';
  if(!visible.length){ emptyEl.hidden=false; return; }
  emptyEl.hidden=true;

  visible.forEach(function(item){
    var read=isRead(item.id);
    var el=document.createElement('div');
    el.className='inbox-item type-'+item.type+(read?'':' unread');
    el.dataset.id=item.id;
    el.innerHTML='<div class="inbox-item-icon">'+pickIcon(item.type)+'</div>'+
      '<div class="inbox-item-body">'+
        '<div class="inbox-item-title">'+escapeHtml(item.title)+'</div>'+
        '<div class="inbox-item-preview">'+escapeHtml(item.message)+'</div>'+
        '<div class="inbox-item-time">'+relTime(item.time)+'</div>'+
      '</div>';
    el.addEventListener('click',function(){ openDetail(item); });
    listEl.appendChild(el);
  });
}

function openDetail(item){
  markRead(item.id);
  modalIcon.textContent=pickIcon(item.type);
  modalTitle.textContent=item.title;
  modalTime.textContent=relTime(item.time);
  modalBody.textContent=item.message||'(tidak ada isi)';
  modal.style.display='flex';
  modal.removeAttribute('hidden');
  render();
}

function closeDetail(){ modal.style.display='none'; modal.setAttribute('hidden',''); }

tabsEl.addEventListener('click',function(e){
  var btn=e.target.closest('.inbox-tab');
  if(!btn) return;
  currentFilter=btn.dataset.filter;
  tabsEl.querySelectorAll('.inbox-tab').forEach(function(b){ b.classList.toggle('active',b===btn); });
  render();
});

$('btnModalClose').addEventListener('click',closeDetail);
modal.addEventListener('click',function(e){ if(e.target===modal) closeDetail(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDetail(); });

$('btnRefresh').addEventListener('click',function(){
  listEl.innerHTML='<div class="inbox-loading">Memuat...</div>';
  fetchInbox().then(function(items){ allItems=items; render(); });
});

fetchInbox().then(function(items){
  allItems=items;
  render();
  console.log('[Inbox] Loaded '+items.length+' items');
});
})();
