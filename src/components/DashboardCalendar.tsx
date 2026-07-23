import { useMemo, useState } from "react";
import { Banknote, ChevronLeft, ChevronRight, Clock3, Plus, Target, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContractType, ENTRY_LABELS, EntryType } from "@/lib/employment";
import { TimeEntry, calculateHours, formatCurrency } from "@/lib/timeUtils";
import { getMonthlyWorkNorm } from "@/lib/workCalendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardCalendarProps {
  entries: TimeEntry[];
  contractType: ContractType;
  fraction: number;
  monthOverrides?: Record<string, number>;
  onAdd: (entry: { date: string; startTime: string; endTime: string; hours: number }) => void;
  onDelete: (id: string) => void;
}

const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const entryDot: Record<EntryType, string> = {
  work: "bg-primary",
  vacation: "bg-amber-400",
  sick_leave: "bg-rose-400",
  other_absence: "bg-violet-400",
};

const toDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const DashboardCalendar = ({
  entries,
  contractType,
  fraction,
  monthOverrides = {},
  onAdd,
  onDelete,
}: DashboardCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const entriesByDate = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    entries.forEach((entry) => {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    });
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const days: { date: Date; inMonth: boolean }[] = [];

    for (let index = startDow - 1; index >= 0; index -= 1) {
      days.push({ date: new Date(year, month, -index), inMonth: false });
    }
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push({ date: new Date(year, month, day), inMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day += 1) {
        days.push({ date: new Date(year, month + 1, day), inMonth: false });
      }
    }
    return days;
  }, [currentMonth]);

  const moveMonth = (direction: -1 | 1) => {
    setCurrentMonth((previous) => {
      const date = new Date(previous.year, previous.month + direction, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
    setSelectedDate(null);
  };

  const monthKey = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey));
  const monthHours = monthEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const monthSalary = monthEntries.reduce(
    (sum, entry) => sum + entry.hours * entry.hourlyRate,
    0,
  );
  const monthTarget =
    monthOverrides[monthKey] ??
    getMonthlyWorkNorm(currentMonth.year, currentMonth.month, fraction);
  const selectedEntries = selectedDate ? entriesByDate[selectedDate] || [] : [];
  const todayStr = toDateStr(new Date());

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Uzupełnij godzinę rozpoczęcia i zakończenia");
      return;
    }
    const hours = calculateHours(startTime, endTime);
    if (hours <= 0 || hours > 24) {
      toast.error("Sprawdź podany zakres godzin");
      return;
    }
    onAdd({ date: selectedDate, startTime, endTime, hours });
    setStartTime("");
    setEndTime("");
    toast.success("Dodano czas pracy");
  };

  return (
    <div className="space-y-3">
      <Card className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 p-3 sm:p-4">
          <Button variant="ghost" size="icon" onClick={() => moveMonth(-1)} aria-label="Poprzedni miesiąc">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold sm:text-lg">
            {MONTHS_PL[currentMonth.month]} {currentMonth.year}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => moveMonth(1)} aria-label="Następny miesiąc">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-border/60 px-1">
          {DAYS_PL.map((day, index) => (
            <div
              key={day}
              className={cn(
                "py-2 text-center text-[11px] font-semibold text-muted-foreground",
                index >= 5 && "text-rose-300/70",
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 p-1">
          {calendarDays.map(({ date, inMonth }) => {
            const dateStr = toDateStr(date);
            const dayEntries = entriesByDate[dateStr] || [];
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <button
                type="button"
                key={dateStr}
                disabled={!inMonth}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "relative flex min-h-[54px] flex-col items-center rounded-xl py-1.5 text-sm transition-colors sm:min-h-[70px]",
                  !inMonth && "opacity-20",
                  inMonth && "hover:bg-accent/60",
                  weekend && inMonth && "text-rose-300/80",
                  isSelected && "bg-primary/15 ring-1 ring-primary",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    isToday && "bg-primary font-bold text-primary-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                {dayEntries.length > 0 && (
                  <span className="mt-1 flex max-w-full gap-1">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <span
                        key={entry.id}
                        className={cn("h-1.5 w-1.5 rounded-full", entryDot[entry.entryType])}
                      />
                    ))}
                  </span>
                )}
                {dayEntries.length > 0 && (
                  <span className="mt-1 hidden text-[10px] text-muted-foreground sm:block">
                    {dayEntries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(1)} h
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border/70 bg-background/25 p-3 text-sm sm:p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Zapisano</p>
              <p className="font-semibold">{monthHours.toFixed(1)} h</p>
            </div>
          </div>
          {contractType === "employment" ? (
            <div className="flex items-center justify-end gap-2">
              <Target className="h-4 w-4 text-violet-300" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Plan miesiąca</p>
                <p className="font-semibold">{monthTarget.toFixed(1)} h</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Zarobki</p>
                <p className="font-semibold">{formatCurrency(monthSalary)}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {selectedDate && (
        <Card className="surface-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedEntries.length > 0 && (
            <div className="mb-4 space-y-2">
              {selectedEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl bg-background/45 p-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("h-2.5 w-2.5 rounded-full", entryDot[entry.entryType])} />
                    <div>
                      <p className="text-sm font-medium">{ENTRY_LABELS[entry.entryType]}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entryType === "work"
                          ? `${entry.startTime?.slice(0, 5)}–${entry.endTime?.slice(0, 5)}`
                          : "Wymiar naliczony automatycznie"}
                        {" · "}
                        {entry.hours.toFixed(2)} h
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(entry.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <div>
              <Label className="text-xs">Od</Label>
              <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Do</Label>
              <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </div>
            <Button type="submit" size="icon" className="gradient-primary">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
