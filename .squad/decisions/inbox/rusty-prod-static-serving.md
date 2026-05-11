# Decision: Production Static Serving Pattern

**Date:** 2026-05-11T17:23:37.686-05:00  
**By:** Rusty  
**Status:** Shipped

## Convention

Express serves both the React build and the API from one process in production. Static serving is gated behind `SERVE_WEBAPP=true` so the dev workflow (Vite on 5173) is unaffected.

```js
if (process.env.SERVE_WEBAPP === 'true') {
  const webappDist = path.join(__dirname, '..', 'webapp', 'dist');
  app.use(express.static(webappDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(webappDist, 'index.html'));
  });
}
```

## Rules

- **Dev:** `SERVE_WEBAPP` is absent or `false`. Vite runs on 5173 and proxies `/api/*` to Express on 3001.
- **Production (Azure App Service):** Set `SERVE_WEBAPP=true` in App Service Application Settings. Azure injects `PORT` (typically 8080 on Linux). Express serves both the React SPA and the API on the same port/origin — no CORS needed.
- **SPA fallback:** Uses `app.use()` (not `app.get('*', ...)`) because Express 5 / path-to-regexp v8 no longer accepts bare `*` wildcard routes. The fallback skips `/api/` paths to let any downstream error handlers surface real 404s.
- **DB path:** Controlled by `process.env.DB_PATH`. Azure App Service should set `DB_PATH=/home/site/data/estimator.db` (persistent storage mount).
- **Port:** `process.env.PORT || 3001`. Azure injects PORT automatically.
- **Startup:** `npm start` → `node index.js`. Azure Node.js App Service runs `npm start` by default.

## Why `app.use()` not `app.get('*', ...)`

Express 5 uses path-to-regexp v8, which requires all wildcards to be named (e.g., `*path`). The bare `*` pattern throws `PathError: Missing parameter name`. Using `app.use()` as a fallback middleware avoids this entirely and is semantically correct.

## Files Changed

- `server/index.js` — added `path` import, all route mounts (catalog, pricelist, customers, vendors), `require.main` guard, `module.exports`, and the `SERVE_WEBAPP` static serving block.
- `server/routes-auth.js` — moved `authMiddleware` inline to `router.get('/me', ...)` so it's guarded properly inside the router, rather than relying on a dead `app.use('/api/auth/me', ...)` handler that was shadowed.
- `server/package.json` — confirmed `"start": "node index.js"`, added `"test"` script and `supertest` devDependency.
