-- 創建游泳賽程表
CREATE TABLE public.swimming_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_number INTEGER NOT NULL,
  group_number INTEGER NOT NULL,
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  event_name TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  registration_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 RLS
ALTER TABLE public.swimming_schedule ENABLE ROW LEVEL SECURITY;

-- 創建公開讀取政策（所有人都可以查看）
CREATE POLICY "Anyone can view swimming schedule"
  ON public.swimming_schedule
  FOR SELECT
  USING (true);

-- 創建索引以提升查詢效能
CREATE INDEX idx_swimming_schedule_item ON public.swimming_schedule(item_number);
CREATE INDEX idx_swimming_schedule_group ON public.swimming_schedule(group_number);

-- 創建更新時間戳記的函數（如果不存在）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器自動更新 updated_at
CREATE TRIGGER update_swimming_schedule_updated_at
  BEFORE UPDATE ON public.swimming_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 添加註釋
COMMENT ON TABLE public.swimming_schedule IS '游泳比賽賽程表，所有人可公開查看';
COMMENT ON COLUMN public.swimming_schedule.item_number IS '項次';
COMMENT ON COLUMN public.swimming_schedule.group_number IS '組次';
COMMENT ON COLUMN public.swimming_schedule.age_group IS '年齡組';
COMMENT ON COLUMN public.swimming_schedule.gender IS '性別';
COMMENT ON COLUMN public.swimming_schedule.event_name IS '比賽項目';
COMMENT ON COLUMN public.swimming_schedule.participant_name IS '姓名';
COMMENT ON COLUMN public.swimming_schedule.unit IS '單位';
COMMENT ON COLUMN public.swimming_schedule.registration_time IS '報名成績';