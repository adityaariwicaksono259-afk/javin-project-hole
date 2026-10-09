(function(){
'use strict';

var $ = function(id){ return document.getElementById(id); };
var viewList = $('viewList');
var viewRoom = $('viewRoom');
var chatList = $('chatList');
var chatEmpty = $('chatEmpty');
var chatSearch = $('chatSearch');
var chatMessages = $('chatMessages');
var chatForm = $('chatForm');
var chatInput = $('chatInput');
var roomName = $('roomName');
var roomAvatar = $('roomAvatar');
var roomStatus = $('roomStatus');
var chatTabs = $('chatTabs');
var roomMenuSheet = $('roomMenuSheet');
var reportSheet = $('reportSheet');

var currentTab = 'rooms';
var currentRoom = null;
var allRooms = [];
var allContacts = [];
var pollTimer = null;
var heartbeatTimer = null;
var typingDebounce = null;
var lastTypingSent = 0;
var cachedMessages = [];

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }

function relTime(ts){
  if(!ts) return '';
  var d=Date.now()-ts;
  if(d<60000) return 'baru saja';
  if(d<3600000) return Math.floor(d/60000)+' menit';
  if(d<86400000) return Math.floor(d/3600000)+' jam';
  if(d<604800000) return Math.floor(d/86400000)+' hari';
  var dt=new Date(ts);
  return dt.getDate()+'/'+(dt.getMonth()+1);
}

function relTimeShort(ts){
  if(!ts) return '';
  var d=Date.now()-ts;
  if(d<60000) return 'baru';
  if(d<3600000) return Math.floor(d/60000)+' m';
  if(d<86400000) return Math.floor(d/3600000)+' j';
  if(d<604800000) return Math.floor(d/86400000)+' h';
  var dt=new Date(ts);
  return dt.getDate()+'/'+(dt.getMonth()+1);
}

function fmtTime(ts){
  var d=new Date(ts);
  var hh=String(d.getHours()).padStart(2,'0');
  var mm=String(d.getMinutes()).padStart(2,'0');
  return hh+':'+mm;
}

function onlineStatus(other){
  if(!other) return 'offline';
  if(other.online) return 'online';
  if(!other.last_seen || other.last_seen === 0) return 'offline';
  return 'terakhir dilihat ' + relTime(other.last_seen) + ' lalu';
}

function avatarHtml(user){
  var initial = (user.name||'U').charAt(0).toUpperCase();
  if(user.avatar){
    return '<img src="'+esc(user.avatar)+'" alt="" onerror="this.replaceWith(document.createTextNode(\''+esc(initial)+'\'))">';
  }
  return esc(initial);
}

function checkmarkIcon(msg){
  if(!msg.fromMe) return '';
  if(msg.read){
    // ✓✓ biru (dibaca)
    return '<span class="msg-check read" title="Dibaca"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 6 7 17 2 12"/><polyline points="22 6 11 17"/></svg></span>';
  }
  if(msg.delivered){
    // ✓✓ abu (sampai)
    return '<span class="msg-check delivered" title="Terkirim ke device"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 6 7 17 2 12"/><polyline points="22 6 11 17"/></svg></span>';
  }
  // ✓ abu (terkirim ke server)
  return '<span class="msg-check sent" title="Terkirim"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>';
}

function fetchJson(url, opts){
  return fetch(url, Object.assign({credentials:'same-origin',cache:'no-store'}, opts||{}))
    .then(function(r){ return r.json().then(function(j){ return {status:r.status, body:j}; }); });
}

function renderTab(){
  chatTabs.querySelectorAll('.chat-tab').forEach(function(b){
    b.classList.toggle('active', b.dataset.tab === currentTab);
  });
  if(currentTab === 'rooms') renderRooms();
  else renderContacts();
}

function renderRooms(){
  var q = (chatSearch.value||'').toLowerCase().trim();
  var list = allRooms.filter(function(r){
    return !q || (r.other.name||'').toLowerCase().indexOf(q) !== -1;
  });
  chatList.innerHTML = '';
  if(!list.length){
    chatEmpty.hidden = false;
    chatEmpty.querySelector('.chat-empty-title').textContent = 'Belum ada chat';
    chatEmpty.querySelector('.chat-empty-sub').textContent = 'Buka tab Kontak untuk mulai ngobrol';
    return;
  }
  chatEmpty.hidden = true;
  list.forEach(function(r){
    var el = document.createElement('div');
    el.className = 'chat-item';
    el.dataset.room = r.id;
    el.innerHTML =
      '<div class="chat-item-avatar">'+avatarHtml(r.other)+'</div>'+
      '<div class="chat-item-body">'+
        '<div class="chat-item-name">'+esc(r.other.name)+'</div>'+
        '<div class="chat-item-preview">'+(r.lastMessage ? (r.lastMessage.fromMe?'Kamu: ':'')+esc(r.lastMessage.text) : 'Mulai percakapan')+'</div>'+
      '</div>'+
      '<div class="chat-item-meta">'+
        (r.lastMessage ? '<div class="chat-item-time">'+relTimeShort(r.lastMessage.time)+'</div>' : '')+
        (r.unread>0 ? '<div class="chat-item-badge">'+(r.unread>99?'99+':r.unread)+'</div>' : '')+
      '</div>';
    el.addEventListener('click', function(){ openRoom(r.id, r.other); });
    chatList.appendChild(el);
  });
}

function renderContacts(){
  var q = (chatSearch.value||'').toLowerCase().trim();
  var list = allContacts.filter(function(c){
    return !q || (c.name||'').toLowerCase().indexOf(q) !== -1 || (c.code||'').toLowerCase().indexOf(q) !== -1;
  });
  chatList.innerHTML = '';
  if(!list.length){
    chatEmpty.hidden = false;
    chatEmpty.querySelector('.chat-empty-title').textContent = 'Belum ada kontak';
    chatEmpty.querySelector('.chat-empty-sub').textContent = 'Belum ada user lain yang terdaftar';
    return;
  }
  chatEmpty.hidden = true;
  list.forEach(function(c){
    var el = document.createElement('div');
    el.className = 'chat-item';
    el.innerHTML =
      '<div class="chat-item-avatar">'+avatarHtml(c)+'</div>'+
      '<div class="chat-item-body">'+
        '<div class="chat-item-name">'+esc(c.name)+'</div>'+
        '<div class="chat-item-preview">'+esc(c.code)+'</div>'+
      '</div>'+
      '<div class="chat-item-meta"><span style="font-size:22px;font-weight:800">+</span></div>';
    el.addEventListener('click', function(){ startChatWith(c.code, c.name, c.avatar); });
    chatList.appendChild(el);
  });
}

function loadRooms(){
  if(!chatList.querySelector('.chat-item')) chatList.innerHTML = '<div class="chat-loading">Memuat...</div>';
  return fetchJson('/api/chat/rooms').then(function(r){
    if(r.status === 401){ location.href='/login'; return; }
    if(r.body && r.body.ok){
      allRooms = r.body.rooms || [];
      if(currentTab === 'rooms') renderRooms();
    }
  }).catch(function(){});
}

function loadContacts(){
  return fetchJson('/api/chat/contacts').then(function(r){
    if(r.body && r.body.ok){
      allContacts = r.body.contacts || [];
      if(currentTab === 'contacts') renderContacts();
    }
  }).catch(function(){});
}

function startChatWith(code, name, avatar){
  fetchJson('/api/chat/rooms', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ target: code })
  }).then(function(r){
    if(r.body && r.body.ok){
      var room = r.body.room;
      openRoom(room.id, room.other || {code:code,name:name,avatar:avatar});
      loadRooms();
    } else {
      alert((r.body && r.body.message) || 'Gagal buka chat');
    }
  }).catch(function(){ alert('Koneksi error'); });
}

function openRoom(roomId, other){
  currentRoom = { id: roomId, other: other };
  roomName.textContent = other.name || 'User';
  roomAvatar.innerHTML = avatarHtml(other);
  roomStatus.textContent = 'memuat...';
  viewList.hidden = true;
  viewRoom.hidden = false;
  cachedMessages = [];
  chatMessages.innerHTML = '<div class="chat-loading">Memuat...</div>';
  loadMessages(true);
  startPolling();
  startHeartbeat();
  setTimeout(function(){ chatInput.focus(); }, 100);
}

function closeRoom(){
  currentRoom = null;
  cachedMessages = [];
  stopPolling();
  stopHeartbeat();
  viewRoom.hidden = true;
  viewList.hidden = false;
  loadRooms();
}

function renderMessages(list, other){
  // Cek apakah user lagi deket bottom (biar auto-scroll cuma kalau perlu)
  var wasNearBottom = (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight) < 80;
  var countBefore = cachedMessages.length;
  cachedMessages = list;

  if(!list.length){
    chatMessages.innerHTML = '<div class="chat-empty" style="padding:40px 20px"><div class="chat-empty-emoji"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></div><div class="chat-empty-title">Mulai percakapan</div><div class="chat-empty-sub">Kirim pesan pertama</div></div>';
    return;
  }

  // Update header online status
  if(other){
    roomStatus.textContent = onlineStatus(other);
    roomStatus.classList.toggle('is-online', !!other.online);
  }

  chatMessages.innerHTML = '';
  list.forEach(function(m){
    var row = document.createElement('div');
    row.className = 'msg-row ' + (m.fromMe?'me':'them');
    var timeHtml = fmtTime(m.time);
    var check = checkmarkIcon(m);
    row.innerHTML = '<div class="msg-bubble">'+esc(m.text)+'<div class="msg-time">'+timeHtml+check+'</div></div>';
    chatMessages.appendChild(row);
  });

  // Auto-scroll kalau perlu
  var shouldScroll = (countBefore === 0) || (list.length > countBefore) || wasNearBottom;
  if(shouldScroll) setTimeout(function(){ chatMessages.scrollTop = chatMessages.scrollHeight; }, 30);
}

