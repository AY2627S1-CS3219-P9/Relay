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

For disposable Compose runs, provision fresh test users and discover Octobox automatically. The provisioner uses the normal registration flow, reads OTPs from Floci SES, creates profiles, waits for asynchronous credit allocation, verifies that Octobox is operational, creates one disposable open errand for read-detail testing, and writes an ignored environment file.

```powershell
docker compose up --build --wait
node load-tests/provision-test-data.mjs
```

For repeated local runs against a persistent Compose environment, `.env.local` remains available. `.env.generated` is intended for fresh runs and is ignored. Do not put real credentials in `.env.example`, test scripts, result files, or committed documentation.

### Run locally in Docker

The default `BASE_URL` is `http://host.docker.internal:8080`, which lets the k6 container reach the Compose host gateway.

```powershell
New-Item -ItemType Directory -Force load-tests/results | Out-Null

docker run --rm -i `
  --env-file load-tests/.env.generated `
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

## Errand read NFR baseline

`nfr-errand-read.js` measures read scalability without changing errand state. It ramps from `NFR_START_VUS` to `NFR_TARGET_VUS`, holds that load, and then ramps down. Each iteration requests visible errands and, when an errand is available, retrieves its details.

The default baseline is 10 to 100 VUs, with a 5-minute hold. Configure the load gradually through the environment file rather than changing the script. The default p95 threshold is 200 ms and the failure-rate threshold is below 1%.

```powershell
New-Item -ItemType Directory -Force load-tests/results | Out-Null

docker run --rm -i `
  --add-host host.docker.internal:host-gateway `
  --env-file load-tests/.env.generated `
  -e K6_SUMMARY_PATH=/scripts/results/nfr-errand-read-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/nfr-errand-read.js
```

For example, after the baseline passes, increase the target without editing the script:

```powershell
$env:NFR_TARGET_VUS = '500'
$env:NFR_HOLD_DURATION = '5m'
```

The NFR test is intentionally separate from pull-request smoke tests. Run it manually or nightly after confirming that the local Compose environment and load generator can sustain the lower levels.

The provisioner creates one fixture errand and reserves only `LOAD_TEST_FIXTURE_CREDIT_AMOUNT` credits for it. After testing, cancel and delete it to release the reservation:

```powershell
node load-tests/cleanup-test-data.mjs
```

The GitHub Actions workflow runs this cleanup step with `if: always()` so the fixture is cleaned up even when a k6 test fails.

## Remaining NFR scenarios

`nfr-supplier.js` measures authenticated supplier queries at a configurable constant rate. The default is 50 requests per second with a 200 ms p95 threshold:

```powershell
docker run --rm -i `
  --add-host host.docker.internal:host-gateway `
  --env-file load-tests/.env.generated `
  -e NFR_SUPPLIER_RATE_PER_SEC=50 `
  -e NFR_SUPPLIER_DURATION=1m `
  -e K6_SUMMARY_PATH=/scripts/results/nfr-supplier-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/nfr-supplier.js
```

`nfr-credit.js` safely measures authenticated credit-balance reads and verifies that available and reserved balances never become negative. The public Credit API does not expose reservation or transfer as user-facing HTTP operations; those transactions are initiated by Errand Service and completed through Kafka. A true 300-transactions-per-second benchmark therefore requires a disposable credit-account pool and controlled reservation/settlement harness, rather than blindly calling the internal reserve endpoint.

```powershell
docker run --rm -i `
  --add-host host.docker.internal:host-gateway `
  --env-file load-tests/.env.generated `
  -e NFR_CREDIT_RATE_PER_SEC=10 `
  -e NFR_CREDIT_DURATION=1m `
  -e K6_SUMMARY_PATH=/scripts/results/nfr-credit-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/nfr-credit.js
```

`nfr-errand-mixed.js` runs read traffic alongside a small create/cancel workload. Writes default to five per minute because each creation temporarily reserves requester credits:

```powershell
docker run --rm -i `
  --add-host host.docker.internal:host-gateway `
  --env-file load-tests/.env.generated `
  -e NFR_MIXED_READ_TARGET_VUS=100 `
  -e NFR_MIXED_WRITE_RATE_PER_MIN=5 `
  -e NFR_MIXED_WRITE_DURATION=1m `
  -e K6_SUMMARY_PATH=/scripts/results/nfr-errand-mixed-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/nfr-errand-mixed.js
```

