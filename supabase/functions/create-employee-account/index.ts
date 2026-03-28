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
    // Verify caller is an authenticated owner
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
      return new Response(JSON.stringify({ error: "Only owners can promote employees" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clock_employee_id, role } = await req.json();

    if (!clock_employee_id || !role) {
      return new Response(JSON.stringify({ error: "Missing clock_employee_id or role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["manager", "shift_lead"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role. Must be manager or shift_lead" }), {
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

    if (employee.linked_user_id) {
      // Already promoted - just update the role
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: employee.linked_user_id, role }, { onConflict: "user_id,role" });

      await supabaseAdmin
        .from("clock_employees")
        .update({ role })
        .eq("id", clock_employee_id);

      return new Response(JSON.stringify({ success: true, message: "Role updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a hidden auth account with random password and email
    const randomPassword = crypto.randomUUID() + "!Aa1";
    const hiddenEmail = `clock-${clock_employee_id}@internal.wetzels.local`;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: hiddenEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: employee.full_name,
        is_clock_employee: true,
      },
    });

    if (createError) throw createError;

    const userId = newUser.user.id;

    // Link the clock employee to the auth user
    await supabaseAdmin
      .from("clock_employees")
      .update({ linked_user_id: userId, role })
      .eq("id", clock_employee_id);

    // Assign role in user_roles
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role });

    return new Response(JSON.stringify({
      success: true,
      message: `${employee.full_name} promoted to ${role}`,
      user_id: userId,
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
