# Self‑Hosted Decap OAuth Bridge

Steps to run the GitHub authentication bridge directly on the web server (no Netlify required).

## 1. Prerequisites
- Node.js 18 or later installed on the server.
- `npm` available (ships with Node).
- Existing Hugo site files deployed somewhere under `/var/www/...` (or similar).

## 2. Install dependencies
```bash
cd /path/to/Cygnas-Hugo/original
npm install
```

## 3. Configure environment variables
Create a `.env` file (or export the same values via systemd/PM2):

```
GITHUB_CLIENT_ID=xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OAUTH_STATE_SECRET=choose-a-long-random-string
OAUTH_COOKIE_DOMAIN=.cygnas.co.uk
# Optional overrides
# OAUTH_REDIRECT_BASE=https://cygnas.co.uk
# PORT=3000
```

- The GitHub Client ID/Secret must come from the OAuth app you registered for Decap.
- `OAUTH_STATE_SECRET` can be generated with `openssl rand -hex 32`.

## 4. Start the server
Development test:
```bash
node server.js
```

Production (recommended):
```bash
npm install --global pm2
pm2 start server.js --name decap-auth
pm2 save
pm2 startup   # follow the instructions so it restarts on boot
```

## 5. Apache reverse proxy
Inside the `cygnas.co.uk` virtual host:
```
ProxyPass        /api/decap http://127.0.0.1:3000/api/decap retry=0
ProxyPassReverse /api/decap http://127.0.0.1:3000/api/decap
```
Reload Apache: `sudo systemctl reload apache2`.

## 6. Verify
```bash
curl -I https://cygnas.co.uk/api/decap/auth
```
Expected headers:
- `Set-Cookie: oauth_state=<random>.<signature>; ...`
- No `Server: Apache` fingerprint (request is proxied to Node).

Finally, log in to `https://cygnas.co.uk/admin/` and confirm the Decap CMS dashboard loads.
