#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

# Compose remains available at localhost:8080; this is a separate Floci instance.
docker volume create relay-floci-eks-ca >/dev/null
docker compose -f compose.eks.yaml --project-name relay-eks up -d --build
for i in $(seq 1 300); do
  [[ "$(docker inspect relay-floci-eks --format '{{.State.Health.Status}}' 2>/dev/null || true)" == healthy ]] && docker exec relay-floci-eks test -s /app/data/relay-auth.env && docker exec relay-floci-eks test -s /app/data/relay-rds.env && break
  sleep 3
done
[[ "$(docker inspect relay-floci-eks --format '{{.State.Health.Status}}')" == healthy ]]
docker exec relay-floci-eks test -s /app/data/relay-rds.env
# The auth stack chooses its own pool and app client IDs.
auth_output="$(docker exec relay-floci-eks cat /app/data/relay-auth.env)"
COGNITO_USER_POOL_ID="$(printf '%s\n' "$auth_output" | sed -n 's/^COGNITO_USER_POOL_ID=//p')"
COGNITO_CLIENT_ID="$(printf '%s\n' "$auth_output" | sed -n 's/^COGNITO_CLIENT_ID=//p')"
[[ -n "$COGNITO_USER_POOL_ID" && -n "$COGNITO_CLIENT_ID" ]]
rds_output="$(docker exec relay-floci-eks cat /app/data/relay-rds.env)"
rds_value() { printf '%s\n' "$rds_output" | sed -n "s/^$1=//p"; }
for name in USER ERRAND CREDIT SUPPLIER; do
  host="$(rds_value "${name}_DATABASE_HOST")"
  port="$(rds_value "${name}_DATABASE_PORT")"
  password="$(rds_value "${name}_DATABASE_PASSWORD")"
  [[ -n "$host" && "$port" =~ ^[0-9]+$ && -n "$password" ]]
  printf -v "${name}_DATABASE_HOST" '%s' "$host"
  printf -v "${name}_DATABASE_PORT" '%s' "$port"
  printf -v "${name}_DATABASE_PASSWORD" '%s' "$password"
done

node=floci-aws-eks-relay-local
for i in $(seq 1 120); do
  docker exec "$node" test -f /etc/rancher/k3s/k3s.yaml >/dev/null 2>&1 && break
  sleep 3
done
docker exec "$node" test -f /etc/rancher/k3s/k3s.yaml
port="$(docker port "$node" 6443/tcp | head -1 | sed 's/.*://')"
docker cp "$node:/etc/rancher/k3s/k3s.yaml" floci/eks/.kubeconfig
sed -i "s|https://127.0.0.1:6443|https://127.0.0.1:$port|" floci/eks/.kubeconfig
export KUBECONFIG="$PWD/floci/eks/.kubeconfig"
kubectl wait --for=condition=Ready node --all --timeout=120s

if [[ "${SKIP_IMAGE_BUILD:-0}" != 1 ]]; then
  USER_DATABASE_URL=bootstrap ERRAND_DATABASE_URL=bootstrap CREDIT_DATABASE_URL=bootstrap SUPPLIER_DATABASE_URL=bootstrap SUPPLIER_DATABASE_PORT=7004 SUPPLIER_DATABASE_PASSWORD=bootstrap docker compose -f compose.yaml --project-name relay build host supplier-frontend user-frontend errand-frontend credit-frontend supplier-api user-api user-auth-api errand-api credit-api user-event-publisher errand-event-publisher
fi
images=(relay-host relay-supplier-frontend relay-user-frontend relay-errand-frontend relay-credit-frontend relay-supplier-api relay-user-api relay-user-auth-api relay-errand-api relay-credit-api relay-user-event-publisher relay-errand-event-publisher)
for i in "${!images[@]}"; do images[$i]="${images[$i]}:latest"; done
if [[ "${SKIP_IMAGE_IMPORT:-0}" != 1 ]]; then
  docker save -o floci/eks/.images.tar "${images[@]}"
  docker cp floci/eks/.images.tar "$node:/tmp/relay-images.tar"
  docker exec "$node" ctr -n k8s.io images import /tmp/relay-images.tar
  docker exec "$node" rm -f /tmp/relay-images.tar
  rm -f floci/eks/.images.tar
fi

kubectl apply -f k8s/base/namespace.yaml -f k8s/base/configmap.yaml -f k8s/floci/traefik.yaml
kubectl -n relay delete deployment user-postgres errand-postgres credit-postgres supplier-postgres --ignore-not-found
kubectl -n relay delete service user-postgres errand-postgres credit-postgres supplier-postgres --ignore-not-found
floci_ip="$(docker inspect relay-floci-eks --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')"
sed "s/FLOCI_DOCKER_IP/$floci_ip/g" k8s/floci/floci-service.yaml | kubectl apply -f -
kubectl -n relay create secret generic kafka-auth --from-literal=KAFKA_USERNAME=relaydemo --from-literal=KAFKA_PASSWORD=relay-local-password --dry-run=client -o yaml | kubectl apply -f -
kubectl -n relay create secret generic kafka-broker-config \
  --from-literal='broker_jaas.conf=KafkaServer { org.apache.kafka.common.security.plain.PlainLoginModule required username="relaydemo" password="relay-local-password" user_relaydemo="relay-local-password"; };' \
  --from-literal='client.properties=security.protocol=SASL_PLAINTEXT
