export type WebhookEventType =
  | "hearing.created"
  | "task.created"
  | "agenda.created";

export interface WebhookPayload {
  event_type: string;
  timestamp: string;
  company_id: string;
  user_id: string;
  data: Record<string, unknown>;
}

export interface WebhookResult {
  sent: boolean;
  status?: number;
  error?: string;
}

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export async function sendWebhook(
  eventType: WebhookEventType,
  companyId: string,
  userId: string,
  data: Record<string, unknown>,
): Promise<WebhookResult | null> {
  if (!N8N_WEBHOOK_URL) {
    console.warn("[webhook] VITE_N8N_WEBHOOK_URL not configured, skipping");
    return null;
  }

  const payload: WebhookPayload = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    company_id: companyId,
    user_id: userId,
    data,
  };

  console.log("[webhook] sending", eventType, "to", N8N_WEBHOOK_URL);

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    const result: WebhookResult = {
      sent: response.ok,
      status: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };

    console.log("[webhook] response status:", response.status);

    if (!response.ok) {
      const n8nError = await response.text().catch(() => "no body");
      console.error("[webhook] error:", response.status, n8nError);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[webhook] failed:", message);
    if (message.toLowerCase().includes("cors")) {
      console.error(
        "[webhook] CORS blocked! Configure CORS headers in N8N or use a proxy.",
      );
    }
    return {
      sent: false,
      error: message,
    };
  }
}
