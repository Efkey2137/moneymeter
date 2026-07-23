import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Banknote, Calendar, Clock3, Gauge, HeartPulse } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { TimeEntriesList } from "@/components/TimeEntriesList";
import { MonthlySalaryDialog } from "@/components/MonthlySalaryDialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CONTRACT_LABELS,
  ContractPeriod,
  ContractType,
  DEFAULT_SETTINGS,
  EntryType,
  UserSettings,
  getPeriodForDate,
} from "@/lib/employment";
import {
  TimeEntry,
  formatCurrency,
  getMonthName,
  groupEntriesByMonth,
} from "@/lib/timeUtils";
import { toast } from "sonner";

const mapEntry = (entry: {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  hourly_rate: number;
  entry_type: string;
  note: string | null;
}): TimeEntry => ({
  id: entry.id,
  date: entry.date,
  startTime: entry.start_time,
  endTime: entry.end_time,
  hours: entry.hours,
  hourlyRate: entry.hourly_rate || 0,
  entryType: entry.entry_type as EntryType,
  note: entry.note,
});

const History = () => {
  const { user } = useAuth();
  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, TimeEntry[]>>({});
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [periods, setPeriods] = useState<ContractPeriod[]>([]);
  const [compensation, setCompensation] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [settingsResult, entriesResult, periodsResult, compensationResult] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("time_entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("contract_periods").select("*").eq("user_id", user.id).order("effective_from"),
      supabase.from("monthly_compensation").select("*").eq("user_id", user.id),
    ]);

    const row = settingsResult.data;
    setSettings(
      row
        ? {
            hourlyRate: row.hourly_rate,
            contractType: row.contract_type as ContractType,
            employmentFraction: row.employment_fraction,
            monthlySalaryNet: row.monthly_salary_net,
            onboardingCompleted: row.onboarding_completed,
          }
        : DEFAULT_SETTINGS,
    );
    const formattedEntries = (entriesResult.data || []).map(mapEntry);
    setEntriesByMonth(groupEntriesByMonth(formattedEntries));
    setPeriods(
      (periodsResult.data || []).map((period) => ({
        id: period.id,
        contractType: period.contract_type as ContractType,
        employmentFraction: period.employment_fraction,
        hourlyRate: period.hourly_rate,
        monthlySalaryNet: period.monthly_salary_net,
        effectiveFrom: period.effective_from,
        effectiveTo: period.effective_to,
      })),
    );
    setCompensation(
      Object.fromEntries(
        (compensationResult.data || []).map((item) => [item.month.slice(0, 7), item.net_amount]),
      ),
    );
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase.from("time_entries").delete().eq("id", id);
    if (error) {
      toast.error("Nie udało się usunąć wpisu");
      return;
    }
    toast.success("Wpis został usunięty");
    loadData();
  };

  if (!loaded || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!settings.onboardingCompleted) return <Navigate to="/" replace />;

  const sortedMonths = Object.keys(entriesByMonth).sort().reverse();
  const activePeriod = [...periods].reverse().find((period) => !period.effectiveTo);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Navigation settings={settings} activePeriod={activePeriod} onSettingsUpdate={loadData} />
      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary">Miesiąc po miesiącu</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Historia</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Sprawdź czas, nieobecności i realną wartość godziny. Kwotę wypłaty na umowie o pracę możesz poprawić osobno dla każdego miesiąca.
          </p>
        </div>

        {sortedMonths.length === 0 ? (
          <Card className="surface-card p-10 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-semibold">Brak historii</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pierwszy zakończony wpis pojawi się tutaj automatycznie.
            </p>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {sortedMonths.map((month) => {
              const entries = entriesByMonth[month];
              const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
              const workHours = entries
                .filter((entry) => entry.entryType === "work")
                .reduce((sum, entry) => sum + entry.hours, 0);
              const absenceHours = totalHours - workHours;
              const period = getPeriodForDate(periods, `${month}-15`);
              const contractType = period?.contractType ?? settings.contractType;
              const mandateSalary = entries.reduce(
                (sum, entry) => sum + entry.hours * entry.hourlyRate,
                0,
              );
              const defaultSalary = period?.monthlySalaryNet ?? settings.monthlySalaryNet;
              const salary =
                contractType === "employment"
                  ? compensation[month] ?? defaultSalary
                  : mandateSalary;
              const effectiveRate = totalHours > 0 ? salary / totalHours : 0;
              const [year, monthNumber] = month.split("-").map(Number);
              const monthLabel = `${getMonthName(monthNumber - 1)} ${year}`;

              return (
                <AccordionItem key={month} value={month} className="border-none">
                  <Card className="surface-card overflow-hidden">
                    <AccordionTrigger className="p-4 text-left hover:no-underline sm:p-5">
                      <div className="w-full pr-3">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h2 className="text-lg font-semibold">{monthLabel}</h2>
                            <Badge variant="outline" className="mt-1">
                              {CONTRACT_LABELS[contractType]}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Rozliczony czas</p>
                            <p className="text-xl font-bold">{totalHours.toFixed(2)} h</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <div className="rounded-xl bg-background/35 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Banknote className="h-3.5 w-3.5" />
                              Wypłata
                            </div>
                            <p className="font-semibold text-primary">{formatCurrency(salary)}</p>
                          </div>
                          <div className="rounded-xl bg-background/35 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Gauge className="h-3.5 w-3.5" />
                              Realnie / h
                            </div>
                            <p className="font-semibold">{formatCurrency(effectiveRate)}</p>
                          </div>
                          <div className="col-span-2 rounded-xl bg-background/35 p-3 sm:col-span-1">
                            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <HeartPulse className="h-3.5 w-3.5" />
                              Nieobecności
                            </div>
                            <p className="font-semibold">{absenceHours.toFixed(2)} h</p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 sm:px-5 sm:pb-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/25 p-3">
                        <div className="flex items-center gap-3">
                          <Clock3 className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Faktyczna praca</p>
                            <p className="font-semibold">{workHours.toFixed(2)} h</p>
                          </div>
                        </div>
                        {contractType === "employment" && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Popraw wypłatę</span>
                            <MonthlySalaryDialog
                              month={month}
                              monthLabel={monthLabel}
                              amount={salary}
                              onSaved={loadData}
                            />
                          </div>
                        )}
                      </div>
                      <TimeEntriesList
                        entries={entries}
                        onDelete={handleDeleteEntry}
                        showMoney={contractType === "mandate"}
                      />
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </main>
    </div>
  );
};

export default History;
