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
      return new Response(JSON.stringify({ error: "PIN must be exactly 4 digits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Only allow setting PIN if it's currently null (first-time setup)
    const { data: employee, error: fetchError } = await supabase
      .from("clock_employees")
      .select("id, pin_code")
      .eq("id", clock_employee_id)
      .eq("is_active", true)
      .single();

    if (fetchError || !employee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (employee.pin_code !== null) {
      return new Response(JSON.stringify({ error: "PIN already set. Contact a manager to reset." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("clock_employees")
      .update({ pin_code: pin })
      .eq("id", clock_employee_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
