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

Login and OTP confirmation set Cognito access, ID, and refresh tokens as HTTP-only, Secure, SameSite=Strict cookies. Cognito access and ID tokens are configured for 15 minutes.

Other services import `@relay/user-auth-middleware` and verify Cognito tokens locally with `aws-jwt-verify`.

HTTPS is required for Secure cookies outside localhost.

Locally verified access tokens remain usable until their 15-minute expiry after
logout, password change, account deletion, or role change. Cognito revocation
stops refresh. A shared revocation store or shorter TTL would be needed for
immediate invalidation.
