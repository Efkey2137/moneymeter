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
    <Card className="surface-card p-5 sm:p-6">
      <h2 className="mb-5 text-lg font-semibold">{monthName}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl bg-background/35 p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Przepracowane godziny</span>
          </div>
          <span className="text-xl font-bold">{hours.toFixed(2)}h</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-background/35 p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Wypłata</span>
          </div>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(salary)}
          </span>
        </div>
      </div>
    </Card>
  );
};
