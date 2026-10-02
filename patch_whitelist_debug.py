with open('functions/_middleware.js', 'r') as f:
    code = f.read()

old = "var __publicPages = ['/login', '/login.html', '/maintenance', '/maintenance.html', '/buy', '/buy.html'];"
new = "var __publicPages = ['/login', '/login.html', '/maintenance', '/maintenance.html', '/buy', '/buy.html', '/debug-auth'];"

if old not in code:
    print("ERROR: __publicPages tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('functions/_middleware.js', 'w') as f:
    f.write(code)
print("OK: /debug-auth di-whitelist")
