-- Update existing time entries with user's hourly rate
UPDATE public.time_entries te
SET hourly_rate = COALESCE(us.hourly_rate, 0)
FROM public.user_settings us
WHERE te.user_id = us.user_id
  AND te.hourly_rate = 0;