#!/bin/sh
set -eu

export AWS_ENDPOINT_URL=http://127.0.0.1:4566
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_REGION="$AWS_DEFAULT_REGION"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_PAGER=''

aws cloudformation deploy --stack-name relay-local-auth \
  --template-file /opt/relay/infra/relay-auth.yaml \
  --parameter-overrides \
    "UserPoolName=${COGNITO_USER_POOL_NAME:-test}" \
    "ClientName=${COGNITO_CLIENT_ID:-test}" \
    "AdminGroupName=${COGNITO_ADMIN_GROUP_NAME:-AdminGroup}" \
    "SuperAdminGroupName=${COGNITO_SUPERADMIN_GROUP_NAME:-SuperAdminGroup}" \
    "FlociPoolId=${COGNITO_USER_POOL_ID:-us-east-1_test}" \
    "FlociClientId=${COGNITO_CLIENT_ID:-test}"

pool_id="$(aws cloudformation describe-stacks --stack-name relay-local-auth --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)"
client_id="$(aws cloudformation describe-stacks --stack-name relay-local-auth --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)"
test "$pool_id" = "${COGNITO_USER_POOL_ID:-us-east-1_test}"
test "$client_id" = "${COGNITO_CLIENT_ID:-test}"

aws cloudformation deploy --stack-name relay-local-storage \
  --template-file /opt/relay/infra/relay-storage.yaml \
  --parameter-overrides "BucketName=${S3_USER_IMAGE_BUCKET:-relay-user-profile-images}"

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

if [ "${FLOCI_LOCAL_EKS:-false}" = true ]; then
  aws cloudformation deploy --stack-name relay-local-eks \
    --template-file /opt/relay/infra/relay-floci-eks.yaml \
    --capabilities CAPABILITY_IAM
fi

touch /app/data/ready
