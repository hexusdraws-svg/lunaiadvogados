import { useMemo } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useActiveCompanyLicenseAlert } from "@/hooks/use-license-alerts";
import { useI18n } from "@/hooks/use-i18n";

/**
 * PARTE 13/14 — Banner fixo no topo, em TODAS as páginas, quando existir um
 * alerta de expiração ativo para a empresa do utilizador. Mostra uma contagem
 * regressiva calculada a partir da data de criação do alerta + dias restantes.
 *
 * Não substitui as notificações do sino (PARTE 15) — é adicional.
 */
export function LicenseAlertBanner() {
  const { t } = useI18n();
  const { data: alert } = useActiveCompanyLicenseAlert();
  const [dismissed, setDismissed] = useState(false);

  // Contagem regressiva: dias restantes efetivos = days_remaining - dias decorridos
  const remaining = useMemo(() => {
    if (!alert) return null;
    const created = new Date(alert.created_at);
    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const elapsedDays = Math.floor(
      (startOfDay(new Date()) - startOfDay(created)) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, alert.days_remaining - elapsedDays);
  }, [alert]);

  if (!alert || remaining === null || dismissed) return null;

  const countdownText =
    remaining <= 0 ? t("licenseAlert.expiresToday", { defaultValue: "Hoje expira." }) : `${remaining} ${remaining === 1 ? t("licenseAlert.day", { defaultValue: "dia" }) : t("licenseAlert.days", { defaultValue: "dias" })}`;

  return (
    <div className="sticky top-0 z-[90] flex items-center justify-center gap-3 border-b border-red-700/40 bg-red-600 px-4 py-2 text-sm font-medium text-white">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-center">
        {alert.message}{" "}
        <strong>
          {remaining <= 0 ? t("licenseAlert.expiresToday", { defaultValue: "Hoje expira." }) : `${t("licenseAlert.expiresIn", { defaultValue: "Expira em" })} ${countdownText}.`}
        </strong>{" "}
        {t("licenseAlert.renewToAvoidInterruption", { defaultValue: "Renove para evitar interrupção." })}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 rounded p-0.5 text-white/80 hover:bg-white/20 hover:text-white"
        aria-label={t("closeAlert", { defaultValue: "Fechar aviso" })}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
