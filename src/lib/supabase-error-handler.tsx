import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/query-client";

// Throttled, self-healing recovery for expired/invalid JWTs.
// Root cause is usually that the client machine clock is behind the server,
// so the cached session still looks valid while the server already expired it.
let lastAuthRecoveryAt = 0;
let authRecoveryInFlight: Promise<void> | null = null;
const AUTH_RECOVERY_THROTTLE_MS = 10_000;

function isAuthFailure(classified: ClassifiedError): boolean {
  const msg = classified.rawMessage.toLowerCase();
  // Only trigger automatic token recovery for clear token-expiry/invalidity
  // signals. Genuine permission (RLS) errors keep their normal error toast.
  return (
    classified.postgresCode === "PGRST303" ||
    msg.includes("jwt") ||
    msg.includes("expired") ||
    msg.includes("invalid token") ||
    msg.includes("bad_jwt") ||
    msg.includes("token is expired") ||
    msg.includes("invalid jwt")
  );
}

async function recoverSessionOnAuthError(): Promise<void> {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastAuthRecoveryAt < AUTH_RECOVERY_THROTTLE_MS) return;
  if (authRecoveryInFlight) return authRecoveryInFlight;

  lastAuthRecoveryAt = now;

  authRecoveryInFlight = (async () => {
    try {
      // Lightweight, one-shot diagnostic (no repeated network calls).
      const { data: sess } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const remaining = sess.session?.expires_at
        ? Math.max(0, Math.round((sess.session.expires_at * 1000 - Date.now()) / 1000))
        : null;

      // Use the refresh token to obtain a new access token. This recovers from
      // an expired access token even when the client clock is behind the server.
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error("[AuthRecovery] renovação falhou, sessao invalida:", error);
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        toast.error("Sessão expirada. Por favor, inicie sessão novamente.");
        window.location.assign("/login");
        return;
      }

      toast.success("Sessão renovada automaticamente.");
      // Refetch every query with the new token.
      queryClient.invalidateQueries();
    } catch (e) {
      console.error("[AuthRecovery] erro ao renovar sessao:", e);
    } finally {
      authRecoveryInFlight = null;
    }
  })();

  return authRecoveryInFlight;
}

export interface SupabaseErrorInfo {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export type ErrorCategory =
  | "schema"
  | "rls"
  | "auth"
  | "constraint"
  | "network"
  | "storage"
  | "rpc"
  | "unknown";

export interface ClassifiedError {
  category: ErrorCategory;
  title?: string;
  description?: string;
  cause?: string;
  table?: string;
  column?: string;
  operation?: string;
  postgresCode?: string;
  rawMessage: string;
  raw?: SupabaseErrorInfo;
  details?: string;
}

function extractSupabaseErrorInfo(error: unknown): SupabaseErrorInfo {
  if (typeof error === "string") {
    return { code: "", message: error };
  }
  if (error instanceof Error) {
    const errRecord = error as unknown as Record<string, unknown>;
    const code = errRecord.code;
    const details = errRecord.details;
    const hint = errRecord.hint;
    return {
      code: typeof code === "string" ? code : "",
      message: error.message,
      details: typeof details === "string" ? details : undefined,
      hint: typeof hint === "string" ? hint : undefined,
    };
  }
  if (error && typeof error === "object" && "message" in error) {
    const errRecord = error as unknown as Record<string, unknown>;
    const code = errRecord.code;
    const details = errRecord.details;
    const hint = errRecord.hint;
    return {
      code: typeof code === "string" ? code : "",
      message: String((error as Record<string, unknown>).message),
      details: typeof details === "string" ? details : undefined,
      hint: typeof hint === "string" ? hint : undefined,
    };
  }
  return { code: "", message: String(error) };
}

function extractTable(message: string): string | undefined {
  let match = message.match(/relation "([^"]+)"/);
  if (match) return match[1];
  match = message.match(/table "([^"]+)"/);
  if (match) return match[1];
  match = message.match(/for relation "([^"]+)"/);
  if (match) return match[1];
  return undefined;
}

function extractColumn(message: string): string | undefined {
  const match = message.match(/column "([^"]+)"/);
  return match?.[1];
}

