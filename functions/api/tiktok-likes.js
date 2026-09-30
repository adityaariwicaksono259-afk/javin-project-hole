// POST /api/tiktok-likes — TEST VERSION (tanpa auth)
// Body: { "url": "https://vt.tiktok.com/..." }
const UA = 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); }
  catch(e) { return json({ error: 'Body harus JSON.' }, 400); }

  const url = body && body.url;
  if (!isTikTokUrl(url)) {
    return json({ error: 'URL TikTok HTTPS tidak valid.' }, 400);
  }

  // ===== STEP 1: Ambil halaman provider =====
  let token = null;
  let cookieHeader = '';

  try {
    const page = await fetch('https://leofame.com/free-tiktok-likes', {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    console.log('[TIKTOK] page status:', page.status);

    if (!page.ok) {
      return json({
        ok: false,
        stage: 'fetch_page',
        error: 'Halaman provider error',
        status: page.status
      }, 502);
    }

    // Extract cookies
    const setCookie = page.headers.get('set-cookie') || '';
    if (setCookie) {
      cookieHeader = setCookie
        .split(/,(?=[^;]+=)/)
        .map(c => c.split(';')[0].trim())
        .filter(Boolean)
        .join('; ');
    }

    const html = await page.text();
    console.log('[TIKTOK] html length:', html.length);

    const tokenMatch = html.match(/var\s+token\s*=\s*['"]([^'"]+)['"]/);
    if (!tokenMatch) {
      return json({
        ok: false,
        stage: 'extract_token',
        error: 'Token tidak ditemukan di HTML',
        html_preview: html.slice(0, 500)
      }, 502);
    }
    token = tokenMatch[1];
    console.log('[TIKTOK] token length:', token.length);
  } catch(e) {
    return json({
      ok: false,
      stage: 'fetch_page',
      error: e.message
    }, 502);
  }

  // ===== STEP 2: Submit ke provider =====
  try {
    const formBody = new URLSearchParams({
      token: token,
      timezone_offset: 'Asia/Jakarta',
      free_link: url
    }).toString();

    const res = await fetch('https://leofame.com/free-tiktok-likes?api=1', {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://leofame.com',
        'Referer': 'https://leofame.com/free-tiktok-likes',
        'Accept': 'application/json, text/plain, */*',
        'Cookie': cookieHeader
      },
      body: formBody,
      signal: AbortSignal.timeout(15000)
    });

    console.log('[TIKTOK] submit status:', res.status);
    console.log('[TIKTOK] submit content-type:', res.headers.get('content-type'));

    const text = await res.text();
    console.log('[TIKTOK] response preview:', text.slice(0, 300));

    let data;
    try { data = JSON.parse(text); }
    catch(e) { data = { raw: text.slice(0, 500) }; }

    return json({
      ok: res.ok,
      stage: 'submit',
      status: res.status,
      data: data
    }, res.ok ? 200 : 502);
  } catch(e) {
    return json({
      ok: false,
      stage: 'submit',
      error: e.message
    }, 502);
  }
}

export async function onRequestGet() {
  return json({
    ok: false,
    message: 'Gunakan POST dengan body JSON: { "url": "https://tiktok.com/..." }'
  }, 405);
}

function isTikTokUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  let u;
  try { u = new URL(value); } catch(e) { return false; }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  return host === 'tiktok.com' || host.endsWith('.tiktok.com');
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
