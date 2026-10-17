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

## New user event

The first successful `PATCH /api/user/me` profile creation stores a
`UserRegistered` envelope in the PostgreSQL outbox in the same transaction
as the profile. The background publisher sends it to `KAFKA_TOPIC_USER_EVENTS`
with `payload: { cognitoSub }`, and marks it published after Kafka acknowledges
it. Pending events are retried after transient broker failures or restarts.
Compose uses `kafka:9092`.

Deleting a profile writes a `UserDeleted` envelope to the same outbox and
topic in the profile deletion transaction. Both envelopes include an event ID,
timestamp, event type, and version 1.
