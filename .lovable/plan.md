

## Plan: Employee Editing, Display Names, and Granular Permissions

This covers three major gaps: employees can't be edited after creation, there's no display name for privacy on the terminal, and there's no way to toggle individual module access per employee.

### 1. Add `display_name` column to `clock_employees`

**Database migration:**
```sql
ALTER TABLE clock_employees ADD COLUMN display_name text;
```

- `full_name` = legal name (for payroll/HR)
- `display_name` = what shows on the terminal dropdown (e.g. first name only, nickname)
- Terminal (Index.tsx) will show `display_name ?? full_name` in the employee list

### 2. Add "Edit Employee" dialog to Employees page

On each employee card, add an **"Edit"** button that opens a dialog with:
- **Full Name** (legal, for HR/payroll)
- **Display Name** (shown on terminal)

This writes directly to `clock_employees` via an update query.

### 3. Update Add Employee dialog

Change the "Add Employee" dialog to collect both **Full Name** and **Display Name** fields at creation time.

### 4. Update terminal to show display names

In `Index.tsx`, change the employee list to show `display_name || full_name` instead of just `full_name`.

### 5. Granular permissions system (toggle-based)

**New database table:**
```sql
CREATE TABLE employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clock_employee_id uuid REFERENCES clock_employees(id) ON DELETE CASCADE NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clock_employee_id, permission)
);
```

Available permissions: `compliance`, `inventory`, `trucks`, `employees`, `schedule`, `hr_onboarding`

**Owner UI on each employee card:** An "Edit Permissions" button opens a dialog with toggle switches for each module. Only owners can grant/revoke.

**DashboardLayout.tsx:** Instead of the current role-based menu filtering, also check the employee's individual permissions from `employee_permissions` when they are a promoted employee (manager/shift_lead). Owners always see everything.

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `display_name` column + `employee_permissions` table + RLS |
| `src/pages/Employees.tsx` | Add Edit dialog (name fields), Edit Permissions dialog (toggles), update Add dialog |
| `src/pages/Index.tsx` | Show `display_name` on terminal |
| `src/components/DashboardLayout.tsx` | Check individual permissions for menu visibility |

### Permission toggles UI concept

```text
┌─ Edit Permissions: Kiara ──────────────┐
│                                         │
│  Compliance          [  toggle  ]       │
│  Inventory           [  toggle  ]       │
│  Trucks              [  toggle  ]       │
│  HR & Onboarding     [  toggle  ]       │
│  Employees           [  toggle  ]       │
│  Schedule            [  toggle  ]       │
│                                         │
│             [Cancel]  [Save]            │
└─────────────────────────────────────────┘
```

