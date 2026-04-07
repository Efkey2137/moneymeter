import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimeEntry, formatCurrency } from "@/lib/timeUtils";
import { Trash2, ChevronLeft, ChevronRight, Clock, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
}

const DAYS_PL = ["Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob.", "Niedz."];
const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export const CalendarView = ({ entries, onDelete }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    entries.forEach((entry) => {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    });
    return map;
  }, [entries]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: { date: Date; inMonth: boolean }[] = [];

    // Previous month days
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, inMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), inMonth: true });
    }

    // Next month days to fill grid
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), inMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
    setSelectedDate(null);
  };

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Monthly totals
  const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));
  const monthHours = monthEntries.reduce((s, e) => s + e.hours, 0);
  const monthSalary = monthEntries.reduce((s, e) => s + e.hours * e.hourlyRate, 0);

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] || [] : [];

  const today = new Date();
  const todayStr = toDateStr(today);

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  return (
    <div className="space-y-4">
      <Card className="gradient-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">
            {MONTHS_PL[currentMonth.month]} {currentMonth.year}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS_PL.map((day, i) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs font-semibold py-2",
                i >= 5 ? "text-destructive/70" : "text-muted-foreground"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, inMonth }, idx) => {
            const dateStr = toDateStr(date);
            const dayEntries = entriesByDate[dateStr] || [];
            const hasEntries = dayEntries.length > 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const weekend = isWeekend(date);

            return (
              <div
                key={idx}
                onClick={() => hasEntries && setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "border-b border-r border-border/50 min-h-[80px] sm:min-h-[100px] p-1 transition-colors",
                  !inMonth && "opacity-40",
                  weekend && inMonth && "bg-destructive/5",
                  hasEntries && "cursor-pointer hover:bg-accent/30",
                  isSelected && "bg-accent/50 ring-1 ring-primary",
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-medium leading-none",
                      weekend && inMonth && "text-destructive/70",
                      !inMonth && "text-muted-foreground",
                      isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {hasEntries && (
                    <span className="w-2 h-2 rounded-full bg-green-500 mt-0.5 shrink-0" />
                  )}
                </div>
                {hasEntries && (
                  <div className="mt-1 space-y-0.5">
                    {dayEntries.map((entry, i) => (
                      <div key={entry.id} className="flex items-center gap-0.5">
                        <div className="w-0.5 h-full min-h-[24px] bg-amber-400 rounded-full shrink-0" />
                        <div className="text-[10px] sm:text-xs leading-tight">
                          <div className="font-mono">{entry.startTime.slice(0, 5)}</div>
                          <div className="font-mono">{entry.endTime.slice(0, 5)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Monthly summary */}
        <div className="flex flex-wrap gap-4 justify-between items-center p-4 border-t border-border bg-background/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Godziny pracy</span>
            <span className="font-bold">{monthHours.toFixed(1)} Godzin</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Łączne zarobki</span>
            <span className="font-bold text-primary">{formatCurrency(monthSalary)}</span>
          </div>
        </div>
      </Card>

      {/* Selected day details */}
      {selectedDate && selectedEntries.length > 0 && (
        <Card className="gradient-card p-4">
          <h3 className="font-semibold mb-3">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="space-y-2">
            {selectedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-background/30 rounded-lg"
              >
                <div>
                  <span className="font-mono text-sm">
                    {entry.startTime} - {entry.endTime}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-primary font-semibold text-sm">
                      {entry.hours.toFixed(2)}h
                    </span>
                    <span className="text-xs text-muted-foreground">
                      × {entry.hourlyRate.toFixed(2)} PLN/h
                    </span>
                    <span className="text-sm font-medium">
                      = {(entry.hours * entry.hourlyRate).toFixed(2)} PLN
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
