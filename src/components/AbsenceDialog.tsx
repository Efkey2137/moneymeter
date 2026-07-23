import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { pl } from "date-fns/locale";
import { CalendarDays, HeartPulse, Palmtree, ShieldQuestion } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntryType } from "@/lib/employment";
import { TimeEntry } from "@/lib/timeUtils";
import { getDailyWorkNorm, getDateRange } from "@/lib/workCalendar";
import { toast } from "sonner";

interface AbsenceDialogProps {
  fraction: number;
  entries: TimeEntry[];
  onAdd: (entries: { date: string; hours: number; entryType: EntryType }[]) => Promise<void>;
}

const actions = [
  { type: "vacation" as const, label: "Urlop", icon: Palmtree },
  { type: "sick_leave" as const, label: "L4", icon: HeartPulse },
  { type: "other_absence" as const, label: "Inne", icon: ShieldQuestion },
];

export const AbsenceDialog = ({ fraction, entries, onAdd }: AbsenceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EntryType>("vacation");
  const [range, setRange] = useState<DateRange | undefined>();
  const [saving, setSaving] = useState(false);

  const openFor = (entryType: EntryType) => {
    setType(entryType);
    setRange(undefined);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!range?.from) {
      toast.error("Wybierz co najmniej jeden dzień");
      return;
    }
    const end = range.to || range.from;
    const selectedDates = getDateRange(range.from, end);
    if (selectedDates.length > 93) {
      toast.error("Jednorazowo możesz wybrać maksymalnie 93 dni");
      return;
    }

    const occupiedDates = new Set(entries.map((entry) => entry.date));
    const absenceEntries = selectedDates
      .map((date) => ({
        date,
        hours: getDailyWorkNorm(date, fraction),
        entryType: type,
      }))
      .filter((entry) => entry.hours > 0 && !occupiedDates.has(entry.date));

    if (absenceEntries.length === 0) {
      toast.error("W wybranym zakresie nie ma wolnych dni roboczych");
      return;
    }

    setSaving(true);
    try {
      await onAdd(absenceEntries);
      setOpen(false);
      const skipped = selectedDates.length - absenceEntries.length;
      toast.success(
        skipped > 0
          ? `Dodano ${absenceEntries.length} dni. Pominięto weekendy, święta lub zajęte dni.`
          : `Dodano ${absenceEntries.length} dni.`,
      );
    } catch {
      // The parent reports the database error; keep the dialog open for retry.
    } finally {
      setSaving(false);
    }
  };

  const activeAction = actions.find((action) => action.type === type)!;
  const ActiveIcon = activeAction.icon;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ type: actionType, label, icon: Icon }) => (
          <Button
            key={actionType}
            variant="outline"
            className="h-auto flex-col gap-2 rounded-2xl py-3"
            onClick={() => openFor(actionType)}
          >
            <Icon className="h-5 w-5 text-primary" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ActiveIcon className="h-5 w-5 text-primary" />
              Dodaj: {activeAction.label}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Zaznacz zakres. Weekendy i święta zostaną pominięte, a każdy dzień otrzyma wymiar zależny od etatu.
          </p>
          <Calendar
            mode="range"
            locale={pl}
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            className="mx-auto"
          />
          <Button className="w-full gradient-primary" onClick={handleSave} disabled={saving}>
            <CalendarDays className="mr-2 h-4 w-4" />
            {saving ? "Dodawanie…" : "Dodaj wybrane dni"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
