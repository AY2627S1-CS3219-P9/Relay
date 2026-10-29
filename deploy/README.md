# Relay AWS deployment

This guide describes the checked-in sandbox deployment. Run commands from the
repository root in Bash (`bash` if your terminal uses Zsh). Deployment creates
billable AWS resources.

- CloudFormation provisions the VPC, EKS Auto Mode cluster, ECR repositories,
  four private PostgreSQL databases, and their credentials. The sandbox demo
  runs its own single-node Kafka broker in EKS.
- `infra/relay-auth.yaml` provisions the Cognito user pool, no-secret app
  client, email verification, password policy, and admin groups.
- `infra/relay-storage.yaml` provisions the private profile-image bucket.
  The user API accesses it through an EKS Pod Identity role, without static
  S3 credentials.
- `scripts/deploy-eks.sh` builds the existing Dockerfiles, pushes the images,
  creates the in-cluster runtime and Kafka Secrets, starts the demo broker,
  applies one-off database migrations,
  and applies the workloads, HPA policies, and ALB Ingress.

## Prerequisites

Install AWS CLI v2, Docker with a running daemon, a compatible `kubectl`,
Node.js, and OpenSSL. The script builds `linux/amd64` images, including on Apple
Silicon. The deployment identity needs the CloudFormation, IAM, EKS, networking,
ECR, RDS, Secrets Manager, Cognito, and S3 permissions used by the templates and
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

### Kubernetes and PostgreSQL versions

The example versions are starting points, not a guarantee of regional support.
Query available EKS versions and set `KUBERNETES_VERSION` in the local file:

```bash
aws eks describe-cluster-versions --region "$AWS_REGION" \
  --query 'clusterVersions[].{Version:clusterVersion,Status:status}' --output table
```

For a new stack, query the regional PostgreSQL default and parameter-group
family, then set `DATABASE_ENGINE_FAMILY` accordingly:

```bash
aws rds describe-db-engine-versions --region "$AWS_REGION" \
  --engine postgres --default-only \
  --query 'DBEngineVersions[].{Version:EngineVersion,Family:DBParameterGroupFamily}' \
  --output table
```

The template does not pin `EngineVersion`. `DATABASE_ENGINE_FAMILY` configures
the User database parameter group; it does not select the engine version. The
template/script fallback is `postgres17`, while the example file currently uses
`postgres18`. Confirm the matching family before deploying. See the
[EKS version guide](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)
and [RDS version command reference](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-engine-versions.html).

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

Create the storage stack. The bucket name must be globally unique:

```bash
export PROFILE_IMAGE_BUCKET=replace-with-a-globally-unique-bucket-name
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STORAGE_STACK" \
  --template-file infra/relay-storage.yaml \
  --parameter-overrides "BucketName=$PROFILE_IMAGE_BUCKET"
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
file uncommitted. The EKS deployment passes the bucket name to the cluster
stack, which grants the `user-api` Pod Identity role access to the bucket.

The bucket blocks public access, enforces bucket-owner ownership, uses AES256
encryption, and is retained on stack deletion/replacement. The User API uses
Pod Identity instead of static S3 keys and returns presigned image URLs valid
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
Docker's build cache. The script uses the selected profile and region, refreshes
kubeconfig, builds and pushes nine images to ECR, prepares runtime configuration,
starts Kafka, and waits for topic initialization. It then runs separate Supplier
SQL and User/Errand/Credit Prisma migration Jobs before applying application
Deployments, autoscalers, and ingress. Rollout and migration waits use ten-minute
timeouts; topic initialization uses five minutes.

The host image receives its Cognito settings at build time, so changing them
requires rebuilding it. ConfigMap/Secret environment changes also require
restarting the affected API Pods. Applying `kubectl apply -k k8s/base` alone does
not perform image substitution, generate Secrets, or prepare migration Jobs;
use the deployment script for the complete sequence.

The script generates a shared Kafka password on first deployment and keeps it
in the `kafka-auth` and `kafka-broker-config` Kubernetes Secrets. The broker is
available only through the in-cluster `kafka:9092` Service. User, Errand, and
Credit API use Kafka's SASL/PLAIN authentication; the password is not placed in
the ConfigMap or the repository. The broker and its one-partition topics are
for a short-lived demo: replacing the broker Pod loses Kafka data, including
topic metadata and consumer offsets. A container restart within the same Pod
retains its `emptyDir` volume. SASL/PLAIN over this internal listener does not encrypt
traffic, so do not use this configuration for production or expose the Service
outside the cluster.

Check the demo broker and topic initializer before testing the application:

```bash
kubectl -n relay rollout status deployment/kafka
kubectl -n relay wait --for=condition=complete job/kafka-init --timeout=5m
kubectl -n relay get pods -l app=kafka
```

The broker advertises `kafka.relay.svc.cluster.local:9092`. Its Service publishes
endpoints before readiness succeeds so startup probes can resolve the advertised
address. Broker probes and topic initialization use the authenticated client
settings in `kafka-broker-config`. The script reuses both Kafka Secrets; changing
only one can break authentication. No MSK cluster is provisioned.

Inspect topics without printing credentials:

```bash
kubectl -n relay exec deployment/kafka -- \
  /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --command-config /etc/kafka/secrets/client.properties --describe
