// POST /api/imgtourl — upload gambar ke catbox.moe
// Body: multipart/form-data dengan field "file"
// Response: { ok: true, url: "https://files.catbox.moe/xxx.jpg" }

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function jsonRes(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request }) {
  let formData;
  try { formData = await request.formData(); }
  catch (e) { return jsonRes(400, { ok: false, message: 'Format body tidak valid.' }); }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return jsonRes(400, { ok: false, message: 'File tidak ditemukan (field "file").' });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonRes(400, {
      ok: false,
      message: 'Tipe file tidak didukung. Cuma: JPG, PNG, WEBP, GIF.'
    });
  }

  if (file.size > MAX_SIZE) {
    return jsonRes(413, {
      ok: false,
      message: 'File terlalu besar (max 5 MB). Ukuran: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB.'
    });
  }
  if (file.size === 0) {
    return jsonRes(400, { ok: false, message: 'File kosong.' });
  }

  try {
    const buf = await file.arrayBuffer();

    const upstream = new FormData();
    upstream.append('reqtype', 'fileupload');
    upstream.append('fileToUpload', new Blob([buf], { type: file.type }), file.name || 'image.jpg');

    const r = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      },
      body: upstream
    });

    if (!r.ok) {
      return jsonRes(502, { ok: false, message: 'Upstream error (HTTP ' + r.status + ').' });
    }

    const text = (await r.text()).trim();

    if (!text.startsWith('https://')) {
      return jsonRes(502, { ok: false, message: 'Gagal upload: ' + text.slice(0, 200) });
    }

    return jsonRes(200, {
      ok: true,
      url: text,
      size: file.size,
      type: file.type,
      name: file.name || 'image'
    });

  } catch (e) {
    return jsonRes(502, { ok: false, message: 'Gagal upload: ' + e.message });
  }
}

export async function onRequestGet() {
  return jsonRes(405, { ok: false, message: 'Gunakan POST dengan file.' });
}
