# University Hall Management System

A full-stack **University Hall Management System** designed to modernize and automate university residential hall operations.

This project was developed as my **University Final Year Project**, with the goal of building a practical system that brings students, hall staff, and the provost into one centralized platform.

The system is designed around real-world university hall workflows, including authentication, hall applications, room allocation, meals, payments, complaints, maintenance, staff operations, notices, notifications, incidents, and administrative reporting.

---

## About the Project

Managing a university residential hall involves many interconnected processes—student applications, room allocation, meal management, payments, complaints, maintenance, staff activities, and administrative decisions.

Traditional manual processes can make these operations difficult to manage and track.

The **University Hall Management System** aims to provide a centralized digital platform where these activities can be managed efficiently through role-based dashboards and structured workflows.

The system is built with three primary user roles:

* **Student** — access personal services, applications, rooms, meals, payments, complaints, and other hall-related activities.
* **Staff** — manage operational tasks, maintenance, cleaning schedules, reports, and student services.
* **Provost** — manage the overall hall system, users, applications, allocations, reports, and administrative operations.

There is no separate admin role. **Provost acts as the super-admin role.**

---

## Core Features

### 🔐 Authentication & User Management

* Student registration
* User login and logout
* JWT-based authentication
* HTTP-only cookie support
* Password hashing with bcrypt
* Session persistence
* Role-based access control
* Protected routes
* User management for provost
* Role summary and administrative views

### 🏠 Hall Application & Allocation

Designed to manage the complete hall application workflow:

* Hall applications
* Application review
* Review notes
* Application status
* Meeting schedules
* Room inventory
* Room allocation
* Capacity management
* Occupancy tracking
* Room transfer workflows

### 🍱 Meal Management

The planned meal system includes:

* Meal catalog
* Meal ordering
* Meal tokens
* Meal verification
* Staff-side meal operations

### 💳 Billing & Payments

The system is designed to support:

* Student wallet/balance
* Billing
* Transaction records
* Payment processing
* Payment gateway integration
* Payment webhook handling

The backend already includes infrastructure for future payment provider integration.

### 🛠️ Service Operations

Students will be able to submit and track:

* Complaints
* Maintenance requests
* Support tickets

Staff can manage and process these requests through dedicated operational workflows.

### 👨‍🔧 Staff Operations

The staff module is designed around:

* Task management
* Cleaning schedules
* Daily reports
* Completion tracking
* Evidence/file uploads

### 📢 Notices & Notifications

The system is designed to support:

* Hall notices
* Targeted notifications
* Multiple delivery channels
* Incident reporting
* Incident severity tracking

### 📊 Reports & Analytics

The provost dashboard is planned to provide:

* Operational statistics
* Hall performance information
* Filterable reports
* Administrative analytics
* Export-ready report APIs

---

## Technology Stack

### Frontend

* **React**
* **Vite**
* **Tailwind CSS**
* **React Router**
* **Axios**
* **React Hook Form**
* **Zod**
* **Recharts**
* **Framer Motion**
* **Lucide React**

### Backend

* **Node.js**
* **Express.js**
* **MongoDB**
* **Mongoose**
* **JWT**
* **bcrypt**
* **Zod**
* **Multer**
* **Cloudinary**
* **Helmet**
* **CORS**

### Testing

* **Vitest**
* **Supertest**
* **MongoDB Memory Server**
* **React Testing Library**

---

## High-Level Architecture

The system follows a **modular full-stack architecture** where the frontend, backend, and database are separated into clear layers.

```text
                    University Hall Management System
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
               Frontend                    Backend API
          React + Vite + Tailwind          Node.js + Express
                    │                           │
                    │                    ┌──────┴──────┐
                    │                    │             │
                    │               Middleware      Routes
                    │                    │             │
                    │              ┌─────┴─────┐       │
                    │              │           │       │
                    │          Auth / RBAC  Validation │
                    │              │           │       │
                    │              └─────┬─────┘       │
                    │                    │             │
                    │                 Controllers ──────┘
                    │                    │
                    │                 Services
                    │                    │
                    │                  Models
                    │                    │
                    └─────────────── API ─┘
                                         │
                                    MongoDB
                                         │
                              Persistent Application Data
```

### Frontend

The frontend is responsible for:

* User interface and dashboards
* Role-based navigation
* Form handling and client-side validation
* API communication
* Authentication state
* Responsive user experience

### Backend

The backend provides the application's core business logic and API layer.

```text
Request
   ↓
Route
   ↓
Middleware
   ├── Authentication
   ├── Authorization / RBAC
   └── Validation
   ↓
Controller
   ↓
Service
   ↓
Model
   ↓
MongoDB
   ↓
Response
```

This separation keeps business logic independent from HTTP handling and database concerns, making the system easier to maintain and extend.

### Database

**MongoDB** is used as the primary database for persistent application data such as:

* Users
* Hall information
* Applications
* Rooms
* Meals
* Transactions
* Complaints
* Maintenance records
* Notices
* Operational data

### Role-Based Access

The architecture is centered around three primary roles:

```text
                    ┌──────────────┐
                    │   Provost    │
                    │  Super Admin │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼─────┐             ┌─────▼─────┐
        │   Staff   │             │  Student  │
        └───────────┘             └───────────┘
```

