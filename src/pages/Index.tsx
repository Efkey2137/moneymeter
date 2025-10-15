import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { HourlyRateDialog } from "@/components/HourlyRateDialog";
import { MonthSummaryCard } from "@/components/MonthSummaryCard";
import { TimeEntriesList } from "@/components/TimeEntriesList";
import { TimeEntry, getCurrentMonth, getMonthName, calculateMonthTotal } from "@/lib/timeUtils";
import { toast } from "sonner";

const Index = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [currentMonthEntries, setCurrentMonthEntries] = useState<TimeEntry[]>([]);
  const [monthSummary, setMonthSummary] = useState({ hours: 0, salary: 0 });
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    loadEntries();
  }, [forceUpdate]);

  useEffect(() => {
    const currentMonth = getCurrentMonth();
    const filtered = entries.filter(entry => entry.date.startsWith(currentMonth));
    setCurrentMonthEntries(filtered);
    setMonthSummary(calculateMonthTotal(filtered));
  }, [entries]);

  const loadEntries = () => {
    const saved = localStorage.getItem('timeEntries');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  };

  const saveEntries = (newEntries: TimeEntry[]) => {
    localStorage.setItem('timeEntries', JSON.stringify(newEntries));
    setEntries(newEntries);
  };

  const handleAddEntry = (entry: Omit<TimeEntry, 'id'>) => {
    const newEntry = {
      ...entry,
      id: Date.now().toString(),
    };
    saveEntries([...entries, newEntry]);
  };

  const handleDeleteEntry = (id: string) => {
    saveEntries(entries.filter(entry => entry.id !== id));
    toast.success("Usunięto wpis");
  };

  const currentMonth = getCurrentMonth();
  const [year, month] = currentMonth.split('-');
  const monthName = `${getMonthName(parseInt(month) - 1)} ${year}`;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <HourlyRateDialog onUpdate={() => setForceUpdate(prev => prev + 1)} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <MonthSummaryCard
            hours={monthSummary.hours}
            salary={monthSummary.salary}
            monthName={monthName}
          />
          <TimeEntryForm onAdd={handleAddEntry} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Wpisy tego miesiąca</h2>
          <TimeEntriesList
            entries={currentMonthEntries}
            onDelete={handleDeleteEntry}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
