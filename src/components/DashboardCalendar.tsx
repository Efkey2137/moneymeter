import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeEntry, formatCurrency, calculateHours } from "@/lib/timeUtils";
import { ChevronLeft, ChevronRight, Clock, Banknote, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardCalendarProps {
  entries: TimeEntry[];
  onAdd: (entry: { date: string; startTime: string; endTime: string; hours: number }) => void;
  onDelete: (id: string) => void;
}

const DAYS_PL = ["Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob.", "Niedz."];
const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export const DashboardCalendar = ({ entries, onAdd, onDelete }: DashboardCalendarProps) => {
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

    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), inMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), inMonth: true });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), inMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 }
    );
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 }
    );
    setSelectedDate(null);
  };

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];
  const todayStr = toDateStr(new Date());

  const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));
  const monthHours = monthEntries.reduce((s, e) => s + e.hours, 0);
  const monthSalary = monthEntries.reduce((s, e) => s + e.hours * e.hourlyRate, 0);

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] || [] : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Wypełnij godziny");
      return;
    }
    const hours = calculateHours(startTime, endTime);
    if (hours <= 0) {
      toast.error("Czas końcowy musi być późniejszy niż początkowy");
      return;
    }
    onAdd({ date: selectedDate, startTime, endTime, hours });
    setStartTime("");
    setEndTime("");
    toast.success("Dodano wpis czasu pracy");
  };

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  return (
    <div className="space-y-4">
      <Card className="gradient-card overflow-hidden">
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
                onClick={() => inMonth && setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "border-b border-r border-border/50 min-h-[80px] sm:min-h-[100px] p-1 transition-colors cursor-pointer",
                  !inMonth && "opacity-40 cursor-default",
                  weekend && inMonth && "bg-destructive/5",
                  hasEntries && "hover:bg-accent/30",
                  !hasEntries && inMonth && "hover:bg-accent/10",
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
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-0.5">
                        <div className="w-0.5 min-h-[24px] bg-amber-400 rounded-full shrink-0" />
                        <div className="text-[10px] sm:text-xs leading-tight font-mono">
                          <div>{entry.startTime}</div>
                          <div>{entry.endTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 justify-between items-center p-4 border-t border-border bg-background/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Godziny pracy</span>
            <span className="font-bold">{monthHours.toFixed(1)}h</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Łączne zarobki</span>
            <span className="font-bold text-primary">{formatCurrency(monthSalary)}</span>
          </div>
        </div>
      </Card>

      {selectedDate && (
        <Card className="gradient-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {(() => {
                const [y, m, d] = selectedDate.split("-").map(Number);
                return new Date(y, m - 1, d).toLocaleDateString("pl-PL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                });
              })()}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {selectedEntries.length > 0 && (
            <div className="space-y-2 mb-4">
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
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Od</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-background/50 h-9"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Do</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-background/50 h-9"
              />
            </div>
            <Button type="submit" size="icon" className="gradient-primary h-9 w-9 shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
