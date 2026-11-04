#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/aws-lifecycle-lib.sh" "${1:-relay}"
pause_compute
printf 'Active Relay infrastructure removed. Cognito, S3, and RDS snapshots remain.\n'
printf 'Snapshot and S3 storage may still incur charges. Redeploy with deploy-eks.sh.\n'