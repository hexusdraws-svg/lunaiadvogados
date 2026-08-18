import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request) => {
  // Handle CORS preflight BEFORE any other logic
  if (req.method === "OPTIONS") {
    console.log("[send-webhook] OPTIONS preflight received");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  console.log("[send-webhook] POST received");

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      db: { schema: "public" },
      auth: { persistSession: false },
    },
  );

  let event_type: string;
  let timestamp: string;
  let company_id: string;
  let user_id: string;
  let data: Record<string, unknown>;

  try {
    const body = await req.json();
    event_type = body.event_type;
    timestamp = body.timestamp;
    company_id = body.company_id;
    user_id = body.user_id;
    data = body.data;
  } catch {
    console.error("[send-webhook] Invalid JSON body");
    return new Response(
      JSON.stringify({ sent: false, error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

  if (!webhookUrl) {
    console.error("[send-webhook] N8N_WEBHOOK_URL not configured");
    return new Response(
      JSON.stringify({ sent: false, error: "N8N_WEBHOOK_URL not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[send-webhook] N8N_WEBHOOK_URL found, forwarding payload");

  let result: { sent: boolean; status: number; error?: string };

  try {
    console.log("[send-webhook] Sending to N8N:", event_type);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, timestamp, company_id, user_id, data }),
    });

    result = {
      sent: response.ok,
      status: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };

    console.log("[send-webhook] N8N response status:", response.status, "sent:", response.ok);

    if (!response.ok) {
      const n8nError = await response.text().catch(() => "no body");
      console.error("[send-webhook] N8N error:", response.status, n8nError);
    }
  } catch (error) {
    result = {
      sent: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    console.error("[send-webhook] Fetch error:", result.error);
  }

  // Log webhook attempt to webhook_logs table (non-critical)
  const { error: logError } = await supabaseService
    .from("webhook_logs")
    .insert({
      event: event_type,
      company_id,
      user_id,
      payload: data,
      sent: result.sent,
      status: result.status ?? null,
      error: result.error ?? null,
    });

  if (logError) {
    console.error("[send-webhook] log error:", logError);
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
