// /api/translate — multi-provider fallback
// Provider: Google → MyMemory → LibreTranslate
// Query: ?text=...&to=en&from=id
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const text = (url.searchParams.get('text') || '').trim();
  const to = (url.searchParams.get('to') || 'en').toLowerCase();
  const from = (url.searchParams.get('from') || 'id').toLowerCase();

  if (!text) {
    return json({ ok: false, error: 'text kosong' }, 400);
  }
  if (text.length > 1000) {
    return json({ ok: false, error: 'text maksimal 1000 char' }, 413);
  }
  if (!/^[a-z]{2,5}(-[a-z]{2,5})?$/i.test(to)) {
    return json({ ok: false, error: 'kode bahasa invalid' }, 400);
  }

  // Kalau target = source, return as-is
  if (to === from || to === 'id') {
    return json({ ok: true, text: text, provider: 'no-op' });
  }

  // ==== Provider 1: Google (translate_a/t) ====
  try {
    const g = 'https://translate.googleapis.com/translate_a/t'
      + '?client=gtx&sl=' + encodeURIComponent(from)
      + '&tl=' + encodeURIComponent(to)
      + '&q=' + encodeURIComponent(text);
    const r = await fetch(g, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' }
    });
    if (r.ok) {
      const raw = await r.text();
      try {
        const data = JSON.parse(raw);
        // Format: "translated text" atau ["translated"] atau [["translated","orig"]]
        let result = '';
        if (typeof data === 'string') result = data;
        else if (Array.isArray(data)) {
          if (typeof data[0] === 'string') result = data[0];
          else if (Array.isArray(data[0])) result = data[0][0] || '';
        }
        if (result) {
          return json({ ok: true, text: result, provider: 'google' });
        }
      } catch(e) {}
    }
  } catch(e) {}

  // ==== Provider 2: MyMemory ====
  try {
    const m = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text)
      + '&langpair=' + encodeURIComponent(from) + '|' + encodeURIComponent(to);
    const r = await fetch(m);
    if (r.ok) {
      const d = await r.json();
      const t = d && d.responseData && d.responseData.translatedText;
      if (t && !/MYMEMORY WARNING/i.test(t)) {
        return json({ ok: true, text: t, provider: 'mymemory' });
      }
    }
  } catch(e) {}

  // ==== Provider 3: LibreTranslate (mirror publik) ====
  try {
    const l = 'https://translate.terraprint.co/translate';
    const r = await fetch(l, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: from, target: to, format: 'text' })
    });
    if (r.ok) {
      const d = await r.json();
      if (d && d.translatedText) {
        return json({ ok: true, text: d.translatedText, provider: 'libre' });
      }
    }
  } catch(e) {}

  return json({ ok: false, error: 'Semua provider gagal. Coba lagi nanti.' }, 502);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
