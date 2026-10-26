# Credit Estimation Service

A microservice for estimating credit values for errands based on their title and description.

## Features

- AI-powered credit estimation using OpenAI
- Keyword-based complexity analysis as fallback
- Rate limiting (10 requests per minute per user)
- Authentication via session validation

## API Endpoints

### POST `/internal/estimation/estimate-credit`

Estimate credits for an errand.

**Request Body:**

```json
{
  "name": "Title of errand",
  "description": "Description of errand",
  "serviceType": 0
}
```

**Authentication:** Requires valid session cookie

**Rate Limit:** 10 requests per minute per user

**Response:**

```json
{
  "estimatedCredits": 25,
  "explanation": "Brief reasoning for the estimate."
}
```

## Configuration

| Variable                        | Default                                 | Description                         |
| ------------------------------- | --------------------------------------- | ----------------------------------- |
| PORT                            | 3005                                    | Service port                        |
| USER_API_URL                    | http://user-api:3000                    | User API URL for session validation |
| USER_SERVICE_INTERNAL_TOKEN     | local-internal-user-service-token       | Token for user API auth             |
| CREDIT_ESTIMATION_SERVICE_TOKEN | local-internal-estimation-service-token | Internal service token              |
| ESTIMATION_SERVICE_TIMEOUT_MS   | 5000                                    | Request timeout in ms               |
| RATE_LIMIT_MAX                  | 10                                      | Max requests per window             |
| RATE_LIMIT_WINDOW_MS            | 60000                                   | Window size in ms                   |
| AI_PROVIDER                     | openai                                  | AI provider (openai)                |
| OPENAI_API_KEY                  | -                                       | OpenAI API key (required)           |
| ESTIMATION_TIMEOUT_MS           | 1500                                    | AI request timeout in ms            |

## Service Baselines

| Service Type | Base | Min | Max |
| ------------ | ---- | --- | --- |
| Food         | 15   | 10  | 30  |
| Drink        | 10   | 8   | 20  |
| Shopping     | 20   | 15  | 40  |
| Printing     | 10   | 8   | 25  |
| Parcel       | 25   | 15  | 50  |
