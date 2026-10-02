with open('functions/api/bot/webhook.js', 'r') as f:
    code = f.read()

# ===== 1. Tambah import =====
old_import = "import { cmdAdmin, cmdUsers, cmdUserDel, cmdKeys, cmdLogs, cmdLogsClear, cmdConfig, cmdBackup, cmdAnnounce } from '../../_lib/bot-admin.js';"

if old_import not in code:
    print("ERROR: import anchor tidak ditemukan")
    exit(1)

new_import = old_import + "\nimport { cmdWhitelistAdd, cmdUnban, cmdBan } from '../../_lib/bot-admin.js';"

if "cmdWhitelistAdd" not in code:
    code = code.replace(old_import, new_import, 1)
    print("OK: import ditambahkan")
else:
    print("SKIP: import udah ada")

# ===== 2. Tambah handler sebelum "// Callback gak dikenal" atau sebelum "await reply(env, chatId, '❓ Command nggak dikenal" =====
anchor = "  await reply(env, chatId, '❓ Command nggak dikenal. Ketik /help.');"

if anchor not in code:
    print("ERROR: anchor command tidak ditemukan")
    exit(1)

handlers = '''  // ==== IP MANAGEMENT ====
  if (cmd === '/whitelist') { await cmdWhitelistAdd(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/unban') { await cmdUnban(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/ban') { await cmdBan(env, chatId, args, reply); return new Response('ok'); }

'''

if "'/whitelist'" in code and "cmdWhitelistAdd" in code and "IP MANAGEMENT" in code:
    print("SKIP: handler udah ada")
else:
    code = code.replace(anchor, handlers + anchor, 1)
    print("OK: handler IP management ditambahkan")

with open('functions/api/bot/webhook.js', 'w') as f:
    f.write(code)
print("SELESAI")