## User authentication NFR

`nfr-auth.js` measures login throughput using a constant arrival rate. The default configuration sends 500 login requests per minute for five minutes and enforces a p95 response time below 500 ms, an HTTP failure rate below 1%, and a check success rate above 99%.

The test uses the provisioned load-test user credentials. It does not register new users, because registration would permanently create accounts on every performance run. For a registration-specific test, provision a disposable account pool separately.

```powershell
New-Item -ItemType Directory -Force load-tests/results | Out-Null

docker run --rm -i `
  --add-host host.docker.internal:host-gateway `
  --env-file load-tests/.env.generated `
  -e NFR_AUTH_RATE_PER_MIN=500 `
  -e NFR_AUTH_DURATION=5m `
  -e K6_SUMMARY_PATH=/scripts/results/nfr-auth-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/nfr-auth.js
```

Use a short validation run before the full NFR run:

```powershell
docker run --rm -i `
  --add-host host.docker.internal:host-gateway `
  --env-file load-tests/.env.generated `
  -e NFR_AUTH_RATE_PER_MIN=30 `
  -e NFR_AUTH_DURATION=30s `
  -e K6_SUMMARY_PATH=/scripts/results/nfr-auth-smoke-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/nfr-auth.js
```

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
  --env-file load-tests/.env.generated `
  -e K6_SUMMARY_PATH=/scripts/results/errand-lifecycle-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/errand-lifecycle.js
```

The default is one virtual user and one lifecycle iteration. Keep these defaults while validating test data. Increasing `LIFECYCLE_VUS` or `LIFECYCLE_ITERATIONS` creates additional errands and consumes the configured requester credit amount for each concurrent reservation.

For Grafana Cloud local execution, use the generated environment file. The load generator remains on your machine (or the GitHub Actions runner), while Grafana Cloud stores the metrics. Do not upload `.env.generated` or configure the generated credentials as permanent Grafana secrets.

```powershell
docker run --rm -i `
  --add-host host.docker.internal:host-gateway `
  --env-file load-tests/.env.generated `
  -e K6_CLOUD_TOKEN `
  -e K6_CLOUD_STACK_ID `
  -e K6_CLOUD_PROJECT_ID `
  -e K6_SUMMARY_PATH=/scripts/results/errand-lifecycle-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 cloud run `
  --local-execution `
  /scripts/errand-lifecycle.js
```

The script creates unique errands and deletes them after confirmation by default. The provisioner creates disposable accounts for the run, so this works after `docker compose down --volumes` and on a clean GitHub Actions runner.

The acceptance-race scenario additionally requires the second courier credentials as `loadtestcourierbemail` and `loadtestcourierbpassword` in Grafana Cloud Secrets.

## Core create, race, and credit-guard scenarios

Run the remaining core scenarios together with `errand-core-scenarios.js`:

```powershell
docker run --rm -i `
  --env-file load-tests/.env.generated `
  -e K6_SUMMARY_PATH=/scripts/results/errand-core-summary.json `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 run /scripts/errand-core-scenarios.js
```

This requires a second courier account in `LOAD_TEST_COURIER_B_EMAIL` and `LOAD_TEST_COURIER_B_PASSWORD`. The acceptance race sends two parallel acceptance requests for the same errand and requires exactly one winner. The credit guard verifies non-negative balances, rejects an insufficient-credit creation, rejects duplicate confirmation, and waits up to 30 seconds for the single asynchronous transfer.

## GitHub Actions load-test workflow

The repository workflow `.github/workflows/load-tests.yml` starts a disposable Compose environment, runs `node load-tests/provision-test-data.mjs`, executes the three k6 scripts with Grafana Cloud local execution, uploads summaries and Compose diagnostics on failure, and removes all volumes afterward.

Configure these repository secrets before using the workflow:

- `K6_CLOUD_TOKEN`
- `K6_CLOUD_STACK_ID`
- `K6_CLOUD_PROJECT_ID`
