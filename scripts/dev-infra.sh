#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

bash floci/docker/up.sh floci kafka-init user-auth-api
init_status="$(docker wait relay-kafka-init-1)"
if [[ "$init_status" != 0 ]]; then
  docker logs relay-kafka-init-1 >&2
  echo "Kafka topic initialization failed with exit code $init_status" >&2
  exit 1
fi
compose_env=(--env-file .env.development)
if [[ -f .env ]]; then compose_env=(--env-file .env "${compose_env[@]}"); fi
compose_env+=(--env-file floci/docker/.generated.env)
docker compose "${compose_env[@]}" run --rm --build --no-deps supplier-schema
