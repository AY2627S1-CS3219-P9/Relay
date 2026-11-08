# Relay load tests

The JavaScript files in this directory are the source of truth for Relay load tests. Tests execute locally in Docker and can stream metrics to Grafana Cloud with `Invoke-K6Cloud.ps1`.

There are two supported targets:

- Local Docker Compose: the provisioner uses `localhost`, while k6 uses `host.docker.internal`.
- AWS: the provisioner and k6 use the deployed CloudFront hostname over HTTPS.

Grafana Cloud runs use `--local-execution`: Grafana stores and displays metrics, but the requests still come from the local Docker engine.

## Prerequisites

- Docker Desktop running
- Node.js installed
- AWS CLI and `kubectl` for AWS testing
- Grafana Cloud k6 token, stack ID, and project ID for streaming

## Local Compose setup and provisioning

Start the local environment:

```powershell
docker compose up --build --wait
```

Use `--build` after application or Dockerfile changes. For changes only under `load-tests/`, `docker compose up --wait` is sufficient when the services are already built.

The local provisioner creates three disposable users, verifies them through Floci SES, creates profiles, waits for credit allocation, selects the operational `Octobox` supplier, and creates one open fixture errand.

The provisioner runs directly on Windows, so it must use `localhost`:

```powershell
$env:BASE_URL = 'http://localhost:8080'
$env:FLOCI_URL = 'http://localhost:4566'
$env:LOAD_TEST_K6_BASE_URL = 'http://host.docker.internal:8080'
$env:LOAD_TEST_ENV_FILE = 'load-tests/.env.generated'

node load-tests/provision-test-data.mjs
```

The provisioner writes `load-tests/.env.generated` with fresh credentials,
supplier details, fixture errand ID, Docker-facing `BASE_URL`, and all smoke,
lifecycle, and NFR settings. It is ignored by Git.

The tracked `.env.example` documents available fields and defaults; Node does
not load it automatically. Do not commit generated files, credentials, or
results.

Verify the local services before provisioning:

```powershell
curl.exe -i http://localhost:8080/healthz
curl.exe -i http://localhost:4566/_aws/ses
```

If provisioning reports `fetch failed`, ensure `$env:BASE_URL` is
`http://localhost:8080`, not `http://host.docker.internal:8080`.

## AWS provisioning

The AWS provisioner is separate from the local Floci provisioner. It creates
three disposable Cognito users with verified email attributes and permanent
passwords, creates Relay profiles through the deployed CloudFront endpoint,
waits for credit allocation, selects operational `Octobox`, and creates one
fixture errand.

The AWS deployment must already be running. The public CloudFront hostname is
the endpoint to test. In PowerShell:

```powershell
$env:AWS_PROFILE = 'relay-sso'
$env:AWS_REGION = 'ap-southeast-1'
$env:AWS_DEFAULT_REGION = $env:AWS_REGION

$cloudFrontDomain = aws cloudfront list-distributions `
  --profile $env:AWS_PROFILE `
  --query "DistributionList.Items[].DomainName" `
  --output text

# Select the deployed distribution from the output above.
$env:BASE_URL = "https://<cloudfront-domain>.cloudfront.net"
$env:COGNITO_USER_POOL_ID = aws cloudformation describe-stacks `
  --stack-name relay-auth `
  --region $env:AWS_REGION `
  --profile $env:AWS_PROFILE `
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" `
  --output text

$env:LOAD_TEST_ENV_FILE = 'load-tests/.env.aws.generated'
$env:LOAD_TEST_SUPPLIER_NAME = 'Octobox'
$env:LOAD_TEST_CLEANUP = 'true'

node load-tests/provision-aws-test-data.mjs
```

The generated `load-tests/.env.aws.generated` contains the CloudFront URL,
credentials, supplier ID, service type, fixture errand ID, and test configuration. The AWS
CLI profile must be allowed to administer users in the Cognito pool.

The AWS provisioner does not delete Cognito users. Remove disposable users
separately if the AWS pool must be cleaned completely.

## Grafana Cloud setup

Set Grafana credentials in the current PowerShell session; never commit the
token:

```powershell
$env:K6_CLOUD_TOKEN = 'your-grafana-cloud-k6-token'
$env:K6_CLOUD_STACK_ID = 'your-grafana-cloud-stack-id'
$env:K6_CLOUD_PROJECT_ID = 'your-grafana-k6-project-id'
```

Load the reusable runner:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
. .\load-tests\Invoke-K6Cloud.ps1
```

