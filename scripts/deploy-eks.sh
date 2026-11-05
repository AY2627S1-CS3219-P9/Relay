#!/usr/bin/env bash
set -euo pipefail

# Creates/updates the AWS foundation, publishes the existing Docker images, then
# applies the Relay Kubernetes objects. Required non-infrastructure values are
# read from deploy/relay.aws.env (see deploy/relay.aws.env.example).

stack_name="${1:-relay}"
aws_region="${AWS_REGION:-${2:-}}"
if [[ -z "$aws_region" ]]; then
  echo "Usage: AWS_REGION=ap-southeast-1 $0 <stack-name> [region]" >&2
  exit 2
fi

env_file="deploy/relay.aws.env"
if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Copy deploy/relay.aws.env.example and fill it in." >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$env_file"

required=(COGNITO_ISSUER COGNITO_JWKS_URI COGNITO_CLIENT_ID COGNITO_USER_POOL_ID S3_ENDPOINT S3_PUBLIC_ENDPOINT S3_BUCKET)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "Missing $name in $env_file" >&2; exit 2; }
done

# A pause deletes the EKS stack; the manifest identifies the four DB snapshots.
snapshot_args=()
resuming=0
state_file="deploy/.${stack_name}-pause.env"
if [[ -s "$state_file" ]]; then
  # shellcheck disable=SC1090
  source "$state_file"
  current_account="$(aws sts get-caller-identity --query Account --output text)"
  [[ "$PAUSE_ACCOUNT_ID" == "$current_account" && "$PAUSE_REGION" == "$aws_region" && "$PAUSE_STACK" == "$stack_name" ]] || {
    echo "Pause manifest belongs to another account, region, or stack." >&2; exit 1;
  }
  for name in User Errand Credit Supplier; do
    key="${name^^}_DATABASE_SNAPSHOT_ID"
    [[ -n "${!key:-}" ]] || { echo "Missing $key in $state_file" >&2; exit 1; }
    snapshot_args+=("${name}DatabaseSnapshotId=${!key}")
  done
  if ! aws cloudformation describe-stacks --region "$aws_region" --stack-name "$stack_name" >/dev/null 2>&1; then
    resuming=1
  fi
fi

# Fail before provisioning billable resources when Docker is unavailable.
if ! docker info >/dev/null 2>&1; then
  echo 'Docker API unavailable. Start Docker Desktop or the Docker daemon and verify docker info from this shell.' >&2
  exit 1
fi

aws cloudformation deploy \
  --region "$aws_region" \
  --stack-name "$stack_name" \
  --template-file infra/relay-eks.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    "KubernetesVersion=${KUBERNETES_VERSION:?Set KUBERNETES_VERSION in deploy/relay.aws.env}" \
    "ProfileImageBucketName=${S3_BUCKET}" \
    "CognitoUserPoolId=${COGNITO_USER_POOL_ID}" \
    "${snapshot_args[@]}"

