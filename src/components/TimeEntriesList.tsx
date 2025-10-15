import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimeEntry } from "@/lib/timeUtils";
import { Trash2, Calendar } from "lucide-react";

interface TimeEntriesListProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
}

export const TimeEntriesList = ({ entries, onDelete }: TimeEntriesListProps) => {
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
          className="p-4 gradient-card transition-smooth hover:scale-[1.01] hover:glow-primary"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-1">
                <span className="text-sm text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
                <span className="font-mono text-sm">
                  {entry.startTime} - {entry.endTime}
                </span>
              </div>
              <div className="text-primary font-semibold">
                {entry.hours.toFixed(2)}h
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
        </Card>
      ))}
    </div>
  );
};
