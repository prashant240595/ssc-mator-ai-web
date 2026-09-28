CREATE POLICY "Admin reads all activity"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');