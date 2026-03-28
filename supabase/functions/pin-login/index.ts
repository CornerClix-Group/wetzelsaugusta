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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate PIN and check if promoted
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

    if (!employee.linked_user_id) {
      return new Response(JSON.stringify({ error: "Employee does not have dashboard access" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the linked auth user's email to sign them in
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(employee.linked_user_id);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Linked account not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link token for sign-in (no password needed)
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

    // Extract the token hash and use it to verify OTP to get a session
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
