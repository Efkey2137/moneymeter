import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface HourlyRateDialogProps {
  onUpdate: () => void;
}

export const HourlyRateDialog = ({ onUpdate }: HourlyRateDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState("");

  const loadRate = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_settings')
      .select('hourly_rate')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setRate(data.hourly_rate.toString());
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      loadRate();
    }
  }, [loadRate, open, user]);

  const handleSave = async () => {
    if (!user) return;

    const rateNumber = parseFloat(rate);
    if (isNaN(rateNumber) || rateNumber <= 0) {
      toast.error("Wprowadź poprawną stawkę");
      return;
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          hourly_rate: rateNumber,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      toast.error("Błąd zapisywania stawki");
      return;
    }

    toast.success("Zaktualizowano stawkę godzinową");
    setOpen(false);
    onUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="gradient-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Stawka godzinowa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="rate">Stawka (PLN/h)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="25.00"
              className="bg-background/50"
            />
          </div>
          <Button onClick={handleSave} className="w-full gradient-primary">
            Zapisz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
