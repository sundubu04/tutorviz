-- Credentials live in Supabase Auth; app users table no longer stores a password hash.
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
