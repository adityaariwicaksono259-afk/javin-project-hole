with open('functions/_middleware.js', 'r') as f:
    code = f.read()

old = """      var __authCookie = request.headers.get('Cookie') || '';
      var __authMatch = __authCookie.match(/(?:^|;\\s*)javin_session=([^;]+)/);
      var __authOk = false;
      if (__authMatch && context.env && context.env.JAVIN_DB) {
        try {
          var __token = decodeURIComponent(__authMatch[1]);
          var __sess = await context.env.JAVIN_DB.prepare(
            'SELECT token FROM auth_sessions WHERE token = ? AND expires_at > ?'
          ).bind(__token, Date.now()).first();
          if (__sess) __authOk = true;
        } catch(e) { console.error('[AUTH-GATE]', e.message); }
      }"""

new = """      var __authCookie = request.headers.get('Cookie') || '';
      var __authOk = false;
      if (context.env && context.env.JAVIN_DB) {
        // 1. Cek javin_demo dulu (prioritas demo mode)
        var __demoMatch = __authCookie.match(/(?:^|;\\s*)javin_demo=([^;]+)/);
        if (__demoMatch) {
          try {
            var __demoToken = decodeURIComponent(__demoMatch[1]);
            var __demoSess = await context.env.JAVIN_DB.prepare(
              'SELECT token FROM auth_sessions WHERE token = ? AND expires_at > ?'
            ).bind(__demoToken, Date.now()).first();
            if (__demoSess) __authOk = true;
          } catch(e) { console.error('[AUTH-GATE-DEMO]', e.message); }
        }
        // 2. Fallback ke javin_session (user Google/email)
        if (!__authOk) {
          var __authMatch = __authCookie.match(/(?:^|;\\s*)javin_session=([^;]+)/);
          if (__authMatch) {
            try {
              var __token = decodeURIComponent(__authMatch[1]);
              var __sess = await context.env.JAVIN_DB.prepare(
                'SELECT token FROM auth_sessions WHERE token = ? AND expires_at > ?'
              ).bind(__token, Date.now()).first();
              if (__sess) __authOk = true;
            } catch(e) { console.error('[AUTH-GATE]', e.message); }
          }
        }
      }"""

if old not in code:
    print("ERROR: blok AUTH GATE tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('functions/_middleware.js', 'w') as f:
    f.write(code)

print("OK: AUTH GATE cek 2 cookie")
