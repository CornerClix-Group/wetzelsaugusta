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
    const body = await req.json();
    const pin = body.pin;
    const clock_employee_id = body.clock_employee_id; // optional for backward compat

    if (!pin) {
      return new Response(JSON.stringify({ error: "Missing pin" }), {
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

    let employee: any;

    if (clock_employee_id) {
      // Legacy: lookup by ID + PIN
      const { data, error } = await supabase
        .from("clock_employees")
        .select("id, full_name, pin_code, role, linked_user_id")
        .eq("id", clock_employee_id)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Employee not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (data.pin_code !== pin) {
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      employee = data;
    } else {
      // PIN-only lookup
      const { data, error } = await supabase
        .from("clock_employees")
        .select("id, full_name, pin_code, role, linked_user_id")
        .eq("pin_code", pin)
        .eq("is_active", true);

      if (error) {
        return new Response(JSON.stringify({ error: "Lookup failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.length > 1) {
        return new Response(JSON.stringify({ error: "PIN conflict. Contact your manager." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      employee = data[0];
    }

    // Check for active time entry
    const { data: activeEntry } = await supabase
      .from("time_entries")
      .select("*")
      .eq("clock_employee_id", employee.id)
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
        clock_employee_id: employee.id,
        role: employee.role,
        hours_worked: hoursWorked,
        clock_out: clockOut,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Clock in
      const profileId = employee.linked_user_id || null;
      const clockIn = new Date().toISOString();
      const { data: newEntry, error: insertError } = await supabase
        .from("time_entries")
        .insert({
          employee_id: profileId,
          clock_employee_id: employee.id,
          clock_in: clockIn,
          clock_in_location: "Augusta, GA",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        action: "clock_in",
        employee_name: employee.full_name,
        clock_employee_id: employee.id,
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
