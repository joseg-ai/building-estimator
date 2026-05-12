# Decision: Azure Production API URL Strategy

**Date:** 2026-05-12  
**Author:** Rusty  
**Trigger:** Azure-deployed app showing "Failed to fetch" on login

## Root Cause

`webapp/src/api.ts` had `API_BASE` hardcoded as `'http://localhost:3001/api'`.

The Azure App Service serves the React SPA over HTTPS (`https://vmbc-estimator.azurewebsites.net`). When the browser tried to call `http://localhost:3001/api/auth/login` (HTTP) from an HTTPS page, the browser blocked it as **mixed content** — producing `TypeError: Failed to fetch`.

Secondary issue: `deploy.yml` set `VITE_API_URL: ''` (empty string). Because `api.ts` uses `??` (nullish coalescing, not `||`), an empty string is NOT treated as absent — `'' ?? '/api'` evaluates to `''`, stripping the `/api` prefix from all routes.

## Decision

### API Base URL Convention

| Context | VITE_API_URL | Effective API_BASE |
|---|---|---|
| Local dev (Vite proxy) | unset/commented | `/api` (fallback) |
| Production Azure CI | `/api` | `/api` |
| Remote staging | `https://staging.example.com/api` | explicit URL |

**Rule:** `VITE_API_URL` must NEVER be set to a `http://localhost` URL in committed code or CI. Use the Vite proxy for local dev.

**Rule:** In `deploy.yml`, set `VITE_API_URL: '/api'` explicitly — not `''`. The `??` operator only triggers on `null`/`undefined`, not on empty string.

### Files Changed

| File | Change |
|---|---|
| `webapp/src/api.ts` | `API_BASE = import.meta.env.VITE_API_URL ?? '/api'` (was hardcoded localhost) |
| `.github/workflows/deploy.yml` | `VITE_API_URL: '/api'` (was `''`) |
| `webapp/vite.config.ts` | Added `/api` proxy → `http://localhost:3001` for dev |
| `webapp/.env.development` | Commented out `VITE_API_URL` (proxy handles it) |

### Commit

`649f788 fix(prod): use VITE_API_URL=/api in deploy + Vite proxy for dev`

## Azure Topology (for reference)

Single App Service `vmbc-estimator` at `https://vmbc-estimator.azurewebsites.net` serves BOTH:
- React SPA (static files via `express.static` when `SERVE_WEBAPP=true`)
- Express API at `/api/*`

**Same origin → no CORS needed for production.** CORS config in `server/index.js` only matters if an external client calls the API.

## Lesson

Working-tree-only code changes DO NOT reach Azure. The dev fix session made the right code change but forgot to `git commit && git push`. Always commit + push to trigger the deploy pipeline.
