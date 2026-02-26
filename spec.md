# Global Pride International School ERP

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full School ERP web application for Academic Year 2026–2027
- Login page with hardcoded credentials (username: "global Pride international school", password: "gpis@syeds")
- Dashboard with summary cards and per-class student counts
- Students page: add/edit/delete students with fee structure, discount, and exam fee options
- Attendance page: class/section selection, present/absent toggle, SMS preview for absent students, attendance history
- Fee/Billing page: payment recording, receipt printing, payment history
- Fee Update page: unpaid fee tracking by class/section/category
- Fee Report page: date-based collection report with print/export
- Transport page: transport student management, monthly fee tracking
- Report Card page: dynamic editable proforma with subject/column management and print support
- localStorage-based persistence for all data (students, attendance, fees, transport, report cards)
- Green-themed responsive design with sidebar navigation
- All 13 classes (Nursery, PP1, PP2, Grade 1–10), 5 sections each (A–E)

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Set up authentication state with hardcoded credentials stored in app state
2. Create localStorage hooks/utilities for students, attendance, fees, transport, report cards
3. Build Login page with green theme and GPIS logo
4. Build Sidebar navigation with all menu items and icons
5. Build Dashboard page with summary cards and class breakdown table
6. Build Students page: add form with fee calculator, student list with search/filter/edit/delete
7. Build Attendance page: class/section picker, student list with present/absent toggles, save, history
8. Build Fee/Billing page: student selector, payment form, receipt print modal, payment history
9. Build Fee Update page: unpaid fee list by class/section/category
10. Build Fee Report page: date picker, collection table, daily total, print support
11. Build Transport page: add transport student form, list, monthly fee paid/unpaid tracking
12. Build Report Card page: dynamic table with editable headers, mark entry, print layout
13. Wire all localStorage persistence across pages
14. Add toast notifications for all actions

## UX Notes
- Green color palette: #16a34a (primary), #15803d (dark), #166534 (darker), #dcfce7 (light bg)
- Sidebar: collapsible on mobile, always visible on desktop
- GPIS logo: green circle with white "GPIS" text
- All forms use clean card layouts with proper validation
- Print layouts hide sidebar and show only the printable content
- Fee auto-calculation updates live as user types
- Responsive tables with horizontal scroll on mobile
- Toast notifications (success/error) for all CRUD and payment actions
