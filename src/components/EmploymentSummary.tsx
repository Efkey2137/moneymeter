import { CalendarRange, CheckCircle2, Clock3, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getQuarterLabel } from "@/lib/workCalendar";

interface EmploymentSummaryProps {
  monthHours: number;
  monthTarget: number;
  quarterHours: number;
  quarterTarget: number;
  absenceHours: number;
}

const hours = (value: number) =>
  `${value.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} h`;

export const EmploymentSummary = ({
  monthHours,
  monthTarget,
  quarterHours,
  quarterTarget,
  absenceHours,
}: EmploymentSummaryProps) => {
  const monthRemaining = monthTarget - monthHours;
  const quarterRemaining = quarterTarget - quarterHours;
  const monthProgress = monthTarget > 0 ? Math.min(100, (monthHours / monthTarget) * 100) : 0;
  const quarterProgress =
    quarterTarget > 0 ? Math.min(100, (quarterHours / quarterTarget) * 100) : 0;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="surface-card p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Bieżący miesiąc</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{hours(monthHours)}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Gauge className="h-5 w-5" />
          </div>
        </div>
        <Progress value={monthProgress} className="mb-3 h-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Plan: {hours(monthTarget)}</span>
          <span className={monthRemaining < 0 ? "font-semibold text-amber-400" : "font-semibold"}>
            {monthRemaining >= 0 ? "Pozostało" : "Ponad plan"} {hours(Math.abs(monthRemaining))}
          </span>
        </div>
      </Card>

      <Card className="surface-card p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{getQuarterLabel()}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{hours(quarterHours)}</p>
          </div>
          <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300">
            <CalendarRange className="h-5 w-5" />
          </div>
        </div>
        <Progress value={quarterProgress} className="mb-3 h-2 [&>div]:bg-violet-400" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Plan: {hours(quarterTarget)}</span>
          <span className={quarterRemaining < 0 ? "font-semibold text-amber-400" : "font-semibold"}>
            {quarterRemaining >= 0 ? "Pozostało" : "Ponad plan"} {hours(Math.abs(quarterRemaining))}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:col-span-2">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-4">
          <Clock3 className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Praca w miesiącu</p>
            <p className="font-semibold">{hours(monthHours - absenceHours)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-xs text-muted-foreground">Nieobecności</p>
            <p className="font-semibold">{hours(absenceHours)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
