// OAuth helper — verify Google/Facebook token

export async function verifyGoogleToken(idToken) {
  if (!idToken) return { ok: false, reason: 'no_token' };
  try {
    var r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
    if (!r.ok) return { ok: false, reason: 'google_http_' + r.status };
    var j = await r.json();
    if (!j.email) return { ok: false, reason: 'no_email' };
    // Cek audience (client_id) kalau ada
    return {
      ok: true,
      user: {
        id: j.sub,
        email: j.email,
        name: j.name || j.email.split('@')[0],
        avatar: j.picture || '',
        email_verified: j.email_verified === 'true' || j.email_verified === true
      }
    };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export async function verifyFacebookToken(accessToken) {
  if (!accessToken) return { ok: false, reason: 'no_token' };
  try {
    var url = 'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=' + encodeURIComponent(accessToken);
    var r = await fetch(url);
    if (!r.ok) return { ok: false, reason: 'fb_http_' + r.status };
    var j = await r.json();
    if (j.error) return { ok: false, reason: j.error.message };
    if (!j.id) return { ok: false, reason: 'no_id' };
    return {
      ok: true,
      user: {
        id: j.id,
        email: j.email || (j.id + '@facebook.local'),
        name: j.name || 'FB User',
        avatar: (j.picture && j.picture.data && j.picture.data.url) || '',
        email_verified: true
      }
    };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export function generateUserCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  var bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (var i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return 'JH-' + s;
}

export function generateSessionToken() {
  var bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(function(b){ return b.toString(16).padStart(2, '0'); }).join('');
}

export function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extraHeaders || {})
  });
}