output() {
  aws cloudformation describe-stacks --region "$aws_region" --stack-name "$stack_name" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

cluster_name="$(output ClusterName)"
aws eks update-kubeconfig --region "$aws_region" --name "$cluster_name"

access_stack="${stack_name}-aws-access"
issuer_url="$(aws eks describe-cluster --region "$aws_region" --name "$cluster_name" --query cluster.identity.oidc.issuer --output text)"
issuer_host="${issuer_url#https://}"
[[ "$issuer_url" == https://* && -n "$issuer_host" ]] || { echo 'EKS OIDC issuer unavailable' >&2; exit 1; }
account_id="$(aws sts get-caller-identity --query Account --output text)"
oidc_arn="arn:aws:iam::${account_id}:oidc-provider/${issuer_host}"
existing_oidc_arn=""
if ! aws cloudformation describe-stack-resource --region "$aws_region" --stack-name "$access_stack" --logical-resource-id ClusterOidcProvider >/dev/null 2>&1; then
  if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$oidc_arn" >/dev/null 2>&1; then
    existing_oidc_arn="$oidc_arn"
  fi
fi
msk_arn="$(output MskClusterArn)"
aws cloudformation deploy --region "$aws_region" --stack-name "$access_stack" \
  --template-file infra/relay-aws-access.yaml --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    "ClusterIssuerUrl=$issuer_url" "ClusterIssuerHost=$issuer_host" \
    "ExistingOidcProviderArn=$existing_oidc_arn" \
    "ProfileImageBucketName=$S3_BUCKET" "CognitoUserPoolId=$COGNITO_USER_POOL_ID"
access_output() {
  aws cloudformation describe-stacks --region "$aws_region" --stack-name "$access_stack" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

registry="$(output HostRepositoryUri)"
registry="${registry%%/*}"
# Docker Desktop's WSL credential helper can fail while saving ECR tokens.
# Keep ECR credentials in a private temporary config for login/push only.
ecr_docker_config="$(mktemp -d)"
chmod 700 "$ecr_docker_config"
rendered=""
cleanup() {
  [[ -z "$rendered" ]] || rm -f -- "$rendered"
  rm -rf -- "$ecr_docker_config"
}
trap cleanup EXIT
aws ecr get-login-password --region "$aws_region" |
  docker --config "$ecr_docker_config" login --username AWS --password-stdin "$registry"

build_and_push() {
  local output_name="$1" service="$2"
  shift 2
  local image_uri
  image_uri="$(output "$output_name"):${IMAGE_TAG:-latest}"
  local build_args=("$@")
  if [[ "${NO_CACHE:-0}" == "1" ]]; then
    build_args+=(--no-cache)
  fi
  # Use the neutral base Compose build definitions without the local Floci
  # override. Keep ECR tags separate from local Compose image tags.
  KAFKA_BROKERS=bootstrap USER_DATABASE_URL=bootstrap ERRAND_DATABASE_URL=bootstrap CREDIT_DATABASE_URL=bootstrap \
    SUPPLIER_DATABASE_URL=bootstrap SUPPLIER_DATABASE_PORT=5432 SUPPLIER_DATABASE_PASSWORD=bootstrap \
    DOCKER_DEFAULT_PLATFORM=linux/amd64 \
    docker compose -f compose.yaml --env-file "$env_file" --project-name relay-aws-build \
      build "${build_args[@]}" "$service" >&2 || return 1
  docker tag "relay-aws-build-$service:latest" "$image_uri" || return 1
  docker --config "$ecr_docker_config" push "$image_uri" >&2 || return 1
  printf '%s' "$image_uri"
}

host_image="$(build_and_push HostRepositoryUri host \
  --build-arg "AWS_ENDPOINT_URL=${COGNITO_AWS_ENDPOINT:-https://cognito-idp.${aws_region}.amazonaws.com}" \
  --build-arg "COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID" \
  --build-arg "COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID")"
supplier_frontend_image="$(build_and_push SupplierFrontendRepositoryUri supplier-frontend)"
user_frontend_image="$(build_and_push UserFrontendRepositoryUri user-frontend)"
errand_frontend_image="$(build_and_push ErrandFrontendRepositoryUri errand-frontend)"
credit_frontend_image="$(build_and_push CreditFrontendRepositoryUri credit-frontend)"
supplier_api_image="$(build_and_push SupplierApiRepositoryUri supplier-api)"
user_api_image="$(build_and_push UserApiRepositoryUri user-api)"
user_auth_api_image="$(build_and_push UserAuthRepositoryUri user-auth-api)"
user_event_publisher_image="$(build_and_push UserEventPublisherRepositoryUri user-event-publisher)"
errand_event_publisher_image="$(build_and_push ErrandEventPublisherRepositoryUri errand-event-publisher)"
errand_api_image="$(build_and_push ErrandApiRepositoryUri errand-api)"
credit_api_image="$(build_and_push CreditApiRepositoryUri credit-api)"
# The topic Job uses this image; do not create it until ECR confirms the tag.
credit_api_repository="${credit_api_image#"$registry"/}"
credit_api_repository="${credit_api_repository%:*}"
credit_api_tag="${credit_api_image##*:}"
aws ecr describe-images --region "$aws_region" --repository-name "$credit_api_repository" \
  --image-ids "imageTag=$credit_api_tag" >/dev/null

secret_value() {
  aws secretsmanager get-secret-value --region "$aws_region" --secret-id "$(output "$1")" --query SecretString --output text
}
password_from_secret() {
  node -e 'process.stdout.write(JSON.parse(process.argv[1]).password)' "$1"
}
user_password="$(password_from_secret "$(secret_value UserDatabaseSecretArn)")"
errand_password="$(password_from_secret "$(secret_value ErrandDatabaseSecretArn)")"
credit_password="$(password_from_secret "$(secret_value CreditDatabaseSecretArn)")"
supplier_password="$(password_from_secret "$(secret_value SupplierDatabaseSecretArn)")"
msk_scram_secret="$(secret_value MskScramSecretArn)"
msk_username="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).username)' "$msk_scram_secret")"
msk_password="$(password_from_secret "$msk_scram_secret")"
# Restored snapshots retain their old master password; new CFN secrets do not.
# Synchronize the master passwords before migration jobs connect.
if [[ "$resuming" == 1 ]]; then
  for name in User Errand Credit Supplier; do
    password_var="${name,,}_password"
    db_id="$(aws cloudformation describe-stack-resource --region "$aws_region" \
      --stack-name "$stack_name" --logical-resource-id "${name}Database" \
      --query StackResourceDetail.PhysicalResourceId --output text)"
    aws rds modify-db-instance --region "$aws_region" --db-instance-identifier "$db_id" \
      --master-user-password "${!password_var}" --apply-immediately >/dev/null
    aws rds wait db-instance-available --region "$aws_region" --db-instance-identifier "$db_id"
  done
fi
kubectl apply -f k8s/base/namespace.yaml -f k8s/base/configmap.yaml
rendered="$(mktemp)"
sed \
  -e "s|ROLE_USER_API|$(access_output UserApiRoleArn)|g" \
  -e "s|ROLE_USER_AUTH_API|$(access_output UserAuthRoleArn)|g" \
  k8s/base/serviceaccounts.yaml > "$rendered"
kubectl apply -f "$rendered"

for attempt in $(seq 1 60); do
  msk_state="$(aws kafka describe-cluster-v2 --region "$aws_region" --cluster-arn "$msk_arn" --query ClusterInfo.State --output text)"
  [[ "$msk_state" == ACTIVE ]] && break
  sleep 10
done
[[ "$msk_state" == ACTIVE ]] || { echo "MSK cluster did not become ACTIVE (state: $msk_state)" >&2; exit 1; }
msk_brokers="$(aws kafka get-bootstrap-brokers --region "$aws_region" --cluster-arn "$msk_arn" --query BootstrapBrokerStringSaslScram --output text)"
[[ -n "$msk_brokers" && "$msk_brokers" != None ]] || { echo 'MSK SCRAM bootstrap brokers unavailable' >&2; exit 1; }
kubectl -n relay delete job kafka-init --ignore-not-found
kubectl -n relay delete deployment kafka --ignore-not-found
kubectl -n relay delete service kafka --ignore-not-found
kubectl -n relay create secret generic relay-runtime \
  --from-literal=USER_DATABASE_URL="postgresql://relay:${user_password}@$(output UserDatabaseEndpoint):5432/relay?schema=public" \
  --from-literal=ERRAND_DATABASE_URL="postgresql://relay:${errand_password}@$(output ErrandDatabaseEndpoint):5432/relayerrand?schema=public" \
  --from-literal=CREDIT_DATABASE_URL="postgresql://relay:${credit_password}@$(output CreditDatabaseEndpoint):5432/relay?schema=public" \
  --from-literal=SUPPLIER_DATABASE_URL="postgresql://relay:${supplier_password}@$(output SupplierDatabaseEndpoint):5432/relay" \
  --from-literal=SUPPLIER_DB_HOST="$(output SupplierDatabaseEndpoint)" \
  --from-literal=SUPPLIER_DB_PORT=5432 \
  --from-literal=SUPPLIER_DB_PASSWORD="$supplier_password" \
  --from-literal=KAFKA_BROKERS="$msk_brokers" \
  --from-literal=KAFKA_USERNAME="$msk_username" \
  --from-literal=KAFKA_PASSWORD="$msk_password" \
  --from-literal=AWS_REGION="$aws_region" \
  --from-literal=AWS_DEFAULT_REGION="$aws_region" \
  --from-literal=COGNITO_ENDPOINT_URL="${COGNITO_AWS_ENDPOINT:-https://cognito-idp.${aws_region}.amazonaws.com}" \
  --from-literal=AUTH_PUBLIC_ORIGIN=https://pending.invalid \
  --from-literal=COGNITO_ISSUER="$COGNITO_ISSUER" \
  --from-literal=COGNITO_JWKS_URI="$COGNITO_JWKS_URI" \
  --from-literal=COGNITO_CLIENT_ID="$COGNITO_CLIENT_ID" \
  --from-literal=COGNITO_USER_POOL_ID="$COGNITO_USER_POOL_ID" \
  --from-literal=S3_ENDPOINT="$S3_ENDPOINT" \
  --from-literal=S3_PUBLIC_ENDPOINT="$S3_PUBLIC_ENDPOINT" \
  --from-literal=S3_REGION="$aws_region" \
  --from-literal=S3_BUCKET="$S3_BUCKET" \
  --from-literal=S3_FORCE_PATH_STYLE=false \
  --dry-run=client -o yaml | kubectl apply -f -

sed "s|IMAGE_CREDIT_API|$credit_api_image|g" k8s/base/kafka-topics.yaml > "$rendered"
kubectl apply -f "$rendered"
if ! kubectl -n relay wait --for=condition=complete job/kafka-init --timeout=15m; then
  echo 'Kafka topic initialization failed. Job and pod diagnostics:' >&2
  kubectl -n relay describe job/kafka-init >&2 || true
  kubectl -n relay get pods -l job-name=kafka-init -o wide >&2 || true
  kubectl -n relay logs job/kafka-init --all-containers=true --tail=100 >&2 || true
  exit 1
fi
kubectl -n relay delete job supplier-schema user-migrate errand-migrate credit-migrate --ignore-not-found
sed \
  -e "s|IMAGE_HOST|$host_image|g" \
  -e "s|IMAGE_SUPPLIER_FRONTEND|$supplier_frontend_image|g" \
  -e "s|IMAGE_USER_FRONTEND|$user_frontend_image|g" \
  -e "s|IMAGE_ERRAND_FRONTEND|$errand_frontend_image|g" \
  -e "s|IMAGE_CREDIT_FRONTEND|$credit_frontend_image|g" \
  -e "s|IMAGE_SUPPLIER_API|$supplier_api_image|g" \
  -e "s|IMAGE_USER_API|$user_api_image|g" \
  -e "s|IMAGE_USER_AUTH_API|$user_auth_api_image|g" \
  -e "s|IMAGE_ERRAND_API|$errand_api_image|g" \
  -e "s|IMAGE_CREDIT_API|$credit_api_image|g" \
  -e "s|IMAGE_USER_EVENT_PUBLISHER|$user_event_publisher_image|g" \
  -e "s|IMAGE_ERRAND_EVENT_PUBLISHER|$errand_event_publisher_image|g" \
  k8s/base/migrations.yaml > "$rendered"
kubectl apply -f "$rendered"
kubectl -n relay wait --for=condition=complete job/supplier-schema job/user-migrate job/errand-migrate job/credit-migrate --timeout=10m

sed \
  -e "s|IMAGE_HOST|$host_image|g" \
  -e "s|IMAGE_SUPPLIER_FRONTEND|$supplier_frontend_image|g" \
  -e "s|IMAGE_USER_FRONTEND|$user_frontend_image|g" \
  -e "s|IMAGE_ERRAND_FRONTEND|$errand_frontend_image|g" \
  -e "s|IMAGE_CREDIT_FRONTEND|$credit_frontend_image|g" \
  -e "s|IMAGE_SUPPLIER_API|$supplier_api_image|g" \
  -e "s|IMAGE_USER_API|$user_api_image|g" \
  -e "s|IMAGE_USER_AUTH_API|$user_auth_api_image|g" \
  -e "s|IMAGE_ERRAND_API|$errand_api_image|g" \
  -e "s|IMAGE_CREDIT_API|$credit_api_image|g" \
  -e "s|IMAGE_USER_EVENT_PUBLISHER|$user_event_publisher_image|g" \
  -e "s|IMAGE_ERRAND_EVENT_PUBLISHER|$errand_event_publisher_image|g" \
  k8s/base/workloads.yaml | kubectl apply -f -
kubectl -n relay rollout restart deployment/user-api deployment/errand-api deployment/credit-api deployment/supplier-api
kubectl apply -f k8s/base/autoscaling.yaml
kubectl apply -f k8s/base/ingress.yaml
kubectl -n relay get deployment -o name | while read -r deployment; do
  kubectl -n relay rollout status "$deployment" --timeout=10m
done
# Wait for the ALB hostname, then create the CloudFront entry point.
alb_dns=""
for attempt in $(seq 1 60); do
  alb_dns="$(kubectl -n relay get ingress relay -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
  [[ -n "$alb_dns" ]] && break
  sleep 10
done
[[ -n "$alb_dns" ]] || { echo "ALB ingress has no hostname after ten minutes" >&2; exit 1; }
# CloudFront provides the trusted HTTPS hostname without Route 53 or ACM.
edge_stack="${stack_name}-edge"
aws cloudformation deploy \
  --region "$aws_region" \
  --stack-name "$edge_stack" \
  --template-file infra/relay-cloudfront.yaml \
  --parameter-overrides "LoadBalancerDnsName=$alb_dns"
edge_output() {
  aws cloudformation describe-stacks --region "$aws_region" --stack-name "$edge_stack" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
distribution_id="$(edge_output DistributionId)"
public_origin="https://$(edge_output DistributionDomainName)"
aws cloudfront wait distribution-deployed --id "$distribution_id"
# The auth pod starts with a fail-closed origin until CloudFront has a hostname.
origin_patch="$(node -e 'const data=Buffer.from(process.argv[1]).toString("base64"); process.stdout.write(JSON.stringify({data:{AUTH_PUBLIC_ORIGIN:data}}))' "$public_origin")"
kubectl -n relay patch secret relay-runtime --type merge -p "$origin_patch" >/dev/null
kubectl -n relay rollout restart deployment/user-auth-api
kubectl -n relay rollout status deployment/user-auth-api --timeout=10m
for attempt in $(seq 1 30); do
  curl --fail --silent --show-error --max-time 10 "$public_origin/healthz" >/dev/null 2>&1 && break
  sleep 10
done
curl --fail --show-error --max-time 10 "$public_origin/healthz"
echo "Deployment complete: $public_origin"