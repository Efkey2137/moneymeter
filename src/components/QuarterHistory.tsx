import { CalendarRange, CheckCircle2, Clock3, Target } from "lucide-react";
import {
  CONTRACT_LABELS,
  ContractPeriod,
  ContractType,
  QuarterlySummary,
  UserSettings,
  getPeriodForDate,
  getTodayKey,
} from "@/lib/employment";
import {
  getContractMonthlyTarget,
  getQuarterEndDate,
  getQuarterMonthsFor,
  getQuarterNumber,
} from "@/lib/workCalendar";
import { TimeEntry } from "@/lib/timeUtils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QuarterHoursDialog } from "@/components/QuarterHoursDialog";

interface QuarterHistoryProps {
  entries: TimeEntry[];
  periods: ContractPeriod[];
  settings: UserSettings;
  summaries: Record<string, QuarterlySummary>;
  monthOverrides: Record<string, number>;
  onReload: () => void;
}

interface QuarterKey {
  year: number;
  quarter: number;
}

const getQuarterStartDate = (year: number, quarter: number) =>
  `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`;

const getQuarters = (firstDate: string): QuarterKey[] => {
  const today = new Date();
  const first = new Date(`${firstDate}T12:00:00`);
  const result: QuarterKey[] = [];
  let year = first.getFullYear();
  let quarter = getQuarterNumber(first);
  const currentYear = today.getFullYear();
  const currentQuarter = getQuarterNumber(today);

  while (year < currentYear || (year === currentYear && quarter <= currentQuarter)) {
    result.push({ year, quarter });
    quarter += 1;
    if (quarter === 5) {
      quarter = 1;
      year += 1;
    }
  }

  return result.reverse();
};

const getContractsInRange = (
  periods: ContractPeriod[],
  start: string,
  end: string,
): ContractType[] =>
  Array.from(
    new Set(
      periods
        .filter(
          (period) =>
            period.effectiveFrom <= end &&
            (!period.effectiveTo || period.effectiveTo >= start),
        )
        .map((period) => period.contractType),
    ),
  );

export const QuarterHistory = ({
  entries,
  periods,
  settings,
  summaries,
  monthOverrides,
  onReload,
}: QuarterHistoryProps) => {
  const earliestDate = [
    ...periods.map((period) => period.effectiveFrom),
    ...entries.map((entry) => entry.date),
    getTodayKey(),
  ].sort()[0];
  const quarters = getQuarters(earliestDate);

  return (
    <div className="space-y-3">
      {quarters.map(({ year, quarter }) => {
        const start = getQuarterStartDate(year, quarter);
        const end = getQuarterEndDate(year, quarter);
        const months = getQuarterMonthsFor(year, quarter);
        const quarterEntries = entries.filter(
          (entry) => entry.date >= start && entry.date <= end,
        );
        const allTrackedHours = quarterEntries.reduce(
          (sum, entry) => sum + entry.hours,
          0,
        );
        const employmentTrackedHours = quarterEntries
          .filter(
            (entry) =>
              (getPeriodForDate(periods, entry.date)?.contractType ??
                settings.contractType) === "employment",
          )
          .reduce((sum, entry) => sum + entry.hours, 0);
        const target = months.reduce((sum, month) => {
          const [monthYear, monthNumber] = month.split("-").map(Number);
          return (
            sum +
            getContractMonthlyTarget(
              monthYear,
              monthNumber - 1,
              periods,
              settings.contractType,
              settings.employmentFraction,
              monthOverrides[month],
            )
          );
        }, 0);
        const contracts = getContractsInRange(periods, start, end);
        const effectiveContracts =
          contracts.length > 0 ? contracts : [settings.contractType];
        const hasEmployment = effectiveContracts.includes("employment");
        const summary = summaries[`${year}-Q${quarter}`];
        const displayedHours = hasEmployment
          ? summary?.reportedHours ?? employmentTrackedHours
          : allTrackedHours;
        const completed = end < getTodayKey();
        const difference = displayedHours - target;
        const progress =
          target > 0 ? Math.min(100, Math.max(0, (displayedHours / target) * 100)) : 0;

        return (
          <Card key={`${year}-${quarter}`} className="surface-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Q{quarter} {year}</h2>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {effectiveContracts.map((contract) => (
                    <Badge key={contract} variant="outline">
                      {CONTRACT_LABELS[contract]}
                    </Badge>
                  ))}
                  {summary && <Badge>Ręcznie uzupełnione</Badge>}
                </div>
              </div>
              {completed && hasEmployment && (
                <QuarterHoursDialog
                  year={year}
                  quarter={quarter}
                  automaticHours={employmentTrackedHours}
                  reportedHours={summary?.reportedHours}
                  onSaved={onReload}
                />
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-background/35 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {hasEmployment ? "Godziny UoP" : "Zarejestrowany czas"}
                </div>
                <p className="text-xl font-bold">{displayedHours.toFixed(2)} h</p>
              </div>
              <div className="rounded-xl bg-background/35 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  Norma UoP
                </div>
                <p className="text-xl font-bold">{target.toFixed(2)} h</p>
              </div>
            </div>

            {hasEmployment && target > 0 && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{progress.toFixed(0)}% normy</span>
                  <span className={difference >= 0 ? "text-primary" : "text-muted-foreground"}>
                    {difference >= 0 ? "+" : ""}{difference.toFixed(2)} h
                  </span>
                </div>
              </div>
            )}

            {effectiveContracts.length > 1 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Łącznie ze zleceniem zapisano {allTrackedHours.toFixed(2)} h. Norma obejmuje tylko dni UoP.
              </p>
            )}
            {completed && !hasEmployment && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Kwartał rozliczony wyłącznie jako umowa zlecenie
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
