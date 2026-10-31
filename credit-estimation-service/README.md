# Credit Estimation Service

A microservice for estimating credit values for errands based on their title and description.

## Features

- AI-powered credit estimation using configurable providers (any OpenAI-compatible API)
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

The AI provider is configured entirely within the estimation service via environment variables. No changes needed in calling services.

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
| AI_API_KEY                      | -                                       | AI API key (required)               |
| AI_MODEL                        | -                                       | AI model to use                     |
| AI_ENDPOINT                     | -                                       | AI API endpoint                     |
| AI_ESTIMATION_TIMEOUT_MS        | -                                       | AI request timeout in ms            |
| AI_TEMPERATURE                  | 0                                       | AI temperature setting              |
| AI_MAX_TOKENS                   | 1000                                    | Max tokens for AI response          |

### Example Configuration

OpenAI-Compatible API**

```bash
AI_PROVIDER=openai
AI_API_KEY=your-api-key
AI_ENDPOINT=https://your-custom-endpoint.com/v1/chat/completions
AI_MODEL=your-model
AI_ESTIMATION_TIMEOUT_MS=1500
AI_TEMPERATURE=0
AI_MAX_TOKENS=1000
```

## Service Baselines

| Service Type | Base | Min | Max |
| ------------ | ---- | --- | --- |
| Food         | 15   | 10  | 30  |
| Drink        | 10   | 8   | 20  |
| Shopping     | 20   | 15  | 40  |
| Printing     | 10   | 8   | 25  |
| Parcel       | 25   | 15  | 50  |
