# Azure Deployment Decision Record — vmbc-estimator

**Date:** 2026-05-12  
**Author:** Rusty (DevOps/Backend agent)  
**Status:** Live ✅

---

## Summary

The `vmbc-estimator` app (React + Express + SQLite) is deployed and running at:

**https://vmbc-estimator.azurewebsites.net**

---

## Azure Resources

| Resource | Name | Details |
|---|---|---|
| Resource Group | `rg-vmbc-estimator` | centralus |
| App Service Plan | `asp-vmbc-estimator` | B1 Linux |
| Web App | `vmbc-estimator` | NODE:22-lts |
| Key Vault | `kv-vmbc-est-JjGT` | JWT_SECRET stored |
| Log Analytics | `law-vmbc-estimator` | centralus |
| App Insights | `ai-vmbc-estimator` | connected |
| Subscription | `40907613-5278-48a4-ab10-c9944be31c8b` | |

Managed identity enabled on the web app (principalId: `fa524286-f4c2-4627-9286-cb250f082828`).

---

## App Settings (Azure Portal)

| Setting | Value |
|---|---|
| `NODE_ENV` | production |
| `SERVE_WEBAPP` | true |
| `DB_PATH` | /home/site/data/estimator.db |
| `JWT_SECRET` | `@Microsoft.KeyVault(VaultName=kv-vmbc-est-JjGT;SecretName=JWT-SECRET)` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | (AI connection string) |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | false |
| `SEED_ADMIN` | true |

Startup command: `node server/index.js`

---

## Default Admin Credentials

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change this password immediately after first login.**

---

## CI/CD Pipeline

File: `.github/workflows/deploy.yml`

- **Trigger:** push to `main` or manual `workflow_dispatch`
- **Auth:** OIDC federated identity (no secrets rotation needed)
- **Build:** Node 22, ubuntu-22.04 runner (glibc 2.35 ≤ Azure glibc 2.36)
- **Deploy:** `az webapp deploy --type zip --async`
- **Verify:** polls `/api/health` until 200

### GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `AZURE_CLIENT_ID` | SP app ID: `d57ec5d3-7d85-40d4-a67b-b02ba3b2ea67` |
| `AZURE_TENANT_ID` | `3d374b94-78d6-435f-b7a6-b8337c1282b6` |
| `AZURE_SUBSCRIPTION_ID` | `40907613-5278-48a4-ab10-c9944be31c8b` |

---

## Key Technical Decisions

1. **ubuntu-22.04 runner** — Azure container uses glibc 2.36; ubuntu-22.04 uses glibc 2.35 so native module binaries are compatible. ubuntu-24.04 would produce glibc 2.38 binaries that crash on Azure.

2. **Node 22 on Azure** — Configured `NODE:22-lts` on the web app (not Node 18 which was the SCM/Kudu default).

3. **uuid v9** — uuid v13+ is ESM-only; `require('uuid')` fails. Using v9.0.1 (CommonJS compatible).

4. **DB directory creation in db.js** — `mkdirSync` must run in `db.js` before `new Database()`, not in `index.js` where route imports would trigger db.js first.

5. **OIDC authentication** — Azure MCAP policies redact basic-auth Kudu credentials in publish profiles. OIDC federated identity avoids this.

---

## Logs

```bash
# Stream live logs
az webapp log tail --name vmbc-estimator --resource-group rg-vmbc-estimator

# Download logs
az webapp log download --name vmbc-estimator --resource-group rg-vmbc-estimator
```

---

## Re-deploy

```bash
git push origin main
# or
gh workflow run deploy.yml --repo joseg-ai/building-estimator
```
