// POST /api/premium/amprem
// Body: { action, email, rawLink?, idToken? }
// Wajib login (session cookie). No API key, no credits.
// Cooldown & VIP menyusul.

import { getMe } from '../chat/_lib.js';

const UPSTREAM = 'https://anita-studio.netlify.app/.netlify/functions/amprem';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ success: false, message: 'DB nggak siap.' }, 503);

  // ==== WAJIB LOGIN ====
  const me = await getMe(request, db);
  if (!me) {
    return json({ success: false, message: 'Login dulu untuk pakai fitur ini.' }, 401);
  }
  if (me.banned) {
    return json({ success: false, message: 'Akun kamu sedang dibatasi.' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ success: false, message: 'Body invalid.' }, 400);
  }

  const action = String(body.action || '').trim();
  const email = String(body.email || '').trim();
  const rawLink = String(body.rawLink || '').trim();
  const idToken = String(body.idToken || '').trim();

  const allowed = ['send-magiclink', 'verify-account', 'apply-premium'];
  if (!allowed.includes(action)) {
    return json({ success: false, message: 'Action tidak dikenal.' }, 400);
  }

  // Validasi per action
  if (action === 'send-magiclink' && !email) {
    return json({ success: false, message: 'Email wajib.' }, 400);
  }
  if (action === 'verify-account' && !rawLink) {
    return json({ success: false, message: 'Raw link wajib.' }, 400);
  }
  if (action === 'apply-premium' && (!email || !idToken)) {
    return json({ success: false, message: 'Email & ID token wajib.' }, 400);
  }

  const started = Date.now();

  try {
    const payload = { action };
    if (email) payload.email = email;
    if (rawLink) payload.rawLink = rawLink;
    if (idToken) payload.idToken = idToken;

    const res = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Origin': 'https://anita-studio.netlify.app',
        'Referer': 'https://anita-studio.netlify.app/'
      },
      body: JSON.stringify(payload)
    });

    const elapsed = Date.now() - started;
    const text = await res.text();

    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text.slice(0, 500) }; }

    if (!res.ok) {
      return json({
        success: false,
        message: data.message || ('Upstream HTTP ' + res.status),
        elapsed_ms: elapsed
      }, 200);
    }

    return json({
      success: true,
      ...data,
      elapsed_ms: elapsed
    });

  } catch (err) {
    console.error('[AMPREM]', err.message);
    return json({
      success: false,
      message: 'Gagal hubungi server.',
      elapsed_ms: Date.now() - started
    }, 500);
  }
}