Each role receives access to the features and workflows relevant to its responsibilities.

The overall architecture is designed to keep the system **modular, scalable, maintainable, and suitable for adding new hall-management modules over time**.

---

## Architecture Details

The project follows a **full-stack layered architecture** with a clear separation between frontend and backend.

```text
University-Hall-Management/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validations/
│   │
│   └── package.json
│
├── ARCHITECTURE.md
├── CONVENTIONS.md
└── README.md
```

### Backend Request Flow

```text
Client
  ↓
Route
  ↓
Validation
  ↓
Authentication
  ↓
Role Authorization
  ↓
Controller
  ↓
Service
  ↓
Model / Database
  ↓
Standard API Response
```

The backend follows a separation of responsibilities where controllers handle request/response orchestration, services contain business logic, models handle persistence, and validation schemas handle request validation.

---

## Role-Based Access Control

The system uses three roles:

| Role        | Responsibility                                          |
| ----------- | ------------------------------------------------------- |
| **Student** | Access personal hall services and student workflows     |
| **Staff**   | Handle hall operations and service-related tasks        |
| **Provost** | Manage the overall system and administrative operations |

The backend uses authentication middleware followed by role authorization middleware to protect restricted resources.

---

## API

The backend follows a versioned API structure:

```text
/api/v1
```

Example endpoints currently included in the foundation:

```text
GET    /api/v1
GET    /api/v1/health

POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/users
GET    /api/v1/users/role-summary
```

The API follows a consistent response format.

### Success

```json
{
  "success": true,
  "message": "Action completed",
  "data": {},
  "meta": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

## UI & Design

The frontend follows a **dashboard-first design approach** with a responsive layout.

The interface includes:

* Responsive sidebar
* Top navigation
* Mobile drawer
* Mobile bottom navigation
* Dashboard cards
* Statistics and metric sections
* Status tables
* Charts
* Responsive layouts
* Role-specific dashboards

The visual direction uses a modern dark dashboard aesthetic with glass-style cards, gradient backgrounds, indigo/cyan accents, and clear status indicators.

---

## Security

Security considerations are included throughout the architecture:

* JWT authentication
* HTTP-only cookie support
* Password hashing with bcrypt
* Role-based authorization
* Request validation using Zod
* CORS configuration
* Helmet security middleware
* Centralized error handling
* Environment-based configuration
* File upload validation

Sensitive configuration is stored through environment variables rather than being hard-coded into the application.

---

## Testing

Testing is included on both sides of the application.

### Backend

* Unit and integration testing with **Vitest**
* API testing with **Supertest**
* In-memory MongoDB testing using **MongoDB Memory Server**

### Frontend

* Component testing with **Vitest**
* React Testing Library
* User interaction testing

---

## Getting Started

### Prerequisites

Make sure you have installed:

* Node.js 20+
* npm 10+
* MongoDB or MongoDB Atlas

### Clone the Repository

```bash
git clone https://github.com/akms-limon/University-Hall-Management.git
cd University-Hall-Management
```

### Backend Setup

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Start the backend:

```bash
npm run dev
```

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Start the frontend:

```bash
npm run dev
```

The default development servers are:

```text
Frontend → http://localhost:5173
Backend  → http://localhost:5000
```

---

## Development Roadmap

The project is being developed progressively through separate functional modules.

### 1. Authentication

* Authentication hardening
* Refresh-token strategy
* Rate limiting
* Account lock policy
* Audit logs

### 2. User Management

* Student profiles
* Staff profiles
* Provost management

### 3. Hall Applications

* Application lifecycle
* Review workflow
* Meeting schedules
* Review notes

### 4. Room Management

* Room inventory
* Allocation engine
* Capacity constraints
* Occupancy updates
* Transfer management

### 5. Meal Management

* Meal catalog
* Meal orders
* Token system
* Staff verification

### 6. Billing & Payments

* Wallet
* Balance ledger
* Transactions
* Payment gateway integration

### 7. Service Operations

* Complaints
* Maintenance
* Support tickets
* Assignment workflows

### 8. Staff Operations

* Tasks
* Cleaning schedules
* Daily reports
* Completion evidence

### 9. Communication & Incidents

* Notices
* Notifications
* Targeting
* Incident management

### 10. Reporting & Analytics

* Provost dashboards
* Filters
* Analytics
* Export-ready reports

---

## Documentation

Additional project documentation is maintained separately:

* [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system architecture and route planning
* [`CONVENTIONS.md`](./CONVENTIONS.md) — coding conventions and architecture rules
* [`backend/docs/BACKEND_FOUNDATION.md`](./backend/docs/BACKEND_FOUNDATION.md) — backend architecture and development guidelines

---

## Academic Project

This project was developed as my **University Final Year Project**.

It is not only a software development exercise, but also an opportunity to apply the concepts I have learned throughout my university journey to a larger real-world problem.

The project focuses on designing a system that is:

* Modular
* Scalable
* Maintainable
* Secure
* Responsive
* Practical for real-world university hall management

---

## Author

**Limon**

GitHub: [@akms-limon](https://github.com/akms-limon)

---

## License

This project is developed for **academic and educational purposes** as part of my university final year project.
