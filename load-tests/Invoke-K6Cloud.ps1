function Invoke-K6Cloud {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Script,

        [Parameter(Mandatory)]
        [string]$Summary,

        [string]$EnvFile = "load-tests/.env.generated"
    )

    $forwardedVariables = @(
        "BASE_URL", "LOAD_TEST_USER_EMAIL", "LOAD_TEST_USER_PASSWORD",
        "LOAD_TEST_REQUESTER_EMAIL", "LOAD_TEST_REQUESTER_PASSWORD",
        "LOAD_TEST_COURIER_EMAIL", "LOAD_TEST_COURIER_PASSWORD",
        "LOAD_TEST_COURIER_B_EMAIL", "LOAD_TEST_COURIER_B_PASSWORD",
        "LOAD_TEST_SUPPLIER_ID", "LOAD_TEST_SERVICE_TYPE",
        "LOAD_TEST_CREDIT_AMOUNT", "LOAD_TEST_ERRAND_ID", "LOAD_TEST_CLEANUP",
        "K6_CLOUD_PROJECT_ID",
        "NFR_AUTH_RATE_PER_MIN", "NFR_AUTH_DURATION", "NFR_AUTH_PREALLOCATED_VUS",
        "NFR_AUTH_MAX_VUS", "NFR_AUTH_P95_LIMIT_MS",
        "NFR_START_VUS", "NFR_TARGET_VUS", "NFR_RAMP_DURATION", "NFR_HOLD_DURATION",
        "NFR_RAMP_DOWN_DURATION", "NFR_THINK_TIME", "NFR_P95_LIMIT_MS",
        "NFR_MIXED_READ_TARGET_VUS", "NFR_MIXED_READ_HOLD_DURATION",
        "NFR_MIXED_WRITE_RATE_PER_MIN", "NFR_MIXED_WRITE_DURATION",
        "NFR_MIXED_THINK_TIME", "NFR_MIXED_P95_LIMIT_MS",
        "NFR_CREDIT_RATE_PER_SEC", "NFR_CREDIT_DURATION",
        "NFR_CREDIT_PREALLOCATED_VUS", "NFR_CREDIT_MAX_VUS", "NFR_CREDIT_P95_LIMIT_MS",
        "NFR_SUPPLIER_RATE_PER_SEC", "NFR_SUPPLIER_DURATION",
        "NFR_SUPPLIER_PREALLOCATED_VUS", "NFR_SUPPLIER_MAX_VUS",
        "NFR_SUPPLIER_P95_LIMIT_MS"
    )

    $shellDefaults = @{
        BASE_URL = "http://host.docker.internal:8080"
        NFR_AUTH_RATE_PER_MIN = "500"; NFR_AUTH_DURATION = "5m"
        NFR_AUTH_PREALLOCATED_VUS = "50"; NFR_AUTH_MAX_VUS = "100"
        NFR_AUTH_P95_LIMIT_MS = "500"
        NFR_START_VUS = "10"; NFR_TARGET_VUS = "100"; NFR_RAMP_DURATION = "1m"
        NFR_HOLD_DURATION = "5m"; NFR_RAMP_DOWN_DURATION = "1m"
        NFR_THINK_TIME = "1"; NFR_P95_LIMIT_MS = "200"
        NFR_MIXED_READ_TARGET_VUS = "100"; NFR_MIXED_READ_HOLD_DURATION = "2m"
        NFR_MIXED_WRITE_RATE_PER_MIN = "5"; NFR_MIXED_WRITE_DURATION = "2m"
        NFR_MIXED_THINK_TIME = "1"; NFR_MIXED_P95_LIMIT_MS = "200"
        NFR_CREDIT_RATE_PER_SEC = "10"; NFR_CREDIT_DURATION = "1m"
        NFR_CREDIT_PREALLOCATED_VUS = "20"; NFR_CREDIT_MAX_VUS = "100"
        NFR_CREDIT_P95_LIMIT_MS = "200"
        NFR_SUPPLIER_RATE_PER_SEC = "50"; NFR_SUPPLIER_DURATION = "5m"
        NFR_SUPPLIER_PREALLOCATED_VUS = "50"; NFR_SUPPLIER_MAX_VUS = "100"
        NFR_SUPPLIER_P95_LIMIT_MS = "200"
    }

    # Use shell defaults so blank optional values cannot become invalid k6 values.
    $k6EnvArguments = ($forwardedVariables | ForEach-Object {
        if ($shellDefaults.ContainsKey($_)) {
            '--env ' + $_ + '="${' + $_ + ':-' + $shellDefaults[$_] + '}"'
        } else {
            '--env ' + $_ + '="$' + $_ + '"'
        }
    }) -join " "

    $summaryContainerPath = "/scripts/results/$Summary"
    $k6Command = 'k6 cloud run --local-execution ' +
        $k6EnvArguments +
        ' --env K6_SUMMARY_PATH="' + $summaryContainerPath + '" /scripts/' + $Script

    $dockerOverrides = @()
    foreach ($name in $forwardedVariables) {
        if ($name -eq "K6_CLOUD_PROJECT_ID") { continue }
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($null -ne $value -and $value -ne "") {
            $dockerOverrides += "-e"
            $dockerOverrides += "$name=$value"
        }
    }

    New-Item -ItemType Directory -Force load-tests/results | Out-Null

    docker run --rm -i `
        --add-host host.docker.internal:host-gateway `
        --env-file $EnvFile `
        -e "K6_CLOUD_TOKEN=$env:K6_CLOUD_TOKEN" `
        -e "K6_CLOUD_STACK_ID=$env:K6_CLOUD_STACK_ID" `
        -e "K6_CLOUD_PROJECT_ID=$env:K6_CLOUD_PROJECT_ID" `
        -e "K6_SUMMARY_PATH=$summaryContainerPath" `
        @dockerOverrides `
        -v "${PWD}/load-tests:/scripts" `
        --entrypoint sh `
        grafana/k6 `
        -c "$k6Command"
}
