import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { calculateHours } from "@/lib/timeUtils";
import { Clock, Plus } from "lucide-react";

interface TimeEntryFormProps {
  onAdd: (entry: { date: string; startTime: string; endTime: string; hours: number }) => void;
}

export const TimeEntryForm = ({ onAdd }: TimeEntryFormProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !startTime || !endTime) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    const hours = calculateHours(startTime, endTime);
    
    if (hours <= 0) {
      toast.error("Czas końcowy musi być późniejszy niż początkowy");
      return;
    }

    onAdd({
      date,
      startTime,
      endTime,
      hours,
    });

    setStartTime("");
    setEndTime("");
    toast.success("Dodano wpis czasu pracy");
  };

  return (
    <Card className="p-6 gradient-card glow-primary transition-smooth hover:scale-[1.02]">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Dodaj czas pracy</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-background/50"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Od</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="7:49"
              className="bg-background/50"
            />
          </div>
          <div>
            <Label htmlFor="endTime">Do</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="16:31"
              className="bg-background/50"
            />
          </div>
        </div>
        <Button type="submit" className="w-full gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Dodaj wpis
        </Button>
      </form>
    </Card>
  );
};
