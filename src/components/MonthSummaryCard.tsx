import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/timeUtils";
import { TrendingUp, Clock } from "lucide-react";

interface MonthSummaryCardProps {
  hours: number;
  salary: number;
  monthName: string;
}

export const MonthSummaryCard = ({ hours, salary, monthName }: MonthSummaryCardProps) => {
  return (
    <Card className="p-6 gradient-card glow-primary">
      <h2 className="text-2xl font-bold mb-6">{monthName}</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Przepracowane godziny</span>
          </div>
          <span className="text-2xl font-bold">{hours.toFixed(2)}h</span>
        </div>
        <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Wypłata</span>
          </div>
          <span className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            {formatCurrency(salary)}
          </span>
        </div>
      </div>
    </Card>
  );
};
