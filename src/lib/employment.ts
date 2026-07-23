export type ContractType = "mandate" | "employment";
export type EntryType = "work" | "vacation" | "sick_leave" | "other_absence";

export interface UserSettings {
  hourlyRate: number;
  contractType: ContractType;
  employmentFraction: number;
  monthlySalaryNet: number;
  onboardingCompleted: boolean;
}

export interface ContractPeriod {
  id: string;
  contractType: ContractType;
  employmentFraction: number;
  hourlyRate: number;
  monthlySalaryNet: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface MonthlyCompensation {
  id?: string;
  month: string;
  netAmount: number;
}

export interface WorkTimeOverride {
  id?: string;
  month: string;
  targetHours: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  hourlyRate: 0,
  contractType: "mandate",
  employmentFraction: 1,
  monthlySalaryNet: 0,
  onboardingCompleted: false,
};

export const CONTRACT_LABELS: Record<ContractType, string> = {
  mandate: "Umowa zlecenie",
  employment: "Umowa o pracę",
};

export const ENTRY_LABELS: Record<EntryType, string> = {
  work: "Praca",
  vacation: "Urlop",
  sick_leave: "L4",
  other_absence: "Inna nieobecność",
};

export const FRACTION_OPTIONS = [
  { value: 1, label: "Pełny etat" },
  { value: 0.75, label: "3/4 etatu" },
  { value: 0.5, label: "1/2 etatu" },
  { value: 0.25, label: "1/4 etatu" },
];

export const formatFraction = (fraction: number): string => {
  const known = FRACTION_OPTIONS.find((option) => option.value === fraction);
  return known?.label ?? `${Math.round(fraction * 100)}% etatu`;
};

export const getPeriodForDate = (
  periods: ContractPeriod[],
  date: string,
): ContractPeriod | undefined =>
  periods.find(
    (period) =>
      period.effectiveFrom <= date &&
      (!period.effectiveTo || period.effectiveTo >= date),
  );
