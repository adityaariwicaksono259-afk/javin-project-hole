// POST /api/ai/generate-reply
// Body: { type, title, message, userName }
// Return: { ok, reply }
export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return json({ ok: false, error: 'Workers AI binding tidak ada' }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch(e) { return json({ ok: false, error: 'Body invalid' }, 400); }

  const type = String(body.type || '').trim();
  const title = String(body.title || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 1000);
  const userName = String(body.userName || '').trim().slice(0, 60) || 'Pengguna';

  if (!message) {
    return json({ ok: false, error: 'message kosong' }, 400);
  }

  const typeLabel = {
    bug: 'laporan bug',
    error: 'laporan error',
    saran: 'saran fitur',
    pembelian: 'masalah pembelian'
  }[type] || 'laporan';

  const systemPrompt = `Kamu adalah customer support Javin (Javin Security Tools), platform API dan tools online. Tugasmu membalas ${typeLabel} dari user dengan sopan dan membantu. Bahasa Indonesia formal. Balasan minimal 50 kata, maksimal 100 kata. Jangan pakai emoji. Jangan menyapa dengan nama user. Struktur: (1) ucapan terima kasih singkat, (2) tanggapan spesifik terhadap masalah, (3) langkah yang akan dilakukan atau saran untuk user, (4) penutup. Langsung ke inti, jangan bertele-tele.`;

  const userPrompt = `Judul laporan: ${title || '(tidak ada judul)'}
Isi pesan: ${message}

Buat balasan yang sesuai untuk laporan ini.`;

  try {
    const result = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.6
    });

    let reply = '';
    if (result && result.response) reply = String(result.response).trim();
    else if (typeof result === 'string') reply = result.trim();

    if (!reply) {
      return json({ ok: false, error: 'AI tidak memberikan respons' }, 502);
    }

    return json({
      ok: true,
      reply: reply,
      model: '@cf/meta/llama-3.2-3b-instruct'
    });
  } catch(e) {
    console.error('[AI-REPLY]', e.message);
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, error: 'Gunakan POST' }, 405);
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
