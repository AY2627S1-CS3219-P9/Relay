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

Set credentials only in the current PowerShell session. Do not save them in the repository.

```powershell
$env:LOAD_TEST_USER_EMAIL = 'load-test-user@example.com'
$env:LOAD_TEST_USER_PASSWORD = 'replace-with-the-seeded-user-password'
```

### Run locally in Docker

The default `BASE_URL` is `http://host.docker.internal:8080`, which lets the k6 container reach the Compose host gateway.

```powershell
New-Item -ItemType Directory -Force load-tests/results | Out-Null

docker run --rm -i `
  -e LOAD_TEST_USER_EMAIL `
  -e LOAD_TEST_USER_PASSWORD `
  -e BASE_URL=http://host.docker.internal:8080 `
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

docker run --rm -i `
  -e K6_CLOUD_TOKEN `
  -e K6_CLOUD_STACK_ID `
  -e LOAD_TEST_USER_EMAIL `
  -e LOAD_TEST_USER_PASSWORD `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v "${PWD}/load-tests:/scripts" `
  grafana/k6 cloud run --local-execution /scripts/errand-browse-smoke.js
```

Use GitHub repository secrets for the corresponding values when this is added to CI.