```

If the broker Pod is replaced after deployment, recreate the topic initializer
Job after Kafka is ready; its previous completion does not restore lost topics:

```bash
kubectl -n relay delete job kafka-init --ignore-not-found
kubectl apply -f k8s/base/kafka-demo.yaml
kubectl -n relay wait --for=condition=complete job/kafka-init --timeout=5m
```

The first deployment can take several minutes while AWS creates the cluster,
databases, and load balancer. The script prints the command for
finding the public ALB hostname at the end:

```bash
kubectl -n relay get ingress relay
```

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

Wait for a nonempty ingress hostname, then check the public host:

```bash
ALB_HOST="$(kubectl -n relay get ingress relay \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
curl --fail --show-error "http://$ALB_HOST/healthz"
```

This public health endpoint checks the host only. In the browser, check that
remote assets load, sign in, complete the profile, and exercise each API with a
valid session. Verify profile-image loading through presigned S3 URLs. A 401
response from an unauthenticated API does not prove its database operation works.

### Routing and HTTPS

| Public path | Destination |
| --- | --- |
| `/remotes/supplier/*` | Supplier frontend Service |
| `/remotes/user/*` | User frontend Service |
| `/remotes/errand/*` | Errand frontend Service |
| `/remotes/credit/*` | Credit frontend Service |
| `/api/user*`, `/api/supplier*`, `/api/errands*`, `/api/credit*` | Host Nginx, then the matching backend Service on port 3000 |
| Remaining paths | Host frontend |

The ingress preserves remote prefixes; frontend Nginx configurations rewrite
their prefixes before serving assets. The host also proxies remote routes using
Kubernetes Service names, without workstation or Docker-host addresses.

The current ingress serves HTTP on port 80. Domains, certificates, HTTPS
listeners, HTTP redirects, and CloudFront are not provisioned. Direct ALB HTTPS
requires a domain you control, DNS pointing to the ALB, an issued ACM certificate
in the ALB region, port 443 access, and HTTPS ingress configuration. See
[EKS Auto Mode ALB configuration](https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-alb.html).
When enabling HTTPS, set the User API's `SESSION_COOKIE_SECURE=true` and restart
it; this setting currently defaults to false.

### Backend readiness and Supplier database TLS

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
| `supplier-api`, `user-api`, `errand-api` | Independent CPU HPA, 1–4 replicas |
| `credit-api` | Independent CPU HPA, 1–3 replicas |
| Host and four microfrontends | One replica each, no HPA |
| Kafka | One broker, no HPA |

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
  separate Deployments, increase topic partitions, and use Kafka lag to scale
  the worker Deployment.
- The demo broker uses one shared Kafka account for User, Errand, and Credit
  API. User API retains EKS Pod Identity only for profile-image S3 access.
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

Delete the Kubernetes ingress while the cluster still exists. Wait for its ALB
and associated controller-managed resources to be removed before deleting the
EKS stack. CloudFormation creates database snapshots on deletion/replacement.
ECR repositories do not enable force-empty deletion; nonempty repositories can
block stack deletion, so explicitly retain or remove their images according to
your retention needs.

The authentication and storage stacks have separate lifecycles. Deleting the
auth stack removes its Cognito resources. The private S3 bucket is retained even
when the storage stack is deleted. Inventory retained database snapshots, image
repositories, and S3 objects afterward because retained storage incurs charges.
