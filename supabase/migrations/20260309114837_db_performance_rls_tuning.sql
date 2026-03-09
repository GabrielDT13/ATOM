drop policy "project_members_mutate_owner_or_admin" on "internal"."project_members";

drop policy "profiles_select_self_or_related_or_admin" on "internal"."profiles";

drop policy "profiles_update_self_or_admin" on "internal"."profiles";

drop policy "project_members_select_related_or_admin" on "internal"."project_members";

drop policy "projects_delete_owner_or_admin" on "internal"."projects";

drop policy "projects_insert_owner_or_admin" on "internal"."projects";

drop policy "projects_select_member_or_admin" on "internal"."projects";

drop policy "projects_update_owner_or_admin" on "internal"."projects";

drop index if exists "internal"."idx_internal_departments_slug";

drop index if exists "internal"."idx_internal_profiles_username";


  create policy "project_members_delete_owner_or_admin"
  on "internal"."project_members"
  as permissive
  for delete
  to authenticated
using ((( SELECT internal.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));



  create policy "project_members_insert_owner_or_admin"
  on "internal"."project_members"
  as permissive
  for insert
  to authenticated
with check ((( SELECT internal.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));



  create policy "project_members_update_owner_or_admin"
  on "internal"."project_members"
  as permissive
  for update
  to authenticated
using ((( SELECT internal.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))))
with check ((( SELECT internal.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));



  create policy "profiles_select_self_or_related_or_admin"
  on "internal"."profiles"
  as permissive
  for select
  to authenticated
using (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM (internal.project_members viewer_pm
     JOIN internal.project_members target_pm ON ((target_pm.project_id = viewer_pm.project_id)))
  WHERE ((viewer_pm.user_id = ( SELECT auth.uid() AS uid)) AND (target_pm.user_id = profiles.id))))));



  create policy "profiles_update_self_or_admin"
  on "internal"."profiles"
  as permissive
  for update
  to authenticated
using (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin)))
with check (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin)));



  create policy "project_members_select_related_or_admin"
  on "internal"."project_members"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM internal.project_members current_pm
  WHERE ((current_pm.project_id = project_members.project_id) AND (current_pm.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));



  create policy "projects_delete_owner_or_admin"
  on "internal"."projects"
  as permissive
  for delete
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin)));



  create policy "projects_insert_owner_or_admin"
  on "internal"."projects"
  as permissive
  for insert
  to authenticated
with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin)));



  create policy "projects_select_member_or_admin"
  on "internal"."projects"
  as permissive
  for select
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM internal.project_members pm
  WHERE ((pm.project_id = projects.id) AND (pm.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "projects_update_owner_or_admin"
  on "internal"."projects"
  as permissive
  for update
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin)))
with check (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT internal.is_admin() AS is_admin)));



