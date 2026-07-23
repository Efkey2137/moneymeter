-- Add employment-contract support without changing the meaning of existing data.
ALTER TABLE public.user_settings
  ADD COLUMN contract_type TEXT NOT NULL DEFAULT 'mandate'
    CHECK (contract_type IN ('mandate', 'employment')),
  ADD COLUMN employment_fraction NUMERIC(4, 2) NOT NULL DEFAULT 1
    CHECK (employment_fraction > 0 AND employment_fraction <= 1),
  ADD COLUMN monthly_salary_net NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (monthly_salary_net >= 0),
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.time_entries
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL,
  ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'work'
    CHECK (entry_type IN ('work', 'vacation', 'sick_leave', 'other_absence')),
  ADD COLUMN note TEXT;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_work_time_check
  CHECK (
    (entry_type = 'work' AND start_time IS NOT NULL AND end_time IS NOT NULL)
    OR
    (entry_type <> 'work' AND start_time IS NULL AND end_time IS NULL)
  );

CREATE TABLE public.contract_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_type TEXT NOT NULL
    CHECK (contract_type IN ('mandate', 'employment')),
  employment_fraction NUMERIC(4, 2) NOT NULL DEFAULT 1
    CHECK (employment_fraction > 0 AND employment_fraction <= 1),
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0
    CHECK (hourly_rate >= 0),
  monthly_salary_net NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (monthly_salary_net >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE public.monthly_compensation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month),
  CHECK (month = date_trunc('month', month)::date)
);

CREATE TABLE public.work_time_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  target_hours NUMERIC(10, 2) NOT NULL CHECK (target_hours >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month),
  CHECK (month = date_trunc('month', month)::date)
);

ALTER TABLE public.contract_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_time_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contract periods"
  ON public.contract_periods FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contract periods"
  ON public.contract_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contract periods"
  ON public.contract_periods FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contract periods"
  ON public.contract_periods FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own monthly compensation"
  ON public.monthly_compensation FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own monthly compensation"
  ON public.monthly_compensation FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own monthly compensation"
  ON public.monthly_compensation FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own monthly compensation"
  ON public.monthly_compensation FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own work time overrides"
  ON public.work_time_overrides FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own work time overrides"
  ON public.work_time_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own work time overrides"
  ON public.work_time_overrides FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own work time overrides"
  ON public.work_time_overrides FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_contract_periods_updated_at
  BEFORE UPDATE ON public.contract_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_compensation_updated_at
  BEFORE UPDATE ON public.monthly_compensation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_time_overrides_updated_at
  BEFORE UPDATE ON public.work_time_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contract_periods_user_dates
  ON public.contract_periods(user_id, effective_from, effective_to);
CREATE INDEX idx_monthly_compensation_user_month
  ON public.monthly_compensation(user_id, month);
CREATE INDEX idx_work_time_overrides_user_month
  ON public.work_time_overrides(user_id, month);

COMMENT ON COLUMN public.user_settings.monthly_salary_net
  IS 'User-provided average monthly net salary for an employment contract.';
COMMENT ON COLUMN public.time_entries.entry_type
  IS 'Work or a system-calculated paid absence.';
