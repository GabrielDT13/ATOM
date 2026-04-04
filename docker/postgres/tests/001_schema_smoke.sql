DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'Falta la extension pgcrypto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
    RAISE EXCEPTION 'Falta la extension unaccent';
  END IF;
END
$$;

DO $$
DECLARE
  required_relations text[] := ARRAY[
    'auth.users',
    'auth.refresh_tokens',
    'internal.profiles',
    'internal.roles',
    'internal.user_roles',
    'internal.departments',
    'internal.profile_preferences',
    'internal.profile_activity',
    'internal.dashboard_activity',
    'internal.projects',
    'internal.project_members',
    'public.vw_departments',
    'public.vw_profiles',
    'public.vw_projects',
    'public.vw_projects_with_users',
    'public.vw_profile_preferences',
    'public.vw_profile_activity',
    'public.vw_dashboard_activity'
  ];
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY required_relations LOOP
    IF to_regclass(relation_name) IS NULL THEN
      RAISE EXCEPTION 'Falta la relacion requerida: %', relation_name;
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  enum_labels text[];
BEGIN
  SELECT array_agg(enumlabel ORDER BY enumsortorder)
  INTO enum_labels
  FROM pg_enum
  WHERE enumtypid = 'internal.project_member_role'::regtype;

  IF enum_labels IS DISTINCT FROM ARRAY['owner', 'editor', 'viewer'] THEN
    RAISE EXCEPTION 'Valores inesperados en internal.project_member_role: %', enum_labels;
  END IF;
END
$$;

DO $$
DECLARE
  role_count integer;
  department_count integer;
  user_count integer;
  profile_count integer;
  preferences_count integer;
  admin_roles text[];
  admin_department text;
  candidate_slug text;
BEGIN
  SELECT count(*) INTO role_count FROM internal.roles;
  IF role_count <> 2 THEN
    RAISE EXCEPTION 'Se esperaban 2 roles base y hay %', role_count;
  END IF;

  SELECT count(*) INTO department_count FROM internal.departments;
  IF department_count <> 5 THEN
    RAISE EXCEPTION 'Se esperaban 5 departamentos base y hay %', department_count;
  END IF;

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <> 3 THEN
    RAISE EXCEPTION 'Se esperaban 3 usuarios semilla y hay %', user_count;
  END IF;

  SELECT count(*) INTO profile_count FROM internal.profiles;
  IF profile_count <> user_count THEN
    RAISE EXCEPTION 'El numero de perfiles (%) no coincide con auth.users (%)', profile_count, user_count;
  END IF;

  SELECT count(*) INTO preferences_count FROM internal.profile_preferences;
  IF preferences_count <> user_count THEN
    RAISE EXCEPTION 'El numero de preferencias (%) no coincide con auth.users (%)', preferences_count, user_count;
  END IF;

  SELECT roles, department
  INTO admin_roles, admin_department
  FROM public.vw_profiles
  WHERE username = 'admin'
  LIMIT 1;

  IF admin_roles IS NULL OR NOT ('admin' = ANY(admin_roles)) THEN
    RAISE EXCEPTION 'El usuario admin no tiene el rol admin';
  END IF;

  IF admin_department IS DISTINCT FROM 'Administracion del sistema' THEN
    RAISE EXCEPTION 'Departamento inesperado para admin: %', admin_department;
  END IF;

  SELECT internal.ensure_project_slug('admin', 'RNA Atlas', NULL)
  INTO candidate_slug;
  IF candidate_slug IS DISTINCT FROM 'admin-rna-atlas' THEN
    RAISE EXCEPTION 'Slug inesperado para proyecto de prueba: %', candidate_slug;
  END IF;
END
$$;
