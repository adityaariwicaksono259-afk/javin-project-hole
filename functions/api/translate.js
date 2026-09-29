// /api/translate — proxy ke Google Translate (unofficial, gratis)
// Query: ?text=...&to=en&from=id
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const text = (url.searchParams.get('text') || '').trim();
  const to = (url.searchParams.get('to') || 'en').toLowerCase();
  const from = (url.searchParams.get('from') || 'auto').toLowerCase();

  if (!text) {
    return new Response(JSON.stringify({ ok: false, error: 'text kosong' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (text.length > 5000) {
    return new Response(JSON.stringify({ ok: false, error: 'text terlalu panjang' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validasi bahasa: huruf aja, 2-5 char
  if (!/^[a-z]{2,5}(-[a-z]{2,5})?$/i.test(to) || !/^[a-z]{2,5}(-[a-z]{2,5})?$/i.test(from)) {
    return new Response(JSON.stringify({ ok: false, error: 'kode bahasa invalid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const gurl = 'https://translate.googleapis.com/translate_a/single'
    + '?client=gtx'
    + '&sl=' + encodeURIComponent(from)
    + '&tl=' + encodeURIComponent(to)
    + '&dt=t'
    + '&q=' + encodeURIComponent(text);

  try {
    const res = await fetch(gurl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36'
      }
    });
    if (!res.ok) throw new Error('Google error ' + res.status);
    const data = await res.json();

    // Format Google: [[["translated","original",...],...], ...]
    let translated = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      data[0].forEach(function(part) {
        if (Array.isArray(part) && part[0]) translated += part[0];
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      text: translated,
      to: to,
      from: from
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
