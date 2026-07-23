import { useCallback, useEffect, useState } from "react";
import { CalendarDays, List, WalletCards } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { TimeEntriesList } from "@/components/TimeEntriesList";
import { MonthSummaryCard } from "@/components/MonthSummaryCard";
import { EmploymentSummary } from "@/components/EmploymentSummary";
import { AbsenceDialog } from "@/components/AbsenceDialog";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ContractPeriod,
  ContractType,
  DEFAULT_SETTINGS,
  EntryType,
  UserSettings,
  formatFraction,
  getPeriodForDate,
} from "@/lib/employment";
import { TimeEntry, getCurrentMonth, getMonthName } from "@/lib/timeUtils";
import {
  getMonthlyWorkNorm,
  getQuarterMonths,
} from "@/lib/workCalendar";
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

const Index = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [periods, setPeriods] = useState<ContractPeriod[]>([]);
  const [monthOverrides, setMonthOverrides] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [calendarView, setCalendarView] = useState(
    () => localStorage.getItem("dashboardView") !== "list",
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    const [settingsResult, entriesResult, periodsResult, overridesResult] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("time_entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("contract_periods").select("*").eq("user_id", user.id).order("effective_from"),
      supabase.from("work_time_overrides").select("*").eq("user_id", user.id),
    ]);

    if (settingsResult.data) {
      setSettings({
        hourlyRate: settingsResult.data.hourly_rate,
        contractType: settingsResult.data.contract_type as ContractType,
        employmentFraction: settingsResult.data.employment_fraction,
        monthlySalaryNet: settingsResult.data.monthly_salary_net,
        onboardingCompleted: settingsResult.data.onboarding_completed,
      });
    } else {
      setSettings(DEFAULT_SETTINGS);
    }

    setEntries((entriesResult.data || []).map(mapEntry));
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
    setMonthOverrides(
      Object.fromEntries(
        (overridesResult.data || []).map((override) => [
          override.month.slice(0, 7),
          override.target_hours,
        ]),
      ),
    );
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem("dashboardView", calendarView ? "calendar" : "list");
  }, [calendarView]);

  const handleAddEntry = async (entry: {
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
  }) => {
    if (!user || !settings) return;
    const period = getPeriodForDate(periods, entry.date);
    const rate = period?.hourlyRate ?? settings.hourlyRate;
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        user_id: user.id,
        date: entry.date,
        start_time: entry.startTime,
        end_time: entry.endTime,
        hours: entry.hours,
        hourly_rate: rate,
        entry_type: "work",
      })
      .select()
      .single();

    if (error) {
      toast.error("Nie udało się dodać wpisu");
      return;
    }
    setEntries((current) => [mapEntry(data), ...current]);
  };

  const handleAddAbsences = async (
    absenceEntries: { date: string; hours: number; entryType: EntryType }[],
  ) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("time_entries")
      .insert(
        absenceEntries.map((entry) => ({
          user_id: user.id,
          date: entry.date,
          start_time: null,
          end_time: null,
          hours: entry.hours,
          hourly_rate: 0,
          entry_type: entry.entryType,
        })),
      )
      .select();
    if (error) {
      toast.error("Nie udało się dodać nieobecności");
      throw error;
    }
    setEntries((current) => [...(data || []).map(mapEntry), ...current]);
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase.from("time_entries").delete().eq("id", id);
    if (error) {
      toast.error("Nie udało się usunąć wpisu");
      return;
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
    toast.success("Wpis został usunięty");
  };

  const activePeriod = [...periods].reverse().find((period) => !period.effectiveTo);
  const earliestEntryDate = entries.reduce<string | undefined>(
    (earliest, entry) => (!earliest || entry.date < earliest ? entry.date : earliest),
    undefined,
  );
  const currentMonth = getCurrentMonth();
  const currentMonthEntries = entries.filter((entry) => entry.date.startsWith(currentMonth));
  const monthHours = currentMonthEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const absenceHours = currentMonthEntries
    .filter((entry) => entry.entryType !== "work")
    .reduce((sum, entry) => sum + entry.hours, 0);
  const monthSalary = currentMonthEntries.reduce(
    (sum, entry) => sum + entry.hours * entry.hourlyRate,
    0,
  );
  const quarterMonths = getQuarterMonths();
  const quarterEntries = entries.filter((entry) => quarterMonths.includes(entry.date.slice(0, 7)));
  const quarterHours = quarterEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const currentDate = new Date();
  const monthTarget =
    monthOverrides[currentMonth] ??
    getMonthlyWorkNorm(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      settings?.employmentFraction ?? 1,
    );
  const quarterTarget = quarterMonths.reduce((sum, month) => {
    if (monthOverrides[month] !== undefined) return sum + monthOverrides[month];
    const [year, monthNumber] = month.split("-").map(Number);
    const period = getPeriodForDate(periods, `${month}-15`);
    const fraction = period?.employmentFraction ?? settings?.employmentFraction ?? 1;
    return sum + getMonthlyWorkNorm(year, monthNumber - 1, fraction);
  }, 0);

  if (!loaded || !settings || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!settings.onboardingCompleted) {
    return (
      <OnboardingFlow
        userId={user.id}
        earliestEntryDate={earliestEntryDate}
        onComplete={loadData}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Navigation settings={settings} activePeriod={activePeriod} onSettingsUpdate={loadData} />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:py-8">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">
              {settings.contractType === "employment"
                ? formatFraction(settings.employmentFraction)
                : "Umowa zlecenie"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Twój czas pracy
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/70 p-2">
            <List className="h-4 w-4 text-muted-foreground" />
            <Switch checked={calendarView} onCheckedChange={setCalendarView} />
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </div>
        </section>

        {settings.contractType === "employment" ? (
          <EmploymentSummary
            monthHours={monthHours}
            monthTarget={monthTarget}
            quarterHours={quarterHours}
            quarterTarget={quarterTarget}
            absenceHours={absenceHours}
          />
        ) : (
          <MonthSummaryCard
            hours={monthHours}
            salary={monthSalary}
            monthName={getMonthName(new Date().getMonth())}
          />
        )}

        {settings.contractType === "employment" && (
          <Card className="surface-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Dodaj nieobecność</h2>
                <p className="text-xs text-muted-foreground">Wybierz typ i zaznacz dni hurtowo</p>
              </div>
            </div>
            <AbsenceDialog
              fraction={settings.employmentFraction}
              entries={entries}
              onAdd={handleAddAbsences}
            />
          </Card>
        )}

        {calendarView ? (
          <DashboardCalendar
            entries={entries}
            contractType={settings.contractType}
            fraction={settings.employmentFraction}
            monthOverrides={monthOverrides}
            onAdd={handleAddEntry}
            onDelete={handleDeleteEntry}
          />
        ) : (
          <div className="space-y-4">
            <TimeEntryForm onAdd={handleAddEntry} />
            <TimeEntriesList
              entries={currentMonthEntries}
              onDelete={handleDeleteEntry}
              showMoney={settings.contractType === "mandate"}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
