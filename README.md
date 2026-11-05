# CS3219 — Software Design and Architecture (AY2627 Sem 1)

## Relay

**Relay** is a peer-to-peer campus errand platform where
students can request items to be collected from stores or facilities on
campus, and other students can fulfil (and deliver) those requests. The
platform runs on a closed credit economy — credits cannot be bought,
withdrawn, or exchanged for money, and only circulate within the platform.

---

## Team Members

| Name      | Role           |
| --------- | -------------- |
| Ryan      | Your ownership |
| Javier    | Your ownership |
| Rong Kang | Your ownership |
| Zhouxuan  | Your ownership |

---

## Repository Structure

This repository follows a **one-service-per-folder** structure: each
microservice (`user-service/`, `supplier-service/`, `errand-service/`,
`credit-service/`) lives in its own top-level folder.

```text
.
├── user-service/
├── supplier-service/
├── errand-service/
├── credit-service/
├── <n2h-service>/
└── README.md
```

- Any **nice-to-have (N2H)** feature that warrants its own service should
  be added as an **additional folder** at the same level, following the
  same per-service structure.
- Files for agentic coding tools (e.g. agent configs, prompts, skills)
  may be added as needed, but must still **respect the
  one-service-per-folder skeleton** for core implementation.

---

## AWS deployment

From the repository root, run `AWS_PROFILE=user AWS_REGION=ap-southeast-1 bash deploy/deploy.sh relay`. The script guides SSO login, provisions the stacks, deploys the application, and prints its HTTPS URL. See [the deployment guide](deploy/README.md) for prerequisites, redeployment, pause, and teardown.

---

## Local development

Run these commands from the repository root using Linux Node/npm in WSL. If
`npm` resolves to the Windows installation, first run `source ~/.nvm/nvm.sh`.
Create `.env.development` with the local Floci settings before starting an
environment.

| Target | Start | Application | Floci API | Stop |
| --- | --- | --- | --- | --- |
| Docker Compose | `npm run up:compose` | http://localhost:8080 | http://localhost:4566 | `npm run down:compose` |
| Local Floci EKS | `npm run up:eks` | CloudFront URL printed by startup (`https://<id>.cloudfront.localhost.floci.io`) | https://localhost:4567 | `npm run down:eks` |
| Local source processes | `npm run dev` | http://localhost:8080 | http://localhost:4566 | Ctrl+C, then `npm run down:compose` |

The startup commands provision local Cognito, S3, and four RDS instances.
Local EKS also pushes application images to Floci ECR and deploys the shared
CloudFront template in front of an internal HTTP ALB. Compose
runs the application as Docker services; EKS runs it as Kubernetes workloads in
Floci's local k3s cluster. The two full deployments can run together, but require
substantial Docker memory. `docker compose up` alone cannot discover the
Floci-generated database and Cognito settings; use `npm run up:compose`.
`npm run dev` starts its Compose dependencies, then runs frontend and backend
processes from source. It shares ports with the full Compose application.

The host serves all four microfrontends on the application origin through
`/remotes/supplier/`, `/remotes/user/`, `/remotes/errand/`, and
`/remotes/credit/`. For the local EKS cluster, inspect pods with
`kubectl --kubeconfig floci/eks/.kubeconfig -n relay get pods`.

### Local HTTPS certificate

`npm run up:eks` writes the current local CA certificate to
`floci/eks/.floci-ca.pem`. Import that file into your operating system or
browser's **Trusted Root Certification Authorities** store, then restart the
browser. This trusts requests to the Floci CloudFront hostname printed by
`npm run up:eks` and to `https://localhost:4567`; accepting a one-page browser exception does not
cover all application requests. The first run needs this import once. The
`relay-floci-eks-ca` Docker volume preserves **only Floci's CA and server
certificate** across `npm run down:eks` and later `npm run up:eks`; application,
Kubernetes, and database state is still removed. Keep the CA volume and its
private key local. To intentionally rotate the CA, run
`docker volume rm relay-floci-eks-ca` after `npm run down:eks`, then run
`npm run up:eks` and trust the new `.floci-ca.pem`.

### Optional local views

Start a view only after its target environment is running. Replace `user` with
`kafka`, `errand`, or `credit`; use `all` to start every view.

| View | Compose URL | Local EKS URL |
| --- | --- | --- |
| Kafka UI | http://localhost:8081 | http://localhost:9081 |
| User Prisma Studio | http://localhost:5555 | http://localhost:6555 |
| Errand Prisma Studio | http://localhost:5556 | http://localhost:6556 |
| Credit Prisma Studio | http://localhost:5557 | http://localhost:6557 |

```bash
npm run views:compose -- user
npm run views:compose:stop -- user
npm run views:eks -- user
npm run views:eks:stop -- user
```

Both teardown commands stop their optional views and remove Floci-managed RDS
containers and database volumes. EKS teardown also removes the local k3s node
and generated kubeconfig. The CA volume is the sole retained local resource.
See [floci/README.md](floci/README.md) for infrastructure details.

---
## Local credit-allocation flow

Docker Compose provisions Floci MSK emulation, backed by a Redpanda sidecar.
Start Kafbat UI on demand with `npm run views:compose -- kafka` at
http://localhost:8081. In the development override, User API is
available to Postman at http://localhost:3001. Creating a verified user's
profile publishes `KAFKA_TOPIC_USER_EVENTS`; Credit Service consumes that event and
allocates 100 credits once. Floci's verification mailbox is at
http://localhost:4566/_aws/ses.

Run the signup, SES code lookup, verification, and profile creation sequence
using the Postman collection in `tests/integration/new-user-allocation.postman_collection.json`
with Newman: `npx newman run tests/integration/new-user-allocation.postman_collection.json`.
Start credit Prisma Studio with `npm run views:compose -- credit` and open
http://localhost:5557 to inspect the new balance.


AWS uses two-broker MSK Provisioned with TLS and SCRAM for user and errand events. The local Compose and
Floci EKS environments use Floci's MSK emulation (a Redpanda sidecar).
See [deployment event broker differences](deploy/README.md#event-broker-targets).
