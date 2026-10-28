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

aws cloudformation deploy \
  --region "$aws_region" \
  --stack-name "$stack_name" \
  --template-file infra/relay-eks.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    "KubernetesVersion=${KUBERNETES_VERSION:?Set KUBERNETES_VERSION in deploy/relay.aws.env}" \
    "ProfileImageBucketName=${S3_BUCKET}" \
    "DatabaseEngineFamily=${DATABASE_ENGINE_FAMILY:-postgres17}"

output() {
  aws cloudformation describe-stacks --region "$aws_region" --stack-name "$stack_name" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

cluster_name="$(output ClusterName)"
aws eks update-kubeconfig --region "$aws_region" --name "$cluster_name"

registry="$(output HostRepositoryUri)"
registry="${registry%%/*}"
aws ecr get-login-password --region "$aws_region" | docker login --username AWS --password-stdin "$registry"

build_and_push() {
  local output_name="$1" dockerfile="$2"
  local image_uri
  image_uri="$(output "$output_name"):${IMAGE_TAG:-latest}"
  docker build --platform linux/amd64 -f "$dockerfile" -t "$image_uri" . >&2
  docker push "$image_uri" >&2
  printf '%s' "$image_uri"
}

host_image="$(build_and_push HostRepositoryUri host/Dockerfile)"
supplier_frontend_image="$(build_and_push SupplierFrontendRepositoryUri supplier-service/frontend/Dockerfile)"
user_frontend_image="$(build_and_push UserFrontendRepositoryUri user-service/frontend/Dockerfile)"
errand_frontend_image="$(build_and_push ErrandFrontendRepositoryUri errand-service/frontend/Dockerfile)"
credit_frontend_image="$(build_and_push CreditFrontendRepositoryUri credit-service/frontend/Dockerfile)"
supplier_api_image="$(build_and_push SupplierApiRepositoryUri supplier-service/backend/Dockerfile)"
user_api_image="$(build_and_push UserApiRepositoryUri user-service/backend/Dockerfile)"
errand_api_image="$(build_and_push ErrandApiRepositoryUri errand-service/backend/Dockerfile)"
credit_api_image="$(build_and_push CreditApiRepositoryUri credit-service/backend/Dockerfile)"

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
kafka_brokers="$(aws kafka get-bootstrap-brokers --region "$aws_region" --cluster-arn "$(output MskClusterArn)" --query BootstrapBrokerStringSaslIam --output text)"

kubectl apply -f k8s/base/namespace.yaml -f k8s/base/configmap.yaml
kubectl -n relay create configmap supplier-schema \
  --from-file=schema.sql=supplier-service/backend/src/schema.sql \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n relay create secret generic relay-runtime \
  --from-literal=USER_DATABASE_URL="postgresql://relay:${user_password}@$(output UserDatabaseEndpoint):5432/relay?schema=public" \
  --from-literal=ERRAND_DATABASE_URL="postgresql://relay:${errand_password}@$(output ErrandDatabaseEndpoint):5432/relayerrand?schema=public" \
  --from-literal=CREDIT_DATABASE_URL="postgresql://relay:${credit_password}@$(output CreditDatabaseEndpoint):5432/relay?schema=public" \
  --from-literal=SUPPLIER_DATABASE_URL="postgresql://relay:${supplier_password}@$(output SupplierDatabaseEndpoint):5432/relay" \
  --from-literal=SUPPLIER_DB_HOST="$(output SupplierDatabaseEndpoint)" \
  --from-literal=SUPPLIER_DB_PASSWORD="$supplier_password" \
  --from-literal=KAFKA_BROKERS="$kafka_brokers" \
  --from-literal=AWS_REGION="$aws_region" \
  --from-literal=AWS_DEFAULT_REGION="$aws_region" \
  --from-literal=AWS_ENDPOINT_URL="${COGNITO_AWS_ENDPOINT:-https://cognito-idp.${aws_region}.amazonaws.com}" \
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

rendered="$(mktemp)"
trap 'rm -f "$rendered"' EXIT
kubectl -n relay delete job supplier-schema user-migrate errand-migrate credit-migrate --ignore-not-found
sed \
  -e "s|IMAGE_HOST|$host_image|g" \
  -e "s|IMAGE_SUPPLIER_FRONTEND|$supplier_frontend_image|g" \
  -e "s|IMAGE_USER_FRONTEND|$user_frontend_image|g" \
  -e "s|IMAGE_ERRAND_FRONTEND|$errand_frontend_image|g" \
  -e "s|IMAGE_CREDIT_FRONTEND|$credit_frontend_image|g" \
  -e "s|IMAGE_SUPPLIER_API|$supplier_api_image|g" \
  -e "s|IMAGE_USER_API|$user_api_image|g" \
  -e "s|IMAGE_ERRAND_API|$errand_api_image|g" \
  -e "s|IMAGE_CREDIT_API|$credit_api_image|g" \
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
  -e "s|IMAGE_ERRAND_API|$errand_api_image|g" \
  -e "s|IMAGE_CREDIT_API|$credit_api_image|g" \
  k8s/base/workloads.yaml | kubectl apply -f -
kubectl apply -f k8s/base/autoscaling.yaml -f k8s/base/ingress.yaml
kubectl -n relay get deployment -o name | while read -r deployment; do
  kubectl -n relay rollout status "$deployment" --timeout=10m
done
echo "Deployment complete. Run: kubectl -n relay get ingress relay"
