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

## Microfrontend development

`host` is the Relay host application. It renders the homepage
and loads one independently deployed React microfrontend for each service.
The remotes live inside their service folders and expose only `./App` through Module
Federation.

For a Dockerized local environment, run:

```bash
docker compose up --build
```

Open `http://localhost:8080`. The host container serves the host and routes
all remotes through one origin using `/remotes/supplier/`, `/remotes/user/`,
`/remotes/errand/`, and `/remotes/credit/`.

The remotes are available on host ports `5001`–`5004` for Docker's internal
Docker Compose service names. The application itself loads them through the host's
single public route on port `8080`.

| Service  | Local URL            | Remote entry                       |
| -------- | -------------------- | ---------------------------------- |
| Supplier | `/remotes/supplier/` | `/remotes/supplier/remoteEntry.js` |
| User     | `/remotes/user/`     | `/remotes/user/remoteEntry.js`     |
| Errand   | `/remotes/errand/`   | `/remotes/errand/remoteEntry.js`   |
| Credit   | `/remotes/credit/`   | `/remotes/credit/remoteEntry.js`   |

Install all workspace dependencies once from the repository root:

```bash
npm install
```

For a non-Docker local federation session, the root workspace points to the
service-owned frontend directories. The standard command starts the local
databases, prepares the Errand Prisma schema, and starts all frontends and
backends:

```bash
npm run dev
```

`npm run dev` starts `user-postgres`, `supplier-db`, and `errand-postgres`,
generates the Errand Prisma client, and applies the Errand schema with
`prisma db push` before starting the APIs. The User API generates its Prisma
client and applies its migrations through its `predev` script.

Local authentication also requires Floci. Ensure `.env.development` exists,
then start Floci in a separate terminal before using the application:

```bash
docker build -t floci-sa ./floci
./floci/local-floci.sh
```

The host uses stable same-origin remote paths, so no per-machine remote URL
environment variables are required. The host deployment must rewrite client-side
paths such as `/suppliers` and `/errands` to its `index.html`.

### Minimal Docker development

Developers can run only the stateful or infrastructure dependencies in Docker
and run the Relay services directly with npm. This avoids building the host and
frontend containers during normal development.

Install dependencies first:

```bash
npm install
```

If you want to start only the infrastructure manually, use:

```bash
docker compose up -d user-postgres supplier-db errand-postgres
```

Build the local Floci image once, then start it in a separate terminal:

```bash
docker build -t floci-sa ./floci
./floci/local-floci.sh
```

In another terminal, start the frontend and backend development processes:

```bash
npm run dev
```

The local development topology is:

| Component           | Address                 |
| ------------------- | ----------------------- |
| Host frontend       | `http://localhost:8080` |
| Supplier frontend   | `http://localhost:5001` |
| User frontend       | `http://localhost:5002` |
| Errand frontend     | `http://localhost:5003` |
| Credit frontend     | `http://localhost:5004` |
| Supplier API        | `http://localhost:3000` |
| User API            | `http://localhost:3001` |
| Errand API          | `http://localhost:3002` |
| Floci               | `http://localhost:4566` |
| User PostgreSQL     | `localhost:5432`        |
| Supplier PostgreSQL | `localhost:5433`        |
| Errand PostgreSQL   | `localhost:5434`        |
| Credit PostgreSQL   | `localhost:5435`        |

The local Vite host proxies `/api/user` to the User API, `/api/supplier` to the
Supplier API, and `/api/errands` to the Errand API. Open the application at
`http://localhost:8080`; the individual frontend ports are mainly useful for
debugging a remote in isolation.

Do not run the full `docker compose up` workflow at the same time as
`npm run dev`; both workflows use the same host ports. To stop the local
development dependencies, run:

```bash
docker compose stop user-postgres supplier-db errand-postgres
```

## Deployment preparation

The Docker Compose setup is also the local reference topology for a future
Kubernetes deployment. Frontends communicate through stable service names, and
each container exposes `/healthz` for orchestration health checks.

The following items are intentionally left for the Kubernetes deployment step:

- TODO: Create a `Deployment` and `Service` for `host` and each frontend.
- TODO: Add an `Ingress` or `LoadBalancer` for the public host entry point.
- TODO: Configure readiness/liveness probes using `/healthz`.
- TODO: Add CPU/memory requests and limits, replica counts, and autoscaling policy.
- TODO: Decide how frontend image versions and Module Federation remote entries
  are promoted together to avoid mixed releases.
- TODO: Add API Deployments and Services when backend implementations exist.
- TODO: Externalize databases, secrets, sessions, and other state from pods.

---

## Local credit-allocation flow

Docker Compose includes a single-node Kafka broker (host port `9092`) and
Kafbat UI at http://localhost:8081. In the development override, User API is
available to Postman at http://localhost:3001. Creating a verified user's
profile publishes `KAFKA_TOPIC_USER_EVENTS`; Credit Service consumes that event and
allocates 100 credits once. Floci's verification mailbox is at
http://localhost:4566/_aws/ses.

Run the signup, SES code lookup, verification, and profile creation sequence
using the Postman collection in `tests/integration/new-user-allocation.postman_collection.json`
with Newman: `npx newman run tests/integration/new-user-allocation.postman_collection.json`.
The new balance appears in credit Prisma Studio at http://localhost:5556
when Studio is running in the credit API container.
