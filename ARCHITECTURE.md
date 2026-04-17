# University Hall Automation System - Foundation Architecture

## 1. Repository Strategy

Two-folder monorepo style:

- `frontend` - React + Vite + Tailwind + Router + UX system
- `backend` - Express + MongoDB + JWT + RBAC API

This keeps deployment independent while preserving one codebase for full-stack coordination.

## 2. Current Folder Structure

```text
.
|-- frontend
|   |-- src
|   |   |-- app
|   |   |   |-- providers
|   |   |   `-- routes
|   |   |-- components
|   |   |   |-- common
|   |   |   |-- feedback
|   |   |   |-- layout
|   |   |   `-- navigation
|   |   |-- features
|   |   |   |-- auth
|   |   |   |-- dashboard
|   |   |   `-- shared
|   |   |-- hooks
|   |   |-- lib
|   |   |-- services
|   |   |   |-- api
|   |   |   `-- auth
|   |   |-- styles
|   |   `-- utils
|   |-- package.json
|   |-- tailwind.config.js
|   `-- vite.config.js
|-- backend
|   |-- src
|   |   |-- config
|   |   |-- constants
|   |   |-- controllers
|   |   |-- db
|   |   |-- middlewares
|   |   |-- models
|   |   |-- routes
|   |   |-- services
|   |   |-- utils
|   |   `-- validations
|   |-- package.json
|   `-- .env.example
`-- sample_design_for_website.jsx
```

## 3. Role System

Only three roles are valid:

- `student`
- `staff`
- `provost` (super admin)

No separate admin role exists.

## 4. Frontend Architecture Plan

### Route Categories

- Public routes:
  - `/`
  - `/login`
  - `/register`
- Protected routes (auth required):
  - `/student/*`
  - `/staff/*`
  - `/provost/*`
- Guard behavior:
  - `ProtectedRoute` checks login state
  - `RoleRoute` checks role access

### Layout Strategy

- Shared app shell for protected routes:
  - desktop sidebar
  - topbar
  - mobile drawer
  - mobile bottom nav
- Feature modules render inside `AppLayout` outlet.

### Frontend Module Pattern

Per feature:

- `features/<feature>/pages`
- `features/<feature>/components`
- `features/<feature>/validation.js` (when needed)

Cross-cutting:

- `services/api` for Axios client
- `services/auth` for auth/session logic
- `hooks` for reusable state hooks
- `components/common` for reusable primitives

## 5. Backend Architecture Plan

### API Base

- Base path: `/api/v1`
- Versioned API chosen for long-term compatibility

### Layered Flow

- Route -> validation middleware -> auth middleware -> RBAC middleware -> controller -> service -> model

### Auth Strategy

- JWT access token for API auth
- Bearer token accepted
- HTTP-only cookie also supported for session continuity
- Passwords hashed with bcrypt

### Validation Strategy

- Zod schemas under `validations/`
- `validateRequest()` middleware maps schema to `body/query/params`
- Standardized validation error response shape

### Error Strategy

- `ApiError` for controlled business errors
- global `errorHandler` for validation/db/unexpected errors
- uniform `{ success, message, errors? }` error payload

### Environment Variables

Core env keys:

- `PORT`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `CLIENT_ORIGIN`
- `NODE_ENV`

## 6. Design Direction (from demo inspiration)

The initial UI foundation applies the visual language from `sample_design_for_website.jsx`:

- deep navy background with gradient overlays
- glassmorphism cards and soft border contrast
- indigo + cyan accent colors with semantic status tones
- dashboard-first spacing and card hierarchy
- responsive sidebar to mobile drawer transition
- metric cards, status tables, and chart blocks

Typography direction:

- primary: `Manrope`
- display headings: `Space Grotesk`
- numeric/tabular emphasis: `JetBrains Mono`

## 7. API Response Standard

Success:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

