-- 創建插入政策（允許所有人插入）
CREATE POLICY "Anyone can insert swimming schedule"
  ON public.swimming_schedule
  FOR INSERT
  WITH CHECK (true);

-- 創建更新政策（允許所有人更新）
CREATE POLICY "Anyone can update swimming schedule"
  ON public.swimming_schedule
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 創建刪除政策（允許所有人刪除）
CREATE POLICY "Anyone can delete swimming schedule"
  ON public.swimming_schedule
  FOR DELETE
  USING (true);