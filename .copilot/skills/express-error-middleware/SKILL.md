---
name: "express-error-middleware"
description: "Standard global error-handling middleware for this Express API. Always returns JSON { error: { code, message } } instead of HTML 500."
domain: "backend, express, error-handling"
confidence: "high"
owner: "rusty"
license: MIT
---

# Express Global Error Middleware

This project uses Express 5 (`express@^5`). Every unhandled synchronous throw in a route or `next(err)` call must be caught by a global 4-arg error handler and returned as JSON — never as the default HTML 500 page.

---

## The Middleware (copy verbatim into `server/index.js`)

Place this **after all `app.use(route)` calls and after static serving**, but **before** `app.listen`:

```js
// Global error-handling middleware — must be last, after all routes.
// Catches any unhandled synchronous throws and next(err) calls.
// Returns JSON { error: { code, message } } instead of the default HTML 500 page.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = (process.env.NODE_ENV === 'production' && status === 500)
    ? 'An unexpected error occurred'
    : (err.message || 'Internal Server Error');
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: { code, message } });
});
```

---

## Rules

1. **4-argument signature is required.** Express identifies error handlers by their arity. The `_next` argument must be present even if unused.
2. **Must be last.** Any route registered after this middleware bypasses it.
3. **Mask in production.** 500-level `message` is replaced with a generic string to avoid leaking internals; 4xx messages pass through (they are safe, user-facing validation text).
4. **Always logs 5xx.** `console.error('[error]', err)` logs the full stack to stdout, which Azure App Service captures in Log Stream.

---

## Error Envelope Convention

All routes in this project return errors as:

```json
{ "error": { "code": "SOME_CODE", "message": "Human-readable message" } }
```

Common codes used across routes:

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION` | 400 | Missing/invalid request field |
| `INVALID_CUSTOMER` | 400 | customerId not found or foreign user |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `NOT_FOUND` | 404 | Resource not found (scoped to user) |
| `IN_USE` | 409 | Can't delete: referenced by other records |
| `INTERNAL_ERROR` | 500 | Unhandled exception (caught by this middleware) |
| `SQLITE_ERROR` | 500 | SQLite threw (also caught by this middleware) |

---

## Why This Matters

Without this middleware, any unhandled throw (e.g., `SqliteError: no such table`) returns Express's default HTML page. The webapp `fetch()` call receives HTML instead of JSON, fails to parse it, and either shows a blank error or a generic "Internal Server Error" toast with no useful code for the UI to handle.
