# University Hall Automation System (UHAS)

Production-structured MERN foundation for the Final Year Project:

- Roles: `student`, `staff`, `provost`
- No separate admin role (`provost` is super admin)
- Responsive dashboard-first UX foundation

## 1. Quick Start

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB local or Atlas

## Setup

1. Copy env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

PowerShell equivalent:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

2. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Run backend:

```bash
cd backend
npm run dev
```

4. Run frontend:

```bash
cd frontend
npm run dev
```

Frontend default: `http://localhost:5173`  
Backend default: `http://localhost:5000`

5. Seed initial provost account:

```bash
cd backend
npm run seed:provost -- --name="Provost" --email="provost@just.edu.bd" --phone="01700000000" --password="StrongPass123!"
```

6. Run tests:

```bash
cd backend && npm run test
cd ../frontend && npm run test
```

## 2. Starter API Endpoints

- `GET /api/v1`
- `GET /api/v1/health`
- `POST /api/v1/auth/register` (student self-registration)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me` (auth required)
- `GET /api/v1/users` (provost only)
- `GET /api/v1/users/role-summary` (provost only)
- `GET /api/v1/examples/protected` (auth required)
- `GET /api/v1/examples/provost-only` (provost only)
- `POST /api/v1/examples/upload-placeholder` (auth + upload middleware example)

## 3. Frontend Foundation Included

- Vite + React + Tailwind setup
- role-based route guards
- responsive app shell:
  - desktop sidebar
  - sticky topbar
  - mobile drawer + mobile bottom nav
- landing page + auth pages
- initial dashboards:
  - student
  - staff
  - provost

## 4. Backend Foundation Included

- Express modular architecture
- MongoDB connection layer
- JWT auth + bcrypt hashing
- cookie signing + CORS allow-list handling
- request validation using Zod
- global error and not-found handlers
- RBAC middleware for role enforcement
- upload middleware scaffold (multer memory storage + file validation)
- payment gateway env placeholders for future adapters
- standard API success/error response pattern

## 5. Recommended Build Order (Next Modules)

1. Authentication Hardening
- refresh-token strategy, rate limit, account lock policy, audit logs

2. User Domain Foundations
- student profile model + staff profile model + provost seed script

3. Hall Application + Review Workflow
- application lifecycle, meeting schedule, review notes

4. Room Inventory + Allocation Engine
- capacity constraints, occupancy auto-update, transfer flow

5. Meal Core
- meal catalog, meal orders, tokenization, staff verification workflow

6. Billing + Payments
- wallet/balance ledger, transaction model, payment gateway adapter layer

7. Service Operations
- complaints, maintenance requests, support tickets, assignment flows

8. Staff Operations
- tasks, cleaning schedule, daily reports, completion evidence uploads

9. Notices + Notifications + Incidents
- targeting rules, delivery channels, incident severity tracking

10. Reporting + Analytics
- provost dashboards, filters, export-ready report APIs

## 6. Key Documents

- Architecture and route planning: `ARCHITECTURE.md`
- Coding and API conventions: `CONVENTIONS.md`
- Backend foundation details: `backend/docs/BACKEND_FOUNDATION.md`
