import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { TimeEntry, groupEntriesByMonth, calculateMonthTotal, getMonthName, formatCurrency } from "@/lib/timeUtils";
import { TrendingUp, Clock, Calendar } from "lucide-react";

const History = () => {
  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, TimeEntry[]>>({});

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = () => {
    const saved = localStorage.getItem('timeEntries');
    if (saved) {
      const entries = JSON.parse(saved);
      setEntriesByMonth(groupEntriesByMonth(entries));
    }
  };

  const sortedMonths = Object.keys(entriesByMonth).sort().reverse();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Historia wypłat</h1>
        
        {sortedMonths.length === 0 ? (
          <Card className="p-12 text-center gradient-card">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">
              Brak danych historycznych
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedMonths.map((month) => {
              const entries = entriesByMonth[month];
              const { hours, salary } = calculateMonthTotal(entries);
              const [year, monthNum] = month.split('-');
              const monthName = `${getMonthName(parseInt(monthNum) - 1)} ${year}`;

              return (
                <Card key={month} className="p-6 gradient-card glow-primary">
                  <h2 className="text-2xl font-bold mb-4">{monthName}</h2>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <span className="text-muted-foreground">Godziny</span>
                      </div>
                      <span className="text-xl font-bold">{hours.toFixed(2)}h</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span className="text-muted-foreground">Wypłata</span>
                      </div>
                      <span className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                        {formatCurrency(salary)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entries.length} {entries.length === 1 ? 'wpis' : 'wpisów'}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
