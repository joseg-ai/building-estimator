# Squad Orchestration Log

## Round 1: Azure Prep

**Round Name:** Azure prep round 1  
**Date:** 2026-05-11  
**Agents Spawned:**
- `linus-3` (Frontend Dev) — ~569s
- `rusty-3` (Backend Dev) — ~723s

**Outcomes:**
- Frontend env config: API base URL via Vite `VITE_API_URL` with `/api` fallback (Linus)
- Production static serving: Express `SERVE_WEBAPP=true` flag pattern with SPA fallback middleware (Rusty)
- Bug fix: `/me` endpoint properly guarded by auth middleware in router

**Decisions Merged:**
- `.squad/decisions/inbox/linus-api-url-env-config.md` → `.squad/decisions.md`
- `.squad/decisions/inbox/rusty-prod-static-serving.md` → `.squad/decisions.md`

**Next Round:** Round 2 — Azure provisioning (resource groups, App Service, database)
