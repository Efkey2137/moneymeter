import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { TimeEntry, groupEntriesByMonth, getMonthName, formatCurrency } from "@/lib/timeUtils";
import { TrendingUp, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TimeEntriesList } from "@/components/TimeEntriesList";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";

const History = () => {
  const { user } = useAuth();
  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, TimeEntry[]>>({});
  const [hourlyRate, setHourlyRate] = useState(0);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
        <h1 className="text-3xl font-bold mb-8">Historia wypłat</h1>
        
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
              const salary = totalHours * hourlyRate;
              const [year, monthNum] = month.split('-');
              const monthName = `${getMonthName(parseInt(monthNum) - 1)} ${year}`;

              return (
                <AccordionItem key={month} value={month} className="border-none">
                  <Card className="gradient-card glow-primary overflow-hidden">
                    <AccordionTrigger className="p-6 hover:no-underline">
                      <div className="w-full">
                        <h2 className="text-2xl font-bold mb-4 text-left">{monthName}</h2>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-primary" />
                              <span className="text-muted-foreground">Godziny</span>
                            </div>
                            <span className="text-xl font-bold">{totalHours.toFixed(2)}h</span>
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
      </div>
    </div>
  );
};

export default History;