sasl.mechanism=PLAIN
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username="relaydemo" password="relay-local-password";' \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/base/kafka-demo.yaml
kubectl -n relay rollout status deployment/kafka --timeout=5m
kubectl -n relay wait --for=condition=complete job/kafka-init --timeout=5m

kubectl -n relay create secret generic relay-runtime \
  --from-literal=USER_DATABASE_URL=postgresql://relay:${USER_DATABASE_PASSWORD}@${USER_DATABASE_HOST}:${USER_DATABASE_PORT}/relay?schema=public \
  --from-literal=ERRAND_DATABASE_URL=postgresql://relay:${ERRAND_DATABASE_PASSWORD}@${ERRAND_DATABASE_HOST}:${ERRAND_DATABASE_PORT}/relayerrand?schema=public \
  --from-literal=CREDIT_DATABASE_URL=postgresql://relay:${CREDIT_DATABASE_PASSWORD}@${CREDIT_DATABASE_HOST}:${CREDIT_DATABASE_PORT}/relay?schema=public \
  --from-literal=SUPPLIER_DATABASE_URL=postgresql://relay:${SUPPLIER_DATABASE_PASSWORD}@${SUPPLIER_DATABASE_HOST}:${SUPPLIER_DATABASE_PORT}/relay \
  --from-literal=SUPPLIER_DB_HOST=${SUPPLIER_DATABASE_HOST} \
  --from-literal=SUPPLIER_DB_PORT=${SUPPLIER_DATABASE_PORT} \
  --from-literal=SUPPLIER_DB_PASSWORD=${SUPPLIER_DATABASE_PASSWORD} \
  --from-literal=KAFKA_BROKERS=kafka:9092 \
  --from-literal=AWS_REGION=us-east-1 \
  --from-literal=AWS_DEFAULT_REGION=us-east-1 \
  --from-literal=AWS_ACCESS_KEY_ID=test \
  --from-literal=AWS_SECRET_ACCESS_KEY=test \
  --from-literal=AWS_ENDPOINT_URL=http://floci-local:4566 \
  --from-literal=AUTH_PUBLIC_ORIGIN=https://localhost:9090 \
  --from-literal=COGNITO_ISSUER=https://localhost:4567/${COGNITO_USER_POOL_ID} \
  --from-literal=COGNITO_JWKS_URI=http://floci-local:4566/${COGNITO_USER_POOL_ID}/.well-known/jwks.json \
  --from-literal=COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID} \
  --from-literal=COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID} \
  --from-literal=AUTH_BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
  --from-literal=S3_ENDPOINT=http://floci-local:4566 \
  --from-literal=S3_PUBLIC_ENDPOINT=https://localhost:4567 \
  --from-literal=S3_REGION=us-east-1 \
  --from-literal=S3_BUCKET=relay-user-profile-images \
  --from-literal=S3_FORCE_PATH_STYLE=true \
  --dry-run=client -o yaml | kubectl apply -f -

render() {
  sed \
    -e 's|IMAGE_HOST|relay-host:latest|g' \
    -e 's|IMAGE_SUPPLIER_FRONTEND|relay-supplier-frontend:latest|g' \
    -e 's|IMAGE_USER_FRONTEND|relay-user-frontend:latest|g' \
    -e 's|IMAGE_ERRAND_FRONTEND|relay-errand-frontend:latest|g' \
    -e 's|IMAGE_CREDIT_FRONTEND|relay-credit-frontend:latest|g' \
    -e 's|IMAGE_SUPPLIER_API|relay-supplier-api:latest|g' \
    -e 's|IMAGE_USER_AUTH_API|relay-user-auth-api:latest|g' \
    -e 's|IMAGE_USER_API|relay-user-api:latest|g' \
    -e 's|IMAGE_ERRAND_API|relay-errand-api:latest|g' \
    -e 's|IMAGE_CREDIT_API|relay-credit-api:latest|g' \
    -e 's|IMAGE_USER_EVENT_PUBLISHER|relay-user-event-publisher:latest|g' \
    -e 's|IMAGE_ERRAND_EVENT_PUBLISHER|relay-errand-event-publisher:latest|g' "$1" |
    sed -E '/^[[:space:]]+image: relay-.*:latest$/ { p; s/^([ ]*)image:.*/\1imagePullPolicy: IfNotPresent/; }'
}

