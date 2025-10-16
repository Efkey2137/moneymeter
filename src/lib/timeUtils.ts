export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

export const calculateHours = (startTime: string, endTime: string): number => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  const startMinutes = start.hours * 60 + start.minutes;
  let endMinutes = end.hours * 60 + end.minutes;
  
  // Handle night shifts (e.g., 22:00 to 6:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }
  
  const totalMinutes = endMinutes - startMinutes;
  return totalMinutes / 60;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(amount);
};

export const getMonthName = (month: number): string => {
  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  return months[month];
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const groupEntriesByMonth = (entries: TimeEntry[]): Record<string, TimeEntry[]> => {
  return entries.reduce((acc, entry) => {
    const month = entry.date.substring(0, 7);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);
};

export const calculateMonthTotal = (entries: TimeEntry[]): { hours: number; salary: number } => {
  const hours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const hourlyRate = parseFloat(localStorage.getItem('hourlyRate') || '0');
  return {
    hours,
    salary: hours * hourlyRate,
  };
};
