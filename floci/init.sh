#!/bin/sh
set -eu

# 1a. Create user pool
# TODO: Add AWS pre sign-up lambda to check if emails are NUS emails
pool_id=$(aws cognito-idp create-user-pool \
  --pool-name "$COGNITO_USER_POOL_NAME" \
  --username-attributes email \
  --auto-verified-attributes email \
  --username-configuration CaseSensitive=false \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":true}}' \
  --schema Name=email,AttributeDataType=String,Required=true,Mutable=true \
  --user-pool-tags "floci:override-id=$COGNITO_USER_POOL_ID,floci:override-cognito-client-id=use-name" \
  --query UserPool.Id --output text)
test "$pool_id" = "$COGNITO_USER_POOL_ID"

# 1b. Create user pool client
client_id=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --client-name "$COGNITO_CLIENT_ID" \
  --no-generate-secret \
  --enable-token-revocation \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query UserPoolClient.ClientId --output text)
test "$client_id" = "$COGNITO_CLIENT_ID"

# 1c. Create admin group in user pool
aws cognito-idp create-group \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --group-name "$COGNITO_ADMIN_GROUP_NAME" \
  --description "Admin user group"

# 1d. Add initial admin to user pool
# TODO for AWS:
# - CloudFormation template should include custom lambda resource to add admin
# - Admin email should be a real email
# - AWS should send a temporary password to that email, and force password creation
# - Add lambda triggers for deleteUsers or deleteUsersFromGroup to check for 0-admin states
aws cognito-idp admin-create-user \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --user-attributes Name=email,Value="$FLOCI_INITIAL_ADMIN_EMAIL" Name=email_verified,Value=true \
  --message-action SUPPRESS && \
aws cognito-idp admin-set-user-password \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --password "$FLOCI_INITIAL_ADMIN_PASSWORD" \
  --permanent && \
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --username "$FLOCI_INITIAL_ADMIN_EMAIL" \
  --group-name "$COGNITO_ADMIN_GROUP_NAME"

# 2. Create s3 bucket for user profile pictures
aws s3api create-bucket --bucket "$S3_USER_IMAGE_BUCKET"
aws s3api put-public-access-block \
  --bucket "$S3_USER_IMAGE_BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo "S3 Bucket initialized with name: $S3_USER_IMAGE_BUCKET"

# Marks container to be ready
touch /app/data/ready
