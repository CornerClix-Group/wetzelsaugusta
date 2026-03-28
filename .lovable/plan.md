

## Plan: Add Business Manager Role

### What It Is

A new `business_manager` role for people like accountants or payroll administrators who need access to HR documents and time clock data to run payroll, but don't need operational tools (Compliance, Inventory, Trucks, etc.).

### How It Works

- Business managers log in via email/password at `/auth` (like owners)
- They see only: **Dashboard**, **Time Clock**, **HR & Onboarding**, and **Settings** in the sidebar
- They have read access to time entries, employee documents, onboarding data, and profiles
- They cannot manage employees, inventory, compliance, or trucks

### Database Changes

1. **Add `business_manager` to the `user_role` enum**:
   ```sql
   ALTER TYPE public.user_role ADD VALUE 'business_manager';
   ```

2. **Add RLS policies** granting `business_manager` SELECT access to:
   - `time_entries` (view all, for payroll)
   - `employee_onboarding` (view all)
   - `employee_documents` (view all)
   - `profiles` (view all)
   - `clock_employees` (view all)
   - `timesheet_email_recipients` (view + manage)

### Frontend Changes

**`DashboardLayout.tsx`**:
- Update menu item visibility: add a `businessManagerVisible` flag to Time Clock and HR & Onboarding
- Update `isElevated` check to include `business_manager`
- Filter menu items based on whether the user has the `business_manager` role (show only their permitted pages)

**`Employees.tsx`** (Promote dialog):
- Add `business_manager` as a promotion option in the role select dropdown

**`create-employee-account` edge function**:
- No changes needed — it already accepts any role string and inserts into `user_roles`

### Navigation Access Matrix

| Page | Owner | Manager | Shift Lead | Business Manager | Employee |
|------|-------|---------|------------|-----------------|----------|
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Time Clock | Yes | Yes | Yes | Yes | Yes |
| HR & Onboarding | Yes | Yes | No | Yes | No |
| Compliance | Yes | Yes | No | No | No |
| Inventory | Yes | Yes | No | No | No |
| Trucks | Yes | Yes | No | No | No |
| Employees | Yes | Yes | No | No | No |
| Schedule | Yes | Yes | Yes | No | Yes |
| Settings | Yes | Yes | Yes | Yes | Yes |

### Files Summary

| File | Action |
|------|--------|
| DB migration | Add `business_manager` to enum, add SELECT RLS policies |
| `src/components/DashboardLayout.tsx` | Role-based menu filtering for business_manager |
| `src/pages/Employees.tsx` | Add `business_manager` to promote dialog options |

