# Orchestration Log: Danny Backlog Triage (2026-05-14)

**Date:** 2026-05-14  
**Event:** Danny (Lead) triaged Reuben's 17-item PEMB assessment backlog into GitHub issues #1–#17  
**Source:** `.squad/decisions/inbox/danny-backlog-triage-2026-05-14.md` (merged into `.squad/decisions.md`)

## Summary

**17 GitHub issues filed** from Reuben's prioritized domain assessment, plus 2 calculator bug flags (items #1–#2).

| Priority | Count | Issues |
|----------|-------|--------|
| **P0 — Critical** | 8 | #1 (bug), #2 (bug), #3, #4, #5, #6, #7, #8 |
| **P1 — High** | 4 | #9, #10, #11, #12 |
| **P2 — Nice-to-Have** | 5 | #13, #14, #15, #16, #17 |

## Owner Assignment

| Owner | Count | Issues |
|-------|-------|--------|
| **Livingston** | 9 | #1, #2, #3, #4, #5, #8, #10, #14, #15 |
| **Linus** | 5 | #7, #9, #11, #12, #13, #16 |
| **Rusty** | 1 | #6 |
| **Danny** | 1 | #17 |
| **Saul** | 0 | (supports test coverage across sprints) |

**Note:** Livingston is the bottleneck (9/17 issues). Saul should pair on test coverage for Livingston deliverables.

## Recommended Sprint Plan

### Sprint 1 — Fix the Math (P0 Bugs + Unblocking Schema)
| # | Title | Owner | Effort |
|---|-------|-------|--------|
| #1 | Fix labor calc base — restrict to structural weight only | Livingston | S |
| #2 | Fix frame opening cost method — dispatch on measure field | Livingston | S |
| #6 | Add quote number, revision, valid-until, status enum | Rusty | S |
| #7 | Add wind speed, exposure category, color selection to DesignPage | Linus | S |
| #8 | Wire color selection to panel SKU in price list lookup | Livingston | S |

### Sprint 2 — Parametric Engines (The Big Lift)
| # | Title | Owner | Effort |
|---|-------|-------|--------|
| #3 | Build parametric main framing BOM engine | Livingston | L |
| #4 | Build parametric component quantity calculator | Livingston | L |
| #5 | Build stair parametric calculator | Livingston + Linus | M |
| #9 | Add proposal legal language — validity, exclusions, payment terms | Linus | M |

### Sprint 3 — Polish & Professional Output
| # | Title | Owner | Effort |
|---|-------|-------|--------|
| #10 | Auto-calculate insulation quantities from building dimensions | Livingston | S |
| #11 | Display $/sqft and $/lb summary metrics | Linus | S |
| #12 | Show quote number and revision on printed proposal | Linus | S |
| #13 | Add sales tax field with rate and include/exclude toggle | Linus | S |
| #14 | Add freight calculator — distance x rate | Livingston | S |

### Backlog (Sprint 4+)
- #15 — Contingency/escalation line item
- #16 — Implement quote comparison page
- #17 — Server-side PDF generation for quotations

## Owner Deviations

| # | Reuben Suggested | Danny Assigned | Reason |
|---|---|---|---|
| #13 | Linus + Livingston | Linus (primary) | Livingston overloaded S1–S2; UI-heavy item |
| #14 | Linus + Livingston | Livingston (primary) | Calc logic is core; Linus assists UI |
| #17 | Danny + Linus | Danny (primary) | Architecture decision on PDF lib; Linus assists |

## Key Observations

- **Critical-path blockers:** Bugs #1–#2 must ship first. Without them, all cost numbers are wrong.
- **Reuben does NOT code.** Reuben reviews domain correctness on all calculator PRs; another agent implements.
- **Parametric engines** (#3–#5) are the highest-value features — they eliminate 40+ manual entries per building and make the app faster than Excel.

---

*Processed by Scribe (squad automation) — 2026-05-14*
