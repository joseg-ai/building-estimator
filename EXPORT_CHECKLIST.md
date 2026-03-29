# VBA Export Checklist

Use this checklist to manually export all VBA code from the `.xlsm` workbook into the `src/` folder structure.

---

## Prerequisites

- Open the `.xlsm` file in Excel (Windows).
- Open the VBA Editor: press **Alt + F11**.
- In the Project Explorer pane (View > Project Explorer if hidden), expand the VBA project tree.

---

## Step 1: Export Standard Modules (.bas)

These appear under the **Modules** folder in the Project Explorer.

1. Right-click each module (e.g., `Module1`, `modEstimator`).
2. Select **Export File...**
3. Save to: `src/Modules/`
4. File extension will be `.bas`.

Repeat for every module listed.

| Done | Module Name | Filename |
|------|-------------|----------|
| [ ]  |             |          |
| [ ]  |             |          |
| [ ]  |             |          |

---

## Step 2: Export Class Modules (.cls)

These appear under the **Class Modules** folder in the Project Explorer.

1. Right-click each class (e.g., `clsLine`, `clsEstimate`).
2. Select **Export File...**
3. Save to: `src/Classes/`
4. File extension will be `.cls`.

Repeat for every class listed.

| Done | Class Name | Filename |
|------|------------|----------|
| [ ]  |            |          |
| [ ]  |            |          |

---

## Step 3: Export UserForms (.frm + .frx)

These appear under the **Forms** folder in the Project Explorer.

1. Right-click each form (e.g., `frmInput`, `frmReport`).
2. Select **Export File...**
3. Save to: `src/Forms/`
4. Two files will be created per form:
   - `.frm` (code and layout definition, text-based)
   - `.frx` (binary resource file for images/controls)

Note: `.frx` files are binary. Add `*.frx` to `.gitattributes` or accept that diffs will not be readable for those files.

| Done | Form Name | Files Created |
|------|-----------|---------------|
| [ ]  |           |               |
| [ ]  |           |               |

---

## Step 4: Capture ThisWorkbook Code

The `ThisWorkbook` object holds workbook-level event code (e.g., `Workbook_Open`).

1. In the Project Explorer, double-click **ThisWorkbook** (under "Microsoft Excel Objects").
2. Select all code in the code window: **Ctrl + A**.
3. Copy: **Ctrl + C**.
4. Create a new file: `src/Sheets/ThisWorkbook.cls`
5. Paste the code into that file.
6. At the top of the file, add a header comment:

```vb
' SOURCE: ThisWorkbook (Workbook-level events)
' Exported manually from VBA Editor
```

---

## Step 5: Capture Sheet Code

Each worksheet may contain event code (e.g., `Worksheet_Change`, `Worksheet_Activate`).

1. In the Project Explorer, under "Microsoft Excel Objects", double-click each Sheet object (e.g., `Sheet1 (Summary)`, `Sheet2 (Data)`).
2. If the code window contains any code:
   a. Select all: **Ctrl + A**
   b. Copy: **Ctrl + C**
   c. Create a file in `src/Sheets/` named after the sheet, e.g., `Sheet1_Summary.cls`
   d. Paste the code.
   e. Add a header comment:

```vb
' SOURCE: Sheet1 (Summary)
' Exported manually from VBA Editor
```

3. If the code window is empty, skip that sheet.

| Done | Sheet Object         | Has Code? | Filename              |
|------|----------------------|-----------|-----------------------|
| [ ]  | Sheet1 (...)         |           |                       |
| [ ]  | Sheet2 (...)         |           |                       |
| [ ]  | Sheet3 (...)         |           |                       |

---

## Step 6: Post-Export Cleanup

- [ ] Verify every module/class/form from the Project Explorer has a matching file in `src/`.
- [ ] Open a few exported files in VS Code to confirm content looks correct.
- [ ] Add a `.gitignore` entry if needed (e.g., `*.frx` for binary form resources, or keep them tracked).
- [ ] Commit all files to Git with a clear message like: `feat: initial VBA export from workbook`.

---

## Tips

- **Do not rename files** during export. Keep the original VBA module names so re-import is straightforward.
- If a module has a `(Name)` property different from the filename shown in the Project Explorer, the export will use the `(Name)` property value.
- You can verify completeness by counting items in the Project Explorer vs. files in `src/`.