function inferOperation(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("insert")) return "INSERT";
  if (lower.includes("update")) return "UPDATE";
  if (lower.includes("delete")) return "DELETE";
  if (lower.includes("select")) return "SELECT";
  return "OPERATION";
}

export function classifySupabaseError(
  error: unknown,
  options?: { operation?: string; table?: string },
): ClassifiedError {
  const info = extractSupabaseErrorInfo(error);
  const message = info.message.toLowerCase();

  let table = options?.table;
  if (!table) table = extractTable(info.message);

  const column = extractColumn(info.message);
  const operation = options?.operation || inferOperation(info.message);

  let category: ErrorCategory = "unknown";

  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("fetch failed")
  ) {
    category = "network";
  } else if (
    message.includes("invalid login credentials") ||
    message.includes("jwt") ||
    message.includes("expired") ||
    message.includes("auth") ||
    message.includes("token")
  ) {
    category = "auth";
  } else if (
    message.includes("bucket") ||
    message.includes("storage") ||
    message.includes("object not found") ||
    message.includes("storage object")
  ) {
    category = "storage";
  } else if (
    message.includes("does not exist") ||
    info.code === "PGRST301" ||
    info.code === "PGRST116"
  ) {
    category = "schema";
  } else if (
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("rls") ||
    info.code === "42501"
  ) {
    category = "rls";
  } else if (
    info.code === "23505" ||
    message.includes("unique constraint") ||
    message.includes("duplicate key")
  ) {
    category = "constraint";
  } else if (
    info.code === "23503" ||
    message.includes("foreign key constraint") ||
    message.includes("violates foreign key")
  ) {
    category = "constraint";
  } else if (
    info.code === "23502" ||
    message.includes("not-null constraint") ||
    message.includes("null value")
  ) {
    category = "constraint";
  } else if (
    message.includes("check constraint") ||
    message.includes("violates check constraint")
  ) {
    category = "constraint";
  }

  const result: ClassifiedError = {
    category,
    rawMessage: info.message,
    raw: info,
    table,
    column,
    operation,
    postgresCode: info.code || undefined,
    details: info.details || info.hint || undefined,
  };

  switch (category) {
    case "schema": {
      if (column) {
        result.title = "Coluna não encontrada";
        result.description = `A coluna "${column}" não existe na tabela "${table || "desconhecida"}'.`;
        result.cause = "A migration necessária ainda não foi aplicada no Supabase.";
      } else if (table) {
        result.title = "Tabela não encontrada";
        result.description = `A tabela "${table}" não existe no schema public.`;
        result.cause = "Verifique as migrations pendentes.";
      } else {
        result.title = "Erro no esquema do banco de dados";
        result.description = info.message;
        result.cause = "Possível problema de schema ou migration não aplicada.";
      }
      break;
    }
    case "rls": {
      result.title = "Permissão negada";
      result.description = table
        ? `O utilizador não possui acesso à tabela "${table}".`
        : "O utilizador não possui permissão para realizar esta operação.";
      result.cause = "Verifique as políticas RLS no Supabase.";
      break;
    }
    case "auth": {
      result.title = "Erro de autenticação";
      result.description = info.message;
      result.cause = "Verifique as credenciais ou o estado da sessão.";
      break;
    }
    case "constraint": {
      if (info.code === "23505") {
        result.title = "Valor duplicado";
        result.description = "Já existe um registo com este valor único.";
        result.cause = info.message;
      } else if (info.code === "23503") {
        result.title = "Referência inválida";
        result.description = "Referência para outro registo não encontrada ou eliminada.";
        result.cause = info.message;
      } else if (info.code === "23502") {
        result.title = "Campo obrigatório em falta";
        result.description = `Um campo obrigatório não foi preenchido.${column ? ` Campo: "${column}"` : ""}`;
        result.cause = info.message;
      } else {
        result.title = "Violação de restrição";
        result.description = "Os dados não satisfazem uma restrição do banco de dados.";
        result.cause = info.message;
      }
      break;
    }
    case "network": {
      result.title = "Erro de conexão";
      result.description = "Não foi possível conectar ao servidor.";
      result.cause = "Verifique a conexão com a internet e tente novamente.";
      break;
    }
    case "storage": {
      result.title = "Erro de armazenamento";
      result.description = "Ocorreu um erro ao aceder ao armazenamento.";
      result.cause = info.message || "Verifique se o bucket existe e tem as permissões corretas.";
      break;
    }
    default: {
      result.title = "Erro inesperado";
      result.description = info.message || "Ocorreu um erro desconhecido.";
      result.cause = undefined;
    }
  }

  return result;
}

