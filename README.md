# JAVIN PROJECT HOLE

Vercel-ready catalog UI for the endpoint data supplied by the project source.

## Termux
```bash
cd ~/storage/downloads
unzip "javin-project-hole.zip"
cd "javin-project-hole"
npm install
npm install -g vercel
vercel login
vercel dev
```

Deploy:
```bash
vercel
vercel --prod
```

## Security
The included proxy applies an allowlist of upstream hosts, method restrictions, parameter validation, response size/time limits, security headers, and a best-effort per-instance request limiter.

Important: Vercel serverless memory is ephemeral. A true persistent daily per-user/per-endpoint quota and production admin authentication require a server-side datastore (e.g. Vercel KV/Redis/Postgres) and admin auth. The UI's localStorage is only a client-side identity convenience and is not a security boundary.
