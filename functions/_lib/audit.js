// Helper audit log — catat aksi admin ke D1

export async function audit(db, { action, actor, target, detail, ip }) {
  if (!db) return;
  try {
    await db.prepare(
      'INSERT INTO audit_log (action, actor, target, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      String(action || 'unknown').slice(0, 60),
      String(actor || 'unknown').slice(0, 100),
      String(target || '').slice(0, 200),
      String(detail || '').slice(0, 500),
      String(ip || 'unknown').slice(0, 60),
      Date.now()
    ).run();
  } catch (e) {
    console.error('[AUDIT] Error:', e.message);
  }
}

export function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
         'unknown';
}
