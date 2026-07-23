import { useState } from "react";
import { BriefcaseBusiness, Clock3, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTRACT_LABELS,
  ContractType,
  FRACTION_OPTIONS,
} from "@/lib/employment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OnboardingFlowProps {
  userId: string;
  earliestEntryDate?: string;
  onComplete: () => void;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

export const OnboardingFlow = ({
  userId,
  earliestEntryDate,
  onComplete,
}: OnboardingFlowProps) => {
  const [contractType, setContractType] = useState<ContractType>("mandate");
  const [fraction, setFraction] = useState("1");
  const [hourlyRate, setHourlyRate] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const rate = Number(hourlyRate || 0);
    const salary = Number(monthlySalary || 0);
    const employmentFraction = Number(fraction);

    if (contractType === "mandate" && rate <= 0) {
      toast.error("Podaj stawkę godzinową");
      return;
    }
    if (contractType === "employment" && salary < 0) {
      toast.error("Podaj poprawną miesięczną kwotę netto");
      return;
    }

    setSaving(true);
    const effectiveFrom = earliestEntryDate || today();

    const { data: existingPeriod } = await supabase
      .from("contract_periods")
      .select("id")
      .eq("user_id", userId)
      .is("effective_to", null)
      .maybeSingle();

    const periodPayload = {
      user_id: userId,
      contract_type: contractType,
      employment_fraction: employmentFraction,
      hourly_rate: rate,
      monthly_salary_net: salary,
      effective_from: effectiveFrom,
      effective_to: null,
    };

    const periodResult = existingPeriod
      ? await supabase
          .from("contract_periods")
          .update(periodPayload)
          .eq("id", existingPeriod.id)
      : await supabase.from("contract_periods").insert(periodPayload);

    if (periodResult.error) {
      toast.error("Nie udało się zapisać okresu umowy");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        contract_type: contractType,
        employment_fraction: employmentFraction,
        hourly_rate: rate,
        monthly_salary_net: salary,
        onboarding_completed: true,
      },
      { onConflict: "user_id" },
    );

    setSaving(false);
    if (error) {
      toast.error("Nie udało się zapisać ustawień");
      return;
    }

    toast.success("MoneyMeter jest gotowy");
    onComplete();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Pierwsze uruchomienie
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Jak pracujesz?</h1>
          <p className="mt-3 text-muted-foreground">
            Dopasujemy podsumowania i sposób liczenia godzin do Twojej umowy.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          {(["mandate", "employment"] as ContractType[]).map((type) => {
            const Icon = type === "mandate" ? Clock3 : BriefcaseBusiness;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setContractType(type)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  contractType === type
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Icon className="mb-4 h-6 w-6 text-primary" />
                <span className="block text-sm font-semibold">{CONTRACT_LABELS[type]}</span>
              </button>
            );
          })}
        </div>

        <Card className="surface-card space-y-5 p-5 sm:p-6">
          {contractType === "employment" ? (
            <>
              <div className="space-y-2">
                <Label>Wymiar etatu</Label>
                <Select value={fraction} onValueChange={setFraction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label htmlFor="monthly-salary">Średnia miesięczna wypłata netto</Label>
                <div className="relative">
                  <Input
                    id="monthly-salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlySalary}
                    onChange={(event) => setMonthlySalary(event.target.value)}
                    placeholder="np. 3600"
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    PLN
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Możesz wpisać 0 i uzupełnić dokładną kwotę później w historii.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="hourly-rate">Stawka godzinowa</Label>
              <div className="relative">
                <Input
                  id="hourly-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                  placeholder="np. 32.00"
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  PLN/h
                </span>
              </div>
            </div>
          )}

          <Button className="h-12 w-full gradient-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Zapisywanie…" : "Przejdź do aplikacji"}
          </Button>
        </Card>
      </div>
    </main>
  );
};
