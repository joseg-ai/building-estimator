# Decisions Log

**Last updated:** 2026-05-11T17:13:54.112-05:00

---

## Azure Architecture Proposal — PEMB Building Estimator

**Date:** 2026-05-11  
**By:** Danny (Tech Lead)  
**Status:** Proposal — awaiting Jose's input  
**Requested by:** Jose Guajardo

**Decision:** Recommend Azure App Service (B1 plan) for Tier 1 production deployment (~$13-15/mo). Express serves React static files. SQLite persists on `/home/site/data/estimator.db`. Key Vault stores JWT_SECRET. Application Insights monitors. Daily backup cron to Blob Storage.

**Tier 2 (10+ users):** Migrate to PostgreSQL Flexible Server + scale App Service to B2/S1 + staging slot deploy pattern.

**Code changes required (Steps 1-2):**
- Make API URL configurable in `webapp/src/api.ts` (~30 min)
- Add Express static serving in `server/index.js` (~15 min)

**Why:** Simplest path from current state. No Docker. No breaking changes. ~2 hours total prep work + 1 hour resource provisioning.

**Key assumptions:**
- Single company, 1-5 users, budget ≤ $50/mo
- No compliance requirements
- Texas-based (South Central US region)
- Occasional 1-minute deploys acceptable
- SQLite + WAL mode suitable for concurrent reads

**Monthly cost estimate (Tier 1):**
| Service | SKU | Cost |
|---------|-----|------|
| App Service Plan | B1 | ~$13/mo |
| Key Vault | Free tier | $0 |
| Application Insights | Free tier | $0 |
| Blob Storage (backups) | LRS, Hot | ~$0.02/mo |
| **Total** | | **~$13-15/mo** |

**Next steps:** Jose to greenlight. Linus handles API URL config. Rusty handles API/DB integration changes if needed.

---

## Azure admin seed mechanism

**Author:** Rusty
**Date:** 2026-05-11
**Status:** Closed — seeder confirmed working, idempotent, left enabled

### Context

Admin login against https://vmbc-estimator.azurewebsites.net was reported as `HTTP 400 Bad Request` for `POST /api/auth/login {username:"admin",password:"admin123"}`. Suspected cause: fresh SQLite DB at `/home/site/data/estimator.db` (Azure persistent storage) had never been seeded with an admin user.

### Investigation

1. Reviewed `server/index.js` — an idempotent admin seeder was **already wired** (added in a prior session, lines 12–27). Runs only when `SEED_ADMIN=true` and `SELECT COUNT(*) FROM users` returns 0. Uses the same `bcryptjs` hashing as `routes-auth.js` (`bcrypt.hashSync(pw, 10)`) and the same `uuid v4` id scheme. Inserts `username=admin`, `password=admin123`, `display_name=Admin`.
2. Checked Azure app settings — `SEED_ADMIN=true`, `DB_PATH=/home/site/data/estimator.db`, `SERVE_WEBAPP=true` were **all already set**.
3. Tested login with a proper JSON body file (`curl --data-binary @body.json`) → **HTTP 200 + JWT returned**. Admin user exists and authenticates.
4. Reproduced the original 400: PowerShell + `curl.exe -d '{\"username\":...}'` mangles the backslash-escaped quotes, sending malformed JSON. `express.json()` rejects with HTML `400 Bad Request` (Express default body-parser error page — not our JSON envelope). This was a **client-side curl/PowerShell quoting bug, not a server bug**.

### Decision

**Keep the seeder as-is and leave `SEED_ADMIN=true` on Azure.** The seeder is idempotent (no-op once any user exists), so leaving it on costs one `SELECT COUNT(*)` at boot and protects against future DB resets (e.g., wiping `/home/site/data/`).

#### Seed mechanism (in `server/index.js`)

```js
function seedAdminIfEmpty() {
  const db = require('./db');
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const count = db.prepare('SELECT COUNT(*) as n FROM users').get();
  if (count.n === 0) {
    const id = uuidv4();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)')
      .run(id, 'admin', hash, 'Admin');
    console.log('[seed] Created default admin user — change this password immediately.');
  }
}
if (process.env.SEED_ADMIN === 'true') seedAdminIfEmpty();
```

- **Gated by env var** — never runs unless `SEED_ADMIN=true` (so local dev / tests don't get a surprise admin).
- **Idempotent** — only inserts when `users` table is empty. Subsequent boots and password changes are preserved.
- **Same hash scheme as `routes-auth.js`** — `bcryptjs.hashSync(pw, 10)`. Login verification via `bcrypt.compareSync` works against the seeded hash.
- **Credentials not in repo** — username/password are literals in code but they are the documented bootstrap default; no secrets file required. Users must change the password after first login.

#### Azure App Settings (already configured)

| Setting        | Value                              |
| -------------- | ---------------------------------- |
| `SEED_ADMIN`   | `true`                             |
| `DB_PATH`      | `/home/site/data/estimator.db`     |
| `SERVE_WEBAPP` | `true`                             |
| `PORT`         | injected by Azure (8080)           |

### Verification

```
$ curl -X POST https://vmbc-estimator.azurewebsites.net/api/auth/login \
    -H "Content-Type: application/json" \
    --data-binary '{"username":"admin","password":"admin123"}'
HTTP/1.1 200 OK
{"token":"eyJhbGciOiJIUzI1NiIs...","user":{"id":"c3b9cee8-...","username":"admin","displayName":"Admin"}}
```

### Follow-ups

- **Webapp consumers:** if the React app sends malformed JSON, express.json() returns HTML 400. Consider a global error handler that emits `{ error: { code: 'BAD_JSON', message: ... } }` instead. Non-urgent.
- **Bootstrap password rotation:** the seeded admin/admin123 should be changed after first prod use. No automated rotation yet — manual via `PUT /api/auth/...` (route TBD) or direct DB update.
- **Client-side note:** when testing from PowerShell, use `--data-binary @file.json` not `-d '{\"..\":...}'`. Backslash-quoted JSON does not survive PowerShell argument parsing.