The helper reads test configuration from the file passed through `-EnvFile`,
adds the Docker host gateway, runs k6 with `--local-execution`, and streams
metrics to Grafana Cloud.

## Run local tests and stream to Grafana Cloud

After local provisioning, use `.env.generated`:

```powershell
Invoke-K6Cloud -Script 'errand-browse-smoke.js' -Summary 'local-browse-summary.json' -EnvFile 'load-tests/.env.generated'
Invoke-K6Cloud -Script 'errand-lifecycle.js' -Summary 'local-lifecycle-summary.json' -EnvFile 'load-tests/.env.generated'
Invoke-K6Cloud -Script 'errand-core-scenarios.js' -Summary 'local-core-summary.json' -EnvFile 'load-tests/.env.generated'
Invoke-K6Cloud -Script 'nfr-auth.js' -Summary 'local-nfr-auth-summary.json' -EnvFile 'load-tests/.env.generated'
Invoke-K6Cloud -Script 'nfr-errand-read.js' -Summary 'local-nfr-errand-read-summary.json' -EnvFile 'load-tests/.env.generated'
Invoke-K6Cloud -Script 'nfr-errand-mixed.js' -Summary 'local-nfr-errand-mixed-summary.json' -EnvFile 'load-tests/.env.generated'
Invoke-K6Cloud -Script 'nfr-credit.js' -Summary 'local-nfr-credit-summary.json' -EnvFile 'load-tests/.env.generated'
Invoke-K6Cloud -Script 'nfr-supplier.js' -Summary 'local-nfr-supplier-summary.json' -EnvFile 'load-tests/.env.generated'
```

The local app must remain running throughout the tests. Rerun the provisioner
after `docker compose down --volumes` or when generated credentials change.

## Run AWS tests and stream to Grafana Cloud

After AWS provisioning, use `.env.aws.generated`. It already contains the CloudFront
`BASE_URL`, so no supplier ID or credential needs to be typed into the command:

```powershell
Invoke-K6Cloud -Script 'errand-browse-smoke.js' -Summary 'aws-browse-summary.json' -EnvFile 'load-tests/.env.aws.generated'
Invoke-K6Cloud -Script 'errand-lifecycle.js' -Summary 'aws-lifecycle-summary.json' -EnvFile 'load-tests/.env.aws.generated'
Invoke-K6Cloud -Script 'errand-core-scenarios.js' -Summary 'aws-core-summary.json' -EnvFile 'load-tests/.env.aws.generated'
Invoke-K6Cloud -Script 'nfr-auth.js' -Summary 'aws-nfr-auth-summary.json' -EnvFile 'load-tests/.env.aws.generated'
Invoke-K6Cloud -Script 'nfr-errand-read.js' -Summary 'aws-nfr-errand-read-summary.json' -EnvFile 'load-tests/.env.aws.generated'
Invoke-K6Cloud -Script 'nfr-errand-mixed.js' -Summary 'aws-nfr-errand-mixed-summary.json' -EnvFile 'load-tests/.env.aws.generated'
Invoke-K6Cloud -Script 'nfr-credit.js' -Summary 'aws-nfr-credit-summary.json' -EnvFile 'load-tests/.env.aws.generated'
Invoke-K6Cloud -Script 'nfr-supplier.js' -Summary 'aws-nfr-supplier-summary.json' -EnvFile 'load-tests/.env.aws.generated'
```

The AWS deployment must stay available for the entire run. Tear it down when
finished to avoid unnecessary AWS charges.

## Observe autoscaling with Headlamp

Start the optional dashboard from Bash with `npm run headlamp -- start`, using
the AWS cluster context. Open http://localhost:9082, paste the printed token,
and select namespace `relay`. Run `npm run headlamp -- check` in another Bash
terminal first; CPU/memory metrics must be numeric and KEDA must be available.
See the [deployment guide](../deploy/README.md#observe-autoscaling-in-headlamp)
for setup, permissions, and cleanup.

After provisioning AWS test users, run a sustained Supplier test in the
PowerShell session with `Invoke-K6Cloud` loaded:

```powershell
Invoke-K6Cloud -Script 'nfr-supplier.js' -Summary 'aws-autoscaling-supplier-summary.json' -EnvFile 'load-tests/.env.aws.generated'
```

Watch `supplier-api` under Horizontal Pod Autoscalers, Deployments, and Pods.
Record its initial replicas and metrics, peak replicas, ready Pod count, and
replicas several minutes after load stops, alongside k6 error rate and p95
latency. The default test lasts five minutes at 50 requests/second; increase
`NFR_SUPPLIER_RATE_PER_SEC` or `NFR_SUPPLIER_DURATION` in the generated env file
gradually if CPU stays below target. A run does not guarantee scaling: actual
resource use must exceed the HPA target. Memory can also trigger or sustain
scaling. Keep successful authenticated requests above 99% so errors are not
mistaken for application load.

For Credit HTTP load, use `nfr-credit.js` and inspect `keda-hpa-credit-api`.
HTTP reads exercise CPU/memory scaling; Kafka-lag scaling requires producing
enough errand events to exceed consumer throughput. Inspect the `credit-api`
ScaledObject conditions as well as its HPA during that separate scenario.

## Test coverage

- `errand-browse-smoke.js`: authenticated visible and owned errand reads.
- `errand-lifecycle.js`: create, accept, pickup, delivery, confirmation, and asynchronous credit settlement.
- `errand-core-scenarios.js`: create verification, concurrent acceptance, and credit guards.
- `nfr-auth.js`: authentication arrival-rate workload.
- `nfr-errand-read.js`: ramping authenticated errand reads.
- `nfr-errand-mixed.js`: concurrent errand reads and create/cancel writes. Its
  latency limits are operation-specific: 150 ms for reads, 250 ms for create,
  and 150 ms for cancel. These limits were recalibrated after a larger AWS
  sample and should still be rechecked on the post-#83 deployment before being
  presented as stable benchmarks.
- `nfr-credit.js`: authenticated credit-balance reads and non-negative balance checks.
- `nfr-supplier.js`: authenticated supplier-query workload.

NFR defaults are bounded by the current Grafana Cloud project limit. The
errand-read limit is 150 ms based on the latest AWS deployment baseline. The mixed
test uses separate read/create/cancel limits because those operations perform
different synchronous work; this is threshold calibration, not an application
performance fix. The supplier limit remains 200 ms until its long-tail p99
behavior is investigated. Increase load gradually and record VUs, throughput,
p95 latency, failure rate, threshold status, and the Grafana run link.

## Cleanup

For local Compose:

```powershell
$env:BASE_URL = 'http://localhost:8080'
$env:LOAD_TEST_ENV_FILE = 'load-tests/.env.generated'
node load-tests/cleanup-test-data.mjs
docker compose down --volumes --remove-orphans
```

For AWS, use the CloudFront URL and AWS-generated environment:

```powershell
$env:BASE_URL = "https://<cloudfront-domain>.cloudfront.net"
$env:LOAD_TEST_ENV_FILE = 'load-tests/.env.aws.generated'
node load-tests/cleanup-test-data.mjs
```

This removes the fixture errand only. It does not delete Cognito users, RDS
snapshots, S3 objects, or AWS stacks.

## GitHub Actions

`.github/workflows/load-tests.yml` supports two manual targets:

- `local`: starts disposable local Compose services and uses
  `provision-test-data.mjs`.
- `aws`: assumes the configured AWS OIDC role, validates the configured
  CloudFront distribution through the AWS CLI, uses `provision-aws-test-data.mjs`,
  and runs against that CloudFront endpoint.

For both targets, k6 executes locally on the GitHub runner and streams metrics
to Grafana Cloud. Pull requests always run only the local browse smoke test.
Manual runs can select `smoke`, `lifecycle`, `core`, `nfr`, or `full`. Summaries
and diagnostics are uploaded, and local Compose is cleaned up after failures.

Configure these repository secrets for non-PR cloud runs:

- `K6_CLOUD_TOKEN`
- `K6_CLOUD_STACK_ID`
- `K6_CLOUD_PROJECT_ID`
- `AWS_LOAD_TEST_ROLE_ARN` (required for the manual `aws` target)

The `aws` target queries enabled CloudFront distributions directly through the
AWS CLI. It requires exactly one enabled distribution so that the workflow
cannot accidentally test the wrong application. No CloudFront URL repository
variable is required.

The AWS target assumes an already-deployed `relay` EKS cluster and
`relay-auth` CloudFormation stack. It does not deploy or tear down AWS
resources automatically.
