# Backend Foundation Guide

This document defines the backend conventions and module pattern for the University Hall Automation System.

## 1. Tech and Runtime

- Node.js + Express (ES modules)
- MongoDB + Mongoose
- JWT-based authentication
- Zod request validation
- Multer-ready upload layer

## 2. Route Prefix and Versioning

- API prefix: `/api/v1`
- Route groups:
  - `/` (system routes)
  - `/auth`
  - `/users`
  - `/examples` (starter protected route patterns)

## 3. Response Contracts

Success:

```json
{
  "success": true,
  "message": "Action completed",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "path": "body.email", "message": "Invalid email" }
  ]
}
```

## 4. Layering Convention

- `routes/*Routes.js`
  - path definitions
  - middleware chain
- `controllers/*Controller.js`
  - request/response orchestration
  - no heavy business rules
- `services/*Service.js`
  - business logic and workflows
- `models/*.js`
  - schema and persistence
- `validations/*.js`
  - request schema definitions

## 5. Middleware Pattern

Typical protected route:

1. `requireAuth`
2. `authorize(...)` as needed
3. `validateRequest(schema)`
4. optional upload middleware (`upload.single|array`)
5. `validateFiles(...)`
6. controller handler (via `asyncHandler`)

## 6. Authentication and RBAC

- Roles:
  - `student`
  - `staff`
  - `provost` (super admin)
- No separate admin role.
- `requireAuth` resolves user from:
  - bearer token
  - signed cookie
- `optionalAuth` is available for endpoints that can behave differently for guests vs logged-in users.

## 7. Validation Strategy

- Every module gets dedicated schemas in `validations/`.
- `validateRequest()` normalizes `body`, `params`, `query`.
- Validation errors are formatted consistently by `formatValidationError`.
- Upload metadata can be validated separately using `uploadValidation` schemas.

## 8. Upload Strategy (Starter)

- `config/upload.js` exports Multer instance with:
  - memory storage
  - file-size limit from env
  - mime-type allow-list from env
- `validateFiles` ensures required/limit rules at route level.

## 9. Payment Integration Readiness

Environment placeholders are already defined:

- `PAYMENT_PROVIDER`
- `PAYMENT_API_BASE_URL`
- `PAYMENT_API_KEY`
- `PAYMENT_API_SECRET`
- `PAYMENT_WEBHOOK_SECRET`

Future payment adapters should be added in `services/payment*` and mounted via dedicated routes.

## 10. New Module Template

For a new module `<module>`:

- `routes/<module>Routes.js`
- `controllers/<module>Controller.js`
- `services/<module>Service.js`
- `validations/<module>Validation.js`
- optional `models/<Module>.js` if new entity is needed

