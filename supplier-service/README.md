# Supplier Service

Microservice for managing campus suppliers.

## Architecture

| Component   | Description                                    |
| ----------- | ---------------------------------------------- |
| `frontend/` | Vite + React microfrontend (Module Federation) |
| `backend/`  | Express.js API server (PostgreSQL)             |

## Local Development

```bash
# Start all services (host + all microfrontends + backend APIs)
npm run dev

# Build all workspaces
npm run build

# Test
npm run test
```

### Supplier frontend data source

The Supplier frontend uses the backend by default. To work with seeded browser-only data,
copy `frontend/.env.example` to `frontend/.env.local` and set:

```env
VITE_SUPPLIER_API_MODE=mock
```

Set it back to `backend` (or remove the setting) to call `/api/supplier` through the Host
or frontend proxy. Restart the Supplier Vite server after changing an environment file.

## Docker Deployment

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down
```

### Services

| Service           | Port | Description                         |
| ----------------- | ---- | ----------------------------------- |
| host              | 8080 | Main app, proxies remotes and APIs  |
| supplier-frontend | 5001 | Supplier microfrontend              |
| supplier-api      | 3000 | Supplier backend API (internal)     |
| supplier-db       | 5433 | PostgreSQL for suppliers (internal) |

## API Endpoints

| Endpoint            | Method | Auth   | Description        |
| ------------------- | ------ | ------ | ------------------ |
| `/api/supplier`     | GET    | Public | List all suppliers |
| `/api/supplier/:id` | GET    | Public | Get supplier by ID |
| `/api/supplier`     | POST   | Admin  | Create supplier    |
| `/api/supplier/:id` | PUT    | Admin  | Update supplier    |
| `/api/supplier/:id` | DELETE | Admin  | Delete supplier    |

## Project Structure

```
supplier-service/
├── frontend/           # Vite + React microfrontend
│   ├── src/
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── package.json
└── backend/            # Express.js backend
    ├── app.ts          # Server entry
    ├── db.ts           # PostgreSQL helpers
    ├── routes.ts       # API routes with session validation
    ├── tsconfig.json   # TypeScript config
    ├── Dockerfile      # Backend container definition
    ├── schema.sql      # Database schema + seed data
    └── package.json
```

## Database Schema

See `backend/schema.sql` for the complete schema including:

- `suppliers` table
- `update_updated_at` trigger

## Seed Data

Seed data is in `backend/schema.sql` (not committed to repo).

To enable seeding on docker compose up, do the following:

1. Edit `backend/schema.sql` and uncomment the `INSERT INTO suppliers` statement (lines 44-65)
2. Rebuild: `docker compose up -d --build supplier-db supplier-api`
