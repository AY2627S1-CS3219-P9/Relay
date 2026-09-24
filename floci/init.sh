#!/bin/sh
set -eu

# 1. Create user pool and client
pool_id=$(aws cognito-idp create-user-pool \
  --pool-name "$COGNITO_USER_POOL_NAME" \
  --username-attributes email \
  --auto-verified-attributes email \
  --verification-message-template '{"DefaultEmailOption":"CONFIRM_WITH_CODE","EmailSubject":"Your verification code","EmailMessage":"Your verification code is {####}"}' \
  --username-configuration CaseSensitive=false \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":true}}' \
  --schema Name=email,AttributeDataType=String,Required=true,Mutable=true \
  --user-pool-tags "floci:override-id=$COGNITO_USER_POOL_ID,floci:override-cognito-client-id=use-name" \
  --query UserPool.Id --output text)
test "$pool_id" = "$COGNITO_USER_POOL_ID"

client_id=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --client-name "$COGNITO_CLIENT_ID" \
  --no-generate-secret \
  --enable-token-revocation \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query UserPoolClient.ClientId --output text)
test "$client_id" = "$COGNITO_CLIENT_ID"

echo "Cognito initialized with pool id: $pool_id and client_id: $client_id"

# TODO: 2. Create s3 bucket for user profile pictures

# Marks container to be ready
touch /app/data/cognito-ready
