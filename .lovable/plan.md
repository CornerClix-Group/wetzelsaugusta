

## Plan: QSCE Compliance Overhaul + Enterprise Inventory System

This is a two-part build: (1) rebuild the compliance module to match the exact Wetzel's QSCE handbook scoring system, and (2) build a full inventory management system with par levels, transactions, and document-based intake.

---

### Part 1: QSCE Compliance Rebuild

The current compliance checklists are generic. The QSCE handbook defines a specific 250-point scoring system across 3 categories with 24 sections. Every item is scored full points or zero, and items marked ▲ are compliance issues that can trigger legal letters.

**Database Changes:**
- New table `qsce_visits` — stores each QSCE evaluation: truck_id, visit_date, evaluator_id, scores by category (cleanliness, operations, service), total score, percentage, status (exceeds/meets/below/OOC), compliance_issues array, action_plan text, franchisee_signature, evaluator_signature, comments
- New table `qsce_visit_items` — individual item scores: visit_id, section_id (e.g. "1a"), points_awarded, points_possible, is_compliance_item, notes, photos
- RLS: owner/manager only for all CRUD operations

**Checklist Templates Rewrite (`checklistTemplates.ts`):**
Replace current generic checklists with the exact QSCE structure:
- **Cleanliness** (71 pts): Sections 1-7 (Customer Facing, Service Area, Restrooms, Trash, Cabinets/Counters, Front of House Equipment, Back Room)
- **Operations** (109 pts): Sections 8-20 (Back Room Equipment, Hand Washing, Sanitation, Approved Products, Product Dating, Product Quality, Temperatures, Uniforms, Gift Cards/POS, Menu Boards, Building Safety, Crew Training, Crew Information)
- **Service** (70 pts): Sections 21-24 (Acknowledge, Connect, Serve, Sense of Urgency)

Each item includes: id, label, points, isComplianceItem (▲), expanded definition text

**New Components:**
- `src/components/compliance/QSCEVisitForm.tsx` — Full QSCE visit form matching the handbook format. Three-tab layout (Cleanliness | Operations | Service). Each item shows points, compliance flag, notes field, photo upload. Running score displayed. Signature pads for franchisee + evaluator. Action plan section.
- `src/components/compliance/QSCEScorecard.tsx` — Score summary card showing category breakdowns, percentage, status badge (Exceeds/Meets/Below/OOC), compliance issues list
- `src/components/compliance/QSCEHistory.tsx` — Visit history with filtering, score trends over time

**Compliance Page Rewrite (`Compliance.tsx`):**
- Restructure into tabs: QSCE Visits | Daily Checklists | Temperature Logs | History | Dashboard
- QSCE Visits tab: Start new visit, view past visits, score trends
- Keep existing daily checklists but as operational tools (not QSCE)

**Access Control:**
- Already owner/manager restricted via DashboardLayout (`employeeVisible: false`), but add RLS on new tables to enforce server-side

**Scoring Logic:**
```text
95-100% (237-250 pts) → Exceeds Expectations (green)
85-94%  (212-236 pts) → Meets Expectations (blue)  
75-84%  (186-211 pts) → Below Expectations (yellow)
≤74%    (≤185 pts)    → Out of Compliance (red)
```

---

### Part 2: Enterprise Inventory System

**Database Tables:**

1. **`inventory_categories`** — id, name, sort_order, created_at
   - Categories like: Dough & Baking, Toppings & Seasonings, Beverages, Packaging, Cleaning Supplies

2. **`inventory_items`** — id, name, category_id, unit (each/lb/oz/case/bag), par_level, current_quantity, cost_per_unit, supplier, sku, is_active, truck_id (nullable for shared items), low_stock_alert_sent, created_at, updated_at
   - RLS: owner/manager for all ops

3. **`inventory_transactions`** — id, item_id, transaction_type (received/used/wasted/adjusted/counted), quantity_change, quantity_after, performed_by, notes, document_id (links to uploaded invoice/receipt), truck_id, created_at
   - Full audit trail of every inventory movement

4. **`inventory_documents`** — id, document_name, document_url, document_type (invoice/receipt/delivery_ticket/count_sheet), uploaded_by, parsed_data (jsonb for extracted items), truck_id, created_at
   - Store uploaded PDFs/images of invoices for reference

- RLS on all tables: owner/manager for full CRUD, employees can view and create "used"/"wasted" transactions only

**New Pages & Components:**

1. **`src/pages/Inventory.tsx`** — Main inventory page with tabs:
   - **Dashboard** — At-a-glance: items below par (red), items near par (yellow), total inventory value, recent transactions
   - **Items** — Full item list with search, filter by category, sort by name/quantity/status. Inline editing of quantities. Color-coded status (green/yellow/red based on par level)
   - **Transactions** — Transaction log with filters (type, date range, item, employee). Shows who did what when.
   - **Documents** — Upload invoices/receipts, view history, link to transactions
   - **Settings** — Manage categories, bulk import items, set par levels

2. **`src/components/inventory/InventoryDashboard.tsx`** — KPI cards (total items, below par count, total value, recent activity), low-stock alerts list, quick-add transaction buttons

3. **`src/components/inventory/ItemsTable.tsx`** — Sortable/filterable table with: item name, category, current qty, par level, status indicator, unit, cost, last updated. Click to expand for transaction history. Bulk actions (adjust quantities).

4. **`src/components/inventory/AddEditItemDialog.tsx`** — Form for creating/editing items with all fields including par level, category, unit, cost, supplier

5. **`src/components/inventory/RecordTransactionDialog.tsx`** — Quick transaction entry: select item(s), type (received/used/wasted/adjusted), quantity, notes. For "received" transactions, option to link an uploaded document.

6. **`src/components/inventory/InventoryCountSheet.tsx`** — Physical count workflow: shows all items grouped by category, input fields for actual counts, auto-generates adjustment transactions for discrepancies

7. **`src/components/inventory/DocumentUpload.tsx`** — Upload invoices/receipts, preview, link items to create "received" transactions

**Routing:**
- Add `/dashboard/inventory` route
- Add "Inventory" to sidebar menu (owner/manager only, with Package icon)

**Key Features:**
- Par level comparison with color coding (red < 25% of par, yellow < 75%, green ≥ 75%)
- Transaction audit trail with employee attribution
- Document attachment for receiving
- Physical count workflow with auto-adjustment
- Category-based organization
- Low stock alerts on dashboard

---

### Files Changed/Created

**Database:** 5 new tables (qsce_visits, qsce_visit_items, inventory_categories, inventory_items, inventory_transactions, inventory_documents) with RLS policies

**New Files:**
- `src/components/compliance/qsceTemplates.ts`
- `src/components/compliance/QSCEVisitForm.tsx`
- `src/components/compliance/QSCEScorecard.tsx`
- `src/components/compliance/QSCEHistory.tsx`
- `src/pages/Inventory.tsx`
- `src/components/inventory/InventoryDashboard.tsx`
- `src/components/inventory/ItemsTable.tsx`
- `src/components/inventory/AddEditItemDialog.tsx`
- `src/components/inventory/RecordTransactionDialog.tsx`
- `src/components/inventory/InventoryCountSheet.tsx`
- `src/components/inventory/DocumentUpload.tsx`

**Modified Files:**
- `src/pages/Compliance.tsx` — QSCE visit integration
- `src/components/DashboardLayout.tsx` — Add Inventory to sidebar
- `src/App.tsx` — Add inventory route

