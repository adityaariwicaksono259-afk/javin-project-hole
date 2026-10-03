// functions/api/amfinder.js — Cari preset Alight Motion dari link TikTok
// Cache di D1 + scan music/posts + bio + komentar

const RAPIDAPI_HOST = 'tiktok-scraper7.p.rapidapi.com';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MUSIC_POSTS = 10;
const MAX_COMMENTS_PER_VIDEO = 30;

const PRESET_PATTERNS = [
  // Alight Motion resmi
  /https?:\/\/[^\s"'<>]*alightcreative\.com[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*alightmotion\.com[^\s"'<>]*/gi,
  // XML file
  /https?:\/\/[^\s"'<>]*\.xml(?:\?[^\s"'<>]*)?/gi,
  // Container bio link
  /https?:\/\/(?:www\.)?linktr\.ee\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?sociabuzz\.com\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?beacons\.ai\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?bio\.link\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?link\.bio\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?carrd\.co\/[^\s"'<>]+/gi,
  // File storage
  /https?:\/\/(?:www\.)?drive\.google\.com\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?mediafire\.com\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?mega\.nz\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?dropbox\.com\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?pixeldrain\.com\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?gofile\.io\/[^\s"'<>]+/gi,
  // Short URL
  /https?:\/\/(?:www\.)?bit\.ly\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?s\.id\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?tinyurl\.com\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?is\.gd\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?t\.co\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?shorturl\.at\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?rebrand\.ly\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?cutt\.ly\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?rb\.gy\/[^\s"'<>]+/gi,
  // WhatsApp Channel + grup
  /https?:\/\/(?:www\.)?whatsapp\.com\/channel\/[^\s"'<>]+/gi,
  /https?:\/\/(?:chat\.)?whatsapp\.com\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?wa\.me\/[^\s"'<>]+/gi,
  // Telegram
  /https?:\/\/(?:t\.me|telegram\.me)\/[^\s"'<>]+/gi,
  // Keyword-based
  /https?:\/\/[^\s"'<>]*(?:preset|alight|am-preset|prem-?am|amvip|xml-?preset)[^\s"'<>]*/gi,
];

function extractPresets(text) {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();
  for (const pat of PRESET_PATTERNS) {
    const matches = text.match(pat);
    if (matches) matches.forEach((m) => found.add(m.replace(/[.,;:!?)\]]+$/, '')));
  }
  return [...found];
}

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function rapidGet(path, apiKey, host) {
  const res = await fetch(`https://${host}${path}`, {
    headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text, _status: res.status }; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function getCache(db, hash) {
  try {
    return await db.prepare('SELECT result_json, expires_at FROM amfinder_cache WHERE url_hash = ?').bind(hash).first();
  } catch (e) { console.error('[CACHE-GET]', e.message); return null; }
}

async function setCache(db, hash, url, resultJson) {
  try {
    const now = Date.now();
    await db.prepare('INSERT OR REPLACE INTO amfinder_cache (url_hash, tiktok_url, result_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(hash, url, resultJson, now, now + CACHE_TTL_MS).run();
  } catch (e) { console.error('[CACHE-SET]', e.message); }
}

async function incrementHit(db, hash) {
  try { await db.prepare('UPDATE amfinder_cache SET hit_count = hit_count + 1 WHERE url_hash = ?').bind(hash).run(); } catch (e) {}
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }});
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }});
  }

  const url = new URL(request.url);
  let tiktokUrl = url.searchParams.get('url');

  if (!tiktokUrl && request.method === 'POST') {
    try { const body = await request.json(); tiktokUrl = body.url; } catch {}
  }

  if (!tiktokUrl) return json({ status: 'error', code: 'MISSING_URL', message: 'Parameter "url" wajib.' }, 400);
  if (!/tiktok\.com/i.test(tiktokUrl)) return json({ status: 'error', code: 'INVALID_URL', message: 'URL harus dari TikTok.' }, 400);

  const RAPIDAPI_KEY = env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) return json({ status: 'error', code: 'MISSING_ENV', message: 'RAPIDAPI_KEY belum di-set.' }, 500);

  const db = env.JAVIN_DB;
  const urlHash = await sha256(tiktokUrl);
  const started = Date.now();

  // CEK CACHE
  if (db) {
    const cached = await getCache(db, urlHash);
    if (cached && cached.expires_at > Date.now()) {
      incrementHit(db, urlHash);
      try {
        const parsed = JSON.parse(cached.result_json);
        parsed.cached = true;
        parsed.elapsed_ms = Date.now() - started;
        return json(parsed);
      } catch {}
    }
  }

  const presetSet = new Set();
  const sources = { caption: [], bio_text: [], bio_link: [], music_posts: [], comments: [] };

  try {
    const videoRes = await rapidGet(`/?url=${encodeURIComponent(tiktokUrl)}`, RAPIDAPI_KEY, RAPIDAPI_HOST);

    if (videoRes?.code !== 0) {
      if (db) {
        const cached = await getCache(db, urlHash);
        if (cached) {
          try {
            const parsed = JSON.parse(cached.result_json);
            parsed.cached = true;
            parsed.cache_expired = true;
            return json(parsed);
          } catch {}
        }
      }
      return json({ status: 'error', code: 'VIDEO_FETCH_FAILED', message: videoRes?.msg || 'Gagal ambil data video.' }, 502);
    }

    const videoData = videoRes.data || {};
    const caption = videoData.title || '';
    const author = videoData.author?.unique_id || '';
    const musicId = videoData.music_info?.id || '';

    extractPresets(caption).forEach((p) => { presetSet.add(p); sources.caption.push(p); });

    if (author) {
      const userRes = await rapidGet(`/user/info?unique_id=${encodeURIComponent(author)}`, RAPIDAPI_KEY, RAPIDAPI_HOST);
      if (userRes?.code === 0) {
        const u = userRes.data?.user || {};
        const bioText = u.signature || '';
        const bioLink = u.bioLink?.link || '';
        extractPresets(bioText).forEach((p) => { if (!presetSet.has(p)) { presetSet.add(p); sources.bio_text.push(p); } });
        if (bioLink) extractPresets(bioLink).forEach((p) => { if (!presetSet.has(p)) { presetSet.add(p); sources.bio_link.push(p); } });
      }
    }

    const commentRes = await rapidGet(`/comment/list?url=${encodeURIComponent(tiktokUrl)}&count=${MAX_COMMENTS_PER_VIDEO}`, RAPIDAPI_KEY, RAPIDAPI_HOST);
    const comments = commentRes?.data?.comments || [];
    for (const c of comments) {
      extractPresets(c.text || '').forEach((p) => {
        if (!presetSet.has(p)) { presetSet.add(p); sources.comments.push({ from: 'main_video', comment: (c.text || '').slice(0, 80), url: p }); }
      });
    }

    if (musicId) {
      const postsRes = await rapidGet(`/music/posts?music_id=${musicId}`, RAPIDAPI_KEY, RAPIDAPI_HOST);
      const videos = (postsRes?.data?.videos || []).slice(0, MAX_MUSIC_POSTS);
      for (const v of videos) {
        const vCaption = v.title || '';
        const vUrl = v.video_id ? `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.video_id}` : null;
        extractPresets(vCaption).forEach((p) => {
          if (!presetSet.has(p)) { presetSet.add(p); sources.music_posts.push({ author: v.author?.unique_id, caption_snippet: vCaption.slice(0, 80), url: p }); }
        });
        if (vUrl) {
          const vCommentsRes = await rapidGet(`/comment/list?url=${encodeURIComponent(vUrl)}&count=${MAX_COMMENTS_PER_VIDEO}`, RAPIDAPI_KEY, RAPIDAPI_HOST);
          const vComments = vCommentsRes?.data?.comments || [];
          for (const c of vComments) {
            extractPresets(c.text || '').forEach((p) => {
              if (!presetSet.has(p)) { presetSet.add(p); sources.comments.push({ from: v.author?.unique_id, comment: (c.text || '').slice(0, 80), url: p }); }
            });
          }
        }
      }
    }

    const elapsed = Date.now() - started;

    const result = {
      status: 'ok',
      tiktok_url: tiktokUrl,
      author,
      caption: caption.slice(0, 200),
      music_id: musicId,
      counts: {
        total_presets: presetSet.size,
        from_caption: sources.caption.length,
        from_bio_text: sources.bio_text.length,
        from_bio_link: sources.bio_link.length,
        from_music_posts: sources.music_posts.length,
        from_comments: sources.comments.length,
        videos_scanned: musicId ? MAX_MUSIC_POSTS + 1 : 1,
      },
      presets: [...presetSet],
      sources,
      elapsed_ms: elapsed,
      cached: false,
    };

    if (db) await setCache(db, urlHash, tiktokUrl, JSON.stringify(result));
    return json(result);

  } catch (err) {
    if (db) {
      const cached = await getCache(db, urlHash);
      if (cached) {
        try {
          const parsed = JSON.parse(cached.result_json);
          parsed.cached = true;
          parsed.cache_expired = true;
          parsed.error_fallback = err.message;
          return json(parsed);
        } catch {}
      }
    }
    return json({ status: 'error', code: 'INTERNAL_ERROR', message: err.message }, 500);
  }
}
