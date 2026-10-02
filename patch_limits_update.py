with open('functions/api/proxy.js', 'r') as f:
    code = f.read()

old = "const TIER_LIMITS = { free: 15, demo: 1, basic: 70, pro: 150, unlimited: 500 };"
new = "const TIER_LIMITS = { free: 20, demo: 3, basic: 70, pro: 150, unlimited: 500 };"

if old not in code:
    print("ERROR: TIER_LIMITS tidak ditemukan")
    print("Cek manual dengan: grep -n 'TIER_LIMITS' functions/api/proxy.js")
    exit(1)

code = code.replace(old, new, 1)

with open('functions/api/proxy.js', 'w') as f:
    f.write(code)

print("OK: TIER_LIMITS di-update (free: 20, demo: 3)")
