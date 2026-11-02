#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

COGNITO_USER_POOL_ID= COGNITO_CLIENT_ID= COGNITO_ISSUER= COGNITO_JWKS_URI= docker compose --env-file .env.development up -d --build floci
for i in $(seq 1 120); do
  [[ "$(docker inspect relay-floci-1 --format '{{.State.Health.Status}}' 2>/dev/null || true)" == healthy ]] && docker exec relay-floci-1 test -s /app/data/relay-auth.env && break
  sleep 3
done
[[ "$(docker inspect relay-floci-1 --format '{{.State.Health.Status}}')" == healthy ]]
docker exec relay-floci-1 test -s /app/data/relay-auth.env

auth_output="$(docker exec relay-floci-1 cat /app/data/relay-auth.env)"
pool_id="$(printf '%s\n' "$auth_output" | sed -n 's/^COGNITO_USER_POOL_ID=//p')"
client_id="$(printf '%s\n' "$auth_output" | sed -n 's/^COGNITO_CLIENT_ID=//p')"
[[ -n "$pool_id" && -n "$client_id" ]]
printf 'COGNITO_USER_POOL_ID=%s\nCOGNITO_CLIENT_ID=%s\nCOGNITO_ISSUER=http://localhost:4566/%s\nCOGNITO_JWKS_URI=http://floci:4566/%s/.well-known/jwks.json\n' \
  "$pool_id" "$client_id" "$pool_id" "$pool_id" >floci/docker/.generated.env

compose_env=(--env-file .env.development)
if [[ -f .env ]]; then
  compose_env=(--env-file .env "${compose_env[@]}")
fi
compose_env+=(--env-file floci/docker/.generated.env)
docker compose "${compose_env[@]}" up -d "$@"
if (( $# == 0 )); then
  docker compose "${compose_env[@]}" up -d --no-deps --force-recreate host
fi
