// =====================================================================
// send-timesheet-report (now: send-payroll-report)
// =====================================================================
//
// Generates the weekly payroll report and emails it to every active
// recipient in `timesheet_email_recipients` (Mary Rose for actual
// payroll, plus anyone Troy adds for visibility).
//
// Behavior:
//   * Defaults to the most recently COMPLETED Sun-Sat week (ET).
//   * Pulls hourly_rate_cents and minimum_per_period_cents from
//     clock_employees so the email shows actual dollars, not just hours.
//   * Applies the per-employee weekly minimum guarantee:
//        payable = MAX(hours * rate, minimum_per_period_cents)
//   * Sends through the existing email queue.
//
// Inputs (all optional in the request body):
//   { start_date?: ISO, end_date?: ISO, dry_run?: boolean }
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ET_TZ = "America/New_York";

// ---------- helpers --------------------------------------------------

/** Return start/end of the most recently completed Sun-Sat week (ET).
 *  End is exclusive (next Sunday 00:00 ET). DST-safe via Intl. */
function lastCompletedWeek(): { start: Date; end: Date } {
  const now = new Date();

  // Get today's ET wall-clock date components.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const y = Number(lookup.year);
  const m = Number(lookup.month);
  const d = Number(lookup.day);
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[lookup.weekday as string] ?? 1;

  // Days back to the Sunday that STARTS the most recently completed week.
  // If today is Sunday, last week ran Sun..Sat ending yesterday → 7 days back.
  // If today is Mon..Sat, last completed week ran the previous Sun..Sat → dow + 7.
  const daysBackToSunday = dow === 0 ? 7 : dow + 7;

  // Convert ET wall-clock midnight to a real UTC instant.
  const etMidnightToUtc = (yy: number, mm: number, dd: number) => {
    const isoGuess = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T00:00:00.000Z`;
    const guess = new Date(isoGuess);
    const etHourStr = new Intl.DateTimeFormat("en-US", { timeZone: ET_TZ, hour: "2-digit", hour12: false }).format(guess);
    let etHour = Number(etHourStr.replace("24", "00"));
    let diff = etHour - 0;
    if (diff < -12) diff += 24;
    if (diff > 12) diff -= 24;
    return new Date(guess.getTime() + diff * 3600000);
  };

  const baseUtc = Date.UTC(y, m - 1, d);
  const sunUtcMidnight = baseUtc - daysBackToSunday * 86400000;
  const sun = new Date(sunUtcMidnight);
  const start = etMidnightToUtc(sun.getUTCFullYear(), sun.getUTCMonth() + 1, sun.getUTCDate());
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start, end };
}

function escapeHtml(unsafe: unknown): string {
  return String(unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const fmtHours = (h: number) => h.toFixed(2);

const fmtDateET = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-US", { timeZone: ET_TZ, weekday: "short", month: "short", day: "numeric" });

const fmtTimeET = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: ET_TZ, hour: "numeric", minute: "2-digit" });

// ---------- core types -----------------------------------------------

interface ShiftRow {
  date: string;
  clock_in: string;
  clock_out: string;
  hours: number;
  location: string;
}

interface EmployeePay {
  employee_id: string;
  name: string;
  email: string | null;
  total_hours: number;
  hourly_rate_cents: number;
  minimum_per_period_cents: number;
  earned_cents: number;
  payable_cents: number;
  topup_cents: number;
  shifts: ShiftRow[];
  open_shift: boolean;
  warnings: string[];
}

// ---------- main entrypoint ------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const startDateInput = body.start_date as string | undefined;
    const endDateInput = body.end_date as string | undefined;
    const dryRun = body.dry_run === true;

    let startDate: Date;
    let endDate: Date;
    if (startDateInput && endDateInput) {
      startDate = new Date(startDateInput);
      endDate = new Date(endDateInput);
    } else {
      const week = lastCompletedWeek();
      startDate = week.start;
      endDate = week.end;
    }

    const { data: employees, error: empErr } = await supabase
      .from("clock_employees")
      .select("id, full_name, display_name, email, hourly_rate_cents, minimum_per_period_cents, is_active");
    if (empErr) throw empErr;

    const empById = new Map<string, any>();
    for (const e of employees ?? []) empById.set(e.id, e);

    const { data: entries, error: entriesErr } = await supabase
      .from("time_entries")
      .select("id, clock_employee_id, clock_in, clock_out, clock_in_location")
      .gte("clock_in", startDate.toISOString())
      .lt("clock_in", endDate.toISOString())
      .order("clock_in", { ascending: true });
    if (entriesErr) throw entriesErr;

    const byEmployee = new Map<string, EmployeePay>();
    let totalsHours = 0;
    let totalsEarned = 0;
    let totalsPayable = 0;
    let totalsTopup = 0;

    for (const entry of entries ?? []) {
      const empId = entry.clock_employee_id;
      if (!empId) continue;
      const emp = empById.get(empId);
      const name = emp?.display_name?.trim() || emp?.full_name || "Unknown";

      let pay = byEmployee.get(empId);
      if (!pay) {
        pay = {
          employee_id: empId,
          name,
          email: emp?.email ?? null,
          total_hours: 0,
          hourly_rate_cents: emp?.hourly_rate_cents ?? 0,
          minimum_per_period_cents: emp?.minimum_per_period_cents ?? 0,
          earned_cents: 0,
          payable_cents: 0,
          topup_cents: 0,
          shifts: [],
          open_shift: false,
          warnings: [],
        };
        if ((emp?.hourly_rate_cents ?? 0) === 0) {
          pay.warnings.push("Hourly rate not set");
        }
        byEmployee.set(empId, pay);
      }

      const isOpen = !entry.clock_out;
      const hours = isOpen
        ? 0
        : (new Date(entry.clock_out!).getTime() - new Date(entry.clock_in).getTime()) / 3_600_000;

      pay.total_hours += hours;
      if (isOpen) pay.open_shift = true;

      pay.shifts.push({
        date: fmtDateET(entry.clock_in),
        clock_in: fmtTimeET(entry.clock_in),
        clock_out: isOpen ? "STILL CLOCKED IN" : fmtTimeET(entry.clock_out!),
        hours,
        location: entry.clock_in_location || "—",
      });
    }

    // Also include employees with a minimum guarantee but no shifts.
    for (const emp of employees ?? []) {
      if (byEmployee.has(emp.id)) continue;
      if ((emp.minimum_per_period_cents ?? 0) > 0 && emp.is_active) {
        byEmployee.set(emp.id, {
          employee_id: emp.id,
          name: emp.display_name?.trim() || emp.full_name,
          email: emp.email ?? null,
          total_hours: 0,
          hourly_rate_cents: emp.hourly_rate_cents ?? 0,
          minimum_per_period_cents: emp.minimum_per_period_cents ?? 0,
          earned_cents: 0,
          payable_cents: 0,
          topup_cents: 0,
          shifts: [],
          open_shift: false,
          warnings: (emp.hourly_rate_cents ?? 0) === 0 ? ["Hourly rate not set"] : [],
        });
      }
    }

    for (const pay of byEmployee.values()) {
      pay.earned_cents = Math.round(pay.total_hours * pay.hourly_rate_cents);
      pay.payable_cents = Math.max(pay.earned_cents, pay.minimum_per_period_cents);
      pay.topup_cents = pay.payable_cents - pay.earned_cents;

      totalsHours += pay.total_hours;
      totalsEarned += pay.earned_cents;
      totalsPayable += pay.payable_cents;
      totalsTopup += pay.topup_cents;
    }

    const employeesSorted = Array.from(byEmployee.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const { data: recipients, error: recErr } = await supabase
      .from("timesheet_email_recipients")
      .select("id, email, name")
      .eq("active", true);
    if (recErr) throw recErr;

    const startLabel = fmtDateET(startDate);
    const endInclusive = new Date(endDate.getTime() - 24 * 3600 * 1000);
    const endLabel = fmtDateET(endInclusive);

    // ---- Build HTML email
    const employeeBlocks = employeesSorted.map((p) => {
      const badges: string[] = [];
      if (p.topup_cents > 0) {
        badges.push(`<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-left:6px;">+${escapeHtml(fmtMoney(p.topup_cents))} guarantee top-up</span>`);
      }
      if (p.open_shift) {
        badges.push(`<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-left:6px;">Open shift in period</span>`);
      }
      for (const w of p.warnings) {
        badges.push(`<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-left:6px;">${escapeHtml(w)}</span>`);
      }
      const badgesHtml = badges.join("");

      const shiftRows = p.shifts.length
        ? p.shifts.map((s) => `
            <tr>
              <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${escapeHtml(s.date)}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${escapeHtml(s.clock_in)}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;${s.clock_out === "STILL CLOCKED IN" ? "color:#991b1b;font-weight:600;" : ""}">${escapeHtml(s.clock_out)}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${s.clock_out === "STILL CLOCKED IN" ? "—" : fmtHours(s.hours) + "h"}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;">${escapeHtml(s.location)}</td>
            </tr>
          `).join("")
        : `<tr><td colspan="5" style="padding:10px 12px;font-size:13px;color:#6b7280;font-style:italic;">No shifts — minimum guarantee applies.</td></tr>`;

      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:16px;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:16px;font-weight:700;color:#111827;">${escapeHtml(p.name)}${badgesHtml}</div>
              ${p.email ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(p.email)}</div>` : ""}
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Pay this week</div>
              <div style="font-size:22px;font-weight:700;color:#084694;">${escapeHtml(fmtMoney(p.payable_cents))}</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-top:14px;">
            <tr>
              <td style="padding:6px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:25%;">Hours</td>
              <td style="padding:6px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:25%;">Rate</td>
              <td style="padding:6px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:25%;">Earned</td>
              <td style="padding:6px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:25%;">Minimum</td>
            </tr>
            <tr>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${fmtHours(p.total_hours)}</td>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${p.hourly_rate_cents > 0 ? escapeHtml(fmtMoney(p.hourly_rate_cents)) + "/hr" : "—"}</td>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${escapeHtml(fmtMoney(p.earned_cents))}</td>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${p.minimum_per_period_cents > 0 ? escapeHtml(fmtMoney(p.minimum_per_period_cents)) : "—"}</td>
            </tr>
          </table>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;background:#fafbfc;border-radius:6px;overflow:hidden;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Date</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Clock In</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Clock Out</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Hours</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Location</th>
              </tr>
            </thead>
            <tbody>${shiftRows}</tbody>
          </table>
        </div>
      `;
    }).join("");

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;max-width:780px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#084694;color:white;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:22px;">Wetzel's of Augusta — Weekly Payroll</h1>
          <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${escapeHtml(startLabel)} → ${escapeHtml(endLabel)}</p>
        </div>
        <div style="background:#ffffff;padding:20px;border:1px solid #e5e7eb;border-top:none;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr>
              <td style="padding:8px 12px;background:#f3f4f6;border-radius:6px;text-align:center;">
                <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Employees</div>
                <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">${employeesSorted.length}</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:8px 12px;background:#f3f4f6;border-radius:6px;text-align:center;">
                <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Hours</div>
                <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">${fmtHours(totalsHours)}</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:8px 12px;background:#f3f4f6;border-radius:6px;text-align:center;">
                <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Earned</div>
                <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">${escapeHtml(fmtMoney(totalsEarned))}</div>
              </td>
              ${totalsTopup > 0 ? `
              <td style="width:8px;"></td>
              <td style="padding:8px 12px;background:#fef3c7;border-radius:6px;text-align:center;">
                <div style="font-size:11px;text-transform:uppercase;color:#92400e;letter-spacing:0.05em;">Top-ups</div>
                <div style="font-size:20px;font-weight:700;color:#92400e;margin-top:4px;">+${escapeHtml(fmtMoney(totalsTopup))}</div>
              </td>` : ""}
            </tr>
          </table>
          <div style="background:#084694;color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px;text-align:center;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.9;">Total to pay</div>
            <div style="font-size:32px;font-weight:700;margin-top:4px;">${escapeHtml(fmtMoney(totalsPayable))}</div>
          </div>
          ${employeesSorted.length === 0
            ? `<div style="padding:24px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:8px;">No time entries for this period.</div>`
            : employeeBlocks}
        </div>
        <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center;">
          Auto-generated by Wetzel's of Augusta · ${escapeHtml(new Date().toLocaleString("en-US", { timeZone: ET_TZ }))} ET<br/>
          Reply to this email if any line item looks off and Troy will reconcile.
        </p>
      </div>
    `;

    const subject = `Wetzel's Payroll: ${startLabel} – ${endLabel} · ${fmtMoney(totalsPayable)} (${employeesSorted.length} employee${employeesSorted.length === 1 ? "" : "s"})`;

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dry_run: true,
        period: { start: startDate.toISOString(), end: endDate.toISOString(), label: `${startLabel} – ${endLabel}` },
        totals: {
          employees: employeesSorted.length,
          hours: totalsHours,
          earned_cents: totalsEarned,
          topup_cents: totalsTopup,
          payable_cents: totalsPayable,
        },
        employees: employeesSorted,
        recipients: (recipients ?? []).map((r) => r.email),
        subject,
        html,
      }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No active email recipients configured." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];
    const isoDay = new Date().toISOString().slice(0, 10);

    for (const recipient of recipients) {
      const messageId = `payroll-report-${recipient.id}-${isoDay}`;

      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "payroll-report",
        recipient_email: recipient.email,
        status: "pending",
        metadata: {
          period_start: startLabel,
          period_end: endLabel,
          total_payable_cents: totalsPayable,
          employee_count: employeesSorted.length,
          topup_cents: totalsTopup,
        },
      });

      const { error: enqueueError } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: recipient.email,
          subject,
          html,
          sender_domain: "notify.wetzelsofaugusta.com",
          from: "noreply@wetzelsofaugusta.com",
          from_name: "Wetzel's of Augusta",
          message_id: messageId,
          template_name: "payroll-report",
          label: "payroll-report",
          purpose: "transactional",
        },
      });

      if (enqueueError) {
        errors.push(`${recipient.email}: ${enqueueError.message}`);
        await supabase.from("email_send_log").insert({
          message_id: messageId + "-err",
          template_name: "payroll-report",
          recipient_email: recipient.email,
          status: "failed",
          error_message: enqueueError.message,
        });
      } else {
        sentCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      period: { start: startLabel, end: endLabel },
      recipients_total: recipients.length,
      recipients_sent: sentCount,
      employees: employeesSorted.length,
      totals: {
        hours: totalsHours,
        earned_cents: totalsEarned,
        topup_cents: totalsTopup,
        payable_cents: totalsPayable,
      },
      summary: employeesSorted.map((e) => ({
        name: e.name,
        hours: e.total_hours,
        rate_cents: e.hourly_rate_cents,
        minimum_cents: e.minimum_per_period_cents,
        earned_cents: e.earned_cents,
        topup_cents: e.topup_cents,
        payable_cents: e.payable_cents,
        warnings: e.warnings,
      })),
      errors: errors.length > 0 ? errors : undefined,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-timesheet-report failed:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
