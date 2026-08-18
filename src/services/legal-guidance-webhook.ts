import { sendWebhook, type WebhookResult } from "@/lib/webhooks";
import type { Audiencia } from "@/hooks/use-audiencias";

export interface LegalGuidanceWebhookPayload {
  company: {
    id: string;
    name: string;
  };
  professional: {
    id: string;
    name: string | null;
    email: string | null;
    role: "lawyer";
    whatsapp: string | null;
    whatsapp_country_code: string | null;
  };
  client: {
    id: string | null;
    name: string | null;
    whatsapp: string | null;
  };
  process: {
    id: string;
    numero: string;
    tipo: string | null;
    status: string | null;
    cliente: string | null;
    company_id: string;
  };
  hearing: {
    id: string;
    date: string;
    time: string;
    location: string;
    status: string;
    process_id: string;
    whatsapp: string | null;
    notes: string | null;
  };
  reminder: {
    date: string | null;
    time: string | null;
  };
  legal_guidance: {
    enabled: boolean;
    case_type: string | null;
    description: string | null;
    people_involved: string | null;
    expected_outcome: string | null;
    notes: string | null;
  };
  timestamp: string;
}

export interface SendLegalGuidanceWebhookOptions {
  hearing: Audiencia;
  processNumero: string;
  processTipo: string | null;
  processCliente: string | null;
  processStatus: string | null;
  clientId: string | null;
  clientName: string | null;
  clientContact: string | null;
  professionalName: string | null;
  professionalEmail: string | null;
  companyName: string;
  hearingWhatsapp: string | null;
  hearingWhatsappCountryCode: string | null;
  reminderDate: string | null;
  reminderTime: string | null;
  legalGuidance?: {
    enabled: boolean;
    case_type: string | null;
    description: string | null;
    people_involved: string | null;
    expected_outcome: string | null;
    notes: string | null;
  };
}

export async function sendLegalGuidanceWebhook(
  options: SendLegalGuidanceWebhookOptions,
): Promise<{ success: boolean; error?: string }> {
  const {
    hearing,
    processNumero,
    processTipo,
    processCliente,
    processStatus,
    clientId,
    clientName,
    clientContact,
    professionalName,
    professionalEmail,
    companyName,
    hearingWhatsapp,
    hearingWhatsappCountryCode,
    reminderDate,
    reminderTime,
    legalGuidance,
  } = options;

  const payload: LegalGuidanceWebhookPayload = {
    company: {
      id: hearing.company_id ?? "",
      name: companyName,
    },
    professional: {
      id: hearing.responsible_professional_id,
      name: professionalName,
      email: professionalEmail,
      role: "lawyer",
      whatsapp: hearingWhatsapp,
      whatsapp_country_code: hearingWhatsappCountryCode,
    },
    client: {
      id: clientId,
      name: clientName,
      whatsapp: clientContact,
    },
    process: {
      id: hearing.case_id,
      numero: processNumero,
      tipo: processTipo,
      status: processStatus,
      cliente: processCliente,
      company_id: hearing.company_id ?? "",
    },
    hearing: {
      id: hearing.id,
      date: hearing.hearing_date,
      time: hearing.hearing_time,
      location: hearing.court_name,
      status: hearing.status,
      process_id: hearing.case_id,
      whatsapp: hearingWhatsapp,
      notes: hearing.notes,
    },
    reminder: {
      date: reminderDate,
      time: reminderTime,
    },
    legal_guidance: legalGuidance ?? {
      enabled: hearing.enable_legal_guidance ?? false,
      case_type: hearing.case_type ?? null,
      description: hearing.case_description ?? null,
      people_involved: hearing.people_involved ?? null,
      expected_outcome: hearing.expected_outcome ?? null,
      notes: hearing.legal_notes ?? null,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("[LegalGuidanceWebhook] Payload:", JSON.stringify(payload, null, 2));

  try {
    const result: WebhookResult | null = await sendWebhook(
      "hearing.created",
      hearing.company_id ?? "",
      hearing.responsible_professional_id,
      payload as unknown as Record<string, unknown>,
    );

    if (result) {
      if (!result.sent) {
        return { success: false, error: result?.error ?? "Webhook not configured" };
      }

      return { success: true };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[LegalGuidanceWebhook] Failed to send webhook:", message);
    return {
      success: false,
      error: message,
    };
  }
}
