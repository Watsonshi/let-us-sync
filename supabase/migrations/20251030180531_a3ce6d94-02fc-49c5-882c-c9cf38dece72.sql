-- 修復 search_path 安全問題
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 重新創建觸發器
CREATE TRIGGER update_swimming_schedule_updated_at
  BEFORE UPDATE ON public.swimming_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();