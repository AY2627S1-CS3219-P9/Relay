#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/aws-lifecycle-lib.sh" "${1:-relay}"
pause_compute
printf 'Active Relay infrastructure, including MSK Provisioned, removed. Cognito, S3, and RDS snapshots remain.\n'
printf 'MSK topic data is deleted immediately; RDS snapshot and S3 storage may still incur charges. Redeploy with deploy-eks.sh.\n'
