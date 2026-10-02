with open('functions/_middleware.js', 'r') as f:
    code = f.read()

old = "var __publicPages = ['/login', '/login.html', '/maintenance', '/maintenance.html', '/buy', '/buy.html', '/debug-auth'];"
new = "var __publicPages = ['/login', '/login.html', '/maintenance', '/maintenance.html', '/buy', '/buy.html'];"

if old not in code:
    print("WARNING: /debug-auth tidak ditemukan di __publicPages (mungkin udah bersih)")
else:
    code = code.replace(old, new, 1)
    print("OK: /debug-auth dihapus dari whitelist")

with open('functions/_middleware.js', 'w') as f:
    f.write(code)
print("SELESAI")
