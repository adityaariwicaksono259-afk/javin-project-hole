// GET /api/stats
// Return: stats platform + top fitur + tier user yang login

import { verifyApiKey } from '../_lib/gen-api-key.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

async function getSessionUserId(db, request) {
  if (!db || !request) return null;
  try {
    const cookie = request.headers.get('Cookie') || '';
    let match = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);
    if (!match) match = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);
    if (!match) return null;

    const token = decodeURIComponent(match[1]);
    const sess = await db.prepare(
      'SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    return sess ? sess.user_id : null;
  } catch (e) {
    return null;
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  try {
    // 1. Total users
    const userRow = await db.prepare('SELECT COUNT(*) as c FROM auth_users').first();
    const totalUsers = userRow ? userRow.c : 0;

    // 2. Total endpoints (dari endpoints.json + custom_apis)
    let totalEndpoints = 0;
    try {
      const epRes = await fetch(new URL('/endpoints.json', request.url).toString());
      if (epRes.ok) {
        const epData = await epRes.json();
        totalEndpoints = epData.length;
      }
    } catch (e) {}

    // Tambah custom endpoints (kalau ada tabelnya)
    try {
      const customRow = await db.prepare('SELECT COUNT(*) as c FROM custom_apis WHERE status = "active"').first();
      if (customRow && customRow.c) totalEndpoints += customRow.c;
    } catch (e) {
      // Tabel custom_apis mungkin belom ada, skip
    }

    // 3. Total requests (all-time dari logs)
    let totalRequests = 0;
    try {
      const reqRow = await db.prepare('SELECT COUNT(*) as c FROM logs').first();
      totalRequests = reqRow ? reqRow.c : 0;
    } catch (e) {}

    // 4. Top fitur (dari endpoint_hits)
    let topFitur = [];
    try {
      const hitsRows = await db.prepare(
        'SELECT endpoint_id, hits FROM endpoint_hits ORDER BY hits DESC LIMIT 5'
      ).all();
      const rows = hitsRows.results || [];

      if (rows.length > 0) {
        // Ambil nama endpoint dari endpoints.json
        let epMap = {};
        try {
          const epRes = await fetch(new URL('/endpoints.json', request.url).toString());
          if (epRes.ok) {
            const epData = await epRes.json();
            epData.forEach(function(ep) {
              epMap[ep.catalogId] = ep.name;
            });
          }
        } catch (e) {}

        topFitur = rows.map(function(r) {
          return {
            catalogId: r.endpoint_id,
            name: epMap[r.endpoint_id] || r.endpoint_id,
            hits: r.hits || 0
          };
        });
      }
    } catch (e) {}

    // 5. Tier user (kalau login)
    let userTier = null;
    const userId = await getSessionUserId(db, request);
    if (userId) {
      try {
        const u = await db.prepare(
          'SELECT tier, tier_expires_at, credits FROM auth_users WHERE id = ?'
        ).bind(userId).first();
        if (u) {
          userTier = {
            tier: u.tier || 'free',
            credits: u.credits || 0,
            expires_at: u.tier_expires_at || 0
          };
        }
      } catch (e) {}
    }

    return json({
      ok: true,
      total_users: totalUsers,
      total_endpoints: totalEndpoints,
      total_requests: totalRequests,
      top_fitur: topFitur,
      user_tier: userTier
    });
  } catch (e) {
    console.error('[STATS]', e.message);
    return json({ ok: false, message: 'Internal error' }, 500);
  }
}
