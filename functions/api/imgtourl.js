// POST /api/imgtourl — multi-fallback upload
// Priority: freeimage.host (permanen) → litterbox (72j) → tmpfiles (1j)

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
const FREEIMAGE_KEY = '6d207e02198a847aa98d0a2a901485a5';

function jsonRes(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function uploadFreeimage(buf, filename, mime) {
  const fd = new FormData();
  fd.append('source', new Blob([buf], { type: mime }), filename);
  fd.append('type', 'file');
  fd.append('action', 'upload');
  const r = await fetch('https://freeimage.host/api/1/upload?key=' + FREEIMAGE_KEY, {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile' },
    body: fd
  });
  if (!r.ok) throw new Error('freeimage HTTP ' + r.status);
  const j = await r.json();
  if (!j.image || !j.image.url) throw new Error('freeimage invalid response');
  return j.image.url;
}

async function uploadLitterbox(buf, filename, mime) {
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append('time', '72h');
  fd.append('fileToUpload', new Blob([buf], { type: mime }), filename);
  const r = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile' },
    body: fd
  });
  if (!r.ok) throw new Error('litterbox HTTP ' + r.status);
  const text = (await r.text()).trim();
  if (!text.startsWith('http')) throw new Error('litterbox: ' + text.slice(0,80));
  return text;
}

async function uploadTmpfiles(buf, filename, mime) {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: mime }), filename);
  const r = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile' },
    body: fd
  });
  if (!r.ok) throw new Error('tmpfiles HTTP ' + r.status);
  const j = await r.json();
  if (!j.data || !j.data.url) throw new Error('tmpfiles invalid');
  return j.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
}

export async function onRequestPost({ request }) {
  let formData;
  try { formData = await request.formData(); }
  catch (e) { return jsonRes(400, { ok: false, message: 'Body invalid.' }); }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return jsonRes(400, { ok: false, message: 'File tidak ditemukan.' });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonRes(400, { ok: false, message: 'Tipe tidak didukung (JPG/PNG/WEBP/GIF).' });
  }
  if (file.size > MAX_SIZE) {
    return jsonRes(413, { ok: false, message: 'Max 5 MB. File: ' + (file.size/1024/1024).toFixed(2) + ' MB.' });
  }
  if (file.size === 0) return jsonRes(400, { ok: false, message: 'File kosong.' });

  const buf = await file.arrayBuffer();
  const fname = file.name || 'image.jpg';

  const providers = [
    { name: 'freeimage.host', label: 'Permanen', fn: uploadFreeimage },
    { name: 'litterbox', label: '72 jam', fn: uploadLitterbox },
    { name: 'tmpfiles', label: '1 jam', fn: uploadTmpfiles }
  ];

  // Kalau file > 2 MB, langsung ke tmpfiles (paling cepat)
  // File >2MB sering timeout di freeimage/litterbox
  var orderedProviders = providers;
  if (file.size > 2 * 1024 * 1024) {
    orderedProviders = [providers[2], providers[1], providers[0]]; // tmpfiles → litterbox → freeimage
  } else {
    orderedProviders = [providers[2], providers[0], providers[1]]; // tmpfiles dulu (paling reliable)
  }

  const errs = [];
  for (const p of orderedProviders) {
    try {
      const url = await p.fn(buf, fname, file.type);
      return jsonRes(200, {
        ok: true,
        url: url,
        host: p.name,
        expires: p.label,
        size: file.size,
        type: file.type,
        name: fname
      });
    } catch (e) {
      errs.push(p.name + ': ' + e.message);
    }
  }

  return jsonRes(502, {
    ok: false,
    message: 'Semua server upload gagal. Coba lagi nanti.',
    detail: errs.join(' | ')
  });
}

export async function onRequestGet() {
  return jsonRes(405, { ok: false, message: 'Gunakan POST.' });
}
