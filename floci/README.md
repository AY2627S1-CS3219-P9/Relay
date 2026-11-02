# Local Floci environments

The existing Docker Compose application stays at http://localhost:8080 and uses
`floci/docker/Dockerfile`. Its init hook deploys `infra/relay-auth.yaml` and
`infra/relay-storage.yaml` with the AWS CLI against Floci on port 4566.

The separate EKS-mode instance uses `floci/eks/Dockerfile` and publishes Floci
on http://localhost:4567. It deploys the same Cognito and S3 CloudFormation
templates plus `infra/relay-floci-eks.yaml`, which creates a real local k3s
cluster through Floci's EKS API. The AWS `infra/relay-eks.yaml` remains the
production EKS Auto Mode template; its ALB, IAM, and RDS resources are not
needed for the local k3s cluster.

Start Docker Compose with `docker compose up -d --build`. Start the local EKS
application with `floci/eks/up.sh` from WSL. The script builds or reuses the
Compose images, imports them into k3s, deploys the app and local PostgreSQL and
Kafka workloads, runs migrations, and forwards the local ingress to
http://localhost:9090. It writes its kubeconfig to `floci/eks/.kubeconfig`.

Local PostgreSQL and Kafka use `emptyDir` and lose data when their pods are
replaced. This is a functional Kubernetes test, not a persistence or RDS/MSK
test. The Floci EKS instance uses local-only test credentials and HTTP; AWS
production uses IAM roles and should terminate HTTPS at the load balancer.

Inspect the local cluster with
`kubectl --kubeconfig floci/eks/.kubeconfig -n relay get pods`.
