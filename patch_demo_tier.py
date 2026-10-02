with open('functions/api/proxy.js', 'r') as f:
    code = f.read()

# ===== Tambah demo ke TIER_LIMITS =====
old = "const TIER_LIMITS = { free: 15, basic: 70, pro: 150, unlimited: 500 };"
new = "const TIER_LIMITS = { free: 15, demo: 1, basic: 70, pro: 150, unlimited: 500 };"

if old not in code:
    print("ERROR: TIER_LIMITS tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: demo tier ditambahkan")

# ===== Tambah flag is_demo di response limit habis =====
old2 = """        return jsonRes(429, {
          ok: false,
          message: 'Limit harian habis (' + status.used + '/' + status.limit + '). Reset dalam ' + formatDuration(remaining) + ' (00:00 WIB).',
          limit: status.limit,
          used: status.used,
          tier: status.tier,
          reset_in_ms: remaining
        });"""

new2 = """        var isDemo = status.tier === 'demo';
        return jsonRes(429, {
          ok: false,
          message: isDemo
            ? 'Limit demo habis. Login untuk lanjut, gratis.'
            : 'Limit harian habis (' + status.used + '/' + status.limit + '). Reset dalam ' + formatDuration(remaining) + ' (00:00 WIB).',
          limit: status.limit,
          used: status.used,
          tier: status.tier,
          is_demo: isDemo,
          reset_in_ms: remaining
        });"""

if old2 not in code:
    print("WARNING: blok 429 tidak ditemukan")
else:
    code = code.replace(old2, new2, 1)
    print("OK: blok 429 di-update (is_demo flag)")

with open('functions/api/proxy.js', 'w') as f:
    f.write(code)

print("SELESAI")
