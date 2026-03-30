import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clock_employee_id, pin } = await req.json();

    if (!clock_employee_id || !pin) {
      return new Response(JSON.stringify({ error: "Missing clock_employee_id or pin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "Invalid PIN format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate PIN
    const { data: employee, error: fetchError } = await supabase
      .from("clock_employees")
      .select("id, full_name, pin_code, role, linked_user_id")
      .eq("id", clock_employee_id)
      .eq("is_active", true)
      .single();

    if (fetchError || !employee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (employee.pin_code !== pin) {
      return new Response(JSON.stringify({ error: "Invalid PIN" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for active time entry
    const { data: activeEntry } = await supabase
      .from("time_entries")
      .select("*")
      .eq("clock_employee_id", clock_employee_id)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeEntry) {
      // Clock out
      const clockOut = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("time_entries")
        .update({ clock_out: clockOut, clock_out_location: "Augusta, GA" })
        .eq("id", activeEntry.id);

      if (updateError) throw updateError;

      const hoursWorked = (
        (new Date(clockOut).getTime() - new Date(activeEntry.clock_in).getTime()) / 3600000
      ).toFixed(2);

      return new Response(JSON.stringify({
        action: "clock_out",
        employee_name: employee.full_name,
        role: employee.role,
        hours_worked: hoursWorked,
        clock_out: clockOut,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Clock in - use linked_user_id for employee_id FK, fall back to clock_employee_id
      const profileId = employee.linked_user_id || clock_employee_id;
      const clockIn = new Date().toISOString();
      const { data: newEntry, error: insertError } = await supabase
        .from("time_entries")
        .insert({
          employee_id: profileId,
          clock_employee_id: clock_employee_id,
          clock_in: clockIn,
          clock_in_location: "Augusta, GA",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        action: "clock_in",
        employee_name: employee.full_name,
        role: employee.role,
        clock_in: clockIn,
        entry_id: newEntry.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
