# Relay User Service Backend

Profile-management API for Relay.

The service uses PostgreSQL for profile metadata and an S3-compatible service
for profile pictures. Authentication initially uses locally signed,
Cognito-compatible JWTs. Cognito verification can be introduced later without
changing the profile service boundary.

## Development

Copy `.env.example` to `.env`, install dependencies, generate the Prisma client,
and run the development server:

```bash
npm install
npm run prisma:generate
npm run dev
```
