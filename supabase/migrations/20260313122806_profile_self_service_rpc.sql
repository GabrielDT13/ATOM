set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.change_my_password(p_current_password text, p_new_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'internal'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  current_encrypted_password text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF COALESCE(trim(p_current_password), '') = '' THEN
    RAISE EXCEPTION 'La contraseña actual es obligatoria';
  END IF;

  IF COALESCE(trim(p_new_password), '') = '' THEN
    RAISE EXCEPTION 'La nueva contraseña es obligatoria';
  END IF;

  IF char_length(trim(p_new_password)) < 8 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 8 caracteres';
  END IF;

  IF p_current_password = p_new_password THEN
    RAISE EXCEPTION 'La nueva contraseña debe ser distinta de la actual';
  END IF;

  SELECT u.encrypted_password
  INTO current_encrypted_password
  FROM auth.users AS u
  WHERE u.id = current_user_id
  FOR UPDATE;

  IF current_encrypted_password IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  IF public.crypt(p_current_password, current_encrypted_password) <> current_encrypted_password THEN
    RAISE EXCEPTION 'Email o contraseña incorrectos';
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = public.crypt(p_new_password, public.gen_salt('bf')),
    updated_at = now()
  WHERE id = current_user_id;

  INSERT INTO internal.profile_activity (user_id, activity_type, title, description)
  VALUES (
    current_user_id,
    'password_changed',
    'Cambio de contraseña',
    'Se actualizó la contraseña de la cuenta.'
  );

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_my_account()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'internal'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM internal.projects
    WHERE owner_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar la cuenta porque todavía eres propietario de proyectos. Reasigna o elimina esos proyectos primero.';
  END IF;

  DELETE FROM auth.users
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  RETURN true;
END;
$function$
;

REVOKE ALL ON FUNCTION public.change_my_password(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.change_my_password(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated, service_role;

