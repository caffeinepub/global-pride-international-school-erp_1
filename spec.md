# Global Pride International School ERP

## Current State
Full-stack school ERP with: Login, Dashboard, Students (with DOB/Aadhar/Admission No), Attendance (with WhatsApp absent notification), Fee Billing (with receipt numbers), Fee Update, Fee Report (daily + all-time totals), Transport (students + monthly billing with receipt), Report Card.

Backend stores: students, payments, transport students, transport monthly payments, attendance records, student extras.

## Requested Changes (Diff)

### Add
- **Transport Billing: Bill No (Receipt No) field** -- Auto-generate a unique bill number (like `TRANS-2026-XXXXX`) for each transport payment. This is already partially done in frontend but needs to be a sequential/unique number. The receipt should show the Bill No prominently.
- **Fee Report: Cash total and UPI total separately** -- In addition to the existing "Daily Total", show a "Cash Total" card and "UPI Total" card (and Bank Transfer if any) for the selected day. These breakdowns should appear in the summary cards area and in the print header.
- **WhatsApp absent messages via WhatsApp Web** -- Change the "Send via WhatsApp" links to use `https://web.whatsapp.com/send?phone=...&text=...` instead of `https://wa.me/...` so messages open in WhatsApp Web (browser-based login), not the app.
- **Search by name, grade/class, and section on every page** -- Add a unified search/filter bar (name search + class dropdown + section dropdown) to all pages that list students: Students page (already has it), Fee Billing page (add class/section filter alongside the existing name search), Fee Update page (already has class/section; add name search), Attendance page (already has class/section; add name search filter on the loaded list), Transport page (add name search on the student list), Report Card page (add name search + class/section filter to the student selector dropdown).
- **Auto-fill payment type and amount in Fee Billing** -- When a student is selected in Fee Billing, automatically set the Fee Category to the student's `feePaymentCategory` and set the Amount field to the student's installment amount (calculated from `finalFee` and `feePaymentCategory` using `getInstallmentAmount`). The user can still change these values manually.

### Modify
- **FeeReportPage**: Add `cashTotal` and `upiTotal` (and `bankTransferTotal`) computed from `reportRows`, display as separate summary cards alongside the existing daily total card. Update print header to include the breakdown.
- **TransportPage (Billing section)**: Ensure the bill/receipt number is shown as a prominent "Bill No." field at the top of the receipt block.
- **AttendancePage**: Change WhatsApp links from `wa.me` to `web.whatsapp.com/send?phone=...&text=...`.
- **FeeBillingPage**: On student selection, auto-populate Fee Category from `student.feePaymentCategory` and Amount from `getInstallmentAmount(student.finalFee, student.feePaymentCategory)`. Also add class/section filter dropdowns to the student search.
- **ReportCardPage**: Add name search input + class/section dropdowns to filter the student list before selection.

### Remove
- Nothing removed.

## Implementation Plan
1. **FeeReportPage.tsx**: Compute `cashTotal`, `upiTotal`, `bankTransferTotal` from `reportRows` (filter by `paymentMode`). Add 2-3 new summary cards for Cash/UPI/Bank Transfer totals. Update print header line.
2. **TransportPage.tsx**: Ensure receipt displays "Bill No." as a labeled field prominently (it already generates the number; just make the label clearer in the receipt block).
3. **AttendancePage.tsx**: Change all `https://wa.me/` to `https://web.whatsapp.com/send?phone=` in the WhatsApp URL construction.
4. **FeeBillingPage.tsx**: 
   - On `handleSelectStudent`, auto-set `selectedCategory` to `student.feePaymentCategory` and `amount` to the string of `getInstallmentAmount(student.finalFee, student.feePaymentCategory)`.
   - Add `filterClass` and `filterSection` state, and add class/section filter dropdowns to the student search area.
5. **FeeUpdatePage.tsx**: Add a name search input to filter the unpaid student list after it is loaded.
6. **ReportCardPage.tsx**: Add `rcSearch`, `rcFilterClass`, `rcFilterSection` state; filter the student dropdown options by those values.
7. **TransportPage.tsx (student list)**: Add name search input to filter the transport students list table.
8. **AttendancePage.tsx**: Add a name search input to filter the loaded attendance records list.