function showTypingIndicator(){
  var existing = document.getElementById('typingIndicator');
  if(existing) return;
  var el = document.createElement('div');
  el.id = 'typingIndicator';
  el.className = 'msg-row them';
  el.innerHTML = '<div class="msg-bubble typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
  chatMessages.appendChild(el);
  setTimeout(function(){ chatMessages.scrollTop = chatMessages.scrollHeight; }, 30);
}

function hideTypingIndicator(){
  var el = document.getElementById('typingIndicator');
  if(el) el.remove();
}

function loadMessages(scroll){
  if(!currentRoom) return;
  fetchJson('/api/chat/messages?room_id='+currentRoom.id).then(function(r){
    if(r.body && r.body.ok){
      renderMessages(r.body.messages || [], r.body.other);
    }
  }).catch(function(){});

  // Cek typing status
  fetchJson('/api/chat/typing?room_id='+currentRoom.id).then(function(r){
    if(r.body && r.body.ok){
      if(r.body.typing) showTypingIndicator();
      else hideTypingIndicator();
    }
  }).catch(function(){});
}

function sendTypingSignal(){
  if(!currentRoom) return;
  var now = Date.now();
  if((now - lastTypingSent) < 3000) return; // throttle 3 detik
  lastTypingSent = now;
  fetchJson('/api/chat/typing', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ room_id: currentRoom.id })
  }).catch(function(){});
}

function sendMessage(text){
  text = String(text||'').trim();
  if(!text || !currentRoom) return;

  // Optimistic: tampil dulu
  var tempMsg = { id:'temp-'+Date.now(), fromMe:true, text:text, time:Date.now(), delivered:false, read:false };
  cachedMessages.push(tempMsg);
  renderMessages(cachedMessages, null);

  chatInput.value = '';

  fetchJson('/api/chat/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ room_id: currentRoom.id, text: text })
  }).then(function(r){
    if(r.body && r.body.ok){
      loadMessages(true);
    } else {
      alert((r.body && r.body.message) || 'Gagal kirim');
      cachedMessages = cachedMessages.filter(function(m){ return m.id !== tempMsg.id; });
      renderMessages(cachedMessages, null);
    }
  }).catch(function(){
    alert('Koneksi error');
    cachedMessages = cachedMessages.filter(function(m){ return m.id !== tempMsg.id; });
    renderMessages(cachedMessages, null);
  });
}

