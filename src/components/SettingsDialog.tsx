import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CONTRACT_LABELS,
  ContractPeriod,
  ContractType,
  FRACTION_OPTIONS,
  UserSettings,
  getCurrentPeriod,
  getTodayKey,
} from "@/lib/employment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SettingsDialogProps {
  settings?: UserSettings;
  periods?: ContractPeriod[];
  onUpdate?: () => void;
}

const firstOfCurrentMonth = () => `${getTodayKey().slice(0, 7)}-01`;

const previousDate = (date: string) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
};

const normalizeTimeline = (periods: ContractPeriod[]): ContractPeriod[] => {
  const sorted = [...periods].sort((first, second) =>
    first.effectiveFrom.localeCompare(second.effectiveFrom),
  );
  return sorted.map((period, index) => ({
    ...period,
    effectiveTo:
      index < sorted.length - 1
        ? previousDate(sorted[index + 1].effectiveFrom)
        : null,
  }));
};

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getPeriodStatus = (period: ContractPeriod) => {
  const today = getTodayKey();
  if (period.effectiveFrom > today) return "planned";
  if (!period.effectiveTo || period.effectiveTo >= today) return "current";
  return "past";
};

export const SettingsDialog = ({
  settings,
  periods = [],
  onUpdate,
}: SettingsDialogProps) => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<ContractPeriod[]>([]);
  const [contractType, setContractType] = useState<ContractType>("mandate");
  const [fraction, setFraction] = useState("1");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [effectiveFrom, setEffectiveFrom] = useState(getTodayKey());
  const [monthTarget, setMonthTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const currentDraftPeriod = useMemo(
    () => getCurrentPeriod(timeline),
    [timeline],
  );

  useEffect(() => {
    if (!open || !settings) return;
    const initialTimeline =
      periods.length > 0
        ? normalizeTimeline(periods)
        : normalizeTimeline([
            {
              id: "initial",
              contractType: settings.contractType,
              employmentFraction: settings.employmentFraction,
              hourlyRate: settings.hourlyRate,
              monthlySalaryNet: settings.monthlySalaryNet,
              effectiveFrom: getTodayKey(),
              effectiveTo: null,
            },
          ]);
    setTimeline(initialTimeline);
    setEditorOpen(false);
    setEditingId(null);

    if (user) {
      supabase
        .from("work_time_overrides")
        .select("target_hours")
        .eq("user_id", user.id)
        .eq("month", firstOfCurrentMonth())
        .maybeSingle()
        .then(({ data }) => setMonthTarget(data ? String(data.target_hours) : ""));
    }
  }, [open, periods, settings, user]);

  const resetEditor = (period?: ContractPeriod) => {
    setEditingId(period?.id ?? null);
    setContractType(period?.contractType ?? currentDraftPeriod?.contractType ?? "mandate");
    setFraction(String(period?.employmentFraction ?? currentDraftPeriod?.employmentFraction ?? 1));
    setHourlyRate(String(period?.hourlyRate ?? currentDraftPeriod?.hourlyRate ?? 0));
    setMonthlySalary(String(period?.monthlySalaryNet ?? currentDraftPeriod?.monthlySalaryNet ?? 0));
    setEffectiveFrom(period?.effectiveFrom ?? getTodayKey());
    setEditorOpen(true);
  };

  const handlePeriodDraft = () => {
    const rate = Number(hourlyRate || 0);
    const salary = Number(monthlySalary || 0);
    const employmentFraction = Number(fraction);
    if (!effectiveFrom) {
      toast.error("Podaj datę rozpoczęcia umowy");
      return;
    }
    if (contractType === "mandate" && rate <= 0) {
      toast.error("Podaj stawkę godzinową dla umowy zlecenia");
      return;
    }
    if (
      timeline.some(
        (period) =>
          period.effectiveFrom === effectiveFrom && period.id !== editingId,
      )
    ) {
      toast.error("W tej dacie rozpoczyna się już inna umowa");
      return;
    }

    const draft: ContractPeriod = {
      id: editingId ?? `draft-${Date.now()}`,
      contractType,
      employmentFraction,
      hourlyRate: rate,
      monthlySalaryNet: salary,
      effectiveFrom,
      effectiveTo: null,
    };
    setTimeline((current) =>
      normalizeTimeline([
        ...current.filter((period) => period.id !== editingId),
        draft,
      ]),
    );
    setEditorOpen(false);
    setEditingId(null);
  };

  const handleDeletePeriod = (id: string) => {
    if (timeline.length === 1) {
      toast.error("Musi pozostać co najmniej jedna umowa");
      return;
    }
    setTimeline((current) =>
      normalizeTimeline(current.filter((period) => period.id !== id)),
    );
  };

  const handleSave = async () => {
    if (!user || timeline.length === 0) return;
    if (editorOpen) {
      toast.error("Najpierw zatwierdź lub anuluj edytowaną umowę");
      return;
    }

    setSaving(true);
    const normalized = normalizeTimeline(timeline);
    if (normalized[0].effectiveFrom > getTodayKey()) {
      toast.error("Oś umów musi obejmować także dzisiejszy dzień");
      setSaving(false);
      return;
    }
    const { error: timelineError } = await supabase.rpc(
      "replace_contract_timeline",
      {
        p_periods: normalized.map((period) => ({
          contract_type: period.contractType,
          employment_fraction: period.employmentFraction,
          hourly_rate: period.hourlyRate,
          monthly_salary_net: period.monthlySalaryNet,
          effective_from: period.effectiveFrom,
          effective_to: period.effectiveTo,
        })),
      },
    );

    if (timelineError) {
      toast.error("Nie udało się zapisać osi umów");
      setSaving(false);
      return;
    }

    const current = getCurrentPeriod(normalized) ?? normalized[0];
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        contract_type: current.contractType,
        employment_fraction: current.employmentFraction,
        hourly_rate: current.hourlyRate,
        monthly_salary_net: current.monthlySalaryNet,
        onboarding_completed: true,
      },
      { onConflict: "user_id" },
    );

    if (!error && current.contractType === "employment") {
      const target = Number(monthTarget);
      if (monthTarget && target >= 0) {
        await supabase.from("work_time_overrides").upsert(
          {
            user_id: user.id,
            month: firstOfCurrentMonth(),
            target_hours: target,
          },
          { onConflict: "user_id,month" },
        );
      } else {
        await supabase
          .from("work_time_overrides")
          .delete()
          .eq("user_id", user.id)
          .eq("month", firstOfCurrentMonth());
      }
    }

    setSaving(false);
    if (error) {
      toast.error("Oś umów została zapisana, ale nie udało się odświeżyć ustawień");
      return;
    }

    toast.success("Historia i zaplanowane umowy zostały zapisane");
    setOpen(false);
    onUpdate?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ustawienia">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editorOpen ? "Szczegóły umowy" : "Ustawienia pracy"}
          </DialogTitle>
        </DialogHeader>

        {editorOpen ? (
          <div className="space-y-5 pt-2">
            <Button
              variant="ghost"
              className="-ml-3"
              onClick={() => setEditorOpen(false)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Wróć do osi umów
            </Button>
            <div className="space-y-2">
              <Label>Rodzaj umowy</Label>
              <Select value={contractType} onValueChange={(value) => setContractType(value as ContractType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTRACT_LABELS) as ContractType[]).map((type) => (
                    <SelectItem key={type} value={type}>{CONTRACT_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {contractType === "employment" ? (
              <>
                <div className="space-y-2">
                  <Label>Wymiar etatu</Label>
                  <Select value={fraction} onValueChange={setFraction}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FRACTION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline-salary">Domyślna wypłata netto</Label>
                  <Input
                    id="timeline-salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlySalary}
                    onChange={(event) => setMonthlySalary(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="timeline-rate">Stawka godzinowa</Label>
                <Input
                  id="timeline-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="timeline-from">Obowiązuje od</Label>
              <Input
                id="timeline-from"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Koniec poprzedniej umowy ustawi się automatycznie na dzień wcześniej.
              </p>
            </div>
            <Button className="h-11 w-full gradient-primary" onClick={handlePeriodDraft}>
              {editingId ? "Zatwierdź zmiany" : "Dodaj do osi umów"}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="rounded-2xl border border-border bg-background/25 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Historia i plan umów</h3>
                  <p className="text-xs text-muted-foreground">
                    Dodaj przeszłe lub przyszłe daty rozpoczęcia.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => resetEditor()}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Dodaj
                </Button>
              </div>

              <div className="space-y-2">
                {timeline.map((period) => {
                  const status = getPeriodStatus(period);
                  return (
                    <div
                      key={period.id}
                      className="rounded-xl border border-border/70 bg-card/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <BriefcaseBusiness className="h-4 w-4 text-primary" />
                            <p className="font-medium">{CONTRACT_LABELS[period.contractType]}</p>
                            <Badge
                              variant={status === "current" ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {status === "current"
                                ? "Obecna"
                                : status === "planned"
                                  ? "Zaplanowana"
                                  : "Zakończona"}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDate(period.effectiveFrom)}
                            {" – "}
                            {period.effectiveTo ? formatDate(period.effectiveTo) : "bezterminowo"}
                          </div>
                        </div>
                        <div className="flex shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => resetEditor(period)}
                            aria-label="Edytuj umowę"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeletePeriod(period.id)}
                            aria-label="Usuń umowę"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {currentDraftPeriod?.contractType === "employment" && (
              <div className="space-y-2">
                <Label htmlFor="month-target">Limit godzin w bieżącym miesiącu</Label>
                <Input
                  id="month-target"
                  type="number"
                  min="0"
                  step="0.25"
                  value={monthTarget}
                  onChange={(event) => setMonthTarget(event.target.value)}
                  placeholder="Automatyczny"
                />
                <p className="text-xs text-muted-foreground">
                  Pozostaw puste, aby korzystać z polskiego kalendarza czasu pracy.
                </p>
              </div>
            )}

            <Button className="h-11 w-full gradient-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Zapisywanie…" : "Zapisz oś umów"}
            </Button>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Wyloguj się
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
