create table if not exists "internal"."dashboard_activity" (
  "id" bigint generated always as identity primary key,
  "user_id" uuid not null references "internal"."profiles" ("id") on delete cascade,
  "activity_type" text not null,
  "title" text not null,
  "description" text not null,
  "project_owner_username" text not null,
  "project_name" text not null,
  "analysis_type" text,
  "design_id" text,
  "created_at" timestamp with time zone not null default now()
);

create index if not exists "idx_internal_dashboard_activity_user_created_at"
  on "internal"."dashboard_activity" using btree ("user_id", "created_at" desc);

create index if not exists "idx_internal_dashboard_activity_project_created_at"
  on "internal"."dashboard_activity" using btree ("project_owner_username", "project_name", "created_at" desc);

alter table "internal"."dashboard_activity" enable row level security;

revoke all on "internal"."dashboard_activity" from public, anon, authenticated;

grant select on table "internal"."dashboard_activity" to "authenticated";
grant select, insert, update, delete on table "internal"."dashboard_activity" to "service_role";

drop policy if exists "dashboard_activity_select_self" on "internal"."dashboard_activity";
create policy "dashboard_activity_select_self"
on "internal"."dashboard_activity"
as permissive
for select
to authenticated
using ("user_id" = (select auth.uid()));

create or replace view "public"."vw_dashboard_activity"
with (security_invoker = true)
as
select
  da.id,
  da.user_id,
  da.activity_type,
  da.title,
  da.description,
  da.project_owner_username,
  da.project_name,
  da.analysis_type,
  da.design_id,
  da.created_at
from "internal"."dashboard_activity" da;

grant select on table "public"."vw_dashboard_activity" to "authenticated";
grant select, insert on table "public"."vw_dashboard_activity" to "service_role";


