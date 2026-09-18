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
  var url='/api/proxy?id='+encodeURIComponent(x.catalogId)+(qs.length?'&'+qs.join('&'):'');
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

  function getUserId(){return localStorage.getItem('javin_user_id')||'JH-ANON'}

  function getOverrides(){try{return JSON.parse(localStorage.getItem('javin_admin_endpoint_overrides')||'[]')}catch(e){return[]}}

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
    if(u===null)return;
    var p=prompt('Password admin:');
    if(p===null)return;
    try{
      var r=await fetch('/api/admin/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:u,password:p})
      });
      var j=await r.json();
      if(j.ok){
        loggedIn=true;
        openPanel();
      } else {
        alert(j.message||'Login gagal.');
      }
    }catch(e){alert('Error: '+e.message)}
  }

  launch.onclick=async function(){
    if(loggedIn){openPanel();return}
    var ok=await checkSession();
    if(ok){loggedIn=true;openPanel();return}
    doLogin();
  };

  if(closeBtn)closeBtn.onclick=closePanel;

  var addEp=document.getElementById('adminAddEndpoint');
  if(addEp)addEp.onclick=function(){
    if(!loggedIn){alert('Login dulu.');return}
    var name=document.getElementById('adminEndpointName').value.trim();
    var path=document.getElementById('adminEndpointPath').value.trim();
    var category=document.getElementById('adminEndpointCategory').value.trim()||'Tools';
    if(!name||path.indexOf('/')!==0){alert('Nama dan path wajib valid (path mulai dengan /).');return}
    var a=getOverrides();
    a.push({name:name,path:path,folder:category,createdBy:getUserId(),createdAt:new Date().toISOString()});
    localStorage.setItem('javin_admin_endpoint_overrides',JSON.stringify(a));
    alert('Endpoint ditambahkan (lokal).');
  };

  var rmEp=document.getElementById('adminRemoveEndpoint');
  if(rmEp)rmEp.onclick=function(){
    if(!loggedIn){alert('Login dulu.');return}
    var target=prompt('Masukkan catalogId endpoint:');
    if(!target)return;
    var a=getOverrides().filter(function(x){return x.catalogId!==target});
    localStorage.setItem('javin_admin_endpoint_overrides',JSON.stringify(a));
    alert('Override lokal dihapus.');
  };

  var addLimit=document.getElementById('adminAddLimit');
  if(addLimit)addLimit.onclick=function(){
    if(!loggedIn){alert('Login dulu.');return}
    var uid=document.getElementById('adminUserId').value.trim();
    var extra=Math.max(1,Number(document.getElementById('adminExtraLimit').value||0));
    if(!uid||!isFinite(extra)){alert('User ID / limit tidak valid.');return}
    var k='javin_extra_limit_'+uid;
    localStorage.setItem(k,String(Number(localStorage.getItem(k)||0)+extra));
    alert('Limit lokal ditambahkan.');
  };
})();
