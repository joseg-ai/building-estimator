# Building Estimator

Pre-Engineered Metal Building (PEMB) estimation tool. Migrated from an Excel `.xlsm` workbook to a React web application.

## Project Structure

```
building-estimator/
  webapp/                  React + TypeScript + Vite web application
    src/
      components/          Reusable UI components
      pages/               Page-level components (one per route)
      types.ts             TypeScript interfaces and data models
      context.tsx           React Context state management
      catalog.ts           Component catalogs (framing, sheeting, trim, etc.)
      calculator.ts        Cost calculation engine
      priceList.ts         Centralized supplier price list
      storage.ts           localStorage persistence
  src/                     Exported VBA source from the original workbook
    Modules/               Standard VBA modules (.bas)
    Classes/               Class modules (.cls)
    Forms/                 UserForms (.frm/.frx)
    Sheets/                Sheet and ThisWorkbook code (.vba)
  extracted_data/          Raw data extracted from Excel sheets (reference)
```

## Web Application

The webapp replaces the Excel workbook with a browser-based estimator featuring:

- **Design** -- building dimensions, roof type, lean-tos, insulation, customer info
- **Price List** -- centralized supplier pricing (Central States), editable, syncs to project
- **Main Framing** -- frames, columns, rafters, canopies, plates, frame openings
- **Components** -- purlins, girts, sheeting, roof/wall trim, doors, windows, hardware
- **Insulation** -- R10 3" coverage for roof, side wall, end wall
- **Fasteners & Bolts** -- anchor bolts, machine bolts, cable bracing, fasteners
- **Stairs & Structural** -- stringers, treads, guard rails, landings
- **Summary** -- full cost and weight breakdown (materials, labor, overhead, profit)
- **Quotation** -- printable proposal with building elevation drawing, insulation diagram, YES/NO checklists, and itemized pricing

### Quick Start

```bash
cd webapp
npm install
npm run dev
```

Opens at http://localhost:5173/

### Key Features

- All data auto-saves to localStorage
- Editable unit prices throughout
- Print/Save PDF from the Quotation page
- SVG building diagrams (top view + front elevation)
- Cost formula: Direct Materials + Labor + Overhead + Detailing + Engineering -> SubTotal -> Profit (15%) + Commission (4%) -> Grand Total

## VBA Source (Legacy)

The `src/` folder contains VBA code exported from the original workbook using `modExportVbaSource.bas`. This is preserved for reference.

### VBA Modules

| File | Description |
|------|-------------|
| modExportVbaSource.bas | VBA export utility (exports all code to src/) |
| Module1.bas | Password removal utilities (dev tool) |
| Module3.bas | Shape z-order management |
| Module4.bas | Sheet visibility control |

### Sheet Code

| File | Description |
|------|-------------|
| Sheet25.vba | Menu navigation (9 command buttons) |
| Line_leantoback_wide.vba | Design sheet -- lean-to toggles, insulation visuals, reset |
| Sheet2-6, 10, 12, 26.vba | Navigation buttons (return to menu) |

## Original Workbook

The `.xlsm` file contains 17 sheets: Take off, MAE, Beams specs, Beams, Central Prices, Central States, M, Menu, Design, Summary, Quotation, Main Framing, Components, Fasteners and Bolts, Insulation, Stairs, Structural.
