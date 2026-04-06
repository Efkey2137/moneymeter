import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimeEntry, formatCurrency } from "@/lib/timeUtils";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
}

export const CalendarView = ({ entries, onDelete }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group entries by date
  const entriesByDate: Record<string, TimeEntry[]> = {};
  entries.forEach((entry) => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = [];
    }
    entriesByDate[entry.date].push(entry);
  });

  // Get dates that have entries
  const datesWithEntries = Object.keys(entriesByDate).map((d) => new Date(d + "T00:00:00"));

  const selectedDateStr = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : null;
  const selectedEntries = selectedDateStr ? entriesByDate[selectedDateStr] || [] : [];

  // Calculate monthly totals for displayed month
  const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));
  const monthHours = monthEntries.reduce((s, e) => s + e.hours, 0);
  const monthSalary = monthEntries.reduce((s, e) => s + e.hours * e.hourlyRate, 0);

  return (
    <div className="space-y-4">
      <Card className="gradient-card p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="pointer-events-auto mx-auto"
          modifiers={{
            hasEntry: datesWithEntries,
          }}
          modifiersClassNames={{
            hasEntry: "bg-primary/20 font-bold text-primary",
          }}
        />
        <div className="flex justify-between items-center mt-4 px-2 text-sm text-muted-foreground border-t border-border pt-3">
          <span>Godziny: <strong className="text-foreground">{monthHours.toFixed(2)}h</strong></span>
          <span>Wypłata: <strong className="text-primary">{formatCurrency(monthSalary)}</strong></span>
        </div>
      </Card>

      {selectedDate && (
        <Card className="gradient-card p-4">
          <h3 className="font-semibold mb-3">
            {selectedDate.toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak wpisów w tym dniu</p>
          ) : (
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
          )}
        </Card>
      )}
    </div>
  );
};
