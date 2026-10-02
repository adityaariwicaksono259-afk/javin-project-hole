with open('functions/api/ai/generate-reply.js', 'r') as f:
    code = f.read()

old = "'@cf/meta/llama-3.1-8b-instruct'"
new = "'@cf/meta/llama-3.2-3b-instruct'"

if old not in code:
    print("ERROR: model lama tidak ditemukan")
    exit(1)

code = code.replace(old, new)

with open('functions/api/ai/generate-reply.js', 'w') as f:
    f.write(code)

print("OK: model diganti ke llama-3.2-3b-instruct")
