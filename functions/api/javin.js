// QR Code Generator — /api/javin?text=hello&size=300
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const text = String(
    url.searchParams.get('text') ||
    url.searchParams.get('url') ||
    url.searchParams.get('data') || ''
  ).trim();

  const sizeRaw = parseInt(url.searchParams.get('size') || '300', 10);
  const size = Math.max(50, Math.min(1000, isFinite(sizeRaw) ? sizeRaw : 300));

  if (!text) {
    return jsonRes(400, { ok: false, message: 'Parameter text / url / data wajib diisi.' });
  }
  if (text.length > 2000) {
    return jsonRes(413, { ok: false, message: 'Teks terlalu panjang (max 2000 karakter).' });
  }

  const target = 'https://api.qrserver.com/v1/create-qr-code/?data=' +
    encodeURIComponent(text) + '&size=' + size + 'x' + size;

  try {
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'image/*,*/*'
      }
    });

    if (!r.ok) {
      return jsonRes(502, { ok: false, message: 'Gagal generate QR (HTTP ' + r.status + ').' });
    }

    const buf = await r.arrayBuffer();
    const ct = r.headers.get('content-type') || 'image/png';

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (e) {
    return jsonRes(502, { ok: false, message: 'Gagal: ' + e.message });
  }
}

function jsonRes(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
