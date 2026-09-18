function maskHost(u){return String(u||"").replace(/https?:\/\/[^\/\s"']*/gi,"")||"/";}
function maskUrl(t){return String(t||'').replace(/https?:\/\/[^"\s,}\)\]]+/gi,function(u){try{return '\u2026'+new URL(u).pathname}catch(e){return u}}).replace(/(api\.|apii\.)?nexadev\.my\.id/gi,'javin').replace(/api\.nexaadev\.my\.id/gi,'javin').replace(/clooud\.my\.id/gi,'javin');}
let endpoints=[],active='ALL';
const order=['AI','Tools','Downloader','Anime','Canvas','Random','Search','SMM','Berita','Info','Islami','Uploader','Other'];
const $=s=>document.querySelector(s);
fetch('/endpoints.json').then(r=>r.json()).then(data=>{endpoints=data;$('#count').textContent=data.length;let cats=[...new Set(data.map(x=>x.folder))];$('#catCount').textContent=cats.length;renderCats(cats);render();});
function renderCats(cats){let sorted=cats.sort((a,b)=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b)));$('#categories').innerHTML='<button class="cat active" data-c="ALL">ALL</button>'+sorted.map(c=>`<button class="cat" data-c="${esc(c)}">${esc(c)} <small>(${endpoints.filter(x=>x.folder===c).length})</small></button>`).join('');document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{active=b.dataset.c;document.querySelectorAll('.cat').forEach(x=>x.classList.remove('active'));b.classList.add('active');render();});}
function render(){let q=$('#search').value.toLowerCase();let list=endpoints.filter(x=>(active==='ALL'||x.folder===active)&&(`${x.name} ${x.path} ${x.desc}`.toLowerCase().includes(q)));$('#grid').innerHTML=list.map(card).join('');document.querySelectorAll('.run').forEach(b=>b.onclick=()=>openEp(b.dataset.id));}
$('#search').oninput=render;
function card(x){return `<article class="card"><div class="badge">${esc(x.folder)} // ${esc(x.subfolder||'API')}</div><h3>${esc(x.name)}</h3><div class="desc">${esc(x.desc||'Javin endpoint')}</div><div class="path">${esc(x.m||'GET')} ${esc(x.path)}</div><button class="run" data-id="${x.catalogId}">OPEN ENDPOINT</button></article>`}
function openEp(id){let x=endpoints.find(e=>e.catalogId===id);if(!x)return;let params=x.params||[];$('#modalBody').innerHTML=`<div class="eyebrow">${esc(x.folder)} // ${esc(x.subfolder||'API')}</div><h2>${esc(x.name)}</h2><p style="color:#888;font-size:13px">${esc(x.desc||'')}</p><div class="urlbox">${esc(x.m+' '+maskHost(x.ex))}</div><div id="form">${params.map(p=>`<div class="formrow"><label>${esc(p.n)} ${p.r?'*':''}<br><small>${esc(p.d||'')}</small></label><input data-p="${esc(p.n)}" placeholder="${esc(p.d||p.n)}"></div>`).join('')}</div><button class="execute" id="execute">EXECUTE REQUEST</button><div id="result"></div>`;$('#modal').classList.remove('hidden');$('#execute').onclick=()=>execute(x);}
async function execute(x){
  var result=$('#result');
  result.innerHTML='<div class="result">MENGHUBUNGI SERVER...</div>';
  var qs=[];
  document.querySelectorAll('[data-p]').forEach(function(i){if(i.value)qs.push(encodeURIComponent(i.dataset.p)+'='+encodeURIComponent(i.value));});
  var uid='';try{uid=localStorage.getItem('javin_user_id')||''}catch(e){}
  var url='/api/proxy?id='+encodeURIComponent(x.catalogId)+(uid?'&uid='+encodeURIComponent(uid):'')+(qs.length?'&'+qs.join('&'):'');
  try{
    var r=await fetch(url);
    var type=r.headers.get('content-type')||'';
    var ext=(type.split('/')[1]||'bin').split(';')[0].trim();
    var fname='javin-'+x.catalogId+'-'+Date.now()+'.'+ext;
    if(!r.ok){
      var t=await r.text();
      result.innerHTML='<pre class="result">HTTP '+r.status+'\n'+esc(maskUrl(t))+'</pre>';
      return;
    }
    if(type.indexOf('image/')!==-1){
      var blob=await r.blob();
      var src=URL.createObjectURL(blob);
      result.innerHTML='<div class="result"><img class="media" src="'+src+'"><div class="media-actions"><a class="btn-dl" href="'+src+'" download="'+fname+'">\u2b07 Download Gambar</a></div><div class="media-info">by Javin \u00b7 HTTP '+r.status+' \u00b7 '+esc(type.split(';')[0])+'</div></div>';
    } else if(type.indexOf('video/')!==-1){
      var blob=await r.blob();
      var src=URL.createObjectURL(blob);
      result.innerHTML='<div class="result"><video class="media" controls src="'+src+'"></video><div class="media-actions"><a class="btn-dl" href="'+src+'" download="'+fname+'">\u2b07 Download Video</a></div><div class="media-info">by Javin \u00b7 HTTP '+r.status+'</div></div>';
    } else if(type.indexOf('audio/')!==-1){
      var blob=await r.blob();
      var src=URL.createObjectURL(blob);
      result.innerHTML='<div class="result"><audio controls style="width:100%" src="'+src+'"></audio><div class="media-actions"><a class="btn-dl" href="'+src+'" download="'+fname+'">\u2b07 Download Audio</a></div><div class="media-info">by Javin \u00b7 HTTP '+r.status+'</div></div>';
    } else {
      var t=await r.text();
      var pretty;try{pretty=JSON.stringify(JSON.parse(t),null,2)}catch(e){pretty=t}
      result.innerHTML='<pre class="result">HTTP '+r.status+'\n'+esc(maskUrl(pretty))+'</pre>';
    }
  }
  catch(e){result.innerHTML='<pre class="result">ERROR\n'+esc(e.message)+'</pre>'}
}
$('#close').onclick=()=>$('#modal').classList.add('hidden');$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').classList.add('hidden')};
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

// === USER ID ===
(function(){
  var KEY='javin_user_id';
  var id=localStorage.getItem(KEY);
  if(!id){
    var rand=Math.random().toString(36).slice(2,8).toUpperCase();
    id='JH-'+rand;
    localStorage.setItem(KEY,id);
  }
  var el=document.getElementById('userId');
  if(el)el.textContent=id;
})();

// === ADMIN PANEL ===
(function(){
  var panel=document.getElementById('adminPanel');
  var launch=document.getElementById('adminLaunch');
  var closeBtn=document.getElementById('adminToggle');
  if(!panel||!launch)return;

  var loggedIn=false;

  function openPanel(){panel.classList.add('open')}
  function closePanel(){panel.classList.remove('open')}

  function getUserId(){
    try{return localStorage.getItem('javin_user_id')||'JH-ANON'}catch(e){return 'JH-ANON'}
  }

  function fmtTime(ts){
    if(!ts)return '-';
    var d=new Date(Number(ts));
    if(isNaN(d.getTime()))return '-';
    return d.toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }

  function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  async function checkSession(){
    try{
      var r=await fetch('/api/admin/check');
      if(!r.ok)return false;
      var j=await r.json();
      return j&&j.ok;
    }catch(e){return false}
  }

  async function doLogin(){
    var u=prompt('Username admin:');
    if(u===null)return false;
    var p=prompt('Password admin:');
    if(p===null)return false;
    try{
      var r=await fetch('/api/admin/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:u,password:p})
      });
      var j=await r.json();
      if(j.ok){loggedIn=true;return true}
      alert(j.message||'Login gagal.');
      return false;
    }catch(e){alert('Error: '+e.message);return false}
  }

  // ==== Tabs ====
  var tabs=panel.querySelectorAll('.admin-tab');
  var panes=panel.querySelectorAll('.admin-pane');
  tabs.forEach(function(t){
    t.onclick=function(){
      tabs.forEach(function(x){x.classList.remove('active')});
      panes.forEach(function(x){x.classList.remove('active')});
      t.classList.add('active');
      var name=t.dataset.tab;
      var p=panel.querySelector('.admin-pane[data-pane="'+name+'"]');
      if(p)p.classList.add('active');
      if(name==='users')loadUsers();
      if(name==='logs')loadLogs();
      if(name==='config')loadConfig();
    };
  });

  // ==== USERS ====
  async function loadUsers(){
    var tb=document.getElementById('userTbody');
    if(!tb)return;
    tb.innerHTML='<tr><td colspan="6" class="tbl-empty">Loading...</td></tr>';
    try{
      var r=await fetch('/api/admin/users');
      if(r.status===401){loggedIn=false;alert('Session expired. Login ulang.');closePanel();return}
      var j=await r.json();
      if(!j.ok){tb.innerHTML='<tr><td colspan="6" class="tbl-empty">'+escHtml(j.message||'Gagal')+'</td></tr>';return}
      var filter=(document.getElementById('userSearch').value||'').toLowerCase();
      var list=(j.users||[]).filter(function(u){return !filter||u.id.toLowerCase().indexOf(filter)!==-1});
      if(!list.length){tb.innerHTML='<tr><td colspan="6" class="tbl-empty">Belum ada user.</td></tr>';return}
      tb.innerHTML=list.map(function(u){
        return '<tr>'
          +'<td><code>'+escHtml(u.id)+'</code></td>'
          +'<td>'+u.extra_limit+'</td>'
          +'<td>'+u.today+'</td>'
          +'<td>'+u.total_request+'</td>'
          +'<td>'+fmtTime(u.last_seen)+'</td>'
          +'<td><button class="tbl-btn" data-edit="'+escHtml(u.id)+'" data-lim="'+u.extra_limit+'">Edit</button> '
          +'<button class="tbl-btn danger" data-del="'+escHtml(u.id)+'">Hapus</button></td>'
          +'</tr>';
      }).join('');
      tb.querySelectorAll('[data-edit]').forEach(function(b){
        b.onclick=function(){
          document.getElementById('adminUserId').value=b.dataset.edit;
          document.getElementById('adminExtraLimit').value=b.dataset.lim;
          document.getElementById('adminExtraLimit').focus();
        };
      });
      tb.querySelectorAll('[data-del]').forEach(function(b){
        b.onclick=async function(){
          if(!confirm('Hapus user '+b.dataset.del+'? Log-nya ikut terhapus.'))return;
          var rr=await fetch('/api/admin/users?id='+encodeURIComponent(b.dataset.del),{method:'DELETE'});
          var jj=await rr.json();
          alert(jj.message||'OK');
          loadUsers();
        };
      });
    }catch(e){tb.innerHTML='<tr><td colspan="6" class="tbl-empty">Error: '+escHtml(e.message)+'</td></tr>'}
  }

  document.getElementById('adminAddLimit').onclick=async function(){
    if(!loggedIn){alert('Login dulu.');return}
    var uid=document.getElementById('adminUserId').value.trim();
    var extra=parseInt(document.getElementById('adminExtraLimit').value||'0');
    if(!uid){alert('User ID wajib.');return}
    var r=await fetch('/api/admin/users',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:uid,extra_limit:extra})
    });
    var j=await r.json();
    alert(j.message||'OK');
    if(j.ok)loadUsers();
  };
  document.getElementById('userReload').onclick=loadUsers;
  document.getElementById('userSearch').oninput=loadUsers;

  // ==== LOGS ====
  async function loadLogs(){
    var tb=document.getElementById('logTbody');
    if(!tb)return;
    tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Loading...</td></tr>';
    try{
      var uid=(document.getElementById('logFilterUid').value||'').trim();
      var url='/api/admin/logs?limit=200'+(uid?'&uid='+encodeURIComponent(uid):'');
      var r=await fetch(url);
      if(r.status===401){loggedIn=false;alert('Session expired.');closePanel();return}
      var j=await r.json();
      if(!j.ok){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">'+escHtml(j.message||'Gagal')+'</td></tr>';return}
      var list=j.logs||[];
      if(!list.length){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Belum ada log.</td></tr>';return}
      tb.innerHTML=list.map(function(l){
        var color=l.status>=200&&l.status<300?'#4ade80':(l.status>=400?'#f87171':'#fbbf24');
        return '<tr>'
          +'<td>'+fmtTime(l.created_at)+'</td>'
          +'<td><code>'+escHtml(l.user_id||'-')+'</code></td>'
          +'<td>'+escHtml(l.endpoint_id)+'</td>'
          +'<td style="color:'+color+'">'+l.status+'</td>'
          +'</tr>';
      }).join('');
    }catch(e){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Error: '+escHtml(e.message)+'</td></tr>'}
  }
  document.getElementById('logReload').onclick=loadLogs;
  document.getElementById('logFilterUid').oninput=loadLogs;
  document.getElementById('logClear').onclick=async function(){
    if(!loggedIn){alert('Login dulu.');return}
    if(!confirm('Hapus SEMUA log?'))return;
    var r=await fetch('/api/admin/logs',{method:'DELETE'});
    var j=await r.json();
    alert(j.message||'OK');
    loadLogs();
  };

  // ==== CONFIG ====
  async function loadConfig(){
    var tb=document.getElementById('configTbody');
    if(!tb)return;
    tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Loading...</td></tr>';
    try{
      var r=await fetch('/api/admin/config');
      if(r.status===401){loggedIn=false;alert('Session expired.');closePanel();return}
      var j=await r.json();
      if(!j.ok){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">'+escHtml(j.message||'Gagal')+'</td></tr>';return}
      var list=j.config||[];
      if(!list.length){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Belum ada config.</td></tr>';return}
      tb.innerHTML=list.map(function(c){
        return '<tr>'
          +'<td><code>'+escHtml(c.key)+'</code></td>'
          +'<td>'+escHtml(c.value)+'</td>'
          +'<td>'+fmtTime(c.updated_at)+'</td>'
          +'<td><button class="tbl-btn" data-k="'+escHtml(c.key)+'" data-v="'+escHtml(c.value)+'">Edit</button></td>'
          +'</tr>';
      }).join('');
      tb.querySelectorAll('[data-k]').forEach(function(b){
        b.onclick=function(){
          document.getElementById('configKey').value=b.dataset.k;
          document.getElementById('configValue').value=b.dataset.v;
        };
      });
    }catch(e){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Error: '+escHtml(e.message)+'</td></tr>'}
  }
  document.getElementById('configReload').onclick=loadConfig;
  document.getElementById('configSave').onclick=async function(){
    if(!loggedIn){alert('Login dulu.');return}
    var key=document.getElementById('configKey').value.trim();
    var value=document.getElementById('configValue').value;
    if(!key){alert('Key wajib.');return}
    var r=await fetch('/api/admin/config',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({key:key,value:value})
    });
    var j=await r.json();
    alert(j.message||'OK');
    if(j.ok)loadConfig();
  };

  // ==== Open panel ====
  launch.onclick=async function(){
    if(loggedIn){openPanel();loadUsers();return}
    var ok=await checkSession();
    if(ok){loggedIn=true;openPanel();loadUsers();return}
    var success=await doLogin();
    if(success){openPanel();loadUsers()}
  };
  if(closeBtn)closeBtn.onclick=closePanel;
})();
