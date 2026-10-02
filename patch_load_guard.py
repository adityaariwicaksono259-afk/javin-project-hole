import re

files = ['public/index.html', 'public/premium.html', 'public/tool.html']

for fname in files:
    with open(fname, 'r') as f:
        html = f.read()

    if '/demo-guard.js' in html:
        print("SKIP: " + fname + " udah load demo-guard")
        continue

    # Sisipkan sebelum </body>
    if '</body>' not in html:
        print("ERROR: " + fname + " gak ada </body>")
        continue

    html = html.replace('</body>', '<script src="/demo-guard.js"></script>\n</body>', 1)

    with open(fname, 'w') as f:
        f.write(html)
    print("OK: " + fname + " di-load demo-guard.js")

print("SELESAI")
