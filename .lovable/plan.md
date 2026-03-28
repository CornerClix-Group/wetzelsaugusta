

## Plan: Fix Deactivation, Add Delete, Add Business Manager Invite

### 1. Fix Deactivation to Revoke Access

When deactivating a promoted employee:
- Call `demote-employee` edge function first (deletes auth account, clears `linked_user_id` and resets role)
- Then set `is_active = false`
- This ensures deactivated managers/shift leads lose dashboard access immediately

### 2. Add Delete Employee

**`Employees.tsx`**:
- Add a "Delete" button (with confirmation dialog) on employee cards
- Deleting a promoted employee calls `demote-employee` first to clean up the auth account
- Then deletes the `clock_employees` row
- Time entries with that `clock_employee_id` remain for historical payroll records (orphaned but intact)

**Database**: Add a CASCADE or leave `clock_employee_id` as a soft reference (no FK). Since there's no FK currently, a simple delete of the `clock_employees` row works — time entries keep the old `clock_employee_id` UUID for audit purposes.

### 3. Add Business Manager via Email Invite

Business managers aren't clock employees — they need a direct email/password account.

**New UI in `Employees.tsx`**:
- Add an "Invite Business Manager" button (separate from "Add Employee")
- Dialog asks for: Name, Email
- Calls a new edge function `invite-business-manager`

**New edge function `invite-business-manager`**:
- Owner-only (verified via JWT + `user_roles`)
- Creates an auth user with `admin.createUser({ email, password: randomPassword, email_confirm: true })`
- Inserts `business_manager` role in `user_roles`
- Sends a password reset email via `admin.generateLink({ type: 'recovery', email })` so the business manager can set their own password
- The business manager then logs in at `/auth` with email/password

**Alternative (simpler)**: Use `admin.inviteUserByEmail(email)` which sends a magic link. The user clicks it, sets a password, and is in. The edge function just needs to also insert the role.

### 4. Display Business Managers in Employees Page

- Show a separate "Business Managers" section below the employee cards
- Query `user_roles` + `profiles` where role = `business_manager`
- Show name, email, and a "Remove" button that deletes the auth account and role

### Files Summary

| File | Action |
|------|--------|
| `src/pages/Employees.tsx` | Add delete button + confirmation, fix deactivate to demote first, add "Invite Business Manager" button + dialog, show business managers section |
| `supabase/functions/invite-business-manager/index.ts` | New — creates auth account, assigns role, sends recovery email |
| `supabase/functions/demote-employee/index.ts` | Minor — ensure it handles already-demoted employees gracefully |

### Flow Summary

```text
Add Employee (clock-only)     →  Name only  →  Appears on terminal
Promote Employee              →  Manager/Shift Lead  →  PIN unlocks dashboard
Invite Business Manager       →  Name + Email  →  Email/password login at /auth
Deactivate Employee           →  Demotes first if promoted  →  Hidden from terminal
Delete Employee               →  Demotes + removes record  →  Time history preserved
Remove Business Manager       →  Deletes auth account + role
```

