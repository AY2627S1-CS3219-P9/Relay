#!/usr/bin/env bash
set -euo pipefail
if [[ "${2:-}" != --confirm-delete-all-data ]]; then
  echo "Usage: AWS_REGION=... $0 <stack-name> --confirm-delete-all-data" >&2
  exit 2
fi
source "$(dirname "$0")/aws-lifecycle-lib.sh" "${1:-relay}"
# pause_compute deletes the EKS stack and its MSK cluster immediately. Capture the retained S3 bucket before deleting its stack.
pause_compute
read_pause_state
bucket="${S3_BUCKET:-}"
delete_stack "$auth_stack"
delete_stack "$storage_stack"
for name in USER ERRAND CREDIT SUPPLIER; do
  key="${name}_DATABASE_SNAPSHOT_ID"
  if aws_call rds describe-db-snapshots --db-snapshot-identifier "${!key}" >/dev/null 2>&1; then
    aws_call rds delete-db-snapshot --db-snapshot-identifier "${!key}" >/dev/null
    aws_call rds wait db-snapshot-deleted --db-snapshot-identifier "${!key}"
  fi
done
# Earlier pause cycles can leave previous, deliberately preserved snapshots.
for snapshot in ${SNAPSHOT_HISTORY:-}; do
  if aws_call rds describe-db-snapshots --db-snapshot-identifier "$snapshot" >/dev/null 2>&1; then
    aws_call rds delete-db-snapshot --db-snapshot-identifier "$snapshot" >/dev/null
    aws_call rds wait db-snapshot-deleted --db-snapshot-identifier "$snapshot"
  fi
done
if [[ -n "$bucket" && "$bucket" != None ]]; then
  aws s3 rb "s3://$bucket" --force
fi
rm -f -- "$state_file"
printf 'Relay stacks, MSK cluster and topics, recorded RDS snapshots, and the stack-owned S3 bucket were removed.\n'
