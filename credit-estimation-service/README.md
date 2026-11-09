# Credit Estimation Service

A microservice for estimating credit values for errands based on their title, description, and instructions.

## Features

- AI-powered credit estimation using configurable providers (any OpenAI-compatible API)
- Per-user rate limiting (10 req/min per user) when Redis is available
- Per-service rate limiting (configurable, default 50 req/min total) when Redis is unavailable
- Authentication via service token

## API Endpoints

### POST `/internal/estimation/estimate-credit`

Estimate credits for an errand.

**Request Body:**

```json
{
  "name": "Title of errand",
  "description": "Description of errand",
  "serviceType": 0,
  "instructions": "Optional instructions",
  "startAt": "2026-11-08T10:00:00Z",
  "expiresAt": "2026-11-08T12:00:00Z",
  "userId": "user-sub-identifier",
  "availableCredit": 37
}
```

**Authentication:** Requires `x-credit-estimation-service-token` OR `x-service-token` header

**Rate Limit:**

- When Redis available: 10 requests per minute per user (configurable via `AI_RATE_LIMIT_REQUESTS_PER_MINUTE`)
- When Redis unavailable: 50 requests per minute total for the service (configurable via `AI_FALLBACK_RATE_LIMIT_REQUESTS_PER_MINUTE`)

**Response:**

```json
{
  "minCredits": 15,
  "maxCredits": 25,
  "reason": "Brief reasoning for the estimate."
}
```

**Error Response (Rate Limited):**

```json
{
  "code": "RATE_LIMITED",
  "message": "Credit estimation is temporarily rate limited."
}
```

**Error Response (Invalid Input):**

```json
{
  "code": "INVALID_INPUT",
  "message": "Name must be a string. Description must be a string."
}
```

## Configuration

The AI provider and rate limiting are configured via environment variables.

| Variable                                   | Default                                 | Description                                       |
| ------------------------------------------ | --------------------------------------- | ------------------------------------------------- |
| PORT                                       | 3005                                    | Service port                                      |
| USER_API_URL                               | http://user-api:3000                    | User API URL for session validation               |
| USER_SERVICE_INTERNAL_TOKEN                | local-internal-user-service-token       | Token for user API auth                           |
| CREDIT_ESTIMATION_SERVICE_TOKEN            | local-internal-estimation-service-token | Internal service token                            |
| ESTIMATION_SERVICE_TIMEOUT_MS              | 5000                                    | Request timeout in ms                             |
| AI_PROVIDER                                | -                                       | AI provider (e.g., openai)                        |
| AI_API_KEY                                 | -                                       | AI API key (required)                             |
| AI_MODEL                                   | -                                       | AI model to use                                   |
| AI_ENDPOINT                                | -                                       | AI API endpoint                                   |
| AI_ESTIMATION_TIMEOUT_MS                   | 3000                                    | AI request timeout in ms                          |
| AI_TEMPERATURE                             | 0                                       | AI temperature setting                            |
| AI_MAX_TOKENS                              | 1000                                    | Max tokens for AI response                        |
| AI_RATE_LIMIT_REQUESTS_PER_MINUTE          | 20                                      | Rate limit per user per minute (Redis mode)       |
| AI_FALLBACK_RATE_LIMIT_REQUESTS_PER_MINUTE | 50                                      | Rate limit total for service (in-memory fallback) |
| REDIS_URL                                  | redis://redis:6379                      | Redis connection URL                              |

### Example Configuration

```bash
AI_PROVIDER=openai
AI_API_KEY=your-api-key
AI_ENDPOINT=your-endpoint
AI_MODEL=your-model-id
AI_ESTIMATION_TIMEOUT_MS=3000
AI_TEMPERATURE=0
AI_MAX_TOKENS=1000
AI_RATE_LIMIT_REQUESTS_PER_MINUTE=20
AI_FALLBACK_RATE_LIMIT_REQUESTS_PER_MINUTE=50
REDIS_URL=redis://redis:6379
```

## Service Baselines

| Service Type | Base | Min | Max |
| ------------ | ---- | --- | --- |
| Food         | 15   | 10  | 30  |
| Drink        | 10   | 8   | 20  |
| Shopping     | 20   | 15  | 40  |
| Printing     | 10   | 8   | 25  |
| Parcel       | 25   | 15  | 50  |

## Validation

The service validates all input fields:

- `name`: string, 1-200 characters, no dangerous patterns
- `description`: string, 1-5000 characters, no dangerous patterns
- `instructions`: optional string, max 5000 characters
- `startAt`: optional valid ISO date string
- `expiresAt`: optional valid ISO date string
- `serviceType`: integer, must be a valid service type from supplier service
- `userId`: required string for per-user rate limiting

Dangerous patterns (XSS, injection, prompt injection) are rejected.
