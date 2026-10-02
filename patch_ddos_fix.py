with open('functions/_middleware.js', 'r') as f:
    code = f.read()

# Cari blok anti-DDoS
old = """  // ==== ANTI-DDOS: Rate limit per IP per menit ====
  if (!__isWhitelisted && __db) {
    try {
      var __ddosNow = Date.now();
      var __ddosWindow = Math.floor(__ddosNow / 60000) * 60000;
      var __ddosLimit = 100; // max 100 req/menit per IP"""

new = """  // ==== ANTI-DDOS: Rate limit per IP per menit ====
  // Skip static assets — biar gak dihitung ke DDoS
  var __ddosExt = pathname.split('.').pop().toLowerCase();
  var __ddosStaticExts = ['js','css','png','jpg','jpeg','gif','svg','ico','woff','woff2','ttf','mp3','mp4','webm','webp','avif','map','txt','xml','json'];
  var __ddosIsStatic = __ddosStaticExts.indexOf(__ddosExt) !== -1;
  var __ddosIsApi = pathname.indexOf('/api/') === 0;

  // Anti-DDoS cuma untuk page request & API (skip asset statis)
  if (!__isWhitelisted && __db && !__ddosIsStatic) {
    try {
      var __ddosNow = Date.now();
      var __ddosWindow = Math.floor(__ddosNow / 60000) * 60000;
      var __ddosLimit = __ddosIsApi ? 200 : 300; // API: 200/menit, page: 300/menit"""

if old not in code:
    print("ERROR: blok anti-DDoS tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: anti-DDoS di-fix (skip static + limit naik)")

with open('functions/_middleware.js', 'w') as f:
    f.write(code)

print("SELESAI")
