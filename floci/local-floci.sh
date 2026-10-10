#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
image="${FLOCI_IMAGE:-floci-sa}"
env_file="${FLOCI_ENV_FILE:-${repo_root}/.env.development}"
container_name="${FLOCI_CONTAINER_NAME:-relay-floci}"

if [[ ! -f "${env_file}" ]]; then
  echo "Environment file not found: ${env_file}" >&2
  echo "Set FLOCI_ENV_FILE or create .env.development first." >&2
  exit 1
fi

if ! docker image inspect "${image}" >/dev/null 2>&1; then
  echo "Docker image not found: ${image}" >&2
  echo "Build it first, for example: docker build -t ${image} ${repo_root}/floci" >&2
  exit 1
fi

docker_socket="${DOCKER_SOCKET:-}"
if [[ -z "${docker_socket}" && -S /var/run/docker.sock ]]; then
  docker_socket=/var/run/docker.sock
fi

if [[ -z "${docker_socket}" ]]; then
  docker_host="$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
  if [[ "${docker_host}" == unix:///* ]]; then
    docker_socket="${docker_host#unix://}"
  fi
fi

if [[ -z "${docker_socket}" || ! -S "${docker_socket}" ]]; then
  echo "Docker socket could not be found." >&2
  echo "Start Docker Desktop, or set DOCKER_SOCKET to its Unix socket path." >&2
  exit 1
fi

if docker container inspect "${container_name}" >/dev/null 2>&1; then
  echo "A container named ${container_name} already exists." >&2
  echo "Remove it with: docker rm -f ${container_name}" >&2
  exit 1
fi

exec docker run --rm \
  --name "${container_name}" \
  --user root \
  --env-file "${env_file}" \
  --publish "${FLOCI_PORT:-4566}:4566" \
  --volume "${docker_socket}:/var/run/docker.sock" \
  "${image}"
