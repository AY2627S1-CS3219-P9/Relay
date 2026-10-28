# User Auth API scaffold

The /api/auth proxy and container are in place. The service currently exposes only
/health and /healthz. The JWT contract defines the future authentication API;
identity operations, token signing and verification, and migration of callers from
user-api have not yet been implemented. Existing /api/user auth routes remain live.
