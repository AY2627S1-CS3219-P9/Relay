# Kafka event keys and values for Kafbat UI

Open Kafbat UI at http://localhost:8081 (the Compose Kafka UI port). Choose the topic, create a message, paste the **key** as plain text and the **value** as JSON. Use a fresh UUID for each `eventId` and a current ISO 8601 UTC `timestamp`. The examples use:

- Requester Cognito subject: `f2b7a94c-111d-4929-886b-76d11e297dbf`
- Courier Cognito subject: `008b5ead-160c-49e9-8c14-9714907410aa`
- Errand ID: `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

These are IDs from the local end-to-end run. Replace them with the IDs you intend to exercise. Keep a given errand's key and `payload.errandId` identical across its events. All values use `version: 1`.

The user service publishes to `user-events`. The errand service publishes to `errand-events`. The credit service consumes both. A rejected errand event is copied to `errand-events-dlq` with an added `error` object. Publishing a Kafka event does **not** create or change an errand row in the errand database.

## User service events

### UserRegistered

**Topic:** `user-events`  
**Key:** `f2b7a94c-111d-4929-886b-76d11e297dbf`

```json
{
  "eventId": "11111111-1111-4111-8111-111111111101",
  "eventType": "UserRegistered",
  "timestamp": "2026-10-17T08:30:00.000Z",
  "version": 1,
  "payload": {
    "cognitoSub": "f2b7a94c-111d-4929-886b-76d11e297dbf"
  }
}
```

Published when the user profile is first created. Credit service allocates the initial 100 credits. Repeating this event for the same subject does not allocate another 100 credits.

### UserDeleted

**Topic:** `user-events`  
**Key:** `f2b7a94c-111d-4929-886b-76d11e297dbf`

```json
{
  "eventId": "11111111-1111-4111-8111-111111111102",
  "eventType": "UserDeleted",
  "timestamp": "2026-10-17T08:31:00.000Z",
  "version": 1,
  "payload": {
    "cognitoSub": "f2b7a94c-111d-4929-886b-76d11e297dbf"
  }
}
```

Published when the profile is deleted. Credit service deletes that user's credit data. Do not use the example requester ID if you want to keep testing its balance.

## Errand service events

The errand publisher sets the Kafka key to `payload.errandId`. It wraps every value with `eventId`, `eventType`, `timestamp`, `version`, and `payload`. Its outbox emits the following seven types.

### ErrandCreated

**Topic:** `errand-events`  
**Key:** `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

```json
{
  "eventId": "22222222-2222-4222-8222-222222222201",
  "eventType": "ErrandCreated",
  "timestamp": "2026-10-17T08:30:00.000Z",
  "version": 1,
  "payload": {
    "errandId": "456cfcbe-ab05-49d6-adf3-a1ad86c4d76c",
    "requesterSub": "f2b7a94c-111d-4929-886b-76d11e297dbf",
    "supplierId": "postman-supplier",
    "creditAmount": 10,
    "expiresAt": "2026-10-18T08:30:00.000Z"
  }
}
```

Credit service accepts this event but takes no balance action. The reserve is made synchronously through the internal credit API before errand creation.

### ErrandCreationFailed

**Topic:** `errand-events`  
**Key:** `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

```json
{
  "eventId": "22222222-2222-4222-8222-222222222202",
  "eventType": "ErrandCreationFailed",
  "timestamp": "2026-10-17T08:30:30.000Z",
  "version": 1,
  "payload": {
    "errandId": "456cfcbe-ab05-49d6-adf3-a1ad86c4d76c",
    "requesterSub": "f2b7a94c-111d-4929-886b-76d11e297dbf"
  }
}
```

Published when a pending errand is recovered after creation did not finish. Credit service closes or releases any matching reservation. Use this only for a genuinely failed creation.

### ErrandStatusChanged: accepted

**Topic:** `errand-events`  
**Key:** `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

```json
{
  "eventId": "22222222-2222-4222-8222-222222222203",
  "eventType": "ErrandStatusChanged",
  "timestamp": "2026-10-17T08:31:00.000Z",
  "version": 1,
  "payload": {
    "errandId": "456cfcbe-ab05-49d6-adf3-a1ad86c4d76c",
    "errandStatus": "ACCEPTED",
    "previousStatus": "OPEN",
    "actorSub": "008b5ead-160c-49e9-8c14-9714907410aa",
    "actorType": "courier",
    "requesterSub": "f2b7a94c-111d-4929-886b-76d11e297dbf"
  }
}
```

