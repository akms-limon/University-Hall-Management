# UHAS Backend

## Start

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
```

Note: first run may download a MongoDB binary for `mongodb-memory-server`.

## Required Environment Variables

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`
- `COOKIE_SECRET`

## Optional / Future Integration Variables

- `TRUST_PROXY`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `COOKIE_DOMAIN`
- `COOKIE_MAX_AGE_MS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `AUTH_LOGIN_WINDOW_MS`
- `AUTH_LOGIN_MAX_ATTEMPTS`
- `AUTH_LOGIN_LOCKOUT_MS`
- `UPLOAD_STORAGE`
- `UPLOAD_MAX_FILE_SIZE_MB`
- `UPLOAD_ALLOWED_MIME_TYPES`
- `PAYMENT_PROVIDER`
- `PAYMENT_API_BASE_URL`
- `PAYMENT_API_KEY`
- `PAYMENT_API_SECRET`
- `PAYMENT_WEBHOOK_SECRET`
