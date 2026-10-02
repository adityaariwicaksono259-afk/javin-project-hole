with open('functions/api/proxy.js', 'r') as f:
    code = f.read()

old = """  // Legacy: extra_limit (kalau lebih besar dari tier limit)
  if (userRow && typeof userRow.extra_limit === 'number' && userRow.extra_limit > limit) {
    limit = userRow.extra_limit;
    tier = 'custom';
  }"""

new = """  // Legacy: extra_limit (kalau di-set dan bukan 0, pakai ini)
  if (userRow && typeof userRow.extra_limit === 'number' && userRow.extra_limit !== 0) {
    limit = userRow.extra_limit;
    tier = 'custom';
  }"""

if old not in code:
    print("ERROR: blok extra_limit tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('functions/api/proxy.js', 'w') as f:
    f.write(code)

print("OK: extra_limit fix")
