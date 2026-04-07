import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { HourlyRateDialog } from "@/components/HourlyRateDialog";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { TimeEntriesList } from "@/components/TimeEntriesList";
import { MonthSummaryCard } from "@/components/MonthSummaryCard";
import { TimeEntry, getCurrentMonth, getMonthName } from "@/lib/timeUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, List } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Index = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [calendarView, setCalendarView] = useState(() => {
    return localStorage.getItem("dashboardView") !== "list";
  });

  useEffect(() => {
    localStorage.setItem("dashboardView", calendarView ? "calendar" : "list");
  }, [calendarView]);

  useEffect(() => {
    if (user) {
      loadData();
      migrateLocalData();
    }
  }, [user]);

  const migrateLocalData = async () => {
    if (!user) return;

    const localEntries = localStorage.getItem('timeEntries');
    const localRate = localStorage.getItem('hourlyRate');

    if (localEntries || localRate) {
      try {
        if (localRate) {
          const { error } = await supabase
            .from('user_settings')
            .upsert(
              { user_id: user.id, hourly_rate: parseFloat(localRate) },
              { onConflict: 'user_id' }
            );
          if (!error) localStorage.removeItem('hourlyRate');
        }

        if (localEntries) {
          const parsedEntries: TimeEntry[] = JSON.parse(localEntries);
          const entriesToMigrate = parsedEntries.map(entry => ({
            user_id: user.id,
            date: entry.date,
            start_time: entry.startTime,
            end_time: entry.endTime,
            hours: entry.hours,
          }));
          const { error } = await supabase.from('time_entries').insert(entriesToMigrate);
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

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('hourly_rate')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsData) {
      setHourlyRate(settingsData.hourly_rate);
    }

    const { data: entriesData } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (entriesData) {
      setEntries(entriesData.map(entry => ({
        id: entry.id,
        date: entry.date,
        startTime: entry.start_time,
        endTime: entry.end_time,
        hours: entry.hours,
        hourlyRate: entry.hourly_rate || 0,
      })));
    }
  };

  const handleAddEntry = async (entry: { date: string; startTime: string; endTime: string; hours: number }) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        date: entry.date,
        start_time: entry.startTime,
        end_time: entry.endTime,
        hours: entry.hours,
        hourly_rate: hourlyRate,
      })
      .select()
      .single();

    if (error) {
      toast.error("Błąd dodawania wpisu");
      return;
    }

    setEntries([{
      id: data.id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      hours: data.hours,
      hourlyRate: data.hourly_rate || 0,
    }, ...entries]);
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

  const currentMonthStr = getCurrentMonth();
  const currentMonthEntries = entries.filter(e => e.date.startsWith(currentMonthStr));
  const monthHours = currentMonthEntries.reduce((s, e) => s + e.hours, 0);
  const monthSalary = currentMonthEntries.reduce((s, e) => s + e.hours * e.hourlyRate, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-muted-foreground" />
              <Switch
                checked={calendarView}
                onCheckedChange={setCalendarView}
              />
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
            </div>
            <HourlyRateDialog onUpdate={loadData} />
          </div>
        </div>

        {calendarView ? (
          <DashboardCalendar
            entries={entries}
            onAdd={handleAddEntry}
            onDelete={handleDeleteEntry}
          />
        ) : (
          <div className="space-y-6">
            <MonthSummaryCard
              hours={monthHours}
              salary={monthSalary}
              monthName={getMonthName(new Date().getMonth())}
            />
            <TimeEntryForm onAdd={handleAddEntry} />
            <TimeEntriesList
              entries={currentMonthEntries}
              onDelete={handleDeleteEntry}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
