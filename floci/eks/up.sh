#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

# Compose remains available at localhost:8080; this is a separate Floci instance.
docker compose -f compose.eks.yaml --project-name relay-eks up -d --build
for i in $(seq 1 120); do
  [[ "$(docker inspect relay-floci-eks --format '{{.State.Health.Status}}' 2>/dev/null || true)" == healthy ]] && break
  sleep 3
done
[[ "$(docker inspect relay-floci-eks --format '{{.State.Health.Status}}')" == healthy ]]
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
  docker compose build host supplier-frontend user-frontend errand-frontend credit-frontend supplier-api user-api user-auth-api errand-api credit-api user-postgres
fi
images=(relay-host relay-supplier-frontend relay-user-frontend relay-errand-frontend relay-credit-frontend relay-supplier-api relay-user-api relay-user-auth-api relay-errand-api relay-credit-api relay-user-postgres)
for i in "${!images[@]}"; do images[$i]="${images[$i]}:latest"; done
if [[ "${SKIP_IMAGE_IMPORT:-0}" != 1 ]]; then
  docker save -o floci/eks/.images.tar "${images[@]}"
  docker cp floci/eks/.images.tar "$node:/tmp/relay-images.tar"
  docker exec "$node" ctr -n k8s.io images import /tmp/relay-images.tar
  docker exec "$node" rm -f /tmp/relay-images.tar
  rm -f floci/eks/.images.tar
fi

kubectl apply -f k8s/base/namespace.yaml -f k8s/base/configmap.yaml -f k8s/floci/postgres.yaml -f k8s/floci/traefik.yaml
floci_ip="$(docker inspect relay-floci-eks --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')"
sed "s/FLOCI_DOCKER_IP/$floci_ip/g" k8s/floci/floci-service.yaml | kubectl apply -f -
kubectl -n relay rollout status deployment/user-postgres deployment/errand-postgres deployment/credit-postgres deployment/supplier-postgres --timeout=5m
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

kubectl -n relay create configmap supplier-schema --from-file=schema.sql=supplier-service/backend/src/schema.sql --dry-run=client -o yaml | kubectl apply -f -
kubectl -n relay create secret generic relay-runtime \
  --from-literal=USER_DATABASE_URL=postgresql://relay:relay@user-postgres:5432/relay?schema=public \
  --from-literal=ERRAND_DATABASE_URL=postgresql://relay:relay@errand-postgres:5432/relayerrand?schema=public \
  --from-literal=CREDIT_DATABASE_URL=postgresql://relay:relay@credit-postgres:5432/relay?schema=public \
  --from-literal=SUPPLIER_DATABASE_URL=postgresql://relay:relay@supplier-postgres:5432/relay \
  --from-literal=SUPPLIER_DB_HOST=supplier-postgres \
  --from-literal=SUPPLIER_DB_PASSWORD=relay \
  --from-literal=KAFKA_BROKERS=kafka:9092 \
  --from-literal=AWS_REGION=us-east-1 \
  --from-literal=AWS_DEFAULT_REGION=us-east-1 \
  --from-literal=AWS_ACCESS_KEY_ID=test \
  --from-literal=AWS_SECRET_ACCESS_KEY=test \
  --from-literal=AWS_ENDPOINT_URL=http://floci-local:4566 \
  --from-literal=COGNITO_ISSUER=http://localhost:4567/us-east-1_test \
  --from-literal=COGNITO_JWKS_URI=http://floci-local:4566/us-east-1_test/.well-known/jwks.json \
  --from-literal=COGNITO_CLIENT_ID=test \
  --from-literal=COGNITO_USER_POOL_ID=us-east-1_test \
  --from-literal=AUTH_BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
  --from-literal=S3_ENDPOINT=http://floci-local:4566 \
  --from-literal=S3_PUBLIC_ENDPOINT=http://localhost:4567 \
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
    -e 's|IMAGE_CREDIT_API|relay-credit-api:latest|g' "$1" |
    sed -E '/^[[:space:]]+image: relay-.*:latest$/ { p; s/^([ ]*)image:.*/\1imagePullPolicy: IfNotPresent/; }'
}

render k8s/base/migrations.yaml | kubectl apply -f -
kubectl -n relay wait --for=condition=complete job/supplier-schema job/user-migrate job/errand-migrate job/credit-migrate --timeout=10m
render k8s/base/workloads.yaml | sed '/DB_SSL_CA_PATH/d' | kubectl apply -f -
kubectl apply -f k8s/floci/ingress.yaml
kubectl -n relay get deployment -o name | while read -r deployment; do kubectl -n relay rollout status "$deployment" --timeout=10m; done

if [[ -f floci/eks/.port-forward.pid ]] && kill -0 "$(cat floci/eks/.port-forward.pid)" 2>/dev/null; then
  kill "$(cat floci/eks/.port-forward.pid)"
fi
nohup kubectl -n relay port-forward --address 127.0.0.1 service/relay-traefik 9090:80 >floci/eks/.port-forward.log 2>&1 &
echo $! > floci/eks/.port-forward.pid
for i in $(seq 1 20); do curl -fsS http://localhost:9090/healthz >/dev/null && break; sleep 2; done
curl -fsS http://localhost:9090/healthz
printf 'Local EKS application: http://localhost:9090\n'
