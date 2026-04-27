import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ET_TZ = "America/New_York";
const fmtMoney = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtHours = (h: number) => h.toFixed(2);

// Get start (Sun 00:00 ET) and end (Sat 23:59:59.999 ET) of the most recently
// completed Sunday–Saturday week, returned as ISO UTC strings.
function lastCompletedWeekRangeET(now = new Date()): { start: string; end: string; startLabel: string; endLabel: string } {
  // Determine "today" in ET as Y/M/D
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
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayDow = weekdayMap[lookup.weekday as string] ?? 0;

  // Most recent Saturday (end of last completed week) is today minus (todayDow + 1) days,
  // unless today IS Sunday (todayDow=0) → last Saturday was yesterday (1 day back).
  const daysBackToLastSat = todayDow + 1;
  // Compute via UTC arithmetic on the ET date components (treating the date midnights as UTC for math, then convert to ET wall time below).
  const baseUtcMidnight = Date.UTC(y, m - 1, d);
  const lastSatUtcMidnight = baseUtcMidnight - daysBackToLastSat * 86400000;
  const lastSunUtcMidnight = lastSatUtcMidnight - 6 * 86400000;

  const sat = new Date(lastSatUtcMidnight);
  const sun = new Date(lastSunUtcMidnight);
  const sunY = sun.getUTCFullYear();
  const sunM = sun.getUTCMonth() + 1;
  const sunD = sun.getUTCDate();
  const satY = sat.getUTCFullYear();
  const satM = sat.getUTCMonth() + 1;
  const satD = sat.getUTCDate();

  // Convert "ET wall time midnight YYYY-MM-DD" to a real UTC instant.
  // Strategy: build an ISO string with a guess offset, compute the actual ET offset for that moment, adjust.
  const etMidnightToUtc = (yy: number, mm: number, dd: number, endOfDay = false) => {
    // Start with a UTC guess at the same wall clock; then read what hour ET sees and subtract the diff.
    const isoGuess = endOfDay
      ? `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T23:59:59.999Z`
      : `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T00:00:00.000Z`;
    const guess = new Date(isoGuess);
    const etHour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: ET_TZ, hour: "2-digit", hour12: false }).format(guess).replace("24", "00"),
    );
    // For midnight target, we want ET hour to be 0 (or 23 for endOfDay)
    const targetHour = endOfDay ? 23 : 0;
    let diff = etHour - targetHour;
    // Handle wrap: if etHour reads e.g. 20 when target is 0, ET is 4h behind UTC at midnight, so diff = 20.
    if (diff < -12) diff += 24;
    if (diff > 12) diff -= 24;
    return new Date(guess.getTime() + diff * 3600000);
  };

  const startUtc = etMidnightToUtc(sunY, sunM, sunD, false);
  const endUtc = etMidnightToUtc(satY, satM, satD, true);

  const dateLabel = (yy: number, mm: number, dd: number) =>
    new Date(Date.UTC(yy, mm - 1, dd)).toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
    startLabel: dateLabel(sunY, sunM, sunD),
    endLabel: dateLabel(satY, satM, satD),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({} as any));
    const dryRun: boolean = body?.dry_run === true;
    let startDate: string;
    let endDate: string;
    let startLabel: string;
    let endLabel: string;

    if (body?.start_date && body?.end_date) {
      startDate = body.start_date;
      endDate = body.end_date;
      startLabel = new Date(startDate).toLocaleDateString("en-US", { timeZone: ET_TZ, weekday: "short", month: "short", day: "numeric" });
      endLabel = new Date(endDate).toLocaleDateString("en-US", { timeZone: ET_TZ, weekday: "short", month: "short", day: "numeric" });
    } else {
      const range = lastCompletedWeekRangeET();
      startDate = range.start;
      endDate = range.end;
      startLabel = range.startLabel;
      endLabel = range.endLabel;
    }

    // Pull all employees (active + inactive — inactive may still have hours that week)
    const { data: employees, error: empErr } = await supabase
      .from("clock_employees")
      .select("id, full_name, display_name, email, hourly_rate_cents, minimum_per_period_cents, is_active");
    if (empErr) throw empErr;

    // Pull time entries that intersect the window (clock_in within window, OR clock_out within window, OR open shift started before end)
    const { data: entries, error: entErr } = await supabase
      .from("time_entries")
      .select("id, clock_employee_id, clock_in, clock_out, clock_in_location")
      .gte("clock_in", startDate)
      .lte("clock_in", endDate)
      .order("clock_in", { ascending: true });
    if (entErr) throw entErr;

    // Build per-employee summary
    type Shift = { date: string; clockIn: string; clockOut: string; hours: number; location: string; open: boolean };
    type EmpRow = {
      id: string;
      name: string;
      email: string | null;
      hourlyRateCents: number;
      minimumCents: number;
      hours: number;
      earnedCents: number;
      payableCents: number;
      topUpCents: number;
      hasOpenShift: boolean;
      shifts: Shift[];
    };

    const byEmp = new Map<string, EmpRow>();
    for (const emp of employees || []) {
      byEmp.set(emp.id, {
        id: emp.id,
        name: emp.display_name || emp.full_name,
        email: emp.email,
        hourlyRateCents: emp.hourly_rate_cents || 0,
        minimumCents: emp.minimum_per_period_cents || 0,
        hours: 0,
        earnedCents: 0,
        payableCents: 0,
        topUpCents: 0,
        hasOpenShift: false,
        shifts: [],
      });
    }

    for (const e of entries || []) {
      if (!e.clock_employee_id) continue;
      const row = byEmp.get(e.clock_employee_id);
      if (!row) continue;
      const open = !e.clock_out;
      const hours = open
        ? 0
        : (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
      row.hours += hours;
      if (open) row.hasOpenShift = true;
      row.shifts.push({
        date: new Date(e.clock_in).toLocaleDateString("en-US", { timeZone: ET_TZ }),
        clockIn: new Date(e.clock_in).toLocaleTimeString("en-US", { timeZone: ET_TZ, hour: "numeric", minute: "2-digit" }),
        clockOut: open ? "Still clocked in" : new Date(e.clock_out!).toLocaleTimeString("en-US", { timeZone: ET_TZ, hour: "numeric", minute: "2-digit" }),
        hours,
        location: e.clock_in_location || "—",
        open,
      });
    }

    // Compute pay
    let totalHours = 0;
    let totalEarnedCents = 0;
    let totalTopUpCents = 0;
    let totalPayableCents = 0;
    const rows: EmpRow[] = [];
    for (const row of byEmp.values()) {
      // Skip employees with NO activity AND no minimum guarantee (they don't belong on the report)
      if (row.shifts.length === 0 && row.minimumCents === 0) continue;
      row.earnedCents = Math.round(row.hours * row.hourlyRateCents);
      row.payableCents = Math.max(row.earnedCents, row.minimumCents);
      row.topUpCents = row.payableCents - row.earnedCents;
      totalHours += row.hours;
      totalEarnedCents += row.earnedCents;
      totalTopUpCents += row.topUpCents;
      totalPayableCents += row.payableCents;
      rows.push(row);
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));

    // Build employee cards HTML
    let cardsHtml = "";
    for (const r of rows) {
      const badges: string[] = [];
      if (r.hourlyRateCents === 0) badges.push(`<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">Hourly rate not set</span>`);
      if (r.hasOpenShift) badges.push(`<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">Open shift in period</span>`);
      if (r.topUpCents > 0) badges.push(`<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">+${fmtMoney(r.topUpCents)} guarantee top-up</span>`);
      const badgesHtml = badges.length ? `<div style="margin-top:6px;">${badges.join(" ")}</div>` : "";

      let shiftsHtml = "";
      if (r.shifts.length > 0) {
        const shiftRows = r.shifts
          .map(
            (s) => `
              <tr>
                <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${s.date}</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${s.clockIn}</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;${s.open ? "color:#991b1b;font-weight:600;" : ""}">${s.clockOut}</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${fmtHours(s.hours)}h</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;">${s.location}</td>
              </tr>`,
          )
          .join("");
        shiftsHtml = `
          <table style="width:100%;border-collapse:collapse;margin-top:12px;background:#fafbfc;border-radius:6px;overflow:hidden;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Date</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">In</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Out</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Hours</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Location</th>
              </tr>
            </thead>
            <tbody>${shiftRows}</tbody>
          </table>`;
      } else {
        shiftsHtml = `<p style="margin:12px 0 0;color:#6b7280;font-size:13px;font-style:italic;">No shifts this week — minimum guarantee applies.</p>`;
      }

      cardsHtml += `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:16px;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:16px;font-weight:700;color:#111827;">${r.name}</div>
              ${r.email ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${r.email}</div>` : ""}
              ${badgesHtml}
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Pay this week</div>
              <div style="font-size:22px;font-weight:700;color:#084694;">${fmtMoney(r.payableCents)}</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-top:14px;">
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:20%;">Hours</td>
              <td style="padding:6px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:20%;">Rate</td>
              <td style="padding:6px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:20%;">Earned</td>
              <td style="padding:6px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:20%;">Minimum</td>
              <td style="padding:6px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:20%;">Top-up</td>
            </tr>
            <tr>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${fmtHours(r.hours)}</td>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${r.hourlyRateCents > 0 ? `${fmtMoney(r.hourlyRateCents)}/hr` : "—"}</td>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${fmtMoney(r.earnedCents)}</td>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:#111827;">${r.minimumCents > 0 ? fmtMoney(r.minimumCents) : "—"}</td>
              <td style="padding:2px 0 0;font-size:14px;font-weight:600;color:${r.topUpCents > 0 ? "#92400e" : "#9ca3af"};">${r.topUpCents > 0 ? `+${fmtMoney(r.topUpCents)}` : "—"}</td>
            </tr>
          </table>
          ${shiftsHtml}
        </div>`;
    }

    if (rows.length === 0) {
      cardsHtml = `<div style="padding:24px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:8px;">No employees with shifts or minimum guarantees this period.</div>`;
    }

    const subject = `Wetzel's Payroll: ${startLabel} – ${endLabel} · ${fmtMoney(totalPayableCents)} (${rows.length} employees)`;

    const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;max-width:780px;margin:0 auto;background:#f9fafb;padding:20px;">
      <div style="background:#084694;color:white;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:22px;">Wetzel's of Augusta — Weekly Payroll</h1>
        <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${startLabel} → ${endLabel}</p>
      </div>
      <div style="background:#ffffff;padding:20px;border:1px solid #e5e7eb;border-top:none;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:8px 12px;background:#f3f4f6;border-radius:6px;text-align:center;width:25%;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Employees</div>
              <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">${rows.length}</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:8px 12px;background:#f3f4f6;border-radius:6px;text-align:center;width:25%;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Total hours</div>
              <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">${fmtHours(totalHours)}</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:8px 12px;background:#f3f4f6;border-radius:6px;text-align:center;width:25%;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Earned</div>
              <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">${fmtMoney(totalEarnedCents)}</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:8px 12px;background:#fef3c7;border-radius:6px;text-align:center;width:25%;">
              <div style="font-size:11px;text-transform:uppercase;color:#92400e;letter-spacing:0.05em;">Top-ups</div>
              <div style="font-size:20px;font-weight:700;color:#92400e;margin-top:4px;">${totalTopUpCents > 0 ? `+${fmtMoney(totalTopUpCents)}` : "—"}</div>
            </td>
          </tr>
        </table>
        <div style="background:#084694;color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px;text-align:center;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.9;">Total to pay</div>
          <div style="font-size:32px;font-weight:700;margin-top:4px;">${fmtMoney(totalPayableCents)}</div>
        </div>
        ${cardsHtml}
      </div>
      <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center;">
        Auto-generated by Wetzel's of Augusta · ${new Date().toLocaleString("en-US", { timeZone: ET_TZ })} ET
      </p>
    </div>`;

    // Build summary payload for dry-run + response
    const summary = {
      success: true,
      dry_run: dryRun,
      period: { start: startLabel, end: endLabel, start_iso: startDate, end_iso: endDate },
      totals: {
        employees: rows.length,
        hours: Number(totalHours.toFixed(2)),
        earned_cents: totalEarnedCents,
        topup_cents: totalTopUpCents,
        payable_cents: totalPayableCents,
        payable_formatted: fmtMoney(totalPayableCents),
      },
      employees: rows.map((r) => ({
        name: r.name,
        email: r.email,
        hours: Number(r.hours.toFixed(2)),
        hourly_rate_cents: r.hourlyRateCents,
        minimum_cents: r.minimumCents,
        earned_cents: r.earnedCents,
        topup_cents: r.topUpCents,
        payable_cents: r.payableCents,
        payable_formatted: fmtMoney(r.payableCents),
        has_open_shift: r.hasOpenShift,
        shift_count: r.shifts.length,
      })),
      subject,
    };

    if (dryRun) {
      return new Response(JSON.stringify(summary), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("timesheet_email_recipients")
      .select("*")
      .eq("active", true);
    if (recipientsError) throw recipientsError;

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ ...summary, success: false, message: "No active email recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let sentCount = 0;
    const errors: string[] = [];
    const sendStamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

    for (const recipient of recipients) {
      const messageId = `payroll-report-${recipient.id}-${sendStamp}`;

      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "payroll-report",
        recipient_email: recipient.email,
        status: "pending",
        metadata: { period_start: startLabel, period_end: endLabel, total_payable_cents: totalPayableCents },
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
          purpose: "transactional",
        },
      });

      if (enqueueError) {
        errors.push(`${recipient.email}: ${enqueueError.message}`);
        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: "payroll-report",
          recipient_email: recipient.email,
          status: "failed",
          error_message: enqueueError.message,
        });
      } else {
        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({
        ...summary,
        recipientsSent: sentCount,
        recipientsTotal: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
