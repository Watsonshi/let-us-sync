-- 建立實際結束時間表
CREATE TABLE public.actual_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_no INTEGER NOT NULL,
  heat_num INTEGER NOT NULL,
  actual_end TIMESTAMPTZ NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_no, heat_num)
);

-- 啟用 RLS
ALTER TABLE public.actual_times ENABLE ROW LEVEL SECURITY;

-- 所有人可讀取
CREATE POLICY "Anyone can view actual times"
  ON public.actual_times FOR SELECT USING (true);

-- 僅管理員可寫入
CREATE POLICY "Only admins can insert actual times"
  ON public.actual_times FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update actual times"
  ON public.actual_times FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete actual times"
  ON public.actual_times FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 啟用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.actual_times;