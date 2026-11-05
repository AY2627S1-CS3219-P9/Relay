# Relay AWS deployment

This guide describes the checked-in sandbox deployment. Run commands from the
repository root in Bash (`bash` if your terminal uses Zsh). Deployment creates
billable AWS resources.

- CloudFormation provisions the VPC, EKS Auto Mode cluster, ECR repositories,
  four private PostgreSQL databases, their credentials, and the Metrics Server
  add-on required by CPU autoscalers. A separate CloudFront stack supplies a
  trusted HTTPS hostname without a custom domain. MSK Provisioned provides
  the private event broker.
- `infra/relay-auth.yaml` provisions the Cognito user pool, no-secret app
  client, email verification, password policy, and admin groups.
- `infra/relay-storage.yaml` provisions the private profile-image bucket.
  The user API accesses it through an IRSA role, without static
  S3 credentials.
- `scripts/deploy-eks.sh` builds images from the Floci-neutral `compose.yaml` definitions, pushes them,
  creates the in-cluster runtime Secret, provisions Kafka topics on MSK,
  applies one-off database migrations,
  and applies the workloads, HPA policies, and ALB Ingress.

## Prerequisites

Install AWS CLI v2, Docker with a running daemon, a compatible `kubectl`,
Node.js, and OpenSSL. The script builds `linux/amd64` images, including on Apple
Silicon. The deployment identity needs the CloudFormation, CloudFront, IAM, EKS, networking,
ECR, RDS, MSK, Secrets Manager, Cognito, and S3 permissions used by the templates and
commands, plus access to the generated Kubernetes cluster.

### AWS SSO and shell configuration

Configure the named profile once:

```bash
aws configure sso --profile user
```

Set these variables in each terminal used for deployment or `kubectl`:

```bash
export AWS_PROFILE=user
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_PAGER=""
export STACK_NAME=relay
export AUTH_STACK=relay-auth
export STORAGE_STACK=relay-storage

aws sso login --profile "$AWS_PROFILE"
aws sts get-caller-identity
```

For device-code login, use
`aws sso login --profile "$AWS_PROFILE" --use-device-code` instead. Repeat login
when the session expires. `AWS_PROFILE` applies to subsequent AWS commands and
the credentials used by `kubectl`; logging in alone does not grant cluster access.

Copy the configuration file once; preserve it on subsequent deployments:

```bash
cp deploy/relay.aws.env.example deploy/relay.aws.env
```

`relay.aws.env` remains outside Git. The script sources it on the workstation,
so its values override exported variables with the same names. Replace every
placeholder before deploying.

### Kubernetes version

Query available EKS versions in the target Region and set a supported
`KUBERNETES_VERSION` in `deploy/relay.aws.env`:

```bash
aws eks describe-cluster-versions --region "$AWS_REGION" \
  --query 'clusterVersions[].{Version:clusterVersion,Status:status}' --output table
```
## Provision AWS resources

The deployment script creates or updates the EKS stack only. Provision Cognito
and storage separately first, in the same AWS region. The EKS project/cluster
name defaults to `relay`; changing the stack name alone does not change that
project name, ECR repository names, or Kubernetes namespace.

Create the Cognito stack:

```bash
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$AUTH_STACK" \
  --template-file infra/relay-auth.yaml
```

Create the storage stack:

```bash
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STORAGE_STACK" \
  --template-file infra/relay-storage.yaml
```

Read the generated values:

```bash
stack_output() {
  aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$1" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" \
    --output text
}

export COGNITO_USER_POOL_ID="$(stack_output "$AUTH_STACK" UserPoolId)"
export COGNITO_CLIENT_ID="$(stack_output "$AUTH_STACK" UserPoolClientId)"
export COGNITO_ISSUER="$(stack_output "$AUTH_STACK" UserPoolIssuer)"
export COGNITO_JWKS_URI="$(stack_output "$AUTH_STACK" UserPoolJwksUri)"
export SUPERADMIN_GROUP="$(stack_output "$AUTH_STACK" SuperAdminGroupName)"
export S3_BUCKET="$(stack_output "$STORAGE_STACK" BucketName)"
export S3_ENDPOINT="$(stack_output "$STORAGE_STACK" S3Endpoint)"
export S3_PUBLIC_ENDPOINT="$(stack_output "$STORAGE_STACK" S3PublicEndpoint)"
```

Copy the Cognito and S3 values above into `deploy/relay.aws.env`. Keep that
file uncommitted. The EKS deployment passes the bucket name to the AWS access stack,
which grants the `user-api` role access to the bucket.

The bucket blocks public access, enforces bucket-owner ownership, uses AES256
encryption, and is retained on stack deletion/replacement. The User API uses
IRSA instead of static S3 keys and returns presigned image URLs valid
for 15 minutes. Public bucket access is unnecessary. If customizing Cognito
group names, also configure `COGNITO_ADMIN_GROUP_NAME` and
`COGNITO_SUPERADMIN_GROUP_NAME` in the User API runtime; the deployment currently
uses the default group names.

For an existing EKS stack, inspect the actual User database version before
changing `DATABASE_ENGINE_FAMILY`:

```bash
USER_DB_ID="$(aws cloudformation describe-stack-resource \
  --stack-name "$STACK_NAME" \
  --logical-resource-id UserDatabase \
  --region "$AWS_REGION" \
  --query 'StackResourceDetail.PhysicalResourceId' \
  --output text)"

aws rds describe-db-instances \
  --db-instance-identifier "$USER_DB_ID" \
  --region "$AWS_REGION" \
  --query 'DBInstances[0].{Version:EngineVersion,ParameterGroups:DBParameterGroups}' \
  --output json
```

## Bootstrap the initial super-admin

CloudFormation intentionally does not create the initial user's permanent
password. Create the first super-admin once, after the auth stack exists. Use a
password of at least eight characters with uppercase, lowercase, numbers, and
symbols. These prompts use Bash:

```bash
read -r -p 'Initial admin email: ' RELAY_INITIAL_ADMIN_EMAIL
read -r -s -p 'Initial admin password: ' RELAY_INITIAL_ADMIN_PASSWORD
printf '\n'

aws cognito-idp admin-create-user \
  --region "$AWS_REGION" \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$RELAY_INITIAL_ADMIN_EMAIL" \
  --user-attributes \
    Name=email,Value="$RELAY_INITIAL_ADMIN_EMAIL" \
    Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region "$AWS_REGION" \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$RELAY_INITIAL_ADMIN_EMAIL" \
  --password "$RELAY_INITIAL_ADMIN_PASSWORD" \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region "$AWS_REGION" \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$RELAY_INITIAL_ADMIN_EMAIL" \
  --group-name "$SUPERADMIN_GROUP"

unset RELAY_INITIAL_ADMIN_PASSWORD
```

This bootstrap is idempotent only up to the first user creation. If the user
already exists, use `admin-set-user-password` and
`admin-add-user-to-group` directly. After deployment, sign in through Relay and
complete the application profile; Cognito account creation alone does not
create a Relay database profile.

## Deploy the application

Set `IMAGE_TAG` in `deploy/relay.aws.env` to a new tag per release, such as a Git
commit hash. Reusing `latest` can leave the Deployment's Pod template unchanged;
pushing a new image with the same tag does not guarantee a rollout.

```bash
bash scripts/deploy-eks.sh "$STACK_NAME"
```

Use `NO_CACHE=1 bash scripts/deploy-eks.sh "$STACK_NAME"` to rebuild without
Docker's build cache. The script uses a private temporary Docker config for the ECR login and image pushes. This avoids Docker Desktop credential-helper failures in WSL and removes the temporary ECR token when the script exits. Normal Docker builds still use your existing Docker configuration.

The script uses the selected profile and region, refreshes
kubeconfig, builds and pushes the application images to ECR, prepares runtime configuration,
discovers the MSK bootstrap endpoint, and waits for topic initialization. It then runs separate Supplier
SQL and User/Errand/Credit Prisma migration Jobs before applying application
Deployments, autoscalers, and ingress. Rollout and migration waits use ten-minute
timeouts; topic initialization uses five minutes.

The host image receives its Cognito settings at build time, so changing them
requires rebuilding it. ConfigMap/Secret environment changes also require
restarting the affected API Pods. Applying `kubectl apply -k k8s/base` alone does
not perform image substitution, generate Secrets, or prepare migration Jobs;
use the deployment script for the complete sequence.

The deployment reads the MSK Provisioned SCRAM bootstrap endpoint and credential,
then runs `kafka-init` to create the event and dead-letter topics. The MSK
endpoint stays private to the VPC and requires SCRAM authentication over TLS.

Check topic initialization and application rollout:

```bash
kubectl -n relay wait --for=condition=complete job/kafka-init --timeout=10m
kubectl -n relay get pods
```

The topic Job is reapplied on deployment. Pausing deletes the MSK cluster and
its topic data and consumer offsets immediately. The application databases are
snapshotted, but previously published outbox entries are not replayed after
resume.

The first deployment can take several minutes. The script creates a separate
`relay-edge` CloudFormation stack after the Kubernetes Ingress reports its ALB
hostname, waits for CloudFront, then prints the public URL:

```text
Deployment complete: https://d123example.cloudfront.net
```

Retrieve it later with:

```bash
aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name relay-edge \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
  --output text
```

The CloudFront distribution uses its default trusted certificate. It forwards
all viewer headers, cookies, and query strings plus `CloudFront-Forwarded-Proto`
to the ALB; caching is disabled for all routes. CloudFront redirects browser
HTTP requests to HTTPS. The ALB receives HTTP on port 80, so the browser-to-edge
connection is encrypted but the edge-to-ALB hop is not. The ALB also remains
publicly reachable; this is a sandbox test configuration, not an end-to-end TLS
or origin-restricted production setup.
### Verify workloads and application behavior

```bash
kubectl -n relay get deployments,pods,jobs,services,ingress
kubectl -n relay get events --sort-by=.metadata.creationTimestamp
kubectl -n relay logs job/kafka-init
kubectl -n relay logs job/supplier-schema
kubectl -n relay logs job/user-migrate
kubectl -n relay logs job/errand-migrate
kubectl -n relay logs job/credit-migrate
```

Check the CloudFront URL printed by the deployment script:

```bash
PUBLIC_HOST="$(aws cloudformation describe-stacks --region "$AWS_REGION" \
  --stack-name relay-edge \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
  --output text)"
curl --fail --show-error "https://$PUBLIC_HOST/healthz"
```

This health endpoint checks the host only. In a browser, verify all four remote
frontends, sign-in, refresh and logout with secure cookies, authenticated APIs,
and presigned profile-image URLs.
### Routing and HTTPS access

| Public path | Destination |
| --- | --- |
| `/remotes/supplier/*` | Supplier frontend Service |
| `/remotes/user/*` | User frontend Service |
| `/remotes/errand/*` | Errand frontend Service |
| `/remotes/credit/*` | Credit frontend Service |
| `/api/auth*` | Host Nginx, then User Auth Service on port 3000 |
| `/api/user*`, `/api/supplier*`, `/api/errands*`, `/api/credit*` | Host Nginx, then the matching backend Service on port 3000 |
| Remaining paths | Host frontend |

The ingress preserves remote prefixes; frontend Nginx configurations rewrite
their prefixes before serving assets. The host also proxies remote routes using
Kubernetes Service names, without workstation or Docker-host addresses.

CloudFront supplies the public `*.cloudfront.net` HTTPS URL. Its distribution
is created after the ALB because the ALB hostname is generated by the EKS
Ingress. The script updates `AUTH_PUBLIC_ORIGIN` to this URL and restarts
`user-auth-api` before reporting completion. Kubernetes uses
`COOKIE_SECURE=true`; Host Nginx forwards CloudFront's viewer protocol to User
Auth. Local Compose retains its HTTP cookie setting.
CloudFormation creates an ECR
repository in the EKS stack and a dedicated IRSA role for `user-auth-api`
in the AWS access stack, restricted to
admin operations on the configured Cognito pool in the same account and Region.
The script builds/pushes the auth image and deploys its Service and workload.

### Login HTTP 400 and authentication proxy errors

Check the response body before treating every 400 as a routing failure. A JSON
`VALIDATION_FAILED` response with `fieldErrors.email` means the authentication
service rejected the email: it accepts `@u.nus.edu`, `@nus.edu.sg`, and an explicitly
configured bootstrap-admin exception. Login and registration show field-specific
validation errors. An `OTP_INVALID` or `OTP_EXPIRED` response requires a valid verification
code, not an ingress change.

An HTML `400 Request Header Or Cookie Too Large`, or an Nginx
`upstream sent too big header` error accompanied by HTTP 502 during login or
verification, indicates proxy header limits. Cognito returns access, ID, and
refresh cookies together. `host/config/nginx.conf` allows 16 KiB request-header
fields and a 16 KiB upstream response-header buffer, with matching proxy buffer
settings. Rebuild and roll out the host image when changing that configuration;
increasing the JSON body limit does not fix oversized headers. See the
[Nginx request-header](https://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers)
and [response-header buffer](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffer_size)
documentation.

### Backend readiness and Supplier database TLS

Supplier verifies the `relay_access` and `relay_id` Cognito cookies directly.
Its Deployment explicitly reads `COGNITO_ISSUER`, `COGNITO_JWKS_URI`,
`COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, and `AWS_DEFAULT_REGION` from the
runtime Secret. Missing settings cause it to fall back to local test defaults
and reject valid AWS login cookies with HTTP 401. If login succeeds but Supplier
returns 401, confirm these settings match the authentication service and that
the browser sends both cookies. Reapply the configuration and restart Supplier
after changing environment settings.

Supplier `/healthz` runs `SELECT 1` and returns 503 if its database is unavailable;
`/health` checks process liveness. The Supplier image includes the Amazon RDS
global CA bundle, and its Deployment sets
`DB_SSL_CA_PATH=/etc/ssl/certs/rds-global-bundle.pem` to enable PostgreSQL TLS with
certificate verification. Local Compose leaves this setting unset.

For Supplier HTTP 500 errors or failed readiness, inspect logs, RDS status,
database security-group access, runtime credentials, and whether the running
image contains the CA bundle. Keep certificate verification enabled:

```bash
kubectl -n relay logs deployment/supplier-api --tail=100
kubectl -n relay describe pods -l app=supplier-api
```

Errand stays live at `/health` while `/healthz` returns 503 until its initial Kafka
publisher connection succeeds. Startup failures retry every five seconds. This
readiness flag tracks initial connection, not continuous Kafka availability.

## What scales

| Workload | Replica configuration |
| --- | --- |
| `supplier-api`, `user-api`, `errand-api` | Independent CPU HPA, 1â€“4 replicas |
| `credit-api` | Independent CPU HPA, 1â€“3 replicas |
| Host and four microfrontends | One replica each, no HPA |
| MSK Provisioned | Managed outside Kubernetes |

Each API HPA targets 65% of its requested CPU, not 65% of node capacity. All
application workloads have CPU and memory requests/limits. EKS Auto Mode can
add node capacity when Pods cannot fit, subject to AWS quotas and capacity.

The host and four microfrontend Deployments deliberately stay at one replica in
this first iteration. They are static Nginx workloads; separately scaling them
does not materially demonstrate the API autoscaling objective.

The ALB routes `/remotes/*` directly to each frontend Service. The host keeps
handling `/api/*`, where Kubernetes Service names match the existing Compose
names (`user-api`, `supplier-api`, `errand-api`, and `credit-api`).

### Verify and test autoscaling

The repository does not install Metrics Server. Check that the metrics API
works and install a compatible Metrics Server if absent using the
[AWS instructions](https://docs.aws.amazon.com/eks/latest/userguide/metrics-server.html):

```bash
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl -n relay top pods
kubectl -n relay get hpa
kubectl -n relay describe hpa supplier-api
```

CPU readings must be numeric rather than `<unknown>`. Use a load generator such
as k6 to send sustained authenticated read requests to one API at a time. Start
small and increase load until its CPU exceeds the target. Suitable routes are
`/api/user/me`, `/api/supplier`, `/api/errands`, and `/api/credit`. Use valid test
sessions and record response success, error rate, latency, CPU, and replica
counts. Health checks and rejected requests do not demonstrate business-load
handling.

Watch autoscalers and Deployments in separate terminals:

```bash
kubectl -n relay get hpa -w
```

```bash
kubectl -n relay get deployments -w
```

The loaded API should gain healthy replicas within its configured range while
requests keep succeeding. Stop traffic and allow time for scale-down
stabilization. Supplier, Errand, and Credit call User for authentication, so User
may also scale. Database, host-proxy, and Kafka bottlenecks may limit throughput
even when more API replicas are available.

## Troubleshoot kubectl and infrastructure

An error such as `lookup ...eks.amazonaws.com: no such host` happens before
Kubernetes authentication. Renewing SSO alone does not fix an obsolete cluster
address. Check the account, region, cluster inventory, and selected context:

```bash
aws sts get-caller-identity
aws eks list-clusters --region "$AWS_REGION"
kubectl config current-context
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

If the cluster exists, refresh its connection from the current stack output
using the `stack_output` helper defined above:

```bash
CLUSTER_NAME="$(stack_output "$STACK_NAME" ClusterName)"
aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" \
  --query 'cluster.{Status:status,Endpoint:endpoint}' --output table
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION" \
  --profile "$AWS_PROFILE"
kubectl -n relay get pods
```

If the cluster list is empty, confirm the intended account and region. A deleted
cluster requires reprovisioning; kubeconfig and SSO cannot restore it. If an
existing cluster's current endpoint also fails to resolve, investigate local
DNS/network access. Timeouts require checking endpoint reachability;
`Unauthorized`/`Forbidden` requires checking the selected identity and EKS access
permissions. See [AWS kubeconfig guidance](https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html).

Inspect CloudFormation events for infrastructure failures:

```bash
aws cloudformation describe-stack-events --stack-name "$STACK_NAME" \
  --max-items 30 --output table
```

Wait for in-progress stack operations to finish and resolve failed resources or
rollback states before starting another deployment.

## Intentional first-phase limits

- `credit-api` still includes its Kafka consumers. It can scale for HTTP load,
  but its consumers share Kafka consumer groups. With the current one-partition
  local topic model, additional replicas do not add consumer throughput.
- A later phase should split Credit HTTP handling and Kafka consumption into
  separate Deployments, use Kafka lag to scale
  the worker Deployment.
- Kafka uses SCRAM over TLS. S3 and Cognito retain OIDC service-account roles.
- Each API database is a separate small, single-AZ RDS instance. This preserves
  the current service data boundaries but is a cost-conscious learning setup,
  not a highly available database design.
- Both private subnets share one NAT gateway. The network is not designed for
  NAT availability-zone failover.
- Internal service tokens currently use demo values in the ConfigMap. Move
  these to managed Secrets and configure rotation before production use.
- Errand notifications use process-local subscribers, and User/Errand outbox
  publishers do not claim rows across replicas. Validate notification delivery
  and duplicate-event handling when running multiple API replicas.
- The deployment script does not run application tests, load tests, or browser
  smoke tests. Successful rollouts alone do not verify application correctness.

## Safe cleanup

Delete the `relay-edge` CloudFormation stack first and wait for CloudFront deletion. Then delete the Kubernetes ingress while the cluster still exists. Wait for its ALB
and associated controller-managed resources to be removed before deleting the
EKS stack. CloudFormation creates database snapshots on deletion/replacement.
ECR repositories do not enable force-empty deletion; nonempty repositories can
block stack deletion, so explicitly retain or remove their images according to
your retention needs.

The authentication and storage stacks have separate lifecycles. Deleting the
auth stack removes its Cognito resources. The private S3 bucket is retained even
when the storage stack is deleted. Inventory retained database snapshots, image
repositories, and S3 objects afterward because retained storage incurs charges.


## AWS lifecycle

Run these commands from the repository root with the same AWS account and region
used for deployment. Install and configure AWS CLI and `kubectl` first. The
scripts only act on the named Relay stacks and their recorded resources.

```bash
export AWS_REGION=ap-southeast-1
bash scripts/pause-aws.sh relay
bash scripts/deploy-eks.sh relay
```

Pause deletes the CloudFront edge and AWS access stacks and the EKS stack, including its EKS
control plane, auto mode nodes, ALB, NAT gateway, ECR repositories, and RDS
instances and the MSK Provisioned cluster. CloudFormation creates four final RDS snapshots. The script records
their IDs and the retained S3 bucket in `deploy/.relay-pause.env`; **keep this
file** for redeployment and full cleanup. Redeploy restores the four RDS
instances from those snapshots, resets their passwords to the new stack
secrets, recreates images and Kubernetes workloads, and runs migrations.
Cognito users and profile images remain in the auth and storage stacks.
The app is unavailable while paused. Snapshot and S3 storage, Secrets Manager
and any other retained service usage can still incur charges; "pause" removes
running infrastructure charges, not every possible AWS charge.

To delete all stacks and their data, including Cognito users, the recorded
RDS snapshots, and profile images:

```bash
AWS_REGION=ap-southeast-1 bash scripts/teardown-aws.sh relay --confirm-delete-all-data
```

The S3 bucket must be unversioned as in the current template. AWS may hold
deleted Secrets Manager secrets in a recovery window. Review the AWS account
for resources outside these CloudFormation stacks.

Do not run teardown after a successful redeploy unless you first pause again,
so the manifest refers to snapshots of the latest data.

### Retrying an ECR deletion failure

If CloudFormation reports `DELETE_FAILED` for an ECR repository, rerun the
same pause or teardown command. The recovery path uses the pending pause
manifest to identify the databases and force deletes only ECR repositories
marked `DELETE_FAILED` in the Relay stack before retrying stack deletion.
The template now sets `EmptyOnDelete: true` on all 12 ECR repositories for
future deployments.


## Event broker targets

AWS EKS provisions a two-broker MSK Provisioned cluster through
`infra/relay-eks.yaml`. The brokers are in separate private subnets and
expose TLS with SASL/SCRAM on port 9096. The stack creates a customer-managed
KMS key, a Secrets Manager username/password secret, and associates that
secret with MSK. The deployment script reads the SCRAM bootstrap brokers and
secret into the Kubernetes runtime Secret. No AWS IAM permissions are needed
for Kafka clients. Keep that Kubernetes Secret restricted to the Relay
namespace and rotate the SCRAM credential through Secrets Manager when needed.

The topic Job creates the four event and dead-letter topics with replication
factor 2, 12 partitions each, and `min.insync.replicas=2`. Both outbox publishers use `acks=-1`
(acknowledge from all in-sync replicas), so they mark rows published only after
both replicas commit. A broker outage blocks writes and leaves unpublished
outbox rows to retry. This is deliberate: lowering the minimum in-sync count
would permit acknowledged writes with one copy.

Pause deletes the MSK cluster without waiting for outboxes or consumer lag.
Kafka records and offsets are lost at pause; RDS snapshots preserve the
application databases, but previously published outbox rows are not replayed.
Resume creates a fresh cluster and topics.

Local Compose and Floci EKS create Provisioned cluster metadata through
Floci's MSK API, but Floci runs one plaintext Redpanda broker. Local topic
settings use one replica and minimum in-sync replica 1. Floci verifies the
application event path, not TLS, SCRAM, two-copy persistence, or broker
failover. Neither local target starts a standalone Kafka container.

### AWS access for S3 and Cognito

The deploy script reads the cluster OIDC issuer, reuses an existing IAM OIDC
provider when present, and deploys `infra/relay-aws-access.yaml` as
`relay-aws-access`. That stack grants the User API access to profile images
in S3 and the Auth API access to Cognito administration. Their service
accounts retain the existing OIDC and STS credential flow. The Kafka topic
Job, publishers, and credit consumer no longer have Kafka IAM roles or
service accounts. The runtime Secret contains no AWS access keys.

If EKS is recreated, its OIDC issuer changes. The script discovers the
current issuer and provider ARN each run. A manually created provider is not
owned by CloudFormation and remains after pause or teardown; remove it
separately if no longer needed.

### Docker and topic Job failures

Run `docker info` in the same WSL shell before deployment. If Docker Desktop
works from Windows but this command cannot reach the Docker API, enable Docker
Desktop's WSL integration for the Ubuntu distribution and restart the WSL
shell. The deployment now checks this before updating CloudFormation. It also
stops immediately if an image build, tag, or ECR push fails.

`kafka-init` runs from the Credit API image. If it times out, inspect
`kubectl -n relay describe pod -l job-name=kafka-init`. An
`ImagePullBackOff` with `not found` means the referenced ECR image tag was not
pushed; Kafka authentication and MSK networking have not been tested yet.
Confirm the tag with `aws ecr describe-images --region "$AWS_REGION"
--repository-name relay/credit-api`. After fixing Docker access, rerun the
deployment script. CloudFormation updates the existing stack when the template
has changes and reports no changes when it is already current. The script
rebuilds and pushes images, then replaces the failed topic Job.

## Verify MSK on AWS

After running `bash scripts/deploy-eks.sh "$STACK_NAME"`, get the cluster ARN and SCRAM broker endpoint:

```bash
MSK_ARN="$(aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='MskClusterArn'].OutputValue" --output text)"
aws kafka describe-cluster-v2 --region "$AWS_REGION" --cluster-arn "$MSK_ARN" --query 'ClusterInfo.{Name:ClusterName,State:State,Type:ClusterType}' --output table
aws kafka get-bootstrap-brokers --region "$AWS_REGION" --cluster-arn "$MSK_ARN" --query 'BootstrapBrokerStringSaslScram' --output text
kubectl -n relay get job kafka-init
kubectl -n relay logs job/kafka-init
kubectl -n relay get deployments user-event-publisher errand-event-publisher credit-api
```

Expect `PROVISIONED`, `ACTIVE`, a nonempty SCRAM broker endpoint, a completed topic Job, and available deployments. The broker is private to the VPC, so a Kafka client on your workstation cannot connect directly. Create a new user and finish its Relay profile; Credit Service should allocate 100 credits. Create an errand with a credit reservation and let it expire; Credit Service should release that reservation. Inspect the event path:

```bash
kubectl -n relay logs deployment/user-event-publisher --since=10m
kubectl -n relay logs deployment/errand-event-publisher --since=10m
kubectl -n relay logs deployment/credit-api --since=10m
```

CloudWatch MSK broker metrics provide a second signal after events flow. Metrics can lag event processing. A successful Floci test does not validate SCRAM, TLS, or two-broker replication.

## Update CloudFront caching without redeploying the application

`infra/relay-cloudfront.yaml` uses `PriceClass_200` so Singapore can be a
CloudFront edge location. It caches only fingerprinted host assets under
`/assets/` and microfrontend assets under `/remotes/*/assets/`. HTML, APIs,
and module federation `remoteEntry.js` continue through the uncached default
behavior. The managed optimized cache policy may keep an asset at an edge for
up to one year, so only put content-addressed files under these paths.

From the repository root in the same WSL shell used for deployment:

```bash
export AWS_PROFILE=user
export AWS_REGION=ap-southeast-1
aws eks update-kubeconfig --region "$AWS_REGION" --name relay
ALB_DNS="$(kubectl -n relay get ingress relay -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
test -n "$ALB_DNS"
aws cloudformation deploy --region "$AWS_REGION" --stack-name relay-edge \
  --template-file infra/relay-cloudfront.yaml \
  --parameter-overrides "LoadBalancerDnsName=$ALB_DNS"
DISTRIBUTION_ID="$(aws cloudformation describe-stacks --region "$AWS_REGION" \
  --stack-name relay-edge \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)"
aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"
aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name relay-edge \
  --query "Stacks[0].Outputs" --output table
```

This updates the existing edge distribution without rebuilding images or
changing EKS, RDS, or MSK. The Nginx `Cache-Control: immutable` headers added
to the frontend images take effect only when those images are rebuilt and
redeployed with `scripts/deploy-eks.sh`; the CloudFront cache behaviors work
after the edge update alone. `PriceClass_200` may increase CloudFront charges.