interface ExpandableErrorToastProps {
  toastId: string | number;
  error: ClassifiedError;
  detailsText: string;
  t: (key: string) => string;
}

function ExpandableErrorToast({
  toastId,
  error,
  detailsText,
  t,
}: ExpandableErrorToastProps) {
  const [showDetails, setShowDetails] = useState(import.meta.env.DEV);

  const categoryIcon = {
    schema: "???",
    rls: "??",
    auth: "??",
    constraint: "??",
    network: "??",
    storage: "??",
    rpc: "??",
    unknown: "?",
  }[error.category] || "?";

  return (
    <div className="toast bg-background border border-border text-foreground shadow-xl rounded-xl px-5 py-4 min-w-[360px] max-w-lg">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">{categoryIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{error.title}</p>
          <p className="text-xs mt-1 text-muted-foreground leading-relaxed">{error.description}</p>
          {error.cause && !showDetails && (
            <p className="text-xs mt-1.5 text-muted-foreground/80 italic leading-relaxed">{error.cause}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(toastId)}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0 leading-none px-1 transition-colors"
        >
          ?
        </button>
      </div>

      {showDetails && (
        <pre className="mt-3 p-3 bg-muted/50 rounded-lg text-[11px] whitespace-pre-wrap break-words leading-relaxed text-muted-foreground border border-border/50">
          {detailsText}
        </pre>
      )}

      <button
        onClick={() => setShowDetails((prev) => !prev)}
        className="text-xs mt-3 text-primary hover:text-primary/80 font-medium transition-colors"
      >
        {showDetails ? t("errors.hideDetails") : t("errors.seeDetails")}
      </button>
    </div>
  );
}

export function handleSupabaseError(
  error: unknown,
  options?: {
    operation?: string;
    table?: string;
    t?: (key: string) => string;
  },
): void {
  const classified = classifySupabaseError(error, options);
  const isDev = import.meta.env.DEV;
  const t =
    options?.t ||
    ((key: string) => {
      const fallback: Record<string, string> = {
        "errors.seeDetails": "Ver detalhes",
        "errors.hideDetails": "Ocultar detalhes",
      };
      return fallback[key] || "";
    });

  console.error("[Supabase Error]", classified);

  // Auth/JWT failures (e.g. expired access token): try to heal automatically
  // by refreshing the session, instead of spamming the user with errors.
  if (isAuthFailure(classified)) {
    void recoverSessionOnAuthError();
    return;
  }

  const detailsText = [
    classified.table && `Tabela: ${classified.table}`,
    classified.operation && `Operação: ${classified.operation}`,
    classified.postgresCode && `Código PostgreSQL: ${classified.postgresCode}`,
    `Mensagem: ${classified.rawMessage}`,
    classified.details && `Detalhes: ${classified.details}`,
    classified.cause && `Causa: ${classified.cause}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (isDev) {
    toast.error(classified.title, {
      description: [
        classified.description,
        classified.cause,
        detailsText,
      ]
        .filter(Boolean)
        .join("\n\n"),
      duration: 15000,
    });
  } else {
    if (!detailsText) {
      toast.error(classified.title, {
        description: classified.description,
      });
      return;
    }

    toast.custom((toast) => {
      const toastId = (toast as unknown as { id: string | number }).id;
      return (
        <ExpandableErrorToast
          key={toastId}
          toastId={toastId}
          error={classified}
          detailsText={detailsText}
          t={t}
        />
      );
    });
  }
}

export function useSupabaseErrorHandler() {
  const { t } = useI18n();

  return (error: unknown, options?: { operation?: string; table?: string }) => {
    handleSupabaseError(error, { ...options, t });
  };
}
