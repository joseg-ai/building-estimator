# Project Context

- **Owner:** Jose Guajardo
- **Project:** Building Estimator — calculation engine and catalog for PEMB cost estimation. Source of truth for all pricing math.
- **Stack:** TypeScript modules in webapp/src/: calculator.ts (cost engine), catalog.ts (components), priceList.ts (supplier prices, currently Central States), types.ts (domain models). Reference data extracted from the original `.xlsm` lives in extracted_data/. Original VBA in src/Modules/.
- **Cost formula:** Direct Materials + Labor + Overhead + Detailing + Engineering → SubTotal → Profit (15%) + Commission (4%) → Grand Total.
- **Created:** 2026-05-10

## Team Updates

📌 **2026-05-10:** Project surveyed by Danny. Gaps identified in customers, vendors, and price persistence. Phase 1 (persist materials/prices to server) recommended as highest priority. Awaiting user selection.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
