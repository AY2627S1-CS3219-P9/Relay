# Local Floci environments

The Docker Compose application runs at http://localhost:8080. Start it with
`bash floci/docker/up.sh` from WSL. The launcher builds the Floci image, waits
for `infra/relay-auth.yaml` and `infra/relay-storage.yaml`, reads the generated
Cognito pool and app client IDs from the auth stack, and starts Compose with
`floci/docker/.generated.env`. This generated file is ignored by Git. Use the
launcher after recreating Floci; plain `docker compose up` does not discover new
Cognito IDs. `npm run dev` calls the launcher for its infrastructure services
and loads the same generated IDs for local backend processes.

The separate EKS-mode Floci instance runs at http://localhost:4567 and creates
a local k3s cluster through `infra/relay-floci-eks.yaml`. Run
`bash floci/eks/up.sh` from WSL to import images, deploy the app, apply local
PostgreSQL and Kafka manifests, run migrations, and forward the ingress to
http://localhost:9090. The script reads generated Cognito IDs from its own auth
stack and writes its kubeconfig to `floci/eks/.kubeconfig`.

`infra/relay-auth.yaml` and `infra/relay-storage.yaml` are the same templates
used for AWS. The EKS template remains separate. A disposable deployment of the
unchanged `infra/relay-eks.yaml` reached `CREATE_COMPLETE` in Floci, but it did
not provide a working equivalent of the AWS environment:

- Both `AWS::EKS::PodIdentityAssociation` resources were reported as stubbed.
  `aws eks create-pod-identity-association` can create them afterward, but the
  current HTTP Floci container cannot inject credentials into pods. Floci
  requires the Pod Identity add-on and an HTTPS admission webhook with a
  certificate hostname reachable from the k3s API server.
- The EKS cluster response omitted `computeConfig` and `storageConfig` even
  though the shared template enabled EKS Auto Mode. Floci starts k3s instead.
- Four RDS containers were created, but they ran stock PostgreSQL 16. The
  user database parameter group listed no parameters, and `pg_cron` was not
  installed. Floci does not apply PostgreSQL parameter group values to its
  database containers. The user schema migration therefore cannot run against
  those RDS instances as it does against the local PostgreSQL image.

The disposable stack and its containers were deleted after the trial. The
local PostgreSQL and Kafka pods use `emptyDir` and lose data on pod replacement;
the AWS template provisions RDS instead. Keep the separate EKS template until
the database and Pod Identity paths work end to end, not just until a shared
CloudFormation stack reports `CREATE_COMPLETE`.

Inspect the local cluster with
`kubectl --kubeconfig floci/eks/.kubeconfig -n relay get pods`.