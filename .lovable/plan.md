

## Plan: Automated Weekly Timesheet Email Reports

### What You Have Today

- **Recipients table** (`timesheet_email_recipients`): You can already add/remove email recipients in Settings. This is where the report gets sent.
- **Time entries** (`time_entries`): Every clock-in/clock-out is stored here, linked to employees via `clock_employee_id`.
- **Report generator** (`send-timesheet-report` Edge Function): Builds an HTML report from time entries, but has two problems:
  1. It only joins on `profiles` (misses clock-only employees who have no profile)
  2. It generates the report but does **not actually send emails** — it just returns the data

### What Needs to Happen

```text
┌──────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  pg_cron     │────▶│ send-timesheet-report │────▶│ Email queue     │
│ (weekly Mon) │     │ Edge Function         │     │ (Lovable Email) │
└──────────────┘     └──────────────────────┘     └────────┬────────┘
                              │                            │
                     Queries: │                   Sends to each
                     • time_entries                recipient in
                     • clock_employees             timesheet_email_
                     • timesheet_email_recipients  recipients
```

### Steps

**1. Fix the report query to include all employees**

The current `send-timesheet-report` function joins `time_entries` → `profiles` via `employee_id`. Since `employee_id` is now nullable (clock-only employees), these entries are missed. The fix: join on `clock_employees` via `clock_employee_id` instead, so every clock entry is included regardless of whether the employee has a linked account.

**2. Wire up actual email sending**

The project already has a verified email domain (`notify.wetzelsofaugusta.com`) and the email queue infrastructure (pgmq, `process-email-queue` cron). Update `send-timesheet-report` to:
- Render the HTML report (already done)
- For each active recipient in `timesheet_email_recipients`, enqueue the email via `enqueue_email` RPC (the same queue that auth/transactional emails use)
- Log each send to `email_send_log`

**3. Schedule automatic weekly delivery**

Set up a `pg_cron` job that calls `send-timesheet-report` every Monday at 6:00 AM ET. This uses the same pattern as the existing `process-email-queue` cron — an HTTP POST to the Edge Function URL with the service role key.

**4. Add a "Send Now" button in Settings**

Add a manual trigger button next to the recipients list so you can send a report on-demand (for testing or ad-hoc needs). This calls `supabase.functions.invoke('send-timesheet-report')` from the UI.

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/send-timesheet-report/index.ts` | Fix query to use `clock_employees`, add email sending via `enqueue_email`, log to `email_send_log` |
| `src/pages/SettingsPage.tsx` | Add "Send Report Now" button |
| Database (pg_cron via insert) | Schedule weekly Monday 6 AM ET cron job |

### How It All Connects

- **Data source**: `time_entries` table (populated every time someone clocks in/out via the time clock on the homepage)
- **Employee names**: Pulled from `clock_employees.full_name` (works for all employees, linked or not)
- **Recipients**: Pulled from `timesheet_email_recipients` where `active = true` (managed in Settings)
- **Delivery**: Through your verified `notify.wetzelsofaugusta.com` domain via the existing email queue
- **Schedule**: Automatic every Monday morning, plus manual "Send Now" option

