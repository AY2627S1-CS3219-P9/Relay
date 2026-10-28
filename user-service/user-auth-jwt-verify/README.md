# User Auth JWT verifier

`userAuthMiddleware` reads the `relay_access` cookie, checks the RS256 signature
against User Auth API JWKS, validates issuer, audience, expiry, and identity
claims, then sets `req.user` to `{ sub, email, emailVerified, role }`.

Exported helpers: `userAuthMiddleware`, `verifyUserAccessToken`, and
`readAccessToken`. Route owners enforce role and verified-email requirements.
The package performs no per-request User Service or Cognito call. JWKS is fetched
on first use, cached for five minutes, and refreshed when a new `kid` appears.
