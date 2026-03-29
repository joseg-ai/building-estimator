# Building Estimator -- Web Application

PEMB (Pre-Engineered Metal Building) estimation tool built with React, TypeScript, Vite, and Tailwind CSS.

## Setup

```bash
npm install
npm run dev       # Development server at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

## Source Structure

```
src/
  types.ts               Data models (BuildingConfig, ComponentItem, CostBreakdown)
  context.tsx             React Context + useReducer state management
  catalog.ts              Component catalogs by category (~70 real items from the workbook)
  calculator.ts           Cost calculation engine (mirrors Excel Summary sheet formulas)
  priceList.ts            Centralized supplier price list (~75 items from Central States)
  storage.ts              localStorage auto-save / load

  components/
    Layout.tsx            Sidebar navigation + main content area
    BuildingDiagram.tsx   SVG top-view footprint diagram
    BuildingElevation.tsx SVG front elevation drawing (gable / single-slope)
    InsulationDiagram.tsx SVG insulation cross-section icon
    LeanToCard.tsx        Lean-to toggle card with dimension inputs
    ComponentTable.tsx    Reusable editable table for any component category

  pages/
    MenuPage.tsx          Dashboard with links to all sections
    DesignPage.tsx        Building dimensions, roof type, lean-tos, insulation, customer info
    PriceListPage.tsx     Centralized supplier pricing (search, edit, sync to project)
    FramingPage.tsx       Main frames, canopy, plates, frame openings
    ComponentsPage.tsx    Purlins, girts, sheeting, trim, doors, windows, hardware
    InsulationPage.tsx    Insulation materials with design status
    FastenersPage.tsx     Anchor bolts, bolts, cable bracing, fasteners
    StructuralPage.tsx    Stairs, landings, guard rails
    SummaryPage.tsx       Full cost/weight breakdown
    QuotationPage.tsx     Printable proposal with building drawings and YES/NO checklists
```

## Tech Stack

- **React 19** + TypeScript
- **Vite 8** (dev server + build)
- **Tailwind CSS 4** (styling)
- **React Router 7** (client-side routing)

## Cost Calculation

The calculator mirrors the Excel Summary sheet formula chain:

1. Direct Materials = Structural + Components + Insulation + Fasteners
2. Labor = Total Weight x $0.75/lb
3. Total = Materials + Labor
4. Add: Detailing ($5,000) + Engineering ($1,500)
5. Overhead = 2% of Total
6. Sub Total
7. Profit = 15% of Sub Total
8. Sales Commission = 4% of Sub Total
9. Grand Total = Sub Total + Profit + Commission

## Data Persistence

All project data auto-saves to localStorage on every change and restores on page reload.
Use the "Reset All" button on the Design page to clear everything.
