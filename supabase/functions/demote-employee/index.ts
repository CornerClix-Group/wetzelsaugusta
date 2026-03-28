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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Check caller is owner
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["owner"])
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Only owners can demote employees" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clock_employee_id } = await req.json();

    if (!clock_employee_id) {
      return new Response(JSON.stringify({ error: "Missing clock_employee_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the clock employee
    const { data: employee, error: empError } = await supabaseAdmin
      .from("clock_employees")
      .select("*")
      .eq("id", clock_employee_id)
      .single();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (employee.role === "employee" && !employee.linked_user_id) {
      return new Response(JSON.stringify({ error: "Employee is already clock-only" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const linkedUserId = employee.linked_user_id;

    // Remove user_roles entry
    if (linkedUserId) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", linkedUserId);

      // Delete the auth user entirely (revokes all sessions)
      await supabaseAdmin.auth.admin.deleteUser(linkedUserId);

      // Clean up profile if it exists
      // (profile is auto-created by trigger, deleting auth user cascades if FK exists)
    }

    // Reset clock_employees to basic employee
    await supabaseAdmin
      .from("clock_employees")
      .update({ role: "employee", linked_user_id: null })
      .eq("id", clock_employee_id);

    return new Response(JSON.stringify({
      success: true,
      message: `${employee.full_name} demoted to clock-only employee`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
