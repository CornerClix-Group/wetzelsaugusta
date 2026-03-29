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

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is owner
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["owner"])
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Only owners can promote employees" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clock_employee_id, role, email, send_invite } = await req.json();

    if (!clock_employee_id || !role) {
      return new Response(JSON.stringify({ error: "Missing clock_employee_id or role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["manager", "shift_lead", "business_manager", "employee"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
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
      // Already has an account - just update the role
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

    // Branch: HR invite with real email vs hidden account for PIN promotion
    if (send_invite && email?.trim()) {
      // Send a real invite email to the employee
      const trimmedEmail = email.trim();

      // Check if email already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === trimmedEmail.toLowerCase()
      );
      if (existing) {
        // Check if this user is already linked to another clock employee
        const { data: otherEmp } = await supabaseAdmin
          .from("clock_employees")
          .select("id, full_name")
          .eq("linked_user_id", existing.id)
          .neq("id", clock_employee_id)
          .maybeSingle();

        if (otherEmp) {
          return new Response(JSON.stringify({ error: `This email is already linked to another employee: ${otherEmp.full_name}` }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Email exists but not linked to another employee — link to this one
        const userId = existing.id;
        await supabaseAdmin
          .from("clock_employees")
          .update({ linked_user_id: userId, role })
          .eq("id", clock_employee_id);

        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

        // Resend invite email
        try {
          await supabaseAdmin.auth.admin.inviteUserByEmail(trimmedEmail, {
            data: { full_name: employee.full_name, is_clock_employee: true },
          });
        } catch (_) {
          // User may already be confirmed — that's fine
        }

        return new Response(JSON.stringify({
          success: true,
          message: `${employee.full_name} linked to existing account and invite resent to ${trimmedEmail}`,
          user_id: userId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Invite by email - sends a real invitation email
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        trimmedEmail,
        { data: { full_name: employee.full_name, is_clock_employee: true } }
      );

      if (inviteError || !inviteData?.user) {
        return new Response(JSON.stringify({ error: inviteError?.message || "Failed to send invite" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = inviteData.user.id;

      // Link the clock employee to the auth user
      await supabaseAdmin
        .from("clock_employees")
        .update({ linked_user_id: userId, role })
        .eq("id", clock_employee_id);

      // Assign role
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role });

      return new Response(JSON.stringify({
        success: true,
        message: `HR invite sent to ${trimmedEmail} for ${employee.full_name}`,
        user_id: userId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: Create a hidden auth account with random password (for PIN-based promotion)
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
