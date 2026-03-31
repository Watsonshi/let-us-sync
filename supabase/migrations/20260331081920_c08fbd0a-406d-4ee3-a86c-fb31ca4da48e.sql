
-- Fix race_sync_status: restrict INSERT/UPDATE to authenticated users with admin role
DROP POLICY IF EXISTS "Service role can insert race sync status" ON public.race_sync_status;
DROP POLICY IF EXISTS "Service role can update race sync status" ON public.race_sync_status;

CREATE POLICY "Only admins can insert race sync status" ON public.race_sync_status
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update race sync status" ON public.race_sync_status
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix user_roles: add admin-only INSERT/UPDATE/DELETE policies
CREATE POLICY "Only admins can insert user roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update user roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete user roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
