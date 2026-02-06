-- Create race_sync_status table for storing scraped race info
CREATE TABLE public.race_sync_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_event_no integer,
  inspection_event_no integer,
  raw_current_text text,
  raw_inspection_text text,
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  source_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.race_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can view (read-only for all users)
CREATE POLICY "Anyone can view race sync status"
ON public.race_sync_status
FOR SELECT
USING (true);

-- Only service role can insert/update (Edge Function uses service role)
CREATE POLICY "Service role can insert race sync status"
ON public.race_sync_status
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update race sync status"
ON public.race_sync_status
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_race_sync_status_updated_at
BEFORE UPDATE ON public.race_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_sync_status;

-- Add comment for documentation
COMMENT ON TABLE public.race_sync_status IS 'Stores scraped race status from external CTSA website';