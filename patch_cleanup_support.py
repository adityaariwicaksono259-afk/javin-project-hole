with open('public/support.js', 'r') as f:
    code = f.read()

# ===== Hapus panggilan setelah submit =====
old1 = """      // Update history
      loadHistory();

"""
if old1 in code:
    code = code.replace(old1, '', 1)
    print("OK: panggilan loadHistory setelah submit dihapus")
else:
    print("SKIP: anchor 1 tidak ditemukan")

# ===== Hapus fungsi loadHistory =====
start_marker = "  // ===== Load history ====="
end_marker = "  function escHtml(s){"

if start_marker in code and end_marker in code:
    start_idx = code.find(start_marker)
    end_idx = code.find(end_marker)
    code = code[:start_idx] + code[end_idx:]
    print("OK: fungsi loadHistory dihapus")
else:
    print("ERROR: marker fungsi loadHistory tidak ditemukan")
    print("start ada?", start_marker in code)
    print("end ada?", end_marker in code)

# ===== Hapus panggilan di init =====
old3 = """  // Init
  loadHistory();
})();"""
new3 = """  // Init
})();"""

if old3 in code:
    code = code.replace(old3, new3, 1)
    print("OK: panggilan di init dihapus")
else:
    print("SKIP: anchor 3 tidak ditemukan")

with open('public/support.js', 'w') as f:
    f.write(code)

print("SELESAI")
