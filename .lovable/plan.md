

## Plan: PIN-as-Universal-Gateway Architecture

### What Changes

PIN becomes the single authentication mechanism for everyone except owners. When an employee enters their PIN on the terminal:
- **Clock-only employees**: See clock in/out (current behavior)
- **Promoted employees (manager/shift_lead)**: PIN unlocks the full dashboard — no email/password needed
- **Owners**: Continue using email/password at `/auth` for full access

### How It Works

**Terminal flow after valid PIN:**
1. Employee taps name → enters PIN → system checks their role in `clock_employees`
2. If role is `employee` (or no role): clock in/out only
3. If role is `manager` or `shift_lead`: show two options — "Clock In/Out" or "Open Dashboard"
4. Choosing "Open Dashboard" creates an anonymous-like session scoped to that employee, navigating to `/dashboard`

**The challenge**: Supabase RLS requires an authenticated session. For promoted PIN users to access dashboard tables, we need to bridge PIN auth to a real session.

**Solution — Edge Function `pin-login`:**
- Accepts `{ clock_employee_id, pin }`
- If the employee has a `linked_user_id`, signs them in using `admin.generateLink()` or a service-role approach that returns a session
- Actually simpler: when promoting, auto-create an auth account with a random password. The PIN login edge function uses `admin.signInWithPassword()` internally, returning the session tokens to the client. The employee never sees or knows the password.

### Database Changes

**New table: `clock_employees`**
- `id` uuid PK
- `full_name` text
- `pin_code` text (nullable, null = first-time setup)
- `role` text (default 'employee') — values: employee, manager, shift_lead
- `linked_user_id` uuid (nullable, set when promoted)
- `is_active` boolean (default true)
- `created_at`, `updated_at`

**Modify `time_entries`**: Add nullable `clock_employee_id` uuid column

### Edge Functions

1. **`set-clock-pin`** — Public. First-time PIN setup for clock employees
2. **`clock-action`** — Public. Validates PIN, handles clock in/out, writes time entries via service role
3. **`pin-login`** — Public. For promoted employees: validates PIN, returns a real auth session using the linked auth account (signs in via service role). Client stores session and navigates to dashboard.
4. **`create-employee-account`** — Authenticated (owner only). Called when promoting: creates auth user with random password, links to clock_employee, assigns role in `user_roles`

### Frontend Changes

**`Index.tsx`**: 
- Step 1: Name selection list from `clock_employees`
- Step 2: PIN entry (or first-time PIN setup)
- Step 3: If role > employee, show "Clock In/Out" and "Open Dashboard" buttons. If basic employee, go straight to clock action.
- "Open Dashboard" calls `pin-login` edge function, stores returned session, navigates to `/dashboard`

**`Employees.tsx`**:
- "Add Employee" — just a name, creates `clock_employees` row
- "Promote" button — sets role (manager/shift_lead), calls `create-employee-account` to create linked auth account with random password
- "Demote" — resets role back to employee

**`Auth.tsx`**: Login only, no signup. Used exclusively by owners.

**`DashboardLayout.tsx`**: Works as-is — the PIN-login session is a real auth session, so RLS and role checks work normally. Add tablet sidebar optimization.

### Files Summary

| File | Action |
|------|--------|
| DB migration | `clock_employees` table, `clock_employee_id` on `time_entries` |
| `supabase/functions/clock-action/index.ts` | New — PIN clock in/out |
| `supabase/functions/set-clock-pin/index.ts` | New — first-time PIN setup |
| `supabase/functions/pin-login/index.ts` | New — PIN → real auth session for promoted staff |
| `supabase/functions/create-employee-account/index.ts` | New — owner promotes employee, creates hidden auth account |
| `src/pages/Index.tsx` | Name list → PIN → clock or dashboard |
| `src/pages/Employees.tsx` | Add/promote/demote employees |
| `src/pages/Auth.tsx` | Remove signup, owner-only login |
| `src/components/DashboardLayout.tsx` | Tablet optimization |
| `src/index.css` | Touch-target minimums for 10.1" tablet |

