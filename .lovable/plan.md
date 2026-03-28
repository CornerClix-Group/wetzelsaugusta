

## Plan: Switch to `inviteUserByEmail` + Add Resend Invite

### What Changes

1. **Update `invite-business-manager` edge function** to use `admin.inviteUserByEmail()` instead of `createUser` + `generateLink`. This sends a real invite email automatically via the built-in auth system — no separate email setup needed. The invitee clicks the magic link, sets a password, and is in.

2. **Add a new `resend-invite` edge function** that calls `admin.inviteUserByEmail()` again for an existing user, re-sending the invite email.

3. **Add "Resend Invite" button** to Business Manager cards in the UI so you can re-trigger the email if someone missed it.

### Edge Function: `invite-business-manager` (updated)

- Replace `createUser` + `generateLink` with `inviteUserByEmail(email, { data: { full_name } })`
- This sends a real email with a magic link
- Still assigns `business_manager` role after user creation
- The invite triggers the `handle_new_user` trigger which creates the profile automatically

### Edge Function: `resend-invite` (new)

- Owner-only
- Accepts `{ user_id }` 
- Looks up the user's email via `admin.getUserById()`
- Calls `admin.inviteUserByEmail()` again to resend
- Returns success/error

### Frontend: `Employees.tsx`

- Add a "Resend Invite" button on each Business Manager card (next to "Remove")
- Calls `resend-invite` edge function
- Shows toast on success/error

### Files Summary

| File | Action |
|------|--------|
| `supabase/functions/invite-business-manager/index.ts` | Switch to `inviteUserByEmail` |
| `supabase/functions/resend-invite/index.ts` | New — resends invite email |
| `src/pages/Employees.tsx` | Add "Resend Invite" button on BM cards |

