import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimeEntry } from "@/lib/timeUtils";
import { Trash2, Calendar, Clock3 } from "lucide-react";
import { ENTRY_LABELS } from "@/lib/employment";
import { Badge } from "@/components/ui/badge";

interface TimeEntriesListProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  showMoney?: boolean;
}

export const TimeEntriesList = ({ entries, onDelete, showMoney = true }: TimeEntriesListProps) => {
  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center gradient-card">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Brak wpisów czasu pracy</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card
          key={entry.id}
          className="surface-card p-4"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {new Date(`${entry.date}T12:00:00`).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
                <Badge variant={entry.entryType === "work" ? "secondary" : "outline"}>
                  {ENTRY_LABELS[entry.entryType]}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {entry.entryType === "work" && (
                  <span className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {entry.startTime?.slice(0, 5)}–{entry.endTime?.slice(0, 5)}
                  </span>
                )}
                <span className="font-semibold text-primary">
                  {entry.hours.toFixed(2)}h
                </span>
                {showMoney && entry.entryType === "work" && (
                  <span className="text-xs text-muted-foreground">
                    × {entry.hourlyRate.toFixed(2)} PLN/h ={" "}
                    {(entry.hours * entry.hourlyRate).toFixed(2)} PLN
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(entry.id)}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
