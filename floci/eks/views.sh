#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
action="${1:-}"
view="${2:-}"
if [[ "$action" != start && "$action" != stop ]] || [[ ! "$view" =~ ^(kafka|user|errand|credit|all)$ ]]; then
  echo "Usage: $0 start|stop kafka|user|errand|credit|all" >&2
  exit 2
fi
[[ -s floci/eks/.kubeconfig ]] || { echo "Run npm run up:eks first." >&2; exit 2; }
export KUBECONFIG="$PWD/floci/eks/.kubeconfig"
if [[ "$view" == all ]]; then views=(kafka user errand credit); else views=("$view"); fi
for item in "${views[@]}"; do
  case "$item" in
    kafka) service=relay-kafka-ui; local_port=9081; service_port=8080 ;;
    user) service=relay-user-prisma-studio; local_port=6555; service_port=5555 ;;
    errand) service=relay-errand-prisma-studio; local_port=6556; service_port=5555 ;;
    credit) service=relay-credit-prisma-studio; local_port=6557; service_port=5555 ;;
  esac
  pid_file="floci/eks/.view-$item.pid"
  if [[ -s "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    kill "$(cat "$pid_file")"
  fi
  rm -f "$pid_file"
  if [[ "$action" == stop ]]; then
    kubectl delete -f "k8s/floci/views/$item.yaml" --ignore-not-found
    continue
  fi
  kubectl apply -f "k8s/floci/views/$item.yaml"
  kubectl -n relay rollout status "deployment/$service" --timeout=5m
  nohup kubectl -n relay port-forward --address 127.0.0.1 "service/$service" "$local_port:$service_port" >"floci/eks/.view-$item.log" 2>&1 &
  echo $! > "$pid_file"
  for attempt in $(seq 1 30); do
    curl --max-time 2 -fsS "http://127.0.0.1:$local_port/" -o /dev/null 2>/dev/null && break
    sleep 2
  done
  curl --max-time 5 -fsS "http://127.0.0.1:$local_port/" -o /dev/null
  echo "$item view: http://localhost:$local_port"
done
