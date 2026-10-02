with open('functions/api/bot/webhook.js', 'r') as f:
    code = f.read()

# ===== 1. Tambah import =====
old_import = "import { cmdWhitelistAdd, cmdUnban, cmdBan } from '../../_lib/bot-admin.js';"

if old_import not in code:
    print("ERROR: import anchor tidak ditemukan")
    exit(1)

new_import = old_import + "\nimport { cmdSetTier, cmdRemoveTier, cmdTierInfo } from '../../_lib/bot-admin.js';"

if "cmdSetTier" not in code:
    code = code.replace(old_import, new_import, 1)
    print("OK: import tier ditambahkan")
else:
    print("SKIP: import tier udah ada")

# ===== 2. Tambah handler setelah IP MANAGEMENT =====
anchor = "  if (cmd === '/ban') { await cmdBan(env, chatId, args, reply); return new Response('ok'); }"

if anchor not in code:
    print("ERROR: anchor handler IP tidak ditemukan")
    exit(1)

handlers = anchor + '''

  // ==== TIER MANAGEMENT ====
  if (cmd === '/settier') { await cmdSetTier(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/removetier') { await cmdRemoveTier(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/tier') { await cmdTierInfo(env, chatId, args, reply); return new Response('ok'); }'''

if "cmdSetTier" in code and "'/settier'" in code:
    print("SKIP: handler tier udah ada")
else:
    code = code.replace(anchor, handlers, 1)
    print("OK: handler tier ditambahkan")

# ===== 3. Update /help =====
old_help = "'<code>/ban &lt;ip&gt; [alasan]</code> — Ban IP manual';"
new_help = old_help.rstrip(';') + " +\n        '\\n\\n🎫 <b>TIER MANAGEMENT</b>\\n' +\n        '<code>/settier &lt;user_id&gt; &lt;tier&gt; [hari]</code> — Set tier user\\n' +\n        '<code>/removetier &lt;user_id&gt;</code> — Turunin ke free\\n' +\n        '<code>/tier &lt;user_id&gt;</code> — Cek tier user';"

if old_help in code:
    code = code.replace(old_help, new_help, 1)
    print("OK: help tier ditambahkan")
else:
    print("WARNING: help anchor tidak ditemukan")

with open('functions/api/bot/webhook.js', 'w') as f:
    f.write(code)
print("SELESAI")