The same event type is emitted for pickup, delivery, and courier drop. Credit service takes no balance action on status changes. For those transitions change the fields as follows:

| Action | `previousStatus` | `errandStatus` | `actorSub` / `actorType` |
| --- | --- | --- | --- |
| Pickup | `ACCEPTED` | `PICKED_UP` | Courier subject / `courier` |
| Delivery | `PICKED_UP` | `DELIVERED` | Courier subject / `courier` |
| Courier drop | `ACCEPTED` | `OPEN` or `EXPIRED` | Courier subject / `courier` |

An expired courier drop also emits `ErrandExpired` below.

### ErrandCompleted

**Topic:** `errand-events`  
**Key:** `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

```json
{
  "eventId": "22222222-2222-4222-8222-222222222204",
  "eventType": "ErrandCompleted",
  "timestamp": "2026-10-17T08:32:00.000Z",
  "version": 1,
  "payload": {
    "errandId": "456cfcbe-ab05-49d6-adf3-a1ad86c4d76c",
    "requesterSub": "f2b7a94c-111d-4929-886b-76d11e297dbf",
    "courierSub": "008b5ead-160c-49e9-8c14-9714907410aa"
  }
}
```

Published after requester confirmation. Credit service transfers the existing reservation from requester to courier. It requires a matching prior reservation; sending this for an unreserved ID goes to the DLQ.

### ErrandCancelled

**Topic:** `errand-events`  
**Key:** `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

```json
{
  "eventId": "22222222-2222-4222-8222-222222222205",
  "eventType": "ErrandCancelled",
  "timestamp": "2026-10-17T08:32:00.000Z",
  "version": 1,
  "payload": {
    "errandId": "456cfcbe-ab05-49d6-adf3-a1ad86c4d76c",
    "actorSub": "f2b7a94c-111d-4929-886b-76d11e297dbf",
    "requesterSub": "f2b7a94c-111d-4929-886b-76d11e297dbf"
  }
}
```

Credit service releases the existing reservation. `actorSub` is the requester or courier who cancelled.

### ErrandExpired

**Topic:** `errand-events`  
**Key:** `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

```json
{
  "eventId": "22222222-2222-4222-8222-222222222206",
  "eventType": "ErrandExpired",
  "timestamp": "2026-10-17T08:33:00.000Z",
  "version": 1,
  "payload": {
    "errandId": "456cfcbe-ab05-49d6-adf3-a1ad86c4d76c"
  }
}
```

Credit service releases the existing reservation. This is emitted when an open errand expires or a courier drops an already expired errand.

### ErrandDeleted

**Topic:** `errand-events`  
**Key:** `456cfcbe-ab05-49d6-adf3-a1ad86c4d76c`

```json
{
  "eventId": "22222222-2222-4222-8222-222222222207",
  "eventType": "ErrandDeleted",
  "timestamp": "2026-10-17T08:34:00.000Z",
  "version": 1,
  "payload": {
    "errandId": "456cfcbe-ab05-49d6-adf3-a1ad86c4d76c",
    "requesterSub": "f2b7a94c-111d-4929-886b-76d11e297dbf"
  }
}
```

Credit service accepts this event but takes no balance action. Deleting an errand through the API removes its database row separately.

## Dead letter events

`ErrandEventInvalid` is defined in the errand contract, but the errand service does not publish it. The credit consumer synthesizes it on `errand-events-dlq` if an incoming value is malformed. For other rejected errand messages it copies the original envelope and adds:

```json
"error": {
  "code": "ERRAND_RESERVATION_NOT_FOUND",
  "message": "No prior credit reservation exists."
}
```

The DLQ key is the failed event's `payload.errandId`.

## Manual credit test sequence

1. Register and create profiles through the user API, or send `UserRegistered` for each subject, then confirm both credit balances exist.
2. Create an errand through `POST /api/errands/`. This makes the reservation and emits `ErrandCreated`. Sending `ErrandCreated` directly does not reserve credit.
3. To test manual settlement, copy that errand ID into **one** of `ErrandCompleted`, `ErrandCancelled`, or `ErrandExpired`. These are alternative outcomes for a reservation; a later conflicting outcome goes to the DLQ.
4. Read `GET /api/credit` and `GET /api/credit/history` with the session cookies from the Postman collection.

