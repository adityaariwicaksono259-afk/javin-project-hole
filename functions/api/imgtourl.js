// POST /api/imgtourl — upload gambar ke 0x0.st (fallback: catbox)
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif'];

function jsonRes(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function upload0x0(buf, filename, mimetype) {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: mimetype }), filename);
  const r = await fetch('https://0x0.st', {
    method: 'POST',
    headers: { 'User-Agent': 'JavinUploader/1.0 (jvin.pages.dev)' },
    body: fd
  });
  if (!r.ok) throw new Error('0x0.st HTTP ' + r.status);
  const text = (await r.text()).trim();
  if (!text.startsWith('http')) throw new Error('0x0.st response: ' + text.slice(0,100));
  return text;
}

async function uploadCatbox(buf, filename, mimetype) {
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append('fileToUpload', new Blob([buf], { type: mimetype }), filename);
  const r = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
    body: fd
  });
  if (!r.ok) throw new Error('catbox HTTP ' + r.status);
  const text = (await r.text()).trim();
  if (!text.startsWith('http')) throw new Error('catbox response: ' + text.slice(0,100));
  return text;
}

export async function onRequestPost({ request }) {
  let formData;
  try { formData = await request.formData(); }
  catch (e) { return jsonRes(400, { ok: false, message: 'Format body tidak valid.' }); }

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

  // Coba 0x0.st dulu
  let url = null, host = null, errs = [];
  try {
    url = await upload0x0(buf, fname, file.type);
    host = '0x0.st';
  } catch (e) {
    errs.push('0x0: ' + e.message);
    try {
      url = await uploadCatbox(buf, fname, file.type);
      host = 'catbox';
    } catch (e2) {
      errs.push('catbox: ' + e2.message);
    }
  }

  if (!url) {
    return jsonRes(502, { ok: false, message: 'Semua server upload gagal. ' + errs.join(' | ') });
  }

  return jsonRes(200, {
    ok: true,
    url: url,
    host: host,
    size: file.size,
    type: file.type,
    name: fname
  });
}

export async function onRequestGet() {
  return jsonRes(405, { ok: false, message: 'Gunakan POST.' });
}
