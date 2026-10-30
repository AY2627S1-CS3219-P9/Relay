# Relay load tests

This directory contains version-controlled k6 scripts. The Grafana Cloud editor may be used to experiment, but these files are the source of truth for local runs and GitHub Actions.

## Errand browse smoke test

`errand-browse-smoke.js` logs in one seeded, verified user and repeatedly checks the authenticated Errand browse endpoints:

- `GET /api/errands?scope=visible`
- `GET /api/errands?scope=mine`
- Optionally, `GET /api/errands/:id` when `LOAD_TEST_ERRAND_ID` is set.

It is intentionally read-only. The forthcoming lifecycle and concurrency tests will use isolated, run-specific errands and separate requester/courier credentials.

### Prerequisites

Start the Relay Docker Compose environment and ensure the selected load-test user has a verified Cognito account and completed profile.

```powershell
docker compose up --build --wait
```

Create an ignored local configuration file once. It is convenient for repeated local runs and is never committed.

```powershell
Copy-Item load-tests/.env.example load-tests/.env.local
# Edit load-tests/.env.local with the test accounts and supplier values.
```

`load-tests/.env.local` is ignored by both the repository and the `load-tests` directory. Do not put real credentials in `.env.example`, test scripts, result files, or committed documentation.

### Run locally in Docker

The default `BASE_URL` is `http://host.docker.internal:8080`, which lets the k6 container reach the Compose host gateway.

```powershell
New-Item -ItemType Directory -Force load-tests/results | Out-Null

docker run --rm -i `
  --env-file load-tests/.env.local `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run `
  -e K6_SUMMARY_PATH=/scripts/results/errand-browse-summary.json `
  /scripts/errand-browse-smoke.js
```

Optional parameters:

```powershell
$env:SMOKE_VUS = '2'
$env:SMOKE_DURATION = '1m'
$env:LOAD_TEST_ERRAND_ID = 'an-errand-visible-to-the-test-user'
```

`results/*.json` is ignored by Git and authentication data is removed from the generated summary. k6 thresholds cause a non-zero exit code when the smoke test fails, so the same script can later gate GitHub Actions.

### Grafana Cloud

After the local script passes, execute the same repository script with Grafana Cloud local execution. The load generator remains local (or on a GitHub Actions runner), while Grafana Cloud stores the run and displays its metrics.

```powershell
$env:K6_CLOUD_TOKEN = 'your-grafana-cloud-k6-token'
$env:K6_CLOUD_STACK_ID = 'your-grafana-cloud-stack-id'
$env:K6_CLOUD_PROJECT_ID = 'your-grafana-k6-project-id'

docker run --rm -i `
  -e K6_CLOUD_TOKEN `
  -e K6_CLOUD_STACK_ID `
  -e K6_CLOUD_PROJECT_ID `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 cloud run --local-execution /scripts/errand-browse-smoke.js
```

Before this command, create the Grafana Cloud secrets `loadtestuseremail` and `loadtestuserpassword` in **Testing & synthetics → Performance → Settings → Secrets**. k6 v2 retrieves them at run time and redacts their values in logs. This deliberately avoids `--include-system-env-vars`, which could otherwise upload unrelated local environment values.

Use GitHub repository secrets for the corresponding values when this is added to CI.

## Errand lifecycle and credit settlement

`errand-lifecycle.js` verifies the end-to-end business workflow using separate seeded requester and courier accounts:

```text
OPEN → ACCEPTED → PICKED_UP → DELIVERED → CONFIRMED
```

It verifies that a `CREDIT_TRANSFER` record appears in both users' credit histories, then deletes the confirmed errand. Deleting a confirmed errand is permitted and does not reverse the completed credit transfer.

The configured supplier must exist, be operational, be currently within operating hours, and offer the configured service type. The script reads its live name and location from Supplier Service before creating an errand.

```powershell
New-Item -ItemType Directory -Force load-tests/results | Out-Null

docker run --rm -i `
  --env-file load-tests/.env.local `
  -e K6_SUMMARY_PATH=/scripts/results/errand-lifecycle-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/errand-lifecycle.js
```

The default is one virtual user and one lifecycle iteration. Keep these defaults while validating test data. Increasing `LIFECYCLE_VUS` or `LIFECYCLE_ITERATIONS` creates additional errands and consumes the configured requester credit amount for each concurrent reservation.

For Grafana Cloud local execution, configure these four lowercase Grafana Cloud k6 secrets: `loadtestrequesteremail`, `loadtestrequesterpassword`, `loadtestcourieremail`, and `loadtestcourierpassword`. Do not pass `--env-file load-tests/.env.local` in this Cloud command; otherwise the local credentials take precedence over Grafana secrets. Pass only non-secret configuration explicitly:

```powershell
docker run --rm -i `
  -e K6_CLOUD_TOKEN `
  -e K6_CLOUD_STACK_ID `
  -e K6_CLOUD_PROJECT_ID `
  -e K6_SUMMARY_PATH=/scripts/results/errand-lifecycle-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 cloud run `
  --local-execution `
  -e BASE_URL=http://host.docker.internal:8080 `
  -e LOAD_TEST_SUPPLIER_ID=your-supplier-id `
  -e LOAD_TEST_SERVICE_TYPE=0 `
  -e LOAD_TEST_CREDIT_AMOUNT=1 `
  /scripts/errand-lifecycle.js
```

## One-time test-account setup

The bootstrap admin cannot be both actors: the lifecycle test requires different requester and courier Cognito subjects. Create two ordinary test users once, for example `relay-load-requester@...` and `relay-load-courier@...`.

1. In the checked-in Postman collection **Relay full errand lifecycle and credit integration**, run the requester registration/setup folder and then the courier registration/setup folder.
2. For each account, register, obtain the Floci OTP, verify through `POST /api/auth/verification/confirm-and-login`, and create its profile through `PATCH /api/user/me`.
3. Wait for the `UserRegistered` Kafka event to be consumed, then verify `GET /api/credit` returns a credit record for each account. The lifecycle script needs enough requester credit for the configured amount.
4. Save their email/passwords only in `load-tests/.env.local` for local runs, and as Grafana Cloud k6/GitHub Actions secrets for Cloud or CI runs.
5. Query Supplier Service for an active supplier currently within its operating hours, then copy its ID and a listed service type into `.env.local`.

The script creates unique errands and deletes them after confirmation by default; it does not delete the two reusable test accounts.
