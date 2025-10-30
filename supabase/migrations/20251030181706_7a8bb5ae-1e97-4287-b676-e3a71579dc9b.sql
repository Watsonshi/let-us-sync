-- 創建角色枚舉
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 創建用戶角色表
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 啟用 RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 用戶可以查看自己的角色
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 創建安全函數檢查角色
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 更新 swimming_schedule 的 RLS 政策
-- 刪除舊的不安全政策
DROP POLICY IF EXISTS "Anyone can insert swimming schedule" ON public.swimming_schedule;
DROP POLICY IF EXISTS "Anyone can update swimming schedule" ON public.swimming_schedule;
DROP POLICY IF EXISTS "Anyone can delete swimming schedule" ON public.swimming_schedule;

-- 創建新的安全政策：只有管理員可以寫入
CREATE POLICY "Only admins can insert swimming schedule"
  ON public.swimming_schedule
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update swimming schedule"
  ON public.swimming_schedule
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete swimming schedule"
  ON public.swimming_schedule
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));