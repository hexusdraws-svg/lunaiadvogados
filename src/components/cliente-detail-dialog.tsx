import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/use-profile-company";
import { useI18n } from "@/hooks/use-i18n";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateForDisplay } from "@/lib/date-utils";
import type { Database } from "@/integrations/supabase/types";

type Cliente = Database["public"]["Tables"]["clientes"]["Row"];

interface ClienteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value && value.trim() ? value : "—"}</span>
    </div>
  );
}

export function ClienteDetailDialog({
  open,
  onOpenChange,
  cliente,
}: ClienteDetailDialogProps) {
  const { t, language, dateFormat } = useI18n();
  const companyId = useCompanyId();
  const locale = language === "en" ? enUS : dateFnsPt;

  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return format(parseISO(v), dateFormat, { locale });
    } catch {
      return v;
    }
  };

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-clientes", companyId],
    queryFn: async () => {
      if (!companyId) return [] as Array<{ id: string; full_name: string | null }>;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", companyId);
      return (data ?? []) as Array<{ id: string; full_name: string | null }>;
    },
    enabled: open && !!companyId,
  });

  const lawyerName = (id?: string | null) =>
    profiles.find((p) => p.id === id)?.full_name ?? "—";

  const { data: processos = [], isLoading: loadingProc } = useQuery({
    queryKey: ["cliente-processos", cliente?.id, companyId],
    queryFn: async () => {
      if (!cliente || !companyId) return [];
      const { data, error } = await supabase
        .from("processos")
        .select("id, numero, tipo, status, cliente_nome")
        .eq("company_id", companyId)
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        numero: string | null;
        tipo: string | null;
        status: string | null;
        cliente_nome: string | null;
      }>;
    },
    enabled: open && !!cliente?.id && !!companyId,
  });

  const { data: audiencias = [], isLoading: loadingAud } = useQuery({
    queryKey: ["cliente-audiencias", cliente?.id, companyId],
    queryFn: async () => {
      if (!cliente || !companyId || processos.length === 0) return [];
      const ids = processos.map((p) => p.id);
      const { data, error } = await supabase
        .from("hearings")
        .select("id, court_name, city, hearing_date, hearing_time, status")
        .eq("company_id", companyId)
        .in("case_id", ids)
        .order("hearing_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        court_name: string | null;
        city: string | null;
        hearing_date: string | null;
        hearing_time: string | null;
        status: string | null;
      }>;
    },
    enabled: open && !!cliente?.id && !!companyId && processos.length > 0,
  });

  const { data: contratos = [], isLoading: loadingCon } = useQuery({
    queryKey: ["cliente-contratos", cliente?.id, companyId, cliente?.nome],
    queryFn: async () => {
      if (!cliente || !companyId) return [];
      const { data, error } = await supabase
        .from("contracts")
        .select("id, numero, tipo, status, created_at")
        .eq("company_id", companyId)
        .eq("cliente_nome", cliente.nome)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        numero: string | null;
        tipo: string | null;
        status: string | null;
        created_at: string;
      }>;
    },
    enabled: open && !!cliente?.id && !!companyId,
  });

  const statusStyles: Record<string, string> = {
    ativo: "bg-success/15 text-success border-success/30",
    inativo: "bg-muted text-muted-foreground border-border",
    arquivado: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cliente?.nome ?? t("clients.detail.noClientFound")}
            {cliente?.estado && (
              <Badge className={statusStyles[cliente.estado] ?? ""}>
                {t(`clients.status.${cliente.estado}`)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

         {cliente && (
          <div className="space-y-5">
            <Card className="p-5">
              <h3 className="mb-3 text-base font-semibold">{t("clients.detail.fullData")}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t("clients.columns.nome")} value={cliente.nome} />
                <Field label={t("clients.detail.contact")} value={cliente.contacto} />
                <Field label={t("clients.form.email")} value={cliente.email} />
                <Field
                  label={t("clients.form.documentType")}
                  value={cliente.tipo_documento ? t(`clients.documentType.${cliente.tipo_documento}`) : null}
                />
                <Field label={t("clients.form.documentNumber")} value={cliente.documento} />
                <Field label={t("clients.form.issueDate")} value={formatDateForDisplay(cliente.data_emissao)} />
                <Field label={t("clients.form.issuePlace")} value={cliente.local_emissao} />
                <Field label={t("clients.form.expiryDate")} value={formatDateForDisplay(cliente.data_validade)} />
                <Field label={t("clients.form.nationality")} value={cliente.nacionalidade} />
                <Field label={t("clients.form.naturality")} value={cliente.naturalidade} />
                <Field label={t("clients.form.address")} value={cliente.endereco} />
                <Field label={t("clients.form.city")} value={cliente.cidade} />
                <Field label={t("clients.form.country")} value={cliente.pais} />
                <Field label={t("clients.detail.responsibleLawyer")} value={lawyerName(cliente.created_by)} />
                <Field label={t("clients.columns.dataCadastro")} value={fmtDate(cliente.created_at)} />
              </div>
              {cliente.observacoes && cliente.observacoes.trim() && (
                <div className="mt-4">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {t("clients.detail.observations")}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{cliente.observacoes}</p>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-base font-semibold">
                {t("clients.detail.associatedProcesses")}{" "}
                <span className="text-muted-foreground">({processos.length})</span>
              </h3>
              {loadingProc ? (
                <p className="text-sm text-muted-foreground">...</p>
              ) : processos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("clients.detail.noProcesses")}</p>
              ) : (
                <ul className="space-y-2">
                  {processos.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{p.numero ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{p.tipo ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-base font-semibold">
                {t("clients.detail.associatedHearings")}{" "}
                <span className="text-muted-foreground">({audiencias.length})</span>
              </h3>
              {loadingAud ? (
                <p className="text-sm text-muted-foreground">...</p>
              ) : audiencias.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("clients.detail.noHearings")}</p>
              ) : (
                <ul className="space-y-2">
                  {audiencias.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{a.court_name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.city ?? ""} · {fmtDate(a.hearing_date)}
                        {a.hearing_time ? ` ${a.hearing_time}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-base font-semibold">
                {t("clients.detail.associatedContracts")}{" "}
                <span className="text-muted-foreground">({contratos.length})</span>
              </h3>
              {loadingCon ? (
                <p className="text-sm text-muted-foreground">...</p>
              ) : contratos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("clients.detail.noContracts")}</p>
              ) : (
                <ul className="space-y-2">
                  {contratos.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{c.numero ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{c.tipo ?? c.status ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-base font-semibold">{t("clients.detail.history")}</h3>
              <p className="text-sm text-muted-foreground">{t("clients.detail.noHistory")}</p>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
