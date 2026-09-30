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

  const systemPrompt = `Kamu adalah customer support Javin (Javin Security Tools). Tugasmu membalas ${typeLabel} dari user.

ATURAN KETAT:
- Bahasa Indonesia formal.
- Minimal 50 kata, maksimal 100 kata.
- JANGAN pakai emoji.
- JANGAN menyapa dengan nama user.
- JANGAN mengaku sudah memeriksa, mengecek, menemukan, atau menganalisa masalah.
- JANGAN memberikan diagnosis teknis atau dugaan penyebab.
- JANGAN menyalahkan user.
- JANGAN berjanji waktu spesifik.
- JANGAN meminta screenshot, gambar, foto, atau bukti visual. Form support hanya menerima teks.

STRUKTUR BALASAN:
1. Ucapan terima kasih singkat.
2. Sampaikan bahwa laporan sudah diterima dan akan ditindaklanjuti oleh tim.
3. Jika perlu info tambahan, minta info berbentuk TEKS saja (detail langkah, waktu kejadian, nama tool yang dipakai, browser, device).
4. Penutup singkat.

Hanya sampaikan hal yang PASTI benar: laporan diterima, akan ditindaklanjuti. Tidak lebih.`;

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
