-- Session authentication was replaced by Cognito JWT cookies.
-- Unschedule the obsolete cleanup before removing its function and table.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup-user-sessions';

DROP FUNCTION IF EXISTS cleanup_user_sessions(integer);
DROP TABLE "user_sessions";
