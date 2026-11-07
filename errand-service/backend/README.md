# Errand Service backend

Errand state changes and their Kafka events are written to errand_event_outbox
in the same PostgreSQL transaction. The errand repository builds the distinct payload for
each lifecycle event. The pending-errand worker runs every five seconds and
records ErrandCreationFailed for stale pending rows; it does not publish Kafka
messages. The outbox publisher runs every second, sends unpublished events to
the configured errand topic, and marks each row published only after Kafka
acknowledges it. A failed send leaves the row pending for retry. The publisher
removes published rows older than seven days during its minute-by-minute cleanup.
Unpublished rows are never deleted by this cleanup.

Before enabling or deploying requester-deletion acceptance protection, run the
profile audit:

```bash
npm run audit:profileless --workspace=@relay/errand-backend
```

The audit compares every distinct errand requester with User Service. A
missing profile with a recorded `UserDeleted` event is classified as
`legitimately-deleted`. A missing profile without that event is classified with
Cognito when available: an existing Cognito user is
`legacy-profile-never-created`, while a missing Cognito user is
`inconsistent-data`. Local/mock identity mode reports
`needs-manual-classification` because it cannot safely make that distinction.
The command exits non-zero while unresolved entries remain.

After reviewing the JSON report, remediation is explicit:

```bash
npm run audit:profileless --workspace=@relay/errand-backend -- --remediate-open
npm run audit:profileless --workspace=@relay/errand-backend -- --resolve-assigned
```

`--remediate-open` cancels only profile-less `OPEN` errands and emits
`ErrandCancelled`, allowing Credit Service to release their reservations.
Assigned errands are left untouched unless `--resolve-assigned` is explicitly
provided; that option applies the same requester-deletion rule as the live
consumer and emits `ErrandCompleted` for settlement. Run the audit again and
record the final report before deploying the acceptance guard.

The Errand API also consumes `UserDeleted` events with the dedicated
`relay-errand-user-events` group. New consumer groups start from the current
Kafka tail; historical deletions require an explicit audit/backfill. For a
deleted requester, `OPEN` errands become `CANCELLED` and emit
`ErrandCancelled` so reserved credit is released. `ACCEPTED`, `PICKED_UP`,
and `DELIVERED` errands become `CONFIRMED` and emit `ErrandCompleted` so the
assigned courier receives the full reserved amount. Each transition is locked
and written with its outbox event in one database transaction, so redelivery is
safe and cannot duplicate settlement events.