kubectl -n relay delete job supplier-schema user-migrate errand-migrate credit-migrate --ignore-not-found
render k8s/base/migrations.yaml | sed '/DB_SSL_CA_PATH/d' | kubectl apply -f -
kubectl -n relay wait --for=condition=complete job/supplier-schema job/user-migrate job/errand-migrate job/credit-migrate --timeout=10m
render k8s/base/workloads.yaml | sed '/DB_SSL_CA_PATH/d' | kubectl apply -f -
kubectl -n relay rollout restart deployment/user-api deployment/errand-api deployment/credit-api deployment/supplier-api deployment/user-event-publisher deployment/errand-event-publisher
kubectl apply -f k8s/floci/ingress.yaml
kubectl -n relay get deployment -o name | while read -r deployment; do kubectl -n relay rollout status "$deployment" --timeout=10m; done

# The local ALB terminates TLS and forwards to Traefik's NodePort on the
# EKS node, which shares a Docker network with Floci.
node_ip="$(docker inspect "$node" --format '{{with index .NetworkSettings.Networks "relay-eks_default"}}{{.IPAddress}}{{end}}')"
[[ -n "$node_ip" ]]
for i in $(seq 1 60); do
  docker exec relay-floci-eks curl -fsS "http://$node_ip:30080/healthz" >/dev/null 2>&1 && break
  sleep 2
done
docker exec relay-floci-eks curl -fsS "http://$node_ip:30080/healthz" >/dev/null
floci_aws() {
  docker exec -e AWS_ENDPOINT_URL=http://127.0.0.1:4566 -e AWS_REGION=us-east-1 \
    -e AWS_DEFAULT_REGION=us-east-1 -e AWS_ACCESS_KEY_ID=test \
    -e AWS_SECRET_ACCESS_KEY=test relay-floci-eks aws "$@"
}
stack=relay-local-rds
subnet_a="$(floci_aws cloudformation describe-stack-resource --stack-name "$stack" --logical-resource-id SubnetA --query StackResourceDetail.PhysicalResourceId --output text)"
subnet_b="$(floci_aws cloudformation describe-stack-resource --stack-name "$stack" --logical-resource-id SubnetB --query StackResourceDetail.PhysicalResourceId --output text)"
vpc_id="$(floci_aws cloudformation describe-stack-resource --stack-name "$stack" --logical-resource-id Vpc --query StackResourceDetail.PhysicalResourceId --output text)"
certificate_arn="$(floci_aws acm list-certificates --query "CertificateSummaryList[?DomainName=='localhost'].CertificateArn | [0]" --output text)"
if [[ -z "$certificate_arn" || "$certificate_arn" == None ]]; then
  certificate_arn="$(floci_aws acm request-certificate --domain-name localhost --validation-method DNS --query CertificateArn --output text)"
fi
load_balancer_arn="$(floci_aws elbv2 describe-load-balancers --names relay-local-https --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || true)"
if [[ -z "$load_balancer_arn" || "$load_balancer_arn" == None ]]; then
  load_balancer_arn="$(floci_aws elbv2 create-load-balancer --name relay-local-https --type application --scheme internet-facing --subnets "$subnet_a" "$subnet_b" --query 'LoadBalancers[0].LoadBalancerArn' --output text)"
fi
floci_aws elbv2 modify-load-balancer-attributes --load-balancer-arn "$load_balancer_arn" --attributes Key=routing.http.preserve_host_header.enabled,Value=true >/dev/null
target_group_arn="$(floci_aws elbv2 describe-target-groups --names relay-local-traefik --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)"
if [[ -z "$target_group_arn" || "$target_group_arn" == None ]]; then
  target_group_arn="$(floci_aws elbv2 create-target-group --name relay-local-traefik --protocol HTTP --port 30080 --target-type ip --vpc-id "$vpc_id" --health-check-path /healthz --query 'TargetGroups[0].TargetGroupArn' --output text)"
fi
# Remove a target left by the earlier host port-forward setup, if present.
gateway_ip="$(docker inspect relay-floci-eks --format '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}')"
floci_aws elbv2 deregister-targets --target-group-arn "$target_group_arn" --targets "Id=$gateway_ip,Port=19090" >/dev/null 2>&1 || true
floci_aws elbv2 register-targets --target-group-arn "$target_group_arn" --targets "Id=$node_ip,Port=30080" >/dev/null
https_listener="$(floci_aws elbv2 describe-listeners --load-balancer-arn "$load_balancer_arn" --query 'Listeners[?Port==`9090`].ListenerArn | [0]' --output text)"
if [[ -z "$https_listener" || "$https_listener" == None ]]; then
  floci_aws elbv2 create-listener --load-balancer-arn "$load_balancer_arn" --protocol HTTPS --port 9090 --certificates "CertificateArn=$certificate_arn" --default-actions "Type=forward,TargetGroupArn=$target_group_arn" >/dev/null
fi
curl -fsS http://localhost:4567/_floci/ca.pem > floci/eks/.floci-ca.pem
for i in $(seq 1 20); do curl --cacert floci/eks/.floci-ca.pem -fsS https://localhost:9090/healthz >/dev/null && break; sleep 2; done
curl --cacert floci/eks/.floci-ca.pem -fsS https://localhost:9090/healthz
printf 'Local EKS application: https://localhost:9090\n'
printf 'Trust floci/eks/.floci-ca.pem in your browser to use the local certificate.\n'
