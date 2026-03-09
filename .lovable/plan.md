

## Plan: Enable Manager/Owner PIN Management

### Problem
Managers and owners cannot set or reset PIN codes for employees. The Settings page only allows self-service PIN setting, the Employees page is read-only, and the database UPDATE policy on `profiles` restricts updates to the user's own row.

### Changes

**1. Database migration**
- Add an RLS policy on `profiles` allowing owners and managers to UPDATE any profile:
  ```sql
  CREATE POLICY "Owners and managers can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));
  ```

**2. Employees page (`src/pages/Employees.tsx`)**
- Add a "Set PIN" button on each employee card (visible to owners/managers only)
- On click, open a dialog with a 4-digit PIN input and Save button
- On save, call `supabase.from("profiles").update({ pin_code }).eq("id", employeeId)`
- Add a "Reset PIN" option that clears the PIN
- Show current user's role to gate the UI (fetch from `user_roles`)

**3. Settings page** — no changes needed; self-service PIN stays as-is.

### Technical notes
- The current `profiles` UPDATE RLS only allows `auth.uid() = id`. The new policy adds a second permissive path for managers/owners. However, since existing policies use `RESTRICTIVE` (Permissive: No), the new policy must also be restrictive — meaning we need to be careful. Actually, looking at the schema, all policies are `Permissive: No` which means they're RESTRICTIVE. Multiple restrictive policies are ANDed together, which would break things. We need to verify the actual policy type and may need to convert existing UPDATE policy or use a different approach (e.g., a security-definer function to update PINs).

Let me reconsider: since all RLS policies on `profiles` are restrictive, adding another restrictive UPDATE policy would AND them — meaning both conditions must be true, which defeats the purpose. The correct fix is either:
- Change existing policies to permissive, OR  
- Create a security-definer function `set_employee_pin(target_user_id, pin)` that bypasses RLS and checks role internally

**Revised approach — use a security-definer function:**

**1. Database migration**
```sql
CREATE OR REPLACE FUNCTION public.set_employee_pin(_target_user_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _pin IS NOT NULL AND (length(_pin) != 4 OR _pin !~ '^\d{4}$') THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;
  UPDATE public.profiles SET pin_code = _pin WHERE id = _target_user_id;
END;
$$;
```

**2. Employees page** — add Set/Reset PIN dialog, call `supabase.rpc('set_employee_pin', { _target_user_id, _pin })`.

