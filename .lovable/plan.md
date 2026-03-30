

## Fix: Clock-in for employees without linked accounts

### Problem
`time_entries.employee_id` references `profiles.id`. Employees without a `linked_user_id` have no profile row, so the fallback `clock_employee_id` violates the FK constraint.

### Solution
Make `employee_id` nullable on `time_entries` so clock-only employees can still clock in using just `clock_employee_id`.

### Steps

**1. Database migration** -- Make `employee_id` nullable
```sql
ALTER TABLE public.time_entries ALTER COLUMN employee_id DROP NOT NULL;
```

**2. Update `clock-action/index.ts`** -- Use `linked_user_id` or `null`
```ts
// Line 92: replace fallback
const profileId = employee.linked_user_id || null;
```
Insert with `employee_id: profileId` (which may be null for clock-only employees).

**3. Redeploy** the `clock-action` edge function.

### Files to modify
| File | Change |
|------|--------|
| Migration SQL | `ALTER COLUMN employee_id DROP NOT NULL` |
| `supabase/functions/clock-action/index.ts` | Set `employee_id` to `null` when no linked account |

