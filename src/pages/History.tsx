import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { TimeEntry, groupEntriesByMonth, getMonthName, formatCurrency } from "@/lib/timeUtils";
import { TrendingUp, Clock, Calendar, DollarSign, List, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TimeEntriesList } from "@/components/TimeEntriesList";
import { CalendarView } from "@/components/CalendarView";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const History = () => {
  const { user } = useAuth();
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, TimeEntry[]>>({});
  const [hourlyRate, setHourlyRate] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "calendar">(() => {
    return (localStorage.getItem("historyViewMode") as "list" | "calendar") || "list";
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("historyViewMode", viewMode);
  }, [viewMode]);

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
      const formattedEntries = entriesData.map(entry => ({
        id: entry.id,
        date: entry.date,
        startTime: entry.start_time,
        endTime: entry.end_time,
        hours: entry.hours,
        hourlyRate: entry.hourly_rate || 0,
      }));
      setAllEntries(formattedEntries);
      setEntriesByMonth(groupEntriesByMonth(formattedEntries));
    }
  };

  const sortedMonths = Object.keys(entriesByMonth).sort().reverse();

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć wpisu",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sukces",
        description: "Wpis został usunięty",
      });
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Historia wypłat</h1>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "gradient-primary" : ""}
            >
              <List className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className={viewMode === "calendar" ? "gradient-primary" : ""}
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Kalendarz</span>
            </Button>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <CalendarView entries={allEntries} onDelete={handleDeleteEntry} />
        ) : (
          <>
            {sortedMonths.length === 0 ? (
              <Card className="p-12 text-center gradient-card">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  Brak danych historycznych
                </p>
              </Card>
            ) : (
              <Accordion type="single" collapsible className="space-y-6">
                {sortedMonths.map((month) => {
                  const entries = entriesByMonth[month];
                  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
                  const salary = entries.reduce((sum, entry) => sum + (entry.hours * entry.hourlyRate), 0);
                  const [year, monthNum] = month.split('-');
                  const monthName = `${getMonthName(parseInt(monthNum) - 1)} ${year}`;

                  return (
                    <AccordionItem key={month} value={month} className="border-none">
                      <Card className="gradient-card glow-primary overflow-hidden">
                        <AccordionTrigger className="p-6 hover:no-underline">
                          <div className="w-full">
                            <h2 className="text-2xl font-bold mb-4 text-left">{monthName}</h2>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-primary" />
                                  <span className="text-muted-foreground">Godziny</span>
                                </div>
                                <span className="text-xl font-bold">{totalHours.toFixed(2)}h</span>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-5 h-5 text-primary" />
                                  <span className="text-muted-foreground">Stawka</span>
                                </div>
                                <span className="text-xl font-bold">
                                  {(() => {
                                    const rates = [...new Set(entries.map(e => e.hourlyRate))];
                                    if (rates.length === 1) {
                                      return `${rates[0].toFixed(2)} PLN/h`;
                                    }
                                    return `${Math.min(...rates).toFixed(2)}-${Math.max(...rates).toFixed(2)} PLN/h`;
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-5 h-5 text-primary" />
                                  <span className="text-muted-foreground">Wypłata</span>
                                </div>
                                <span className="text-xl font-bold text-primary">
                                  {formatCurrency(salary)}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground text-left">
                              {entries.length} {entries.length === 1 ? 'wpis' : 'wpisów'}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <TimeEntriesList entries={entries} onDelete={handleDeleteEntry} />
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;
