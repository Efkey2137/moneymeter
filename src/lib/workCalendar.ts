import {
  ContractPeriod,
  ContractType,
  getPeriodForDate,
} from "@/lib/employment";

const DAY_MS = 24 * 60 * 60 * 1000;

const asUtcDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month, day));

const addUtcDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

const toDateKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;

// Meeus/Jones/Butcher algorithm.
const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return asUtcDate(year, month - 1, day);
};

export const getPolishHolidays = (year: number): Set<string> => {
  const easter = getEasterSunday(year);
  const fixed = [
    [0, 1],
    [0, 6],
    [4, 1],
    [4, 3],
    [7, 15],
    [10, 1],
    [10, 11],
    // Christmas Eve has been a statutory day off since 2025.
    ...(year >= 2025 ? ([[11, 24]] as number[][]) : []),
    [11, 25],
    [11, 26],
  ];

  return new Set([
    ...fixed.map(([month, day]) => toDateKey(asUtcDate(year, month, day))),
    toDateKey(easter),
    toDateKey(addUtcDays(easter, 1)),
    toDateKey(addUtcDays(easter, 49)),
    toDateKey(addUtcDays(easter, 60)),
  ]);
};

export const getMonthlyWorkNorm = (
  year: number,
  month: number,
  fraction = 1,
): number => {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const completeWeeks = Math.floor(daysInMonth / 7);
  let fullTimeHours = completeWeeks * 40;

  for (let day = completeWeeks * 7 + 1; day <= daysInMonth; day += 1) {
    const weekday = asUtcDate(year, month, day).getUTCDay();
    if (weekday >= 1 && weekday <= 5) fullTimeHours += 8;
  }

  const holidays = getPolishHolidays(year);
  for (const holiday of holidays) {
    const date = new Date(`${holiday}T00:00:00Z`);
    if (date.getUTCMonth() !== month) continue;
    if (date.getUTCDay() !== 0) fullTimeHours -= 8;
  }

  return Math.max(0, Math.round(fullTimeHours * fraction * 100) / 100);
};

export const getDailyWorkNorm = (date: string, fraction = 1): number => {
  const parsed = new Date(`${date}T00:00:00Z`);
  const weekday = parsed.getUTCDay();
  if (weekday === 0 || weekday === 6) return 0;
  if (getPolishHolidays(parsed.getUTCFullYear()).has(date)) return 0;
  return Math.round(8 * fraction * 100) / 100;
};

export const getQuarterMonths = (date = new Date()): string[] => {
  const year = date.getFullYear();
  const firstMonth = Math.floor(date.getMonth() / 3) * 3;
  return [0, 1, 2].map(
    (offset) =>
      `${year}-${String(firstMonth + offset + 1).padStart(2, "0")}`,
  );
};

export const getQuarterLabel = (date = new Date()): string =>
  `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;

export const getQuarterMonthsFor = (year: number, quarter: number): string[] => {
  const firstMonth = (quarter - 1) * 3;
  return [0, 1, 2].map(
    (offset) => `${year}-${String(firstMonth + offset + 1).padStart(2, "0")}`,
  );
};

export const getQuarterEndDate = (year: number, quarter: number): string => {
  const lastMonth = quarter * 3;
  const lastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
  return `${year}-${String(lastMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};

export const getQuarterNumber = (date: Date): number =>
  Math.floor(date.getMonth() / 3) + 1;

export const getContractMonthlyTarget = (
  year: number,
  month: number,
  periods: ContractPeriod[],
  fallbackContractType: ContractType,
  fallbackFraction: number,
  override?: number,
): number => {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let hasEmploymentDay = false;
  let target = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const period = getPeriodForDate(periods, date);
    const contractType = period?.contractType ?? fallbackContractType;
    if (contractType !== "employment") continue;

    hasEmploymentDay = true;
    target += getDailyWorkNorm(
      date,
      period?.employmentFraction ?? fallbackFraction,
    );
  }

  if (override !== undefined && hasEmploymentDay) return override;
  return Math.round(target * 100) / 100;
};

export const getDateRange = (from: Date, to: Date): string[] => {
  const start = asUtcDate(from.getFullYear(), from.getMonth(), from.getDate());
  const end = asUtcDate(to.getFullYear(), to.getMonth(), to.getDate());
  const dates: string[] = [];

  for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
    dates.push(toDateKey(cursor));
  }
  return dates;
};
