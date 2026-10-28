# Relay AWS deployment

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

Install and authenticate the AWS CLI, Docker, and `kubectl`. The identity used
to deploy needs permission to create the CloudFormation resources and access
the generated EKS cluster.

### AWS Sandbox Specific Instructions
Use SSO Login to access the Sanbox AWS Account.

1. `aws configure sso` to configure sso
2. `aws sts get-caller-identity --profile user` to confirm you logged in
3. `aws sso login --profile user --use-device-code` to log in using SSO

Use a supported EKS Kubernetes version in the target
Region.

Copy the non-committed configuration file:

```bash
cp deploy/relay.aws.env.example deploy/relay.aws.env
```

`relay.aws.env` intentionally remains outside Git. The deployment script reads
it only on the workstation running the deployment.

## Provision AWS resources

Set the region and stack names once for the commands below:

```bash
export AWS_REGION=ap-southeast-1
export AUTH_STACK=relay-auth
export STORAGE_STACK=relay-storage
```

Create the Cognito stack:

```bash
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$AUTH_STACK" \
  --template-file infra/relay-auth.yaml
```

If using sso login, include the parameter
`--profile user --region ap-southeast-1`

Create the storage stack. The bucket name must be globally unique:

```bash
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STORAGE_STACK" \
  --template-file infra/relay-storage.yaml \
  --parameter-overrides BucketName=relay-user-profile-images \
  --capabilities CAPABILITY_IAM
```
If using sso login, include the parameter
`--profile user --region ap-southeast-1`

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
export S3_BUCKET="$(stack_output "$STORAGE_STACK" BucketName)"
export S3_ENDPOINT="$(stack_output "$STORAGE_STACK" S3Endpoint)"
export S3_PUBLIC_ENDPOINT="$(stack_output "$STORAGE_STACK" S3PublicEndpoint)"
```

Copy the Cognito and S3 values above into `deploy/relay.aws.env`. Keep that
file uncommitted. The EKS deployment passes the bucket name to the cluster
stack, which grants the `user-api` Pod Identity role access to the bucket.

`DATABASE_ENGINE_FAMILY` must match the PostgreSQL major version used by the
RDS instances, for example `postgres17`. Check the current value before the
first deployment with:

```bash
USER_DB_ID="$(aws cloudformation describe-stack-resources \
  --stack-name relay \
  --logical-resource-id UserDatabase \
  --region "$AWS_REGION" \
  --profile user \
  --query 'StackResources[0].PhysicalResourceId' \
  --output text)"

aws rds describe-db-instances \
  --db-instance-identifier "$USER_DB_ID" \
  --region "$AWS_REGION" \
  --profile user \
  --query 'DBInstances[0].EngineVersion' \
  --output text
```

## Bootstrap the initial super-admin

CloudFormation intentionally does not create the initial user's permanent
password. Create the first super-admin once, after the auth stack exists:

```bash
read -r -p 'Initial admin email: ' FLOCI_INITIAL_ADMIN_EMAIL
read -r -s -p 'Initial admin password: ' FLOCI_INITIAL_ADMIN_PASSWORD
printf '\n'

aws cognito-idp admin-create-user \
  --region "$AWS_REGION" \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --user-attributes \
    Name=email,Value="$FLOCI_INITIAL_ADMIN_EMAIL" \
    Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region "$AWS_REGION" \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --password "$FLOCI_INITIAL_ADMIN_PASSWORD" \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region "$AWS_REGION" \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --group-name SuperAdminGroup
```

If using sso login, include the parameter
`--profile user --region ap-southeast-1`

This bootstrap is idempotent only up to the first user creation. If the user
already exists, use `admin-set-user-password` and
`admin-add-user-to-group` directly.

## Deploy the application

```bash
chmod +x scripts/deploy-eks.sh
AWS_PROFILE=user AWS_REGION="$AWS_REGION" ./scripts/deploy-eks.sh relay
```

The script generates a shared Kafka password on first deployment and keeps it
in the `kafka-auth` and `kafka-broker-config` Kubernetes Secrets. The broker is
available only through the in-cluster `kafka:9092` Service. User, Errand, and
Credit API use Kafka's SASL/PLAIN authentication; the password is not placed in
the ConfigMap or the repository. The broker and its one-partition topics are
for a short-lived demo: the broker uses ephemeral storage, and restarting its
Pod loses Kafka data. SASL/PLAIN over this internal listener does not encrypt
traffic, so do not use this configuration for production or expose the Service
outside the cluster.

Check the demo broker and topic initializer before testing the application:

```bash
kubectl -n relay rollout status deployment/kafka
kubectl -n relay wait --for=condition=complete job/kafka-init --timeout=5m
kubectl -n relay get pods -l app=kafka
```

The first deployment can take several minutes while AWS creates the cluster,
databases, and load balancer. The script prints the command for
finding the public ALB hostname at the end:

```bash
kubectl -n relay get ingress relay
```

## What scales

`supplier-api`, `user-api`, `errand-api`, and `credit-api` each have a CPU HPA
with a range of one to four Pods (one to three for Credit). EKS Auto Mode adds
or removes node capacity when those Pods cannot fit on existing nodes.

The host and four microfrontend Deployments deliberately stay at one replica in
this first iteration. They are static Nginx workloads; separately scaling them
does not materially demonstrate the API autoscaling objective.

The ALB routes `/remotes/*` directly to each frontend Service. The host keeps
handling `/api/*`, where Kubernetes Service names match the existing Compose
names (`user-api`, `supplier-api`, `errand-api`, and `credit-api`).

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

## Safe cleanup

CloudFormation retains database snapshots on stack deletion. Before deleting a
stack, delete the Kubernetes Ingress so its load balancer is removed, then use
the CloudFormation console or CLI to delete the stack. Review retained RDS
snapshots and ECR images afterwards because they continue to incur storage
costs.
