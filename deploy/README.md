# Relay AWS deployment

- CloudFormation provisions the VPC, EKS Auto Mode cluster, ECR repositories,
  four private PostgreSQL databases, MSK Serverless, and their credentials.
- `infra/relay-auth.yaml` provisions the Cognito user pool, no-secret app
  client, email verification, password policy, and admin groups.
- `infra/relay-storage.yaml` provisions the private profile-image bucket and a
  least-privilege static S3 application user. The generated access key is kept
  in Secrets Manager and is copied into the deployment environment only when
  needed.
- `scripts/deploy-eks.sh` builds the existing Dockerfiles, pushes the images,
  creates the in-cluster runtime Secret, applies one-off database migrations,
  and applies the workloads, HPA policies, and ALB Ingress.
- No local Docker Compose configuration or application route changes are needed.

## Prerequisites

Install and authenticate the AWS CLI, Docker, and `kubectl`. The identity used
to deploy needs permission to create the CloudFormation resources and access
the generated EKS cluster. Use a supported EKS Kubernetes version in the target
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

Create the storage stack. The bucket name must be globally unique:

```bash
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STORAGE_STACK" \
  --template-file infra/relay-storage.yaml \
  --parameter-overrides BucketName=REPLACE_WITH_UNIQUE_PROFILE_BUCKET_NAME
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
export S3_BUCKET="$(stack_output "$STORAGE_STACK" BucketName)"
export S3_ENDPOINT="$(stack_output "$STORAGE_STACK" S3Endpoint)"
export S3_PUBLIC_ENDPOINT="$(stack_output "$STORAGE_STACK" S3PublicEndpoint)"
```

Retrieve the generated S3 credentials from Secrets Manager and put them in
`deploy/relay.aws.env`:

```bash
credentials_secret="$(stack_output "$STORAGE_STACK" ApplicationCredentialsSecretArn)"
aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "$credentials_secret" \
  --query SecretString \
  --output text
```

Set the returned `accessKeyId` and `secretAccessKey` as:

```text
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

Also copy the Cognito and S3 values above into `deploy/relay.aws.env`. Keep
that file uncommitted.

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

This bootstrap is idempotent only up to the first user creation. If the user
already exists, use `admin-set-user-password` and
`admin-add-user-to-group` directly.

## Deploy the application

```bash
chmod +x scripts/deploy-eks.sh
AWS_REGION="$AWS_REGION" ./scripts/deploy-eks.sh relay
```

The first deployment can take several minutes while AWS creates the cluster,
databases, MSK cluster, and load balancer. The script prints the command for
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
  separate Deployments, increase topic partitions, and use KEDA/MSK lag to
  scale the worker Deployment.
- MSK access is isolated with EKS Pod Identity: only User, Errand, and Credit
  API ServiceAccounts receive temporary Kafka credentials. The host, all
  frontends, Supplier API, and the shared EKS node role receive no MSK access.
  The API roles remain deliberately broad across Relay topics for this first
  deployment; narrow them to topic and consumer-group ARNs before production.
- Each API database is a separate small, single-AZ RDS instance. This preserves
  the current service data boundaries but is a cost-conscious learning setup,
  not a highly available database design.

## Safe cleanup

CloudFormation retains database snapshots on stack deletion. Before deleting a
stack, delete the Kubernetes Ingress so its load balancer is removed, then use
the CloudFormation console or CLI to delete the stack. Review retained RDS
snapshots and ECR images afterwards because they continue to incur storage
costs.
