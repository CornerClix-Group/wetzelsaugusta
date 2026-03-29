

## Analysis & Plan: Email Invitations, Role Badges, and Scheduling Notifications

### Issues Found

**1. Role badge only shows "employee"**
In `Employees.tsx` line 390-392, the badge displays `emp.role` from the `clock_employees` table. The `role` column defaults to `'employee'` and should update to `manager`/`shift_lead` on promotion via `create-employee-account`. However, the badge just renders the raw DB value with no formatting. It should display human-readable labels: "Owner", "Manager", "Shift Lead" instead of `manager`, `shift_lead`. Additionally, owners/franchise owners who aren't in `clock_employees` won't appear here at all (they log in via `/auth`), so this is correct — but promoted employees should show their updated role.

**2. HR employee invite is broken**
The "Send HR Invite" button (line 727) calls `create-employee-account` with `role: "employee"` and `send_invite: true` + `email`. But the edge function (`create-employee-account/index.ts`) does NOT handle `email` or `send_invite` parameters — it generates a random hidden email (`clock-{id}@internal.wetzels.local`). The invite email is never actually sent.

**3. Business manager invitation emails**
The `invite-business-manager` function uses `inviteUserByEmail` which sends a real email via the built-in auth system. This should work, but the invite link points to the default Supabase confirmation URL — the user needs to land on `/auth` to set their password. The `resend-invite` function was fixed to use `generateLink` but `generateLink` with type `magiclink` doesn't actually send an email — it just returns a link. So resend doesn't actually deliver an email.

**4. Timesheet report doesn't send emails**
`send-timesheet-report` builds HTML but has a comment on line 123: "In production, integrate with an email service." It returns the report data as JSON but never sends an email.

**5. Schedule notifications**
The Schedule page is a placeholder. No notification/confirmation framework exists.

---

### Plan

#### Step 1: Fix role badge display
- In `Employees.tsx`, replace the raw `emp.role` badge with a formatted label map:
  - `employee` → "Employee"
  - `manager` → "Manager"
  - `shift_lead` → "Shift Lead"
  - `owner` → "Owner"
- Apply distinct badge colors per role (e.g., Manager = blue, Shift Lead = amber)

#### Step 2: Fix HR employee invite (Send HR Invite button)
- Update `create-employee-account` edge function to accept optional `email` and `send_invite` parameters
- When `send_invite: true` and `email` is provided:
  - Create the auth account using the provided email instead of the hidden email
  - Use `inviteUserByEmail` to send a real invite email
  - Link the clock employee to the new auth user
  - Assign an `employee` role (no dashboard access, just HR onboarding access)
- When no email/send_invite, keep existing hidden-account behavior for PIN-based promotion

#### Step 3: Fix resend-invite to actually send an email
- Replace `generateLink` (which only returns a URL) with `inviteUserByEmail` wrapped in try/catch
- If user already confirmed, use `generateLink` with type `magiclink` and then use the built-in email system to send it

#### Step 4: Make timesheet report actually send emails
- Update `send-timesheet-report` to use Lovable's built-in transactional email system to deliver the HTML report to all active recipients

#### Step 5: Scaffold scheduling notification framework
- Create a `schedule_notifications` database table to store notification preferences and pending notifications
- Create a `send-schedule-notification` edge function skeleton that will handle:
  - Shift assignment notifications
  - Schedule change alerts
  - PTO request confirmations
- Wire the Schedule page to reference this infrastructure (placeholder UI noting notifications are ready to connect)

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Employees.tsx` | Format role badges with labels and colors |
| `supabase/functions/create-employee-account/index.ts` | Handle `email` + `send_invite` for HR invites |
| `supabase/functions/resend-invite/index.ts` | Actually deliver the email |
| `supabase/functions/send-timesheet-report/index.ts` | Send email via transactional email system |
| New: `supabase/functions/send-schedule-notification/index.ts` | Notification framework |
| Migration SQL | `schedule_notifications` table |

