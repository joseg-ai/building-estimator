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
