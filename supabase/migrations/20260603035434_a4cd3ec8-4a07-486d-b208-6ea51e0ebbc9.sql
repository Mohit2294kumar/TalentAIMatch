
-- Fix function search paths and lock down SECURITY DEFINER exposure
alter function public.has_role(uuid, app_role) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.touch_updated_at() set search_path = public;

revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Storage RLS: users can manage only their own files (path prefix = user_id/...)
create policy "resumes_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
