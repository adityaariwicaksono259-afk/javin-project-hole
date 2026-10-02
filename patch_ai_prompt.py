with open('functions/api/ai/generate-reply.js', 'r') as f:
    code = f.read()

old = "  const systemPrompt = `Kamu adalah customer support Javin (Javin Security Tools), platform API dan tools online. Tugasmu membalas ${typeLabel} dari user dengan sopan, singkat, dan membantu. Bahasa Indonesia. Maksimal 4 kalimat. Jangan pakai emoji berlebihan. Jangan menyapa dengan \"Halo [nama]\" karena nama user tidak selalu valid. Langsung ke inti balasan.`;"

new = "  const systemPrompt = `Kamu adalah customer support Javin (Javin Security Tools), platform API dan tools online. Tugasmu membalas ${typeLabel} dari user dengan sopan dan membantu. Bahasa Indonesia formal. Balasan minimal 50 kata, maksimal 100 kata. Jangan pakai emoji. Jangan menyapa dengan nama user. Struktur: (1) ucapan terima kasih singkat, (2) tanggapan spesifik terhadap masalah, (3) langkah yang akan dilakukan atau saran untuk user, (4) penutup. Langsung ke inti, jangan bertele-tele.`;"

if old not in code:
    print("ERROR: prompt lama tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

old2 = "      max_tokens: 300,"
new2 = "      max_tokens: 400,"

if old2 in code:
    code = code.replace(old2, new2, 1)
    print("OK: max_tokens dinaikkan ke 400")

with open('functions/api/ai/generate-reply.js', 'w') as f:
    f.write(code)

print("OK: prompt diupdate")
