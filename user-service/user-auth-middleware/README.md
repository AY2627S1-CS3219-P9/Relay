# User Auth Middleware

Express middleware for Cognito user-pool tokens. Each request verifies the Cognito access and ID cookies using `aws-jwt-verify` and cached Cognito public keys. It checks issuer, app client, token type, signature, expiry, and matching subjects. The access token supplies group membership; the ID token supplies email and email verification.

Exports: `userAuthMiddleware`, `userAuthAdminMiddleware`, `userAuthSuperAdminMiddleware`. Admin accepts the Admin and SuperAdmin groups. SuperAdmin accepts only the SuperAdmin group.

Configure `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_ADMIN_GROUP_NAME`, `COGNITO_SUPERADMIN_GROUP_NAME`. In local Floci development set `COGNITO_ISSUER` and `COGNITO_JWKS_URI` to its external issuer and reachable JWKS URL.
