-- Manual totals for quarters that predate detailed daily tracking.
CREATE TABLE public.quarterly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  reported_hours NUMERIC(10, 2) NOT NULL CHECK (reported_hours >= 0),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, quarter)
);

ALTER TABLE public.quarterly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quarterly summaries"
  ON public.quarterly_summaries FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quarterly summaries"
  ON public.quarterly_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quarterly summaries"
  ON public.quarterly_summaries FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quarterly summaries"
  ON public.quarterly_summaries FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_quarterly_summaries_updated_at
  BEFORE UPDATE ON public.quarterly_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_quarterly_summaries_user_period
  ON public.quarterly_summaries(user_id, year DESC, quarter DESC);

-- Replace the user's complete contract timeline atomically. The application
-- sends start dates; end dates are derived from the next period.
CREATE OR REPLACE FUNCTION public.replace_contract_timeline(p_periods JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  period_count INTEGER;
  overlap_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF jsonb_typeof(p_periods) <> 'array' THEN
    RAISE EXCEPTION 'Contract timeline must be an array';
  END IF;

  period_count := jsonb_array_length(p_periods);
  IF period_count = 0 THEN
    RAISE EXCEPTION 'At least one contract period is required';
  END IF;

  CREATE TEMP TABLE contract_timeline_input (
    contract_type TEXT,
    employment_fraction NUMERIC,
    hourly_rate NUMERIC,
    monthly_salary_net NUMERIC,
    effective_from DATE,
    effective_to DATE
  ) ON COMMIT DROP;

  INSERT INTO contract_timeline_input
  SELECT
    item.contract_type,
    item.employment_fraction,
    item.hourly_rate,
    item.monthly_salary_net,
    item.effective_from,
    item.effective_to
  FROM jsonb_to_recordset(p_periods) AS item(
    contract_type TEXT,
    employment_fraction NUMERIC,
    hourly_rate NUMERIC,
    monthly_salary_net NUMERIC,
    effective_from DATE,
    effective_to DATE
  );

  IF (SELECT count(*) FROM contract_timeline_input) <> period_count THEN
    RAISE EXCEPTION 'Invalid contract timeline';
  END IF;

  IF (
    SELECT count(DISTINCT effective_from)
    FROM contract_timeline_input
  ) <> period_count THEN
    RAISE EXCEPTION 'Contract periods must have unique start dates';
  END IF;

  SELECT count(*) INTO overlap_count
  FROM contract_timeline_input first_period
  JOIN contract_timeline_input second_period
    ON first_period.effective_from < second_period.effective_from
   AND COALESCE(first_period.effective_to, 'infinity'::date) >= second_period.effective_from;

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Contract periods cannot overlap';
  END IF;

  DELETE FROM public.contract_periods
  WHERE user_id = auth.uid();

  INSERT INTO public.contract_periods (
    user_id,
    contract_type,
    employment_fraction,
    hourly_rate,
    monthly_salary_net,
    effective_from,
    effective_to
  )
  SELECT
    auth.uid(),
    contract_type,
    employment_fraction,
    hourly_rate,
    monthly_salary_net,
    effective_from,
    effective_to
  FROM contract_timeline_input
  ORDER BY effective_from;
END;
$$;

COMMENT ON TABLE public.quarterly_summaries
  IS 'Optional user-reported total hours for completed quarters.';
COMMENT ON FUNCTION public.replace_contract_timeline(JSONB)
  IS 'Atomically replaces the authenticated user contract timeline.';
