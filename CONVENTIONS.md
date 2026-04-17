# Coding Conventions and Architecture Rules

## 1. Naming Conventions

- Directories: `kebab-case` (e.g., `daily-report`)
- React components: `PascalCase` file names (e.g., `StudentDashboardPage.jsx`)
- Hooks: `useXxx` pattern (e.g., `useAuth.js`)
- Utility files: `camelCase` (e.g., `sanitizeUser.js`)
- Constants: `UPPER_SNAKE_CASE` keys

## 2. Route Naming Style

Frontend:

- Public: `/login`, `/register`
- Role prefix strategy:
  - `/student/...`
  - `/staff/...`
  - `/provost/...`

Backend:

- Base: `/api/v1`
- Resource style: plural nouns
  - `/api/v1/auth`
  - `/api/v1/users`

## 3. Controller and Service Separation

- Controller responsibilities:
  - parse request context
  - call service
  - shape HTTP response
- Service responsibilities:
  - business logic
  - data integrity rules
  - cross-model operations
- Models should not hold business workflows; keep domain logic in services.

## 4. Response Format Standard

- Success responses use `apiResponse()` helper.
- Always include:
  - `success`
  - `message`
- Include `data` when returning payload.
- Include `meta` for pagination and aggregate metadata.

## 5. Error Handling Standard

- Use `ApiError(statusCode, message, details?)` for expected failures.
- Throw errors from services, handle globally in `errorHandler`.
- Never return raw stack traces to clients.

## 6. Validation Strategy

- Use Zod for request validation in `validations/`.
- Validate at route layer using `validateRequest(schema)`.
- Store schema per feature/module (e.g., `authValidation.js`, `userValidation.js`).

## 7. Authentication Strategy

- JWT access token signed with `JWT_ACCESS_SECRET`.
- Accept both:
  - `Authorization: Bearer <token>`
  - cookie `accessToken`
- `requireAuth` middleware resolves and verifies token and injects `req.user`.

## 8. RBAC Strategy

- Use `authorize(...roles)` middleware after `requireAuth`.
- Valid roles:
  - `student`
  - `staff`
  - `provost`
- `provost` is the only super admin role.

## 9. Scalability Rules

- New business modules must follow feature-first boundaries.
- Keep reusable UI primitives in `components/common`.
- Keep backend modules independent: `routes/controllers/services/validations`.
- Prefer composition over deep inheritance.

