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
microservice (`user-service/`, `supplier-service/`, `order-service/`,
`credit-service/`) lives in its own top-level folder.

```text
.
├── user-service/
├── supplier-service/
├── order-service/
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
`/remotes/order/`, and `/remotes/credit/`.

The remotes are available on host ports `5001`–`5004` for Docker's internal
Docker Compose service names. The application itself loads them through the host's
single public route on port `8080`.

| Service  | Local URL            | Remote entry                       |
| -------- | -------------------- | ---------------------------------- |
| Supplier | `/remotes/supplier/` | `/remotes/supplier/remoteEntry.js` |
| User     | `/remotes/user/`     | `/remotes/user/remoteEntry.js`     |
| Order    | `/remotes/order/`    | `/remotes/order/remoteEntry.js`    |
| Credit   | `/remotes/credit/`   | `/remotes/credit/remoteEntry.js`   |

Install all workspace dependencies once from the repository root:

```bash
npm install
```

For a non-Docker local federation session, the root workspace points to the
service-owned frontend directories:

```bash
npm run build --workspace=@relay/supplier-frontend
npm run build --workspace=@relay/user-frontend
npm run build --workspace=@relay/order-frontend
npm run build --workspace=@relay/credit-frontend
npm run dev --workspace=@relay/host
```

The host uses stable same-origin remote paths, so no per-machine remote URL
environment variables are required. The host deployment must rewrite client-side
paths such as `/suppliers` and `/orders` to its `index.html`.

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
