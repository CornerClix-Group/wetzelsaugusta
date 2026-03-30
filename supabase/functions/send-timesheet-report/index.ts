import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get date range (default: last 7 days)
    const { start_date, end_date } = await req.json().catch(() => ({}));
    const endDate = end_date || new Date().toISOString();
    const startDate =
      start_date ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch time entries with clock_employee names (works for all employees)
    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select("*, clock_employees!time_entries_clock_employee_id_fkey(full_name)")
      .gte("clock_in", startDate)
      .lte("clock_in", endDate)
      .order("clock_in", { ascending: true });

    if (entriesError) throw entriesError;

    // Fetch active recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("timesheet_email_recipients")
      .select("*")
      .eq("active", true);

    if (recipientsError) throw recipientsError;

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No active email recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build summary by clock_employee_id
    const employeeSummary: Record<string, { name: string; totalHours: number; entries: any[] }> = {};
    for (const entry of entries || []) {
      const empId = entry.clock_employee_id || entry.employee_id || "unknown";
      const name = entry.clock_employees?.full_name || "Unknown";
      if (!employeeSummary[empId]) {
        employeeSummary[empId] = { name, totalHours: 0, entries: [] };
      }
      const hours = entry.clock_out
        ? (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000
        : 0;
      employeeSummary[empId].totalHours += hours;
      employeeSummary[empId].entries.push({
        date: new Date(entry.clock_in).toLocaleDateString("en-US", { timeZone: "America/New_York" }),
        clockIn: new Date(entry.clock_in).toLocaleTimeString("en-US", { timeZone: "America/New_York" }),
        clockOut: entry.clock_out
          ? new Date(entry.clock_out).toLocaleTimeString("en-US", { timeZone: "America/New_York" })
          : "Still clocked in",
        hours: hours.toFixed(2),
        location: entry.clock_in_location || "N/A",
      });
    }

    // Build HTML email
    const startFormatted = new Date(startDate).toLocaleDateString("en-US", { timeZone: "America/New_York" });
    const endFormatted = new Date(endDate).toLocaleDateString("en-US", { timeZone: "America/New_York" });

    let employeeRows = "";
    for (const [, emp] of Object.entries(employeeSummary)) {
      employeeRows += `
        <tr style="background:#f9fafb;">
          <td colspan="5" style="padding:12px 16px;font-weight:bold;font-size:15px;border-bottom:2px solid #e5e7eb;">
            ${emp.name} — ${emp.totalHours.toFixed(2)} total hours
          </td>
        </tr>`;
      for (const e of emp.entries) {
        employeeRows += `
        <tr>
          <td style="padding:8px 16px;border-bottom:1px solid #f3f4f6;">${e.date}</td>
          <td style="padding:8px 16px;border-bottom:1px solid #f3f4f6;">${e.clockIn}</td>
          <td style="padding:8px 16px;border-bottom:1px solid #f3f4f6;">${e.clockOut}</td>
          <td style="padding:8px 16px;border-bottom:1px solid #f3f4f6;">${e.hours}h</td>
          <td style="padding:8px 16px;border-bottom:1px solid #f3f4f6;">${e.location}</td>
        </tr>`;
      }
    }

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
      <div style="background:#084694;color:white;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:22px;">Wetzels of Augusta Timesheet Report</h1>
        <p style="margin:8px 0 0;opacity:0.8;">${startFormatted} — ${endFormatted}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:10px 16px;text-align:left;">Date</th>
              <th style="padding:10px 16px;text-align:left;">Clock In</th>
              <th style="padding:10px 16px;text-align:left;">Clock Out</th>
              <th style="padding:10px 16px;text-align:left;">Hours</th>
              <th style="padding:10px 16px;text-align:left;">Location</th>
            </tr>
          </thead>
          <tbody>
            ${employeeRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#6b7280;">No time entries for this period</td></tr>'}
          </tbody>
        </table>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center;">
        Auto-generated by Wetzels of Augusta • ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}
      </p>
    </div>`;

    const subject = `Timesheet Report: ${startFormatted} – ${endFormatted}`;

    // Enqueue email for each active recipient
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const messageId = `timesheet-report-${recipient.id}-${new Date().toISOString().slice(0, 10)}`;

      // Log as pending
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "timesheet-report",
        recipient_email: recipient.email,
        status: "pending",
        metadata: { period_start: startFormatted, period_end: endFormatted },
      });

      // Enqueue to transactional_emails queue
      const { error: enqueueError } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: recipient.email,
          subject,
          html,
          sender_domain: "notify.wetzelsofaugusta.com",
          from: "noreply@wetzelsofaugusta.com",
          from_name: "Wetzels of Augusta",
          message_id: messageId,
          template_name: "timesheet-report",
          purpose: "transactional",
        },
      });

      if (enqueueError) {
        errors.push(`${recipient.email}: ${enqueueError.message}`);
        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: "timesheet-report",
          recipient_email: recipient.email,
          status: "failed",
          error_message: enqueueError.message,
        });
      } else {
        sentCount++;
      }
    }

    const report = {
      success: true,
      period: { start: startFormatted, end: endFormatted },
      recipientsSent: sentCount,
      recipientsTotal: recipients.length,
      totalEmployees: Object.keys(employeeSummary).length,
      totalEntries: entries?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      summary: Object.values(employeeSummary).map((e) => ({
        name: e.name,
        totalHours: e.totalHours.toFixed(2),
        shifts: e.entries.length,
      })),
    };

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
