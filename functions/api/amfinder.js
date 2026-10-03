// functions/api/amfinder.js — Proxy ke RapidAPI TikTok Scraper
// Cari preset Alight Motion dari link TikTok

const RAPIDAPI_HOST = 'tiktok-scraper7.p.rapidapi.com';

// Regex preset — URL apapun yang mirip preset AM atau short link
const PRESET_PATTERNS = [
  // Domain langsung
  /https?:\/\/[^\s"'<>]*alightcreative\.com[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*alightmotion\.com[^\s"'<>]*/gi,
  // Short URL umum
  /https?:\/\/(?:www\.)?bit\.ly\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?s\.id\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?linktr\.ee\/[^\s"'<>]+/gi,
  /https?:\/\/(?:www\.)?t\.me\/[^\s"'<>]+/gi,
  /https?:\/\/[^\s"'<>]*\.xml/gi,
  // Keyword-based URL (link yang ada kata "preset" atau "am")
  /https?:\/\/[^\s"'<>]*(?:preset|alight|am-preset)[^\s"'<>]*/gi,
];

function extractPresets(text) {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();
  for (const pat of PRESET_PATTERNS) {
    const matches = text.match(pat);
    if (matches) matches.forEach((m) => found.add(m.replace(/[.,;:!?]+$/, '')));
  }
  return [...found];
}

async function rapidGet(path, apiKey, host) {
  const res = await fetch(`https://${host}${path}`, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host,
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text, _status: res.status };
  }
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

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  let tiktokUrl = url.searchParams.get('url');

  // Kalau POST, terima dari body JSON
  if (!tiktokUrl && request.method === 'POST') {
    try {
      const body = await request.json();
      tiktokUrl = body.url;
    } catch {}
  }

  if (!tiktokUrl) {
    return json({
      status: 'error',
      code: 'MISSING_URL',
      message: 'Parameter "url" wajib. Contoh: /api/amfinder?url=https://vt.tiktok.com/xxx',
    }, 400);
  }

  if (!/tiktok\.com/i.test(tiktokUrl)) {
    return json({
      status: 'error',
      code: 'INVALID_URL',
      message: 'URL harus dari TikTok.',
    }, 400);
  }

  const RAPIDAPI_KEY = env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    return json({
      status: 'error',
      code: 'MISSING_ENV',
      message: 'RAPIDAPI_KEY belum di-set di Cloudflare Pages environment.',
    }, 500);
  }

  const started = Date.now();
  const presetSet = new Set();
  const sources = {
    caption: [],
    author_bio: [],
    comments: [],
    replies: [],
  };

  try {
    // 1. Ambil info video
    const videoRes = await rapidGet(`/?url=${encodeURIComponent(tiktokUrl)}`, RAPIDAPI_KEY, RAPIDAPI_HOST);

    if (videoRes?.code !== 0) {
      return json({
        status: 'error',
        code: 'VIDEO_FETCH_FAILED',
        message: videoRes?.msg || 'Gagal ambil data video.',
        raw: videoRes,
      }, 502);
    }

    const videoData = videoRes.data || {};
    const caption = videoData.title || '';
    const author = videoData.author?.unique_id || '';

    // Extract dari caption
    const captionPresets = extractPresets(caption);
    captionPresets.forEach((p) => { presetSet.add(p); sources.caption.push(p); });

    // 2. Ambil komentar
    const commentRes = await rapidGet(`/comment/list?url=${encodeURIComponent(tiktokUrl)}&count=50`, RAPIDAPI_KEY, RAPIDAPI_HOST);
    const comments = commentRes?.data?.comments || [];

    for (const c of comments) {
      const cText = c.text || '';
      const cPresets = extractPresets(cText);
      cPresets.forEach((p) => {
        if (!presetSet.has(p)) {
          presetSet.add(p);
          sources.comments.push({ comment: cText.slice(0, 100), url: p });
        }
      });
    }

    // 3. Ambil bio author
    let bioPresets = [];
    if (author) {
      const userRes = await rapidGet(`/user/info?unique_id=${encodeURIComponent(author)}`, RAPIDAPI_KEY, RAPIDAPI_HOST);
      const bio = userRes?.data?.user?.signature || '';
      const bioLink = userRes?.data?.user?.bio_link?.link || '';
      const combined = `${bio} ${bioLink}`;
      bioPresets = extractPresets(combined);
      bioPresets.forEach((p) => {
        if (!presetSet.has(p)) {
          presetSet.add(p);
          sources.author_bio.push(p);
        }
      });
    }

    const elapsed = Date.now() - started;

    return json({
      status: 'ok',
      tiktok_url: tiktokUrl,
      author,
      caption: caption.slice(0, 200),
      counts: {
        total_presets: presetSet.size,
        from_caption: sources.caption.length,
        from_bio: sources.author_bio.length,
        from_comments: sources.comments.length,
        comments_scanned: comments.length,
      },
      presets: [...presetSet],
      sources,
      elapsed_ms: elapsed,
    });

  } catch (err) {
    return json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: err.message,
      elapsed_ms: Date.now() - started,
    }, 500);
  }
}
