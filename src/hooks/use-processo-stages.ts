import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/use-profile-company";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { sendWebhook } from "@/lib/webhooks";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Types
export type ProcessoEtapa = {
  id: string;
  processo_id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  observacoes: string | null;
  responsavel_id: string | null;
  tarefas: string | null;
  data_prevista: string | null;
  ordem: number;
  company_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessoDocumento = {
  id: string;
  processo_id: string;
  etapa_id: string | null;
  nome_ficheiro: string;
  arquivo_url: string;
  tipo_ficheiro: string | null;
  categoria: string | null;
  uploaded_by: string | null;
  company_id: string | null;
  created_at: string;
};

export type ProcessoHistorico = {
  id: string;
  processo_id: string;
  etapa_id: string | null;
  tarefa_id: string | null;
  tipo: string;
  descricao: string;
  company_id: string | null;
  created_at: string;
};

export type ProcessoHistoricoInsert = Database["public"]["Tables"]["processo_historico"]["Insert"];

export type EtapaStatus = "pendente" | "em_andamento" | "concluido" | "cancelado";

export const ETAPA_STATUSES: EtapaStatus[] = ["pendente", "em_andamento", "concluido", "cancelado"];
export const ETAPA_STATUS_LABELS: Record<string, string> = {
  pendente: "Nova",
  em_andamento: "Em andamento",
  concluido: "Concluída",
  cancelado: "Suspensa",
};
export const ETAPA_STATUS_STYLES: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-info/20 text-info",
  concluido: "bg-success/20 text-success",
  cancelado: "bg-destructive/20 text-destructive",
};

// Helper to add historico entry
async function addHistoricoEntry(
  processoId: string,
  tipo: string,
  descricao: string,
  etapaId?: string | null,
  tarefaId?: string | null,
  companyId?: string | null,
) {
  const payload: ProcessoHistoricoInsert = {
    processo_id: processoId,
    etapa_id: etapaId || null,
    tarefa_id: tarefaId || null,
    tipo,
    descricao,
    company_id: companyId || null,
  };
  await supabase.from("processo_historico").insert(payload);
}

// ===================== ETAPAS HOOKS =====================

export function useEtapasPorProcesso(processoId: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["processo-etapas", processoId, companyId],
    queryFn: async () => {
      if (!processoId) return [];
      let q = supabase
        .from("processo_etapas")
        .select("*")
        .eq("processo_id", processoId)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[useEtapasPorProcesso] query error:", error);
        return [];
      }
      return (data ?? []) as ProcessoEtapa[];
    },
    enabled: !!processoId,
    staleTime: 30_000,
  });
}

export function useCreateEtapa(processoId: string) {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();

  const getCompanyId = () => {
    if (isSuperAdmin) return null;
    return profile?.company_id ?? null;
  };

  return useMutation({
    mutationFn: async (values: {
      titulo: string;
      descricao?: string | null;
      status?: string;
      observacoes?: string | null;
      data_prevista?: string | null;
      ordem?: number;
      responsavel_id?: string | null;
      tarefas?: string | null;
    }) => {
      const companyId = getCompanyId();
      if (!companyId) throw new Error("Empresa não configurada");

      const insertData: TablesInsert<"processo_etapas"> = {
        processo_id: processoId,
        titulo: values.titulo,
        descricao: values.descricao || null,
        status: values.status || "pendente",
        observacoes: values.observacoes || null,
        data_prevista: values.data_prevista || null,
        ordem: values.ordem ?? 0,
        company_id: companyId,
        tarefas: values.tarefas || null,
      };
      if (values.responsavel_id) {
        insertData.responsavel_id = values.responsavel_id;
      }

      const { data, error } = await supabase
        .from("processo_etapas")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return { etapa: data as ProcessoEtapa, companyId };
    },
    onSuccess: async ({ etapa, companyId }) => {
      qc.invalidateQueries({ queryKey: ["processo-etapas", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      try {
        await addHistoricoEntry(
          processoId,
          "etapa_criada",
          `Etapa criada: ${etapa.titulo}`,
          etapa.id,
          null,
          companyId ?? undefined,
        );
      } catch {
        // falha no registo de histórico não deve bloquear a criação da etapa
      }
      toast.success("Etapa criada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "processo_etapas" });
    },
  });
}

export function useUpdateEtapa(processoId: string) {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: TablesUpdate<"processo_etapas">;
    }) => {
      let q = supabase.from("processo_etapas").update(updates).eq("id", id);

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as ProcessoEtapa;
    },
    onSuccess: async (etapa) => {
      qc.invalidateQueries({ queryKey: ["processo-etapas", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      let descricao = `Etapa actualizada: ${etapa.titulo}`;
      if (etapa.status) {
        descricao = `Etapa marcada como ${ETAPA_STATUS_LABELS[etapa.status] || etapa.status}`;
      }
      await addHistoricoEntry(
        processoId,
        "etapa_editada",
        descricao,
        etapa.id,
        null,
        companyId ?? undefined,
      );
      toast.success("Etapa actualizada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "processo_etapas" });
    },
  });
}

export function useDeleteEtapa(processoId: string) {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));
  const companyId = getCompanyId();

  return useMutation({
    mutationFn: async (etapaId: string) => {
      const currentCompanyId = getCompanyId();
      let q = supabase.from("processo_etapas").delete().eq("id", etapaId);
      if (currentCompanyId) {
        q = q.eq("company_id", currentCompanyId);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: async () => {
      const currentCompanyId = getCompanyId();
      qc.invalidateQueries({ queryKey: ["processo-etapas", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-documentos", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      toast.success("Etapa eliminada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "processo_etapas" });
    },
  });
}

// ===================== DOCUMENTOS HOOKS =====================

export function useDocumentosPorProcesso(processoId: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["processo-documentos", processoId, companyId],
    queryFn: async () => {
      if (!processoId) return [];
      let q = supabase
        .from("processo_documentos")
        .select("*")
        .eq("processo_id", processoId)
        .order("created_at", { ascending: false });

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[useDocumentosPorProcesso] query error:", error);
        return [];
      }
      return (data ?? []) as ProcessoDocumento[];
    },
    enabled: !!processoId,
    staleTime: 30_000,
  });
}

export function useDocumentosPorEtapa(processoId: string | null, etapaId: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["processo-documentos", processoId, etapaId, companyId],
    queryFn: async () => {
      if (!processoId) return [];
      let q = supabase
        .from("processo_documentos")
        .select("*")
        .eq("processo_id", processoId)
        .order("created_at", { ascending: false });

      if (etapaId) {
        q = q.eq("etapa_id", etapaId);
      }

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[useDocumentosPorEtapa] query error:", error);
        return [];
      }
      return (data ?? []) as ProcessoDocumento[];
    },
    enabled: !!processoId,
    staleTime: 30_000,
  });
}

export function useUploadDocumento(processoId: string) {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      file,
      etapaId,
      categoria,
    }: {
      file: File;
      etapaId?: string | null;
      categoria?: string | null;
    }) => {
      const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));
      const currentCompanyId = getCompanyId();
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/jpg",
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipo de ficheiro não permitido. Use PDF, DOC, DOCX, PNG ou JPG.");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Ficheiro muito grande. Tamanho máximo: 10MB.");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `processos/${processoId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("processo-documentos")
        .upload(storagePath, file, {
          metadata: companyId ? { company_id: companyId } : undefined,
        });

      if (uploadError) {
        if (uploadError.message.includes("bucket") || uploadError.message.includes("not found")) {
          throw new Error(
            "Bucket 'processo-documentos' não encontrado. Crie-o no Supabase Storage.",
          );
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("processo-documentos")
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error("Erro ao obter URL do ficheiro.");
      }

      const insertPayload: Record<string, unknown> = {
        processo_id: processoId,
        etapa_id: etapaId || null,
        nome_ficheiro: file.name,
        arquivo_url: urlData.publicUrl,
        tipo_ficheiro: file.type,
        categoria: categoria || "Outro",
        company_id: currentCompanyId,
        uploaded_by: profile?.id ?? null,
      };

      const { data, error } = await supabase
        .from("processo_documentos")
        .insert(insertPayload as never)
        .select()
        .single();

      if (error) throw error;
      return data as ProcessoDocumento;
    },
    onSuccess: async (doc) => {
      qc.invalidateQueries({ queryKey: ["processo-documentos", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      await addHistoricoEntry(
        processoId,
        "documento_anexado",
        `Documento anexado: ${doc.nome_ficheiro}`,
        doc.etapa_id,
        null,
        companyId ?? undefined,
      );
      toast.success("Documento anexado");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "processo_documentos" });
    },
  });
}

export function useDeleteDocumento(processoId: string) {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));
  const companyId = getCompanyId();

  return useMutation({
    mutationFn: async (doc: ProcessoDocumento) => {
      const currentCompanyId = getCompanyId();

      try {
        const url = new URL(doc.arquivo_url);
        const pathParts = url.pathname.split("/");
        const storagePath = pathParts.slice(pathParts.indexOf("processo-documentos") + 1).join("/");

        if (storagePath) {
          await supabase.storage.from("processo-documentos").remove([storagePath]);
        }
      } catch {
        // Ignore URL parsing errors, just delete DB record
      }

      let q = supabase.from("processo_documentos").delete().eq("id", doc.id);
      if (currentCompanyId) {
        q = q.eq("company_id", currentCompanyId);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: async (_vars, doc) => {
      qc.invalidateQueries({ queryKey: ["processo-documentos", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      await addHistoricoEntry(
        processoId,
        "documento_removido",
        `Documento removido: ${doc.nome_ficheiro}`,
        doc.etapa_id,
        null,
        companyId ?? undefined,
      );
      toast.success("Documento removido");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "processo_documentos" });
    },
  });
}

// ===================== HISTORICO HOOKS =====================

export function useHistoricoPorProcesso(processoId: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["processo-historico", processoId, companyId],
    queryFn: async () => {
      if (!processoId) return [];
      let q = supabase
        .from("processo_historico")
        .select("*")
        .eq("processo_id", processoId);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }
      q = q.order("created_at", { ascending: false });

      const { data, error } = await q;
      if (error) {
        console.error("[useHistoricoPorProcesso] query error:", error);
        handleSupabaseError(error, { operation: "SELECT", table: "processo_historico" });
        return [];
      }
      return (data ?? []) as ProcessoHistorico[];
    },
    enabled: !!processoId,
    staleTime: 30_000,
  });
}

export function useAdicionarHistorico(processoId: string) {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      tipo,
      descricao,
      etapaId,
      tarefaId,
    }: {
      tipo: string;
      descricao: string;
      etapaId?: string | null;
      tarefaId?: string | null;
    }) => {
      await addHistoricoEntry(
        processoId,
        tipo,
        descricao,
        etapaId,
        tarefaId,
        companyId ?? undefined,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
    },
  });
}
