import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { notification_type, recipient_employee_id, message, metadata } = await req.json();

    if (!notification_type || !recipient_employee_id) {
      return new Response(JSON.stringify({ error: "notification_type and recipient_employee_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["shift_assigned", "shift_changed", "shift_cancelled", "pto_approved", "pto_denied", "schedule_published"];
    if (!validTypes.includes(notification_type)) {
      return new Response(JSON.stringify({ error: `Invalid notification_type. Must be one of: ${validTypes.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store the notification
    const { data: notification, error: insertError } = await supabaseAdmin
      .from("schedule_notifications")
      .insert({
        notification_type,
        recipient_employee_id,
        message: message || `You have a new ${notification_type.replace(/_/g, " ")} notification`,
        metadata: metadata || {},
        sent_by: caller.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // In the future, when email domain is configured, this will also
    // send an email notification to employees who have email addresses.
    // For now, notifications are stored in the database for in-app display.

    return new Response(JSON.stringify({
      success: true,
      notification_id: notification.id,
      message: "Notification created successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
