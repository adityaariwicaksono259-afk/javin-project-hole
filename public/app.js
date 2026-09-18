function maskHost(u){return String(u||"").replace(/(https?:\/\/)?(api\.|apii\.)?nexadev\.my\.id/gi,"").replace(/(https?:\/\/)?api\.nexaadev\.my\.id/gi,"").replace(/(https?:\/\/)?clooud\.my\.id/gi,"")||"/";}
let endpoints=[],active='ALL';
const order=['AI','Tools','Downloader','Anime','Canvas','Random','Search','SMM','Berita','Info','Islami','Uploader','Other'];
const $=s=>document.querySelector(s);
fetch('/endpoints.json').then(r=>r.json()).then(data=>{endpoints=data;$('#count').textContent=data.length;let cats=[...new Set(data.map(x=>x.folder))];$('#catCount').textContent=cats.length;renderCats(cats);render();});
function renderCats(cats){let sorted=cats.sort((a,b)=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b)));$('#categories').innerHTML='<button class="cat active" data-c="ALL">ALL</button>'+sorted.map(c=>`<button class="cat" data-c="${esc(c)}">${esc(c)} <small>(${endpoints.filter(x=>x.folder===c).length})</small></button>`).join('');document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{active=b.dataset.c;document.querySelectorAll('.cat').forEach(x=>x.classList.remove('active'));b.classList.add('active');render();});}
function render(){let q=$('#search').value.toLowerCase();let list=endpoints.filter(x=>(active==='ALL'||x.folder===active)&&(`${x.name} ${x.path} ${x.desc}`.toLowerCase().includes(q)));$('#grid').innerHTML=list.map(card).join('');document.querySelectorAll('.run').forEach(b=>b.onclick=()=>openEp(b.dataset.id));}
$('#search').oninput=render;
function card(x){return `<article class="card"><div class="badge">${esc(x.folder)} // ${esc(x.subfolder||'API')}</div><h3>${esc(x.name)}</h3><div class="desc">${esc(x.desc||'Nexa endpoint')}</div><div class="path">${esc(x.m||'GET')} ${esc(x.path)}</div><button class="run" data-id="${x.catalogId}">OPEN ENDPOINT</button></article>`}
function openEp(id){let x=endpoints.find(e=>e.catalogId===id);if(!x)return;let params=x.params||[];$('#modalBody').innerHTML=`<div class="eyebrow">${esc(x.folder)} // ${esc(x.subfolder||'API')}</div><h2>${esc(x.name)}</h2><p style="color:#888;font-size:13px">${esc(x.desc||'')}</p><div class="urlbox">${esc(x.m+' '+maskHost(x.ex))}</div><div id="form">${params.map(p=>`<div class="formrow"><label>${esc(p.n)} ${p.r?'*':''}<br><small>${esc(p.d||'')}</small></label><input data-p="${esc(p.n)}" placeholder="${esc(p.d||p.n)}"></div>`).join('')}</div><button class="execute" id="execute">EXECUTE REQUEST</button><div id="result"></div>`;$('#modal').classList.remove('hidden');$('#execute').onclick=()=>execute(x);}
async function execute(x){let result=$('#result');result.innerHTML='<div class="result">CONNECTING TO EVENT HORIZON...</div>';let qs=[];document.querySelectorAll('[data-p]').forEach(i=>{if(i.value)qs.push(encodeURIComponent(i.dataset.p)+'='+encodeURIComponent(i.value));});let url='/api/proxy?id='+encodeURIComponent(x.catalogId)+(qs.length?'&'+qs.join('&'):'');try{let r=await fetch(url);let type=r.headers.get('content-type')||'';if(!r.ok){let t=await r.text();result.innerHTML=`<pre class="result">HTTP ${r.status}\n${esc(t)}</pre>`;return;}if(type.includes('image/')){let blob=await r.blob();let src=URL.createObjectURL(blob);result.innerHTML=`<div class="result"><img class="media" src="${src}"><div>HTTP ${r.status} · ${esc(type)}</div></div>`}else if(type.includes('video/')){let blob=await r.blob();let src=URL.createObjectURL(blob);result.innerHTML=`<div class="result"><video class="media" controls src="${src}"></video><div>HTTP ${r.status}</div></div>`}else if(type.includes('audio/')){let blob=await r.blob();let src=URL.createObjectURL(blob);result.innerHTML=`<div class="result"><audio controls style="width:100%" src="${src}"></audio><div>HTTP ${r.status}</div></div>`}else{let t=await r.text();let pretty;try{pretty=JSON.stringify(JSON.parse(t),null,2)}catch{pretty=t}result.innerHTML=`<pre class="result">HTTP ${r.status}\n${esc(pretty)}</pre>`}}catch(e){result.innerHTML=`<pre class="result">ERROR\n${esc(e.message)}</pre>`}}
$('#close').onclick=()=>$('#modal').classList.add('hidden');$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').classList.add('hidden')};
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

(() => {
  const id = localStorage.getItem("javin_project_hole_user_id");
  const badge = document.getElementById("userId"); if (badge) badge.textContent = id || "-";
  const panel = document.getElementById("adminPanel");
  const launch = document.getElementById("adminLaunch");
  const close = document.getElementById("adminToggle");
  if (launch) launch.onclick = () => panel?.classList.add("open");
  if (close) close.onclick = () => panel?.classList.remove("open");

  const adminKey = "javin_admin_endpoint_overrides";
  const getOverrides = () => JSON.parse(localStorage.getItem(adminKey) || "[]");
  document.getElementById("adminAddEndpoint")?.addEventListener("click", () => {
    const name = document.getElementById("adminEndpointName").value.trim();
    const path = document.getElementById("adminEndpointPath").value.trim();
    const category = document.getElementById("adminEndpointCategory").value.trim() || "Tools";
    if (!name || !path.startsWith("/")) return alert("Nama dan path wajib valid.");
    const a = getOverrides(); a.push({name,path,folder:category,createdBy:id,createdAt:new Date().toISOString()});
    localStorage.setItem(adminKey, JSON.stringify(a)); alert("Endpoint ditambahkan ke katalog lokal. Deploy production perlu API admin server-side.");
  });
  document.getElementById("adminRemoveEndpoint")?.addEventListener("click", () => {
    const target = prompt("Masukkan catalogId endpoint:");
    if (!target) return;
    const a = getOverrides().filter(x => x.catalogId !== target);
    localStorage.setItem(adminKey, JSON.stringify(a)); alert("Override lokal dihapus.");
  });
  document.getElementById("adminAddLimit")?.addEventListener("click", () => {
    const uid = document.getElementById("adminUserId").value.trim();
    const extra = Math.max(1, Number(document.getElementById("adminExtraLimit").value || 0));
    if (!uid || !Number.isFinite(extra)) return alert("User ID/limit tidak valid.");
    const k = `javin_extra_limit_${uid}`;
    localStorage.setItem(k, String(Number(localStorage.getItem(k)||0)+extra));
    alert("Limit lokal ditambahkan. Untuk multi-device/anti-reset wajib database server-side.");
  });
})();
