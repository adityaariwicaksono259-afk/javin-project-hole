// Password strength checker
// Return: { ok: true } atau { ok: false, reason: '...' }

const COMMON_WEAK = [
  'password', 'admin', '123456', '12345678', 'qwerty', 'abc123',
  'letmein', 'welcome', 'monkey', 'dragon', 'javin', 'javachat',
  'admin123', 'password1', '123456789', 'iloveyou', 'master',
  'sunshine', 'princess', 'football', 'baseball', 'shadow'
];

export function checkPasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { ok: false, reason: 'Password kosong.' };
  }
  if (password.length < 12) {
    return { ok: false, reason: 'Password minimal 12 karakter.' };
  }
  if (password.length > 200) {
    return { ok: false, reason: 'Password maksimal 200 karakter.' };
  }

  const lower = password.toLowerCase();

  // Cek common weak passwords
  if (COMMON_WEAK.some(w => lower.includes(w))) {
    return { ok: false, reason: 'Password mengandung kata umum yang gampang ditebak.' };
  }

  // Cek variasi karakter
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score < 3) {
    return { ok: false, reason: 'Password harus campur: huruf besar, huruf kecil, angka, simbol (min 3 dari 4).' };
  }

  // Cek karakter berulang (aaaa, 1111)
  if (/(.)\1{3,}/.test(password)) {
    return { ok: false, reason: 'Password tidak boleh ada karakter berulang 4x atau lebih.' };
  }

  // Cek urutan berurutan (abcd, 1234)
  if (/(?:abcd|bcde|cdef|1234|2345|3456|4567|5678|6789|qwer|asdf|zxcv)/i.test(password)) {
    return { ok: false, reason: 'Password tidak boleh ada urutan umum (abcd, 1234, qwer).' };
  }

  return { ok: true };
}
