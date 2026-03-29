

## Plan: Dual HR Onboarding — Owner-Fill or Employee Self-Service

### Current State
- Adding a clock employee (like Kiara) creates a name-only record for the time clock terminal
- HR Onboarding forms (W-4, direct deposit, emergency contacts, documents, policies) exist but require a dashboard login
- Clock-only employees have no login, so they can't access the HR forms

### What Changes

**1. Add "Send HR Invite" button to employee cards on the Employees page**

On each active employee card, add a button that sends an email invite (using `inviteUserByEmail`) so the employee can log in and fill out their own HR paperwork. This would also promote them to have dashboard access (limited to HR Onboarding only based on their role).

**2. Add "Fill HR Info" button for owner/manager to do it on their behalf**

On each employee card, add a button that opens an inline dialog or navigates to a pre-filled HR form where the owner enters the employee's W-4, direct deposit, emergency contacts, etc. This writes directly to `employee_onboarding` using the owner's session but associated with the employee's `clock_employee_id` or `linked_user_id`.

**3. Extend `employee_onboarding` to support clock-employee-only records**

Currently `employee_onboarding.user_id` references an auth user. For employees without dashboard accounts, we need to also allow linking by `clock_employee_id`. Add a nullable `clock_employee_id` column so owners can store HR data for non-promoted employees.

**4. Update HR Onboarding page to support "on behalf of" mode**

When an owner navigates to HR Onboarding with a query param like `?for=<clock_employee_id>`, the forms save data for that employee instead of the current user.

### Database Migration

```sql
ALTER TABLE employee_onboarding 
ADD COLUMN clock_employee_id uuid REFERENCES clock_employees(id) ON DELETE SET NULL;

-- Allow owners to insert/update onboarding for any employee
CREATE POLICY "Owners can insert onboarding for employees"
ON employee_onboarding FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners can update onboarding for employees"  
ON employee_onboarding FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
```

### Files Summary

| File | Action |
|------|--------|
| `employee_onboarding` table | Add `clock_employee_id` column + owner insert/update RLS policies |
| `src/pages/Employees.tsx` | Add "Fill HR Info" and "Send HR Invite" buttons per employee |
| `src/pages/HROnboarding.tsx` | Support `?for=` query param for owner-on-behalf mode |
| `src/components/hr/W4Form.tsx` | Accept optional target employee ID prop |
| `src/components/hr/DirectDepositForm.tsx` | Accept optional target employee ID prop |
| `src/components/hr/EmergencyContactsForm.tsx` | Accept optional target employee ID prop |
| `src/components/hr/DocumentUploadSection.tsx` | Accept optional target employee ID prop |
| `src/components/hr/PolicyAcknowledgements.tsx` | Accept optional target employee ID prop |

### Flow

```text
Employee Card (Kiara)
  ├── "Fill HR Info"    → Owner navigates to /dashboard/hr-onboarding?for=<id>
  │                       and fills out W-4, direct deposit, etc. on her behalf
  └── "Send HR Invite"  → Sends email invite to Kiara
                           She clicks link, sets password, logs in
                           Sees only HR Onboarding to complete her own forms
```

