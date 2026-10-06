// POST /api/premium/amprem
// Body: { apikey, action, email, rawLink?, idToken? }
// Verify API key dari auth_users → cek credits >= 15 → proxy ke upstream → deduct 15.

import { verifyApiKey, deductCredits } from '../../_lib/gen-api-key.js';


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

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({
      success: false,
      message: 'Body invalid.'
    }, 400);
  }

  const apikey = String(body.apikey || '')
    .trim()
    .toUpperCase();

  const action = String(body.action || '').trim();

  const allowed = [
    'send-magiclink',
    'verify-account',
    'apply-premium'
  ];

  if (!allowed.includes(action)) {
    return json({
      success: false,
      message: 'Action tidak dikenal.'
    }, 400);
  }

  const v = await verifyApiKey(db, apikey);

  if (!v.ok) {
    return json({
      success: false,
      message: v.message
    }, v.code);
  }

  const email = String(body.email || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({
      success: false,
      message: 'Email tidak valid.'
    }, 400);
  }

  if (action === 'verify-account') {
    const rawLink = String(body.rawLink || '').trim();

    if (!rawLink || rawLink.length < 10) {
      return json({
        success: false,
        message: 'Magic link tidak valid.'
      }, 400);
    }

    if (rawLink.length > 5000) {
      return json({
        success: false,
        message: 'Magic link terlalu panjang.'
      }, 400);
    }
  }

  if (action === 'apply-premium') {
    const idToken = String(body.idToken || '').trim();

    if (!idToken || idToken.length < 10) {
      return json({
        success: false,
        message: 'idToken tidak valid.'
      }, 400);
    }
  }

  try {
    const payload = {
      action,
      email
    };

    if (body.rawLink) {
      payload.rawLink = String(body.rawLink).trim();
    }

    if (body.idToken) {
      payload.idToken = String(body.idToken).trim();
    }

    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        'Referer': 'https://anita-studio.netlify.app/',
        'Origin': 'https://anita-studio.netlify.app'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await upstream.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      data = {
        success: false,
        message: 'Upstream response bukan JSON',
        raw: text.slice(0, 500)
      };
    }

    // Potong 15 API Key hanya kalau request sukses.
    if (data && data.success === true) {
      const deduct = await deductCredits(db, v.user.id, 15);
      if (!deduct.ok) {
        return json({
          success: false,
          message: deduct.message || 'API Key tidak cukup.'
        }, 403);
      }
      data._counter = {
        cost: 15,
        remaining: deduct.credits,
        status: 'active'
      };
    }

    return json(data, upstream.status);
  } catch (err) {
    return json({
      success: false,
      message: 'Gagal menghubungi server: ' + err.message
    }, 502);
  }
}
