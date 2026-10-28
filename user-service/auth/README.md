# User Auth API

This service owns Cognito registration, verification, login, refresh, logout,
password change, and admin group changes. It has no database. User profiles stay
in User Service.

## Routes

- `POST /api/auth/register`
- `POST /api/auth/verification/resend`
- `POST /api/auth/verification/confirm-and-login`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password`
- `POST /api/auth/admin/promote` and `/api/auth/admin/demote` (superadmin only)
- `GET /api/auth/.well-known/jwks.json`

Login and OTP confirmation set a 15-minute RS256 `relay_access` cookie and a
Cognito `relay_refresh` cookie. Both are HttpOnly, Secure, SameSite=Strict. The
refresh cookie is scoped to `/api/auth`. Refresh renews the access token and
replaces the refresh cookie if Cognito rotates it. The frontend uses `/api/user/me`
to determine whether a profile exists; a 404 means setup is still needed.

Other services import `@relay/user-auth-jwt-verify` and validate access tokens
locally against this service's JWKS. They do not call the auth service per
request. The package accepts `USER_AUTH_JWKS_URL`, `USER_AUTH_ISSUER`, and
`USER_AUTH_AUDIENCE`; Compose defaults are usable without service-specific
configuration. Keys are cached for up to five minutes, with a refetch on an
unknown key ID.

Compose persists a locally generated private key in `user-auth-keys`. For a
production deployment, provide a protected PEM file at `JWT_PRIVATE_KEY_FILE`
and assign a new `USER_AUTH_KEY_ID` when rotating it. Never share the private key
with verifier services. HTTPS is required for Secure cookies outside localhost.

Locally verified access tokens remain usable until their 15-minute expiry after
logout, password change, account deletion, or role change. Cognito revocation
stops refresh. A shared revocation store or shorter TTL would be needed for
immediate invalidation.
