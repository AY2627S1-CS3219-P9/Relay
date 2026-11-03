-- Session authentication was replaced by Cognito JWT cookies.
DROP FUNCTION IF EXISTS cleanup_user_sessions(integer);
DROP TABLE IF EXISTS "user_sessions";
