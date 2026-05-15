# Decision: PDF Tool Choice for Issue #17 — pdfkit

**Date:** 2026-05-15
**Author:** Rusty (Backend)
**Scope:** Server-side PDF generation endpoint (`GET /api/quotes/:id/pdf`)
**Issue:** #17

---

## Candidates Evaluated

| Library | Size | Rendering | Fidelity | Verdict |
|---|---|---|---|---|
| **puppeteer** | ~170 MB (Chromium download) | Headless browser — renders React page directly | Pixel-perfect match to UI | ❌ Too heavy |
| **pdfkit** | ~3 MB | Programmatic — draws text, lines, rects | Structural match to UI sections | ✅ **Chosen** |
| @react-pdf/renderer | ~6 MB | JSX → PDF | Requires separate JSX layout maintained in sync | ❌ Duplication risk |

## Decision: pdfkit

**Rationale:**

1. **Dependency weight.** The server is a lean Express + SQLite deployment targeting Azure B1 (~1.75 GB RAM). Puppeteer's embedded Chromium (~170 MB compressed, ~350 MB extracted) consumes a disproportionate share of available disk and memory. A startup headless Chrome for every cold boot adds 2–4 seconds of latency.

2. **No browser needed.** The server has all quote data in SQLite; it does not need to re-render the React page. The PDF content is driven by `config_json` fields (same data the `QuotationPage` reads), so programmatic composition is fully equivalent in information content.

3. **Precedent.** The existing stack uses zero runtime dependencies with binary blobs (bcryptjs uses pure JS). Staying lightweight is consistent.

4. **All required sections deliverable.** pdfkit is capable of rendering all 13 PEMB anatomy sections from SKILL.md: company header, client/job block, quote/revision number, building description, additional structures checklist, components checklist, accessories, building engineering, itemized pricing table, observations, colors, T&C legal, and signature block.

## Sample Output Description

The generated PDF (`Q-{id}-r{rev}.pdf`) is a US Letter document containing:

- **Header:** "BUILDING ESTIMATOR" title bar in brand blue (#1e3a5f) with horizontal rule
- **Proposal Information:** Two-column grid — customer name, job name, date, location, quote number, revision, valid-until date
- **Building Specifications:** Bold description line (`50W × 100L × 16H, 4:12 Roof Pitch, Gable Slope`)
- **Additional Structures:** YES/NO checklist rows (green "YES" / gray "NO" tags)
- **Components:** 10-row checklist (roof panel, side/end wall systems, liner, trim, bolts, insulation)
- **Accessories:** Door counts, roll-up doors, frame openings, windows — each with YES/NO
- **Building Engineering:** Wind speed, exposure category, live/snow loads, erection flag
- **Itemized Pricing:** Blue header table → Building Price / Erection / Foundation / Permits line items → blue TOTAL bar with grand total
- **Observations & Colors:** Observations note, sales tax status, Roof/Walls/Trim colors
- **Terms & Conditions:** 7-paragraph legal block (validity, acceptance, payment terms 50/40/10, exclusions, scope, delivery lead time, warranty)
- **Signature Block:** Two signature lines (Authorized Signature, Customer Acceptance)

File starts with PDF magic bytes `%PDF-` (verified by test).

## curl Smoke Command

```bash
# Replace TOKEN and QUOTE_ID with real values
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/quotes/$QUOTE_ID/pdf \
  --output Q-test.pdf && head -c 5 Q-test.pdf
# Expected output: %PDF-
```
