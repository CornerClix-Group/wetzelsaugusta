

## Redesign Home Screen: Simple Clock Terminal + Inventory Button

### What Changes

The home screen currently has a name-selection list flow. You want it simplified to a standard clock-in terminal (big PIN pad, no name list), plus an "Inventory" button that PIN-gates access to the inventory page for authorized employees only. PIN setup moves entirely to the dashboard (owner/manager sets PINs for employees).

### Steps

**1. Redesign the Index page layout**

Remove the employee name selection step entirely. The new home screen shows:
- Large clock display (time + date) at the top
- A big numeric PIN pad in the center
- 4 PIN dots above the pad
- A "Clock In / Out" submit button below the pad
- An "Inventory" button in the corner or below the clock area
- Subtle "Log in" link stays in the footer

The flow: employee types their 4-digit PIN and hits "Clock In / Out". The backend looks up which employee has that PIN (no name selection needed).

**2. Update `clock-action` edge function to accept PIN-only lookup**

Currently requires `clock_employee_id` + `pin`. Change it to also support just `pin` (no employee ID). The function queries `clock_employees` where `pin_code = pin` and `is_active = true`. If exactly one match, proceed. If zero or multiple matches, return an error.

**3. Add Inventory PIN flow**

When user taps "Inventory":
- Show the same PIN pad with prompt "Enter Manager PIN"
- On submit, call `pin-login` edge function to validate the PIN belongs to someone with inventory permission
- Check `employee_permissions` table for `permission = 'inventory'` and `granted = true`, OR check if the employee's role is `owner` or `manager`
- If authorized, authenticate via `pin-login` and navigate to `/dashboard/inventory`
- If not authorized, show "Access denied" toast

**4. Remove the "set-pin" step from the home screen**

PIN creation/reset is handled entirely from the dashboard employee management UI (already exists via `set-clock-pin` edge function). Remove the `set-pin` step and related code from Index.tsx.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Full redesign: remove name list, show PIN pad + "Clock In/Out" button + "Inventory" button. Remove set-pin flow. |
| `supabase/functions/clock-action/index.ts` | Support PIN-only lookup (find employee by PIN instead of requiring employee ID) |
| `supabase/functions/pin-login/index.ts` | Minor: support PIN-only lookup for inventory access |

### How the New Flow Works

```text
HOME SCREEN
┌─────────────────────┐
│   10:30 AM          │
│   Monday, Mar 30    │
│                     │
│     ● ● ○ ○        │
│                     │
│   [1] [2] [3]      │
│   [4] [5] [6]      │
│   [7] [8] [9]      │
│   [C] [0] [⌫]      │
│                     │
│  [ Clock In / Out ] │
│                     │
│  [ 📦 Inventory ]   │
│                     │
│         Log in      │
└─────────────────────┘

Clock In/Out: PIN → clock-action (lookup by PIN) → success/fail screen
Inventory:    PIN → pin-login (check inventory permission) → /dashboard/inventory
```

