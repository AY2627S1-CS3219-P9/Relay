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
| supplier-db       | 5432 | PostgreSQL for suppliers (internal) |

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
    ├── routes.ts       # API routes
    └── package.json
```

## Database Schema

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location JSONB NOT NULL,
  is_operational BOOLEAN NOT NULL DEFAULT true,
  operating_hours JSONB NOT NULL,
  service_types INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Seed Data

To initialise database with seed data (for development):

1. Uncomment `\\ir supplier-seed.sql` in `backend/init-db.sql`
2. Rebuild: `docker compose up -d --build supplier-db supplier-api`

## Contract Types

As defined in `packages/contracts/src/supplier/`:

- `Location` - lat, lng, buildingName, floorNumber
- `ServiceType` - Food(0), Drink(1), Shopping(2), Printing(3), Parcel(4)
- `Day` - Monday(0) through Sunday(6)
- `OperatingHours` - openingTime, closingTime, daysOfWeek
- `Supplier` - Full supplier record with all fields
