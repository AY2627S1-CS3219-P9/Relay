#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

COGNITO_USER_POOL_ID= COGNITO_CLIENT_ID= COGNITO_ISSUER= COGNITO_JWKS_URI= USER_DATABASE_URL=bootstrap ERRAND_DATABASE_URL=bootstrap CREDIT_DATABASE_URL=bootstrap SUPPLIER_DATABASE_URL=bootstrap SUPPLIER_DATABASE_PORT=7004 SUPPLIER_DATABASE_PASSWORD=bootstrap docker compose --env-file .env.development up -d --build floci
for i in $(seq 1 120); do
  [[ "$(docker inspect relay-floci-1 --format '{{.State.Health.Status}}' 2>/dev/null || true)" == healthy ]] && docker exec relay-floci-1 test -s /app/data/relay-auth.env && docker exec relay-floci-1 test -s /app/data/relay-rds.env && break
  sleep 3
done
[[ "$(docker inspect relay-floci-1 --format '{{.State.Health.Status}}')" == healthy ]]
docker exec relay-floci-1 test -s /app/data/relay-auth.env
docker exec relay-floci-1 test -s /app/data/relay-rds.env

auth_output="$(docker exec relay-floci-1 cat /app/data/relay-auth.env)"
pool_id="$(printf '%s\n' "$auth_output" | sed -n 's/^COGNITO_USER_POOL_ID=//p')"
client_id="$(printf '%s\n' "$auth_output" | sed -n 's/^COGNITO_CLIENT_ID=//p')"
[[ -n "$pool_id" && -n "$client_id" ]]
rds_output="$(docker exec relay-floci-1 cat /app/data/relay-rds.env)"
rds_value() { printf '%s\n' "$rds_output" | sed -n "s/^$1=//p"; }
user_port="$(rds_value USER_DATABASE_PORT)"
user_password="$(rds_value USER_DATABASE_PASSWORD)"
errand_port="$(rds_value ERRAND_DATABASE_PORT)"
errand_password="$(rds_value ERRAND_DATABASE_PASSWORD)"
credit_port="$(rds_value CREDIT_DATABASE_PORT)"
credit_password="$(rds_value CREDIT_DATABASE_PASSWORD)"
supplier_port="$(rds_value SUPPLIER_DATABASE_PORT)"
supplier_password="$(rds_value SUPPLIER_DATABASE_PASSWORD)"
for port in "$user_port" "$errand_port" "$credit_port" "$supplier_port"; do
  [[ "$port" =~ ^[0-9]+$ ]]
done
for password in "$user_password" "$errand_password" "$credit_password" "$supplier_password"; do
  [[ -n "$password" ]]
done
printf 'COGNITO_USER_POOL_ID=%s\nCOGNITO_CLIENT_ID=%s\nCOGNITO_ISSUER=http://localhost:4566/%s\nCOGNITO_JWKS_URI=http://floci:4566/%s/.well-known/jwks.json\nUSER_DATABASE_URL=postgresql://relay:%s@floci:%s/relay?schema=public\nERRAND_DATABASE_URL=postgresql://relay:%s@floci:%s/relayerrand?schema=public\nCREDIT_DATABASE_URL=postgresql://relay:%s@floci:%s/relay?schema=public\nSUPPLIER_DATABASE_URL=postgresql://relay:%s@floci:%s/relay\nSUPPLIER_DATABASE_PORT=%s\nSUPPLIER_DATABASE_PASSWORD=%s\nUSER_DATABASE_URL_HOST=postgresql://relay:%s@localhost:%s/relay?schema=public\nERRAND_DATABASE_URL_HOST=postgresql://relay:%s@localhost:%s/relayerrand?schema=public\nCREDIT_DATABASE_URL_HOST=postgresql://relay:%s@localhost:%s/relay?schema=public\nSUPPLIER_DATABASE_URL_HOST=postgresql://relay:%s@localhost:%s/relay\n' \
  "$pool_id" "$client_id" "$pool_id" "$pool_id" \
  "$user_password" "$user_port" "$errand_password" "$errand_port" \
  "$credit_password" "$credit_port" "$supplier_password" "$supplier_port" \
  "$supplier_port" "$supplier_password" \
  "$user_password" "$user_port" "$errand_password" "$errand_port" \
  "$credit_password" "$credit_port" "$supplier_password" "$supplier_port" >floci/docker/.generated.env

compose_env=(--env-file .env.development)
if [[ -f .env ]]; then
  compose_env=(--env-file .env "${compose_env[@]}")
fi
compose_env+=(--env-file floci/docker/.generated.env)
docker compose "${compose_env[@]}" up -d "$@"
if (( $# == 0 )); then
  docker compose "${compose_env[@]}" up -d --no-deps --force-recreate host
fi
