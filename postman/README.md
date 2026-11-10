# Postman collections

Start the local Compose environment from the repository root with
`npm run up:compose` before running collections. This provisions Cognito, database,
S3, and Kafka settings through Floci. The mailbox used by OTP requests is at
http://localhost:4566/_aws/ses. See the [local guide](../floci/README.md).

Use a Postman client that supports the checked-in v3 YAML collection format.
The files are not Newman v2 JSON exports. These instructions target local
Compose; AWS does not expose Floci's OTP mailbox, and AWS load-test provisioning
is documented in the [load-test guide](../load-tests/README.md#aws-provisioning).

The v3 collections under `postman/collections` use the Compose host at `http://localhost:8080` by default. Run requests in order. Sign-in stores Cognito `relay_access`, `relay_id`, and `relay_refresh` values in collection variables. Protected requests send only the selected identity's access and ID cookies. The existing service and integration collections omit token refresh; the dedicated **User Auth API** collection tests it.

For the six service and integration collections, select **No environment** and no data file. For **User Auth API**, select the **Development** environment containing `target_env=development`. The collections include their own waits; use no Runner delay and default cookie handling. Reimport the latest files before running. If a manual demo pauses for more than 15 minutes, sign in again before continuing. Check the sent `Cookie` header in the Postman Console if a request is unexpectedly unauthorized; each protected request should have one access and one ID cookie for the same user.

All seven v3 collections are under `postman/collections`. Each registration flow generates fresh users on every run and reads its OTP by matching the recipient email in Floci SES. The Supplier Service API generates fresh supplier names on every run. Other collections' variables do not override collection variables; avoid adding environment variables with the same names. Run each collection from its first request so its initialization scripts clear old tokens and IDs.
The **User Auth API** collection covers registration, two sessions, refresh, token reuse, logout, password changes, and admin operations. With `target_env=development`, the token rotation and reuse checks assert Floci's observed behavior and print console warnings: Floci returns the same refresh token and accepts reuse after the grace period. Other environment values retain strict security assertions.
