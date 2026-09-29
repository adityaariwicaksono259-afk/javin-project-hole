// Template balasan support ticket
// Admin bisa edit teks di sini nanti

export const SUPPORT_TEMPLATES = {
  // ==== BUG ====
  bug_fixed: {
    emoji: '✅',
    label: 'Bug Fixed',
    reply: 'Bug yang Anda laporkan sudah kami perbaiki. 🎉\n\nSilakan refresh halaman dan coba lagi. Kalau masih error, balas tiket ini dengan screenshot terbaru.'
  },
  bug_processed: {
    emoji: '🔧',
    label: 'Bug Diproses',
    reply: 'Terima kasih atas laporannya! 🐛\n\nBug ini sudah masuk antrean perbaikan tim kami. Estimasi perbaikan 1-3 hari kerja. Kami akan update tiket ini kalau sudah selesai.'
  },
  bug_cant_reproduce: {
    emoji: '❓',
    label: 'Tidak Bisa Direproduksi',
    reply: 'Kami sudah coba reproduksi bug yang Anda laporkan, tapi belum berhasil. 🤔\n\nBisa bantu kami dengan info tambahan?\n• Screenshot pesan error\n• Browser & versi yang dipakai\n• Langkah-langkah detail sebelum error muncul\n\nBalas tiket ini dengan info tersebut ya.'
  },

  // ==== ERROR ====
  error_solved: {
    emoji: '✅',
    label: 'Error Teratasi',
    reply: 'Error yang Anda alami sudah teratasi. ✅\n\nSilakan coba lagi. Kalau masih bermasalah, clear cache browser dulu ya.'
  },
  error_need_info: {
    emoji: '📸',
    label: 'Butuh Info Tambahan',
    reply: 'Terima kasih atas laporannya. ⚠️\n\nSupaya kami bisa bantu, tolong kirim:\n• Screenshot pesan error\n• Nama tool yang dipakai\n• Waktu kejadian\n• Browser & device\n\nBalas tiket ini dengan info tersebut.'
  },

  // ==== SARAN ====
  saran_accepted: {
    emoji: '💡',
    label: 'Saran Diterima',
    reply: 'Saran Anda sangat bagus! 💡\n\nKami akan pertimbangkan untuk update berikutnya. Kalau diimplementasikan, kami akan kabari via notifikasi.'
  },
  saran_hold: {
    emoji: '⏸️',
    label: 'Saran Ditahan',
    reply: 'Terima kasih atas sarannya. 🙏\n\nSaran ini belum bisa kami implementasikan sekarang karena prioritas teknis. Tapi akan tetap kami catat untuk update mendatang.'
  },
  saran_rejected: {
    emoji: '❌',
    label: 'Saran Ditolak',
    reply: 'Terima kasih atas sarannya. 🙏\n\nSetelah pertimbangan, saran ini belum bisa kami implementasikan karena beberapa alasan teknis. Kami tetap terbuka untuk saran lain ya.'
  },

  // ==== PEMBELIAN ====
  beli_approved: {
    emoji: '✅',
    label: 'Pembelian Disetujui',
    reply: 'Pembayaran Anda sudah kami terima! 🎉\n\nPesanan sedang diproses. API Key / akun akan dikirim ke Anda dalam 5-30 menit.\n\nTerima kasih sudah belanja!'
  },
  beli_pending: {
    emoji: '⏳',
    label: 'Pembayaran Diproses',
    reply: 'Terima kasih! Pembayaran Anda sedang kami verifikasi. ⏳\n\nEstimasi 5 menit - 1 jam. Kalau sudah dikonfirmasi, kami akan update tiket ini.'
  },
  beli_rejected: {
    emoji: '❌',
    label: 'Pembayaran Ditolak',
    reply: 'Maaf, pembayaran Anda tidak bisa kami verifikasi. ❌\n\nKemungkinan penyebab:\n• Bukti transfer tidak jelas\n• Nominal tidak sesuai\n• Transfer belum masuk\n\nSilakan submit ulang dengan bukti yang lebih jelas.'
  },

  // ==== UMUM ====
  thanks: {
    emoji: '🙏',
    label: 'Terima Kasih',
    reply: 'Terima kasih atas laporannya! 🙏\n\nKami akan follow up sesuai prioritas. Kalau ada info tambahan, balas tiket ini ya.'
  },
  close: {
    emoji: '🔒',
    label: 'Tutup Tiket',
    reply: 'Tiket ini kami tutup. 🔒\n\nKalau ada pertanyaan lain, silakan buat tiket baru. Terima kasih!'
  }
};

// Dapatkan template default per kategori
export function getTemplatesByCategory(category) {
  const map = {
    bug: ['bug_fixed', 'bug_processed', 'bug_cant_reproduce'],
    error: ['error_solved', 'error_need_info'],
    saran: ['saran_accepted', 'saran_hold', 'saran_rejected'],
    pembelian: ['beli_approved', 'beli_pending', 'beli_rejected'],
    umum: ['thanks', 'close']
  };
  return map[category] || map.umum;
}
