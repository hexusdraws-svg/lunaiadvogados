import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import {
  useAgendaEvents,
  getEventColor,
  useCreateAgendaEvent,
  useDeleteAgendaEvent,
} from "@/hooks/use-agenda-events";
import { useAudiencias } from "@/hooks/use-audiencias";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/use-auth";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, CalendarDays, Clock, MapPin, FileText, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DayPicker } from "react-day-picker";
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda" }] }),
  component: () => (
    <SuperAdminRedirect>
      <AgendaPage />
    </SuperAdminRedirect>
  ),
});

type EventForm = {
  title: string;
  description: string;
  event_date: string | null;
  event_time: string;
  location: string;
  notes: string;
  event_type: "audiencia" | "tarefa" | "consultoria" | "manual";
  reminder_date: string | null;
  reminder_time: string;
  phone_country_code: string;
  phone_number: string;
};

function AgendaPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>({
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    event_time: "",
    location: "",
    notes: "",
    event_type: "manual",
    reminder_date: null,
    reminder_time: "",
    phone_country_code: profile?.phone_country_code ?? "",
    phone_number: profile?.phone_number ?? "",
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

  const { data: agendaEvents, isLoading: loadingEvents } = useAgendaEvents({
    start: format(startOfMonth(month), "yyyy-MM-dd"),
    end: format(endOfMonth(month), "yyyy-MM-dd"),
  });

  const { data: audiencias, isLoading: loadingAudiencias } = useAudiencias({
    startDate: format(startOfMonth(month), "yyyy-MM-dd"),
    endDate: format(endOfMonth(month), "yyyy-MM-dd"),
  });

  const createMutation = useCreateAgendaEvent();

  const deleteMutation = useDeleteAgendaEvent();

  const daysInMonth = useMemo(() => {
    const interval = { start: startOfMonth(month), end: endOfMonth(month) };
    return eachDayOfInterval(interval);
  }, [month]);

  const getDayEvents = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const events = (agendaEvents ?? []).filter((e) => e.event_date === dateStr);
      const auds = (audiencias ?? [])
        .filter((a) => a.hearing_date === dateStr)
        .map((a) => ({
          id: a.id,
          title: a.processo_numero || "AudiÃªncia",
          event_type: "audiencia" as const,
          event_time: a.hearing_time,
          location: a.court_name,
          description: null,
          status: a.status,
        }));
    return [...events, ...auds];
  };

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getDayEvents(selectedDate);
  }, [selectedDate, agendaEvents, audiencias]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setForm((f) => ({ ...f, event_date: format(day, "yyyy-MM-dd") }));
  };

  const handleCreateEvent = () => {
    if (!form.title.trim()) return toast.error("TÃ­tulo obrigatÃ³rio");
    if (!form.reminder_date) return toast.error("Data de lembrete Ã© obrigatÃ³ria");
    createMutation.mutate(
      {
        title: form.title.trim(),
        description: form.description || null,
        event_date: form.event_date!,
        event_time: form.event_time || null,
        location: form.location || null,
        notes: form.notes || null,
        event_type: form.event_type,
        reminder_date: form.reminder_date,
        reminder_time: form.reminder_time || null,
        phone_country_code: form.phone_country_code,
        phone_number: form.phone_number,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm({
            title: "",
            description: "",
            event_date: format(new Date(), "yyyy-MM-dd"),
            event_time: "",
            location: "",
            notes: "",
            event_type: "manual",
            reminder_date: null,
            reminder_time: "",
            phone_country_code: profile?.phone_country_code ?? "",
            phone_number: profile?.phone_number ?? "",
          });
        },
      },
    );
  };

  const isLoading = loadingEvents || loadingAudiencias;

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("agenda.title")} subtitle={t("nav.agenda")} showSearch={false} />

        <div className="p-6 lg:p-8 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />{" "}
                    {t("agenda.eventTypes.audiencia")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500" />{" "}
                    {t("agenda.eventTypes.tarefa")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />{" "}
                    {t("agenda.eventTypes.consultoria")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />{" "}
                    {t("agenda.eventTypes.manual")}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!selectedDate) {
                      toast.error(t("agenda.selectDate"));
                      return;
                    }
                    setShowForm(true);
                  }}
                  disabled={!selectedDate}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> {t("agenda.newEvent")}
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <Card className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      {format(month, "MMMM yyyy", { locale: pt })}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonth(subMonths(month, 1))}
                      >
                        {t("agenda.previous")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonth(addMonths(month, 1))}
                      >
                        {t("agenda.next")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "SÃ¡b"].map((d) => (
                      <div
                        key={d}
                        className="bg-background px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px rounded-b-lg border border-t-0 border-border bg-border">
                    {daysInMonth.map((day) => {
                      const dayEvents = getDayEvents(day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => handleDayClick(day)}
                          className={cn(
                            "relative flex h-16 flex-col items-start justify-start gap-1 bg-background p-1.5 text-left transition-colors hover:bg-muted/50",
                            isSelected && "ring-2 ring-primary ring-inset",
                            isToday && "font-semibold",
                          )}
                        >
                          <span className={cn("text-[10px]", isToday && "text-primary")}>
                            {format(day, "d")}
                          </span>
                          <div className="flex flex-wrap gap-0.5">
                            {dayEvents.map((ev) => (
                              <span
                                key={ev.id}
                                className={cn(
                                  "h-1 w-1.5 rounded-full",
                                  getEventColor(ev.event_type),
                                )}
                                title={ev.title}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        {selectedDate
                          ? format(selectedDate, "dd MMMM yyyy", { locale: pt })
                          : t("agenda.selectDate")}
                      </h4>
                    </div>

                    <div className="space-y-2.5">
                      {selectedEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("agenda.noEvents")}</p>
                      ) : (
                        selectedEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="rounded-lg border border-border p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    getEventColor(ev.event_type),
                                  )}
                                />
                                <p className="text-sm font-medium leading-tight">{ev.title}</p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {ev.status || ev.event_type}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Deseja realmente excluir este evento?")) {
                                    deleteMutation.mutate(ev.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                title="Excluir evento"
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {ev.event_time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {ev.event_time}
                                </div>
                              )}
                              {ev.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {ev.location}
                                </div>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-xs text-muted-foreground">{ev.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("agenda.newEvent")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>{t("agenda.form.titleRequired")}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("agenda.form.description")}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("agenda.form.dateRequired")}</Label>
                  <DateInput
                    value={form.event_date}
                    onChange={(v) => setForm({ ...form, event_date: v })}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("agenda.form.time")}</Label>
                  <Input
                    type="time"
                    value={form.event_time}
                    onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("agenda.form.location")}</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("agenda.form.notes")}</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("agenda.form.type")}</Label>
                <Select
                  value={form.event_type}
                  onValueChange={(v) =>
                    setForm({ ...form, event_type: v as EventForm["event_type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t("agenda.eventTypes.manual")}</SelectItem>
                    <SelectItem value="audiencia">{t("agenda.eventTypes.audiencia")}</SelectItem>
                    <SelectItem value="tarefa">{t("agenda.eventTypes.tarefa")}</SelectItem>
                    <SelectItem value="consultoria">
                      {t("agenda.eventTypes.consultoria")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    {t("agenda.form.reminderDate", { defaultValue: "Data de Lembrete" })}
                  </Label>
                  <DateInput
                    value={form.reminder_date}
                    onChange={(v) => setForm({ ...form, reminder_date: v })}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {t("agenda.form.reminderTime", { defaultValue: "Hora de Lembrete" })}
                  </Label>
                  <Input
                    type="time"
                    value={form.reminder_time}
                    onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("agenda.form.profissionalContact")}</Label>
                <PhoneInput
                  countryCode={form.phone_country_code}
                  onCountryCodeChange={(v) => setForm({ ...form, phone_country_code: v })}
                  value={form.phone_number}
                  onChange={(v) => setForm({ ...form, phone_number: v })}
                  placeholder="+258 84 607 8509"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t("agenda.cancel")}
              </Button>
              <Button onClick={handleCreateEvent} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("agenda.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
