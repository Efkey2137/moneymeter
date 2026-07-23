import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
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

interface MonthlySalaryDialogProps {
  month: string;
  monthLabel: string;
  amount: number;
  onSaved: () => void;
}

export const MonthlySalaryDialog = ({
  month,
  monthLabel,
  amount,
  onSaved,
}: MonthlySalaryDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(String(amount));
  }, [open, amount]);

  const handleSave = async () => {
    if (!user) return;
    const netAmount = Number(value);
    if (!Number.isFinite(netAmount) || netAmount < 0) {
      toast.error("Podaj poprawną kwotę netto");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("monthly_compensation").upsert(
      {
        user_id: user.id,
        month: `${month}-01`,
        net_amount: netAmount,
      },
      { onConflict: "user_id,month" },
    );
    setSaving(false);

    if (error) {
      toast.error("Nie udało się zapisać wypłaty");
      return;
    }
    toast.success("Zapisano wypłatę za miesiąc");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edytuj wypłatę">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Wypłata — {monthLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`salary-${month}`}>Dokładna kwota netto</Label>
            <Input
              id={`salary-${month}`}
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <Button className="w-full gradient-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Zapisywanie…" : "Zapisz kwotę"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
