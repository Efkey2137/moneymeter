import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { HourlyRateDialog } from "@/components/HourlyRateDialog";
import { MonthSummaryCard } from "@/components/MonthSummaryCard";
import { TimeEntriesList } from "@/components/TimeEntriesList";
import { TimeEntry, getCurrentMonth, getMonthName, calculateMonthTotal } from "@/lib/timeUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [currentMonthEntries, setCurrentMonthEntries] = useState<TimeEntry[]>([]);
  const [monthSummary, setMonthSummary] = useState({ hours: 0, salary: 0 });
  const [hourlyRate, setHourlyRate] = useState(0);

  useEffect(() => {
    if (user) {
      loadData();
      migrateLocalData();
    }
  }, [user]);

  useEffect(() => {
    const currentMonth = getCurrentMonth();
    const filtered = entries.filter(entry => entry.date.startsWith(currentMonth));
    setCurrentMonthEntries(filtered);
    
    const total = filtered.reduce((sum, entry) => sum + entry.hours, 0);
    setMonthSummary({
      hours: total,
      salary: total * hourlyRate,
    });
  }, [entries, hourlyRate]);

  const migrateLocalData = async () => {
    if (!user) return;

    const localEntries = localStorage.getItem('timeEntries');
    const localRate = localStorage.getItem('hourlyRate');

    if (localEntries || localRate) {
      try {
        // Migrate hourly rate
        if (localRate) {
          const { error } = await supabase
            .from('user_settings')
            .upsert({
              user_id: user.id,
              hourly_rate: parseFloat(localRate),
            });

          if (!error) {
            localStorage.removeItem('hourlyRate');
          }
        }

        // Migrate time entries
        if (localEntries) {
          const parsedEntries: TimeEntry[] = JSON.parse(localEntries);
          const entriesToMigrate = parsedEntries.map(entry => ({
            user_id: user.id,
            date: entry.date,
            start_time: entry.startTime,
            end_time: entry.endTime,
            hours: entry.hours,
          }));

          const { error } = await supabase
            .from('time_entries')
            .insert(entriesToMigrate);

          if (!error) {
            localStorage.removeItem('timeEntries');
            toast.success("Zmigrowano dane lokalne do chmury!");
          }
        }
      } catch (error) {
        console.error("Migration error:", error);
      }
    }
  };

  const loadData = async () => {
    if (!user) return;

    // Load hourly rate
    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('hourly_rate')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsData) {
      setHourlyRate(settingsData.hourly_rate);
    }

    // Load time entries
    const { data: entriesData } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (entriesData) {
      const formattedEntries = entriesData.map(entry => ({
        id: entry.id,
        date: entry.date,
        startTime: entry.start_time,
        endTime: entry.end_time,
        hours: entry.hours,
      }));
      setEntries(formattedEntries);
    }
  };

  const handleAddEntry = async (entry: Omit<TimeEntry, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        date: entry.date,
        start_time: entry.startTime,
        end_time: entry.endTime,
        hours: entry.hours,
      })
      .select()
      .single();

    if (error) {
      toast.error("Błąd dodawania wpisu");
      return;
    }

    const newEntry: TimeEntry = {
      id: data.id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      hours: data.hours,
    };

    setEntries([newEntry, ...entries]);
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Błąd usuwania wpisu");
      return;
    }

    setEntries(entries.filter(entry => entry.id !== id));
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
          <HourlyRateDialog onUpdate={loadData} />
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
