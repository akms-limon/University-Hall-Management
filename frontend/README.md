# Frontend Foundation (Prompt 2)

This frontend is organized for scalable module development with role-aware dashboards and reusable UI primitives.

## Structure

```text
src/
  app/providers
  api
  assets
  components/
    ui
    shared
  features/
    auth
    dashboard
  hooks
  layouts
  lib
  pages
  routes
  utils
```

## Core Principles

- Mobile-first responsive layout
- Role-aware navigation shell (`student`, `staff`, `provost`)
- Shared design system and reusable UI components
- Route guards for auth and role access
- Framer Motion for subtle transitions and shell animation