function startPolling(){
  stopPolling();
  pollTimer = setInterval(function(){
    if(currentRoom && !document.hidden) loadMessages(false);
  }, 2000);
}
function stopPolling(){
  if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
}

function startHeartbeat(){
  stopHeartbeat();
  var tick = function(){
    if(document.hidden) return;
    fetchJson('/api/chat/heartbeat', { method:'POST' }).catch(function(){});
  };
  tick();
  heartbeatTimer = setInterval(tick, 20000);
}
function stopHeartbeat(){
  if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

chatForm.addEventListener('submit', function(e){
  e.preventDefault();
  sendMessage(chatInput.value);
});

chatInput.addEventListener('input', function(){
  if(!currentRoom) return;
  if(typingDebounce) clearTimeout(typingDebounce);
  typingDebounce = setTimeout(sendTypingSignal, 400);
});

chatSearch.addEventListener('input', function(){
  if(currentTab === 'rooms') renderRooms(); else renderContacts();
});

chatTabs.addEventListener('click', function(e){
  var btn = e.target.closest('.chat-tab');
  if(!btn) return;
  currentTab = btn.dataset.tab;
  chatSearch.value = '';
  renderTab();
});

$('btnBackList').addEventListener('click', closeRoom);
$('btnNewChat').addEventListener('click', function(){
  currentTab = 'contacts';
  chatSearch.value = '';
  renderTab();
});
$('btnRoomMenu').addEventListener('click', function(){
  if(!currentRoom) return;
  $('sheetName').textContent = currentRoom.other.name || 'User';
  roomMenuSheet.hidden = false;
});
$('sheetClose').addEventListener('click', function(){ roomMenuSheet.hidden = true; });
roomMenuSheet.addEventListener('click', function(e){ if(e.target === roomMenuSheet) roomMenuSheet.hidden = true; });

$('btnBlock').addEventListener('click', function(){
  if(!currentRoom) return;
  if(!confirm('Blokir '+currentRoom.other.name+'?\n\nKamu nggak akan bisa chat dengan user ini.')) return;
  fetchJson('/api/chat/block', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ target: currentRoom.other.code, action: 'block' })
  }).then(function(r){
    if(r.body && r.body.ok){
      roomMenuSheet.hidden = true;
      alert('User diblokir');
      closeRoom();
    } else {
      alert((r.body && r.body.message) || 'Gagal blokir');
    }
  }).catch(function(){ alert('Koneksi error'); });
});

$('btnReport').addEventListener('click', function(){
  roomMenuSheet.hidden = true;
  reportSheet.hidden = false;
});
$('reportClose').addEventListener('click', function(){ reportSheet.hidden = true; });
reportSheet.addEventListener('click', function(e){ if(e.target === reportSheet) reportSheet.hidden = true; });

var selectedReason = '';
$('reportReasons').addEventListener('click', function(e){
  var btn = e.target.closest('.chat-reason');
  if(!btn) return;
  selectedReason = btn.dataset.r;
  $('reportReasons').querySelectorAll('.chat-reason').forEach(function(b){
    b.classList.toggle('active', b === btn);
  });
});

$('btnSendReport').addEventListener('click', function(){
  if(!currentRoom) return;
  if(!selectedReason){ alert('Pilih alasan dulu'); return; }
  var detail = ($('reportDetail').value||'').trim();
  fetchJson('/api/chat/report', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ target: currentRoom.other.code, reason: selectedReason, detail: detail })
  }).then(function(r){
    if(r.body && r.body.ok){
      reportSheet.hidden = true;
      $('reportDetail').value = '';
      $('reportReasons').querySelectorAll('.chat-reason').forEach(function(b){ b.classList.remove('active'); });
      selectedReason = '';
      alert(r.body.message || 'Laporan terkirim');
    } else {
      alert((r.body && r.body.message) || 'Gagal kirim laporan');
    }
  }).catch(function(){ alert('Koneksi error'); });
});

document.addEventListener('visibilitychange', function(){
  if(!document.hidden && currentRoom) loadMessages(false);
});

// Heartbeat juga pas di list (biar keliatan online ke user lain)
startHeartbeat();

loadRooms();
loadContacts();
renderTab();
console.log('[JavinChat] Loaded');
})();
