import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CONTRACT_LABELS,
  ContractPeriod,
  ContractType,
  FRACTION_OPTIONS,
  UserSettings,
} from "@/lib/employment";
import { Button } from "@/components/ui/button";
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
  activePeriod?: ContractPeriod;
  onUpdate?: () => void;
}

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const firstOfCurrentMonth = () => `${localDate().slice(0, 7)}-01`;

const previousDate = (date: string) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
};

export const SettingsDialog = ({
  settings,
  activePeriod,
  onUpdate,
}: SettingsDialogProps) => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [contractType, setContractType] = useState<ContractType>("mandate");
  const [fraction, setFraction] = useState("1");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [effectiveFrom, setEffectiveFrom] = useState(localDate());
  const [monthTarget, setMonthTarget] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !settings) return;
    setContractType(settings.contractType);
    setFraction(String(settings.employmentFraction));
    setHourlyRate(String(settings.hourlyRate));
    setMonthlySalary(String(settings.monthlySalaryNet));
    setEffectiveFrom(localDate());

    if (user) {
      supabase
        .from("work_time_overrides")
        .select("target_hours")
        .eq("user_id", user.id)
        .eq("month", firstOfCurrentMonth())
        .maybeSingle()
        .then(({ data }) => setMonthTarget(data ? String(data.target_hours) : ""));
    }
  }, [open, settings, user]);

  const saveContractPeriod = async (
    type: ContractType,
    employmentFraction: number,
    rate: number,
    salary: number,
  ) => {
    if (!user) return new Error("Brak użytkownika");
    const payload = {
      user_id: user.id,
      contract_type: type,
      employment_fraction: employmentFraction,
      hourly_rate: rate,
      monthly_salary_net: salary,
      effective_from: effectiveFrom,
      effective_to: null,
    };

    if (!activePeriod) {
      const { error } = await supabase.from("contract_periods").insert(payload);
      return error;
    }

    if (effectiveFrom < activePeriod.effectiveFrom) {
      return new Error("Data zmiany nie może poprzedzać początku obecnej umowy");
    }

    if (effectiveFrom === activePeriod.effectiveFrom) {
      const { error } = await supabase
        .from("contract_periods")
        .update(payload)
        .eq("id", activePeriod.id);
      return error;
    }

    const { error: closeError } = await supabase
      .from("contract_periods")
      .update({ effective_to: previousDate(effectiveFrom) })
      .eq("id", activePeriod.id);
    if (closeError) return closeError;

    const { error } = await supabase.from("contract_periods").insert(payload);
    return error;
  };

  const handleSave = async () => {
    if (!user) return;
    const rate = Number(hourlyRate || 0);
    const salary = Number(monthlySalary || 0);
    const employmentFraction = Number(fraction);
    if (contractType === "mandate" && rate <= 0) {
      toast.error("Podaj poprawną stawkę godzinową");
      return;
    }
    if (!effectiveFrom) {
      toast.error("Podaj datę obowiązywania zmiany");
      return;
    }

    setSaving(true);
    const periodError = await saveContractPeriod(
      contractType,
      employmentFraction,
      rate,
      salary,
    );

    if (periodError) {
      toast.error(periodError.message || "Nie udało się zapisać historii umowy");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        contract_type: contractType,
        employment_fraction: employmentFraction,
        hourly_rate: rate,
        monthly_salary_net: salary,
        onboarding_completed: true,
      },
      { onConflict: "user_id" },
    );

    if (!error && contractType === "employment") {
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
      toast.error("Nie udało się zapisać ustawień");
      return;
    }

    toast.success("Ustawienia zostały zapisane");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ustawienia pracy</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
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
                <Label htmlFor="settings-salary">Domyślna miesięczna wypłata netto</Label>
                <Input
                  id="settings-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlySalary}
                  onChange={(event) => setMonthlySalary(event.target.value)}
                />
              </div>
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
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="settings-rate">Stawka godzinowa</Label>
              <Input
                id="settings-rate"
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="effective-from">Zmiana obowiązuje od</Label>
            <Input
              id="effective-from"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Wcześniejsze miesiące pozostaną przypisane do poprzedniej umowy.
            </p>
          </div>

          <Button className="h-11 w-full gradient-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Zapisywanie…" : "Zapisz zmiany"}
          </Button>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Wyloguj się
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
