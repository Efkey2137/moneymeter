-- Add hourly_rate column to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN hourly_rate NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.time_entries.hourly_rate IS 'Hourly rate at the time of entry creation';