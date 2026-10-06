// POST /api/premium/validate-key
// Body: { apikey }
// Validasi API key tanpa potong credits.
// Return: { ok, credits, tier, user_code }

import { verifyApiKey } from '../../_lib/gen-api-key.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid.' }, 400); }

  const apikey = String(body.apikey || '').trim().toUpperCase();
  if (!apikey) return json({ ok: false, message: 'API Key wajib.' }, 400);

  const v = await verifyApiKey(db, apikey);
  if (!v.ok) return json({ ok: false, message: v.message }, v.code);

  const credits = v.user.credits || 0;

  return json({
    ok: true,
    credits: credits,
    tier: v.user.tier || 'free',
    user_code: v.user.user_code || null,
    can_afford: {
      amprem: credits >= 15,
      amfinder: credits >= 2
    }
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
