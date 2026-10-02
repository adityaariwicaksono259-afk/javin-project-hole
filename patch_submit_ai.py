with open('functions/api/support/submit.js', 'r') as f:
    code = f.read()

old = """    // Bikin tombol per kategori
    const templateKeys = getTemplatesByCategory(type);
    const buttons = [];
    templateKeys.forEach(function(key) {
      const tpl = SUPPORT_TEMPLATES[key];
      if (!tpl) return;
      buttons.push([{
        text: tpl.emoji + ' ' + tpl.label,
        callback_data: 'sup:' + ticketId + ':' + key
      }]);
    });"""

new = """    // Tombol AI Reply (baris pertama)
    const buttons = [];
    buttons.push([{
      text: 'AI Reply (auto)',
      callback_data: 'ai:' + ticketId
    }]);

    // Tombol template per kategori
    const templateKeys = getTemplatesByCategory(type);
    templateKeys.forEach(function(key) {
      const tpl = SUPPORT_TEMPLATES[key];
      if (!tpl) return;
      buttons.push([{
        text: tpl.emoji + ' ' + tpl.label,
        callback_data: 'sup:' + ticketId + ':' + key
      }]);
    });"""

if old not in code:
    print("ERROR: blok tombol tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('functions/api/support/submit.js', 'w') as f:
    f.write(code)

print("OK: tombol AI ditambahkan")
