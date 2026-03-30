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
    const clock_employee_id = body.clock_employee_id; // optional
    const require_permission = body.require_permission; // optional, e.g. "inventory"

    if (!pin) {
      return new Response(JSON.stringify({ error: "Missing pin" }), {
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
      // Lookup by ID + PIN
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

      if (error || !data || data.length === 0) {
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

    if (!employee.linked_user_id) {
      return new Response(JSON.stringify({ error: "Employee does not have dashboard access" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a specific permission is required, check it
    if (require_permission) {
      const isOwnerOrManager = employee.role === "owner" || employee.role === "manager";

      if (!isOwnerOrManager) {
        // Check employee_permissions table
        const { data: perm } = await supabase
          .from("employee_permissions")
          .select("granted")
          .eq("clock_employee_id", employee.id)
          .eq("permission", require_permission)
          .eq("granted", true)
          .maybeSingle();

        if (!perm) {
          return new Response(JSON.stringify({ error: "Access denied. You do not have permission." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Get the linked auth user's email to sign them in
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(employee.linked_user_id);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Linked account not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link token for sign-in
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email!,
    });

    if (linkError || !linkData) {
      return new Response(JSON.stringify({ error: "Failed to generate session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      return new Response(JSON.stringify({ error: "Failed to generate token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the OTP to get actual session tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (sessionError || !sessionData?.session) {
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      session: sessionData.session,
      employee_name: employee.full_name,
      role: employee.role,
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
