import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface QuarterHoursDialogProps {
  year: number;
  quarter: number;
  automaticHours: number;
  reportedHours?: number;
  onSaved: () => void;
}

export const QuarterHoursDialog = ({
  year,
  quarter,
  automaticHours,
  reportedHours,
  onSaved,
}: QuarterHoursDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(reportedHours ?? automaticHours));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(String(reportedHours ?? automaticHours));
  }, [automaticHours, open, reportedHours]);

  const handleSave = async () => {
    if (!user) return;
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours < 0) {
      toast.error("Podaj poprawną liczbę godzin");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("quarterly_summaries").upsert(
      {
        user_id: user.id,
        year,
        quarter,
        reported_hours: hours,
      },
      { onConflict: "user_id,year,quarter" },
    );
    setSaving(false);

    if (error) {
      toast.error("Nie udało się zapisać godzin kwartału");
      return;
    }

    toast.success(`Zapisano godziny za Q${quarter} ${year}`);
    setOpen(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!user || reportedHours === undefined) return;
    setSaving(true);
    const { error } = await supabase
      .from("quarterly_summaries")
      .delete()
      .eq("user_id", user.id)
      .eq("year", year)
      .eq("quarter", quarter);
    setSaving(false);

    if (error) {
      toast.error("Nie udało się usunąć ręcznej wartości");
      return;
    }

    toast.success("Przywrócono godziny wyliczone z wpisów");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Uzupełnij
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Godziny UoP — Q{quarter} {year}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background/30 p-3 text-sm">
            <p className="text-muted-foreground">Z wpisów dziennych</p>
            <p className="mt-1 font-semibold">{automaticHours.toFixed(2)} h</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`quarter-hours-${year}-${quarter}`}>
              Łączna liczba godzin w kwartale
            </Label>
            <Input
              id={`quarter-hours-${year}-${quarter}`}
              type="number"
              min="0"
              step="0.25"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ta wartość zastąpi sumę wpisów tylko w podsumowaniu kwartału.
            </p>
          </div>
          <Button className="h-11 w-full gradient-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Zapisywanie…" : "Zapisz godziny"}
          </Button>
          {reportedHours !== undefined && (
            <Button
              variant="ghost"
              className="w-full text-destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń ręczną wartość
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
