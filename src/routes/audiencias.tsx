import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import {
  useAudiencias,
  useUpdateAudienciaStatus,
  useCreateAudiencia,
  useUpdateAudiencia,
  useDeleteAudiencia,
  useProcessosForSelect,
  type Audiencia,
} from "@/hooks/use-audiencias";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  CalendarClock,
  MapPin,
  Gavel,
  CheckCircle,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Scale,
  Search,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { LegalGuidanceDialog } from "@/components/legal-guidance-dialog";

export const Route = createFileRoute("/audiencias")({
  head: () => ({ meta: [{ title: "AudiÃªncias" }] }),
  component: () => (
    <SuperAdminRedirect>
      <AudienciasPage />
    </SuperAdminRedirect>
  ),
});

type TabKey = "ativas" | "canceladas" | "concluidas";

function AudienciasPage() {
  const { t, language, dateFormat } = useI18n();
  const { profile } = useAuth();
  const { data: audiencias, isLoading } = useAudiencias();
  const { data: processos = [] } = useProcessosForSelect();
  const updateStatus = useUpdateAudienciaStatus();
  const createAudiencia = useCreateAudiencia();
  const updateAudiencia = useUpdateAudiencia();
  const deleteAudiencia = useDeleteAudiencia();
  const canAdd = can(profile, "create_hearing");

  const [open, setOpen] = useState(false);
  const [editingAudiencia, setEditingAudiencia] = useState<Audiencia | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("ativas");
  const [detailsAudiencia, setDetailsAudiencia] = useState<Audiencia | null>(null);
  const [guidanceAudiencia, setGuidanceAudiencia] = useState<Audiencia | null>(null);
  const [search, setSearch] = useState("");

  const locale = language === "en" ? enUS : dateFnsPt;

  const [form, setForm] = useState({
    case_id: "",
    hearing_date: null as string | null,
    hearing_time: "",
    court_name: "",
    city: "",
    judge_name: "",
    notes: "",
    reminder_date: null as string | null,
    reminder_time: "",
    phone_country_code: profile?.phone_country_code ?? "+258",
    phone_number: profile?.phone_number ?? "",
    enable_legal_guidance: false,
    case_type: "",
    case_description: "",
    people_involved: "",
    expected_outcome: "",
    legal_notes: "",
  });

  useEffect(() => {
    if (profile?.phone_country_code && !form.phone_country_code) {
      const cc = profile.phone_country_code;
      setForm((f) => ({ ...f, phone_country_code: cc }));
    }
    if (profile?.phone_number && !form.phone_number) {
      const pn = profile.phone_number;
      setForm((f) => ({ ...f, phone_number: pn }));
    }
  }, [profile?.phone_country_code, profile?.phone_number]);

  const resetForm = () =>
    setForm({
      case_id: "",
      hearing_date: null,
      hearing_time: "",
      court_name: "",
      city: "",
      judge_name: "",
      notes: "",
      reminder_date: null,
      reminder_time: "",
      phone_country_code: profile?.phone_country_code || "+258",
      phone_number: profile?.phone_number || "",
      enable_legal_guidance: false,
      case_type: "",
      case_description: "",
      people_involved: "",
      expected_outcome: "",
      legal_notes: "",
    });

  const openCreate = () => {
    setEditingAudiencia(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (a: Audiencia) => {
    setEditingAudiencia(a);
    setForm({
      case_id: a.case_id,
      hearing_date: a.hearing_date || null,
      hearing_time: a.hearing_time,
      court_name: a.court_name,
      city: a.city,
      judge_name: a.judge_name || "",
      notes: a.notes || "",
      reminder_date: a.reminder_date || null,
      reminder_time: a.reminder_time || "",
      phone_country_code: profile?.phone_country_code || "+258",
      phone_number: profile?.phone_number || "",
      enable_legal_guidance: a.enable_legal_guidance ?? false,
      case_type: a.case_type || "",
      case_description: a.case_description || "",
      people_involved: a.people_involved || "",
      expected_outcome: a.expected_outcome || "",
      legal_notes: a.legal_notes || "",
    });
    setOpen(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({
        id,
        status: status as "Scheduled" | "Completed" | "Cancelled" | "Rescheduled",
      });
    } catch {
      // handled by hook
    }
  };

  const openDetails = (a: Audiencia) => {
    setDetailsAudiencia(a);
  };

  const handleCreate = async () => {
    if (!form.case_id)
      return toast.error(
        t("audiencias.form.selectProcess", { defaultValue: "Selecione o processo" }),
      );
    if (!form.hearing_date || !form.hearing_time)
      return toast.error(t("audiencias.form.dateAndTimeRequired"));
    if (!form.court_name.trim())
      return toast.error(
        t("audiencias.form.courtRequired", { defaultValue: "Tribunal obrigatÃ³rio" }),
      );
    if (!form.city.trim()) return toast.error(t("audiencias.form.cityRequired"));
    if (!form.reminder_date) return toast.error(t("audiencias.form.reminderRequired"));

    try {
      await createAudiencia.mutateAsync({
        case_id: form.case_id,
        hearing_date: form.hearing_date,
        hearing_time: form.hearing_time,
        court_name: form.court_name.trim(),
        city: form.city.trim(),
        judge_name: form.judge_name.trim() || null,
        notes: form.notes.trim() || null,
        reminder_date: form.reminder_date,
        reminder_time: form.reminder_time,
        enable_legal_guidance: form.enable_legal_guidance,
        case_type: form.case_type || null,
        case_description: form.case_description || null,
        people_involved: form.people_involved || null,
        expected_outcome: form.expected_outcome || null,
        legal_notes: form.legal_notes || null,
        phone_number: form.phone_number,
        phone_country_code: form.phone_country_code,
      });
      toast.success(
        t("audiencias.createSuccess", { defaultValue: "AudiÃªncia criada com sucesso" }),
      );
      setOpen(false);
      resetForm();
    } catch {
      // handled by hook
    }
  };

  const handleUpdate = async () => {
    if (!editingAudiencia) return;
    if (!form.case_id)
      return toast.error(
        t("audiencias.form.selectProcess", { defaultValue: "Selecione o processo" }),
      );
    if (!form.hearing_date || !form.hearing_time)
      return toast.error(t("audiencias.form.dateAndTimeRequired"));
    if (!form.court_name.trim())
      return toast.error(
        t("audiencias.form.courtRequired", { defaultValue: "Tribunal obrigatÃ³rio" }),
      );
    if (!form.city.trim()) return toast.error(t("audiencias.form.cityRequired"));
    if (!form.reminder_date) return toast.error(t("audiencias.form.reminderRequired"));

    try {
      await updateAudiencia.mutateAsync({
        id: editingAudiencia.id,
        case_id: form.case_id,
        hearing_date: form.hearing_date,
        hearing_time: form.hearing_time,
        court_name: form.court_name.trim(),
        city: form.city.trim(),
        judge_name: form.judge_name.trim() || null,
        notes: form.notes.trim() || null,
        status: editingAudiencia.status,
        reminder_date: form.reminder_date,
        reminder_time: form.reminder_time,
        enable_legal_guidance: form.enable_legal_guidance,
        case_type: form.case_type || null,
        case_description: form.case_description || null,
        people_involved: form.people_involved || null,
        expected_outcome: form.expected_outcome || null,
        legal_notes: form.legal_notes || null,
      });
      toast.success("AudiÃªncia actualizada com sucesso");
      setOpen(false);
      setEditingAudiencia(null);
      resetForm();
    } catch {
      // handled by hook
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteAudiencia.mutateAsync(confirmDeleteId);
      toast.success("AudiÃªncia removida com sucesso");
    } catch {
      // handled
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const fmtDate = (v?: string | null) => {
    if (!v) return "â€”";
    try {
      return format(parseISO(v), dateFormat, { locale });
    } catch {
      return v;
    }
  };

  const statusMap: Record<string, { label: string; variant: string }> = {
    Scheduled: { label: "Agendada", variant: "bg-info/15 text-info border-info/30" },
    Completed: { label: "ConcluÃ­da", variant: "bg-success/15 text-success border-success/30" },
    Cancelled: {
      label: "Cancelada",
      variant: "bg-destructive/15 text-destructive border-destructive/30",
    },
    Rescheduled: { label: "Reagendada", variant: "bg-warning/15 text-warning border-warning/30" },
  };

  const filtered = useMemo(() => {
    const list = audiencias ?? [];
    let result: Audiencia[];
    if (tab === "ativas")
      result = list.filter((a) => a.status === "Scheduled" || a.status === "Rescheduled");
    else if (tab === "canceladas") result = list.filter((a) => a.status === "Cancelled");
    else if (tab === "concluidas") result = list.filter((a) => a.status === "Completed");
    else result = list;

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (a) =>
          a.case_id.toLowerCase().includes(q) ||
          (a.court_name ?? "").toLowerCase().includes(q) ||
          (a.city ?? "").toLowerCase().includes(q) ||
          (a.notes ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [audiencias, tab, search]);

  const stats = useMemo(() => {
    const list = audiencias ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekFromNowStr = weekFromNow.toISOString().slice(0, 10);

    return {
      hoje: list.filter((a) => a.hearing_date === today).length,
      proximos7Dias: list.filter(
        (a) =>
          a.hearing_date >= today &&
          a.hearing_date <= weekFromNowStr &&
          (a.status === "Scheduled" || a.status === "Rescheduled"),
      ).length,
      canceladas: list.filter((a) => a.status === "Cancelled").length,
      concluidas: list.filter((a) => a.status === "Completed").length,
    };
  }, [audiencias]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <PageHeader title={t("audiencias")} />
          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("audiencias")} subtitle={t("nav.audiencias")} />
        <div className="p-6 lg:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("search") + "..."}
                className="h-9 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              {canAdd && (
                <Button className="gap-1.5" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> {t("audiencias.createButton")}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("audiencias.stats.today")}
              </p>
              <p className="text-xl font-semibold">{stats.hoje}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("audiencias.stats.next7Days")}
              </p>
              <p className="text-xl font-semibold">{stats.proximos7Dias}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("audiencias.stats.cancelled")}
              </p>
              <p className="text-xl font-semibold text-destructive">{stats.canceladas}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("audiencias.stats.completed")}
              </p>
              <p className="text-xl font-semibold text-success">{stats.concluidas}</p>
            </Card>
          </div>

          <div className="flex gap-1 border-b border-border">
            {(["ativas", "canceladas", "concluidas"] as TabKey[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  tab === tb
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tb === "ativas" && t("audiencias.tabs.active")}
                {tb === "canceladas" && t("audiencias.tabs.cancelled")}
                {tb === "concluidas" && t("audiencias.tabs.completed")}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <Gavel className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {t("audiencias.empty.title")}
              </p>
              <p className="text-xs text-muted-foreground">
                {tab === "ativas" && t("audiencias.empty.active")}
                {tab === "canceladas" && t("audiencias.empty.cancelled")}
                {tab === "concluidas" && t("audiencias.empty.completed")}
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t("audiencias.form.hearingDate")}</th>
                      <th className="px-4 py-3 font-medium">{t("time")}</th>
                      <th className="px-4 py-3 font-medium">{t("process")}</th>
                      <th className="px-4 py-3 font-medium">{t("client")}</th>
                      <th className="px-4 py-3 font-medium">{t("court")}</th>
                      <th className="px-4 py-3 font-medium">{t("audiencias.form.city")}</th>
                      <th className="px-4 py-3 font-medium">{t("status")}</th>
                      <th className="px-4 py-3 font-medium w-32">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const info = statusMap[a.status] || statusMap["Scheduled"];
                      return (
                        <tr
                          key={a.id}
                          className="border-t border-border/60 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => openDetails(a)}
                        >
                          <td className="px-4 py-3">{fmtDate(a.hearing_date)}</td>
                          <td className="px-4 py-3">{a.hearing_time}</td>
                          <td className="px-4 py-3 font-medium">{a.processo_numero || "â€”"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {a.cliente_nome || "â€”"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{a.court_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.city}</td>
                          <td className="px-4 py-3">
                            <Badge className={cn(info.variant, "border")}>{info.label}</Badge>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-1">
                              {a.status === "Scheduled" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(a.id, "Completed");
                                    }}
                                    className="h-7 w-7 p-0 text-success"
                                    title={t("nav.audienciasActions.markCompleted")}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(a.id, "Cancelled");
                                    }}
                                    className="h-7 w-7 p-0 text-destructive"
                                    title={t("nav.audienciasActions.markCancelled")}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(a);
                                }}
                                className="h-7 w-7 p-0"
                                title={t("edit")}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGuidanceAudiencia(a);
                                }}
                                className="h-7 w-7 p-0 text-primary"
                                title={t("nav.audienciasActions.legalGuidance")}
                              >
                                <Scale className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(a.id);
                                }}
                                className="h-7 w-7 p-0 text-destructive"
                                title={t("delete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAudiencia
                  ? t("nav.audienciasActions.edit")
                  : t("nav.audienciasActions.new")}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("process")} *</Label>
                  <Select
                    value={form.case_id}
                    onValueChange={(v) => setForm({ ...form, case_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectProcess")} />
                    </SelectTrigger>
                    <SelectContent>
                      {processos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} Â· {p.cliente_nome ?? "â€”"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("date")} *</Label>
                    <DateInput
                      value={form.hearing_date}
                      onChange={(v) => setForm({ ...form, hearing_date: v })}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("time")} *</Label>
                    <Input
                      type="time"
                      value={form.hearing_time}
                      onChange={(e) => setForm({ ...form, hearing_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("court")} *</Label>
                  <Input
                    value={form.court_name}
                    onChange={(e) => setForm({ ...form, court_name: e.target.value })}
                    placeholder={t("court")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("audiencias.form.city")} *
                    </Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder={t("city")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("judge")}</Label>
                    <Input
                      value={form.judge_name}
                      onChange={(e) => setForm({ ...form, judge_name: e.target.value })}
                      placeholder={t("judge")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("notes")}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={t("notes")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("audiencias.form.reminderDate")}
                    </Label>
                    <DateInput
                      value={form.reminder_date}
                      onChange={(v) => setForm({ ...form, reminder_date: v })}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("audiencias.form.reminderTime")}
                    </Label>
                    <Input
                      type="time"
                      value={form.reminder_time}
                      onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("audiencias.form.whatsappContact")}
                  </Label>
                  <PhoneInput
                    countryCode={form.phone_country_code}
                    onCountryCodeChange={(v) => setForm({ ...form, phone_country_code: v })}
                    value={form.phone_number}
                    onChange={(v) => setForm({ ...form, phone_number: v })}
                    placeholder="+258 84 607 8509"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Card className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold">{t("audiencias.form.legalGuidance")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("audiencias.form.legalGuidanceHint")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {t("audiencias.form.generateLegalGuidance")}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.enable_legal_guidance}
                        onChange={(e) =>
                          setForm({ ...form, enable_legal_guidance: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div
                      className={cn(
                        "grid gap-3 overflow-hidden transition-all duration-300 ease-in-out",
                        form.enable_legal_guidance
                          ? "max-h-[800px] opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t("audiencias.form.caseType")}
                        </Label>
                        <Select
                          value={form.case_type}
                          onValueChange={(v) => setForm({ ...form, case_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectCaseType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="criminal">
                              {t("audiencias.caseType.criminal", {
                                defaultValue: "Processo Criminal",
                              })}
                            </SelectItem>
                            <SelectItem value="civil">
                              {t("audiencias.caseType.civil", { defaultValue: "Processo CÃ­vel" })}
                            </SelectItem>
                            <SelectItem value="laboral">
                              {t("audiencias.caseType.laboral", {
                                defaultValue: "Processo Laboral",
                              })}
                            </SelectItem>
                            <SelectItem value="comercial">
                              {t("audiencias.caseType.comercial", {
                                defaultValue: "Processo Comercial",
                              })}
                            </SelectItem>
                            <SelectItem value="administrativo">
                              {t("audiencias.caseType.administrativo", {
                                defaultValue: "Processo Administrativo",
                              })}
                            </SelectItem>
                            <SelectItem value="familiar">
                              {t("audiencias.caseType.familiar", {
                                defaultValue: "Processo Familiar",
                              })}
                            </SelectItem>
                            <SelectItem value="outro">
                              {t("audiencias.caseType.other", { defaultValue: "Outro" })}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t("audiencias.form.caseDescription")}
                        </Label>
                        <Textarea
                          value={form.case_description}
                          onChange={(e) => setForm({ ...form, case_description: e.target.value })}
                          rows={4}
                          placeholder={t("legalGuidancePlaceholder")}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {t("audiencias.form.caseDescriptionHint")}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t("legalGuidancePeople")}
                        </Label>
                        <Textarea
                          value={form.people_involved}
                          onChange={(e) => setForm({ ...form, people_involved: e.target.value })}
                          rows={3}
                          placeholder={t("legalGuidancePeople")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t("audiencias.form.expectedGoal")}
                        </Label>
                        <Textarea
                          value={form.expected_outcome}
                          onChange={(e) => setForm({ ...form, expected_outcome: e.target.value })}
                          rows={3}
                          placeholder={t("audiencias.form.expectedGoalPlaceholder", {
                            defaultValue: "Qual o resultado esperado nesta audiÃªncia?",
                          })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t("audiencias.form.additionalNotes")}
                        </Label>
                        <Textarea
                          value={form.legal_notes}
                          onChange={(e) => setForm({ ...form, legal_notes: e.target.value })}
                          rows={3}
                          placeholder={t("audiencias.form.additionalNotesPlaceholder", {
                            defaultValue:
                              "InformaÃ§Ãµes que possam ajudar na preparaÃ§Ã£o jurÃ­dica.",
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditingAudiencia(null);
                  resetForm();
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={editingAudiencia ? handleUpdate : handleCreate}
                disabled={createAudiencia.isPending || updateAudiencia.isPending}
              >
                {(createAudiencia.isPending || updateAudiencia.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingAudiencia ? t("save") : t("audiencias.createButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("audiencias.confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("audiencias.confirmDeleteDesc", {
                  defaultValue:
                    "Tem a certeza que deseja eliminar esta audiÃªncia? Esta aÃ§Ã£o nÃ£o pode ser desfeita.",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Sheet open={!!detailsAudiencia} onOpenChange={(o) => !o && setDetailsAudiencia(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{t("audiencias.details.title")}</SheetTitle>
            </SheetHeader>
            {detailsAudiencia && (
              <ScrollArea className="h-[calc(100vh-80px)] px-1">
                <div className="grid gap-4 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("audiencias.details.process")}
                    </p>
                    <p className="text-sm font-semibold">
                      {detailsAudiencia.processo_numero || "â€”"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {detailsAudiencia.cliente_nome || "â€”"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("audiencias.details.date")}
                      </p>
                      <p className="text-sm font-semibold">
                        {fmtDate(detailsAudiencia.hearing_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("audiencias.details.time")}
                      </p>
                      <p className="text-sm font-semibold">{detailsAudiencia.hearing_time}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("audiencias.details.court")}
                    </p>
                    <p className="text-sm font-semibold">{detailsAudiencia.court_name}</p>
                    <p className="text-xs text-muted-foreground">{detailsAudiencia.city}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("audiencias.details.status")}
                    </p>
                    <Badge
                      className={cn(
                        (statusMap[detailsAudiencia.status] || statusMap["Scheduled"]).variant,
                        "border",
                      )}
                    >
                      {(statusMap[detailsAudiencia.status] || statusMap["Scheduled"]).label}
                    </Badge>
                  </div>
                  {detailsAudiencia.notes && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("audiencias.details.notes")}
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {detailsAudiencia.notes}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("audiencias.details.legalPrep")}
                    </p>
                    {!detailsAudiencia.enable_legal_guidance ? (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          {t("audiencias.details.noLegalGuidance")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("audiencias.details.legalGuidancePending")}
                        </p>
                      </div>
                    ) : detailsAudiencia.legal_guidance_status === "pending" ? (
                      <div className="mt-2">
                        <Badge variant="outline" className="border-warning text-warning">
                          {t("audiencias.details.legalGuidancePendingBadge")}
                        </Badge>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setGuidanceAudiencia(detailsAudiencia)}
                        >
                          {t("audiencias.form.viewLegalGuidance", {
                            defaultValue: "Ver OrientaÃ§Ã£o JurÃ­dica",
                          })}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>

        <LegalGuidanceDialog
          open={!!guidanceAudiencia}
          onOpenChange={(o) => !o && setGuidanceAudiencia(null)}
          hearing={guidanceAudiencia}
        />
      </main>
    </div>
  );
}
