#!/bin/sh
set -eu

export AWS_ENDPOINT_URL=http://127.0.0.1:4566
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_REGION="$AWS_DEFAULT_REGION"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_PAGER=''

rm -f /app/data/ready /app/data/relay-auth.env /app/data/relay-rds.env

aws cloudformation deploy --stack-name relay-local-auth \
  --template-file /opt/relay/infra/relay-auth.yaml \
  --parameter-overrides \
    "UserPoolName=${COGNITO_USER_POOL_NAME:-test}" \
    "ClientName=${COGNITO_CLIENT_NAME:-relay-client}" \
    "AdminGroupName=${COGNITO_ADMIN_GROUP_NAME:-AdminGroup}" \
    "SuperAdminGroupName=${COGNITO_SUPERADMIN_GROUP_NAME:-SuperAdminGroup}"

pool_id="$(aws cloudformation describe-stacks --stack-name relay-local-auth --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)"
client_id="$(aws cloudformation describe-stacks --stack-name relay-local-auth --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)"
test -n "$pool_id"
test -n "$client_id"
printf 'COGNITO_USER_POOL_ID=%s\nCOGNITO_CLIENT_ID=%s\n' "$pool_id" "$client_id" >/app/data/relay-auth.env

aws cloudformation deploy --stack-name relay-local-storage \
  --template-file /opt/relay/infra/relay-storage.yaml \
  --parameter-overrides "BucketName=${S3_USER_IMAGE_BUCKET:-relay-user-profile-images}"

infrastructure_stack=relay-local-rds
aws cloudformation deploy --stack-name "$infrastructure_stack" \
  --template-file /opt/relay/infra/relay-floci-db.yaml

output() {
  aws cloudformation describe-stacks --stack-name "$infrastructure_stack" \
    --query "Stacks[0].Outputs[?OutputKey==\`$1\`].OutputValue" --output text
}

if [ "${FLOCI_LOCAL_EKS:-false}" = true ]; then
  aws cloudformation deploy --stack-name relay-local-eks \
    --template-file /opt/relay/infra/relay-floci-eks.yaml \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
      "VpcId=$(output VpcId)" \
      "SubnetAId=$(output SubnetAId)" \
      "SubnetBId=$(output SubnetBId)"
fi

# Floci's CloudFormation RDS provider currently ignores these DBInstance
# properties. Reconcile its RDS metadata through the supported RDS API.
database_security_group="$(aws cloudformation describe-stack-resource \
  --stack-name "$infrastructure_stack" --logical-resource-id DatabaseSecurityGroup \
  --query StackResourceDetail.PhysicalResourceId --output text)"
for database in UserDatabase ErrandDatabase CreditDatabase SupplierDatabase; do
  database_id="$(aws cloudformation describe-stack-resource \
    --stack-name "$infrastructure_stack" --logical-resource-id "$database" \
    --query StackResourceDetail.PhysicalResourceId --output text)"
  aws rds modify-db-instance --db-instance-identifier "$database_id" \
    --storage-type gp3 --backup-retention-period 7 \
    --vpc-security-group-ids "$database_security_group" --apply-immediately >/dev/null
  actual="$(aws rds describe-db-instances --db-instance-identifier "$database_id" \
    --query 'DBInstances[0].[StorageType,BackupRetentionPeriod,VpcSecurityGroups[0].VpcSecurityGroupId]' \
    --output text)"
  test "$actual" = "$(printf 'gp3\t7\t%s' "$database_security_group")"
done

password_for() {
  aws secretsmanager get-secret-value --secret-id "$(output "$1")" \
    --query SecretString --output text |
    python3 -c 'import json,sys; print(json.load(sys.stdin)["password"])'
}
printf 'USER_DATABASE_HOST=%s\nUSER_DATABASE_PORT=%s\nUSER_DATABASE_PASSWORD=%s\nERRAND_DATABASE_HOST=%s\nERRAND_DATABASE_PORT=%s\nERRAND_DATABASE_PASSWORD=%s\nCREDIT_DATABASE_HOST=%s\nCREDIT_DATABASE_PORT=%s\nCREDIT_DATABASE_PASSWORD=%s\nSUPPLIER_DATABASE_HOST=%s\nSUPPLIER_DATABASE_PORT=%s\nSUPPLIER_DATABASE_PASSWORD=%s\n' \
  "$(output UserDatabaseEndpoint)" "$(output UserDatabasePort)" "$(password_for UserDatabaseSecretArn)" \
  "$(output ErrandDatabaseEndpoint)" "$(output ErrandDatabasePort)" "$(password_for ErrandDatabaseSecretArn)" \
  "$(output CreditDatabaseEndpoint)" "$(output CreditDatabasePort)" "$(password_for CreditDatabaseSecretArn)" \
  "$(output SupplierDatabaseEndpoint)" "$(output SupplierDatabasePort)" "$(password_for SupplierDatabaseSecretArn)" >/app/data/relay-rds.env

aws cognito-idp admin-create-user \
  --user-pool-id "$pool_id" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --user-attributes "Name=email,Value=$FLOCI_INITIAL_ADMIN_EMAIL" Name=email_verified,Value=true \
  --message-action SUPPRESS
aws cognito-idp admin-set-user-password \
  --user-pool-id "$pool_id" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --password "$FLOCI_INITIAL_ADMIN_PASSWORD" \
  --permanent
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$pool_id" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --group-name "${COGNITO_SUPERADMIN_GROUP_NAME:-SuperAdminGroup}"

touch /app/data/ready
