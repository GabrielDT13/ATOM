CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(4);

SELECT has_schema('internal', 'El schema internal debe existir');
SELECT has_table('internal', 'profiles', 'Debe existir internal.profiles');
SELECT has_table('internal', 'roles', 'Debe existir internal.roles');
SELECT has_table('internal', 'user_roles', 'Debe existir internal.user_roles');

SELECT finish();

ROLLBACK;
