with open('functions/api/bot/webhook.js', 'r') as f:
    code = f.read()

# Cari baris terakhir OSINT help, sisipin IP management setelahnya
anchor = "'<code>/portscan &lt;target&gt;</code> — Port scan (IP sendiri!)';"

if anchor not in code:
    print("ERROR: anchor help tidak ditemukan")
    exit(1)

# Cek udah ada belum
idx = code.find(anchor)
after = code[idx:idx+500]

if "IP MANAGEMENT" in after or "/whitelist" in after:
    print("SKIP: help IP udah ada")
    exit(0)

ip_help = anchor.rstrip(';') + " +\n        '\\n\\n🌐 <b>IP MANAGEMENT</b>\\n' +\n        '<code>/whitelist &lt;ip&gt; [alasan]</code> — Whitelist IP\\n' +\n        '<code>/unban &lt;ip&gt;</code> — Unban IP\\n' +\n        '<code>/ban &lt;ip&gt; [alasan]</code> — Ban IP manual';"

code = code.replace(anchor, ip_help, 1)

with open('functions/api/bot/webhook.js', 'w') as f:
    f.write(code)
print("OK: help IP management ditambahkan")
