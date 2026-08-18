import type { Database } from "@/integrations/supabase/types";

type Hearing = Database["public"]["Tables"]["hearings"]["Row"];

export interface LegalGuidancePayload {
  hearing_id: string;
  processo_id: string;
  numero_processo?: string;
  advogado?: string;
  data_audiencia: string;
  tipo_caso?: string;
  descricao?: string;
  envolvidos?: string;
  objetivo?: string;
  observacoes?: string;
  cliente?: string;
  empresa?: string;
}

export function buildLegalGuidancePayload(hearing: Hearing): LegalGuidancePayload | null {
  if (!hearing.enable_legal_guidance) {
    return null;
  }

  return {
    hearing_id: hearing.id,
    processo_id: hearing.case_id,
    data_audiencia: hearing.hearing_date,
    tipo_caso: hearing.case_type ?? undefined,
    descricao: hearing.case_description ?? undefined,
    envolvidos: hearing.people_involved ?? undefined,
    objetivo: hearing.expected_outcome ?? undefined,
    observacoes: hearing.legal_notes ?? undefined,
  };
}
