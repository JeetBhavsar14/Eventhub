# EventHub – Event Management System

EventHub is an event management web application built using Angular. The project aims to bring event discovery, ticket booking, event hosting, team management, and platform administration into one application.

The application provides separate workspaces for attendees, event hosts, management teams, field staff, and administrators.

I am developing this project with a focus on modular architecture, reusable components, centralized API communication, and maintainable frontend code.

**Project Status:** Active Development

---

## Features

### 1. Event Discovery
- Browse and explore events.
- Search events.
- Filter events by category.
- Explore events based on location.
- View event details and ticket information.

### 2. User / Attendee
- User registration and login.
- Event and ticket selection.
- Checkout and payment form interface.
- Apply offers and discounts.
- View booking details.
- Generate QR-code-based digital tickets.
- Manage user profile.

### 3. Host / Organizer Dashboard
- Dashboard with event statistics.
- Create and manage events.
- Edit event information.
- Manage ticket categories and pricing.
- View bookings and attendee information.
- Event performance analytics.
- Manage event team members.
- Multiple event co-owners and ownership allocation.
- Ownership percentage validation (100%).
- Assign event managers and operational responsibilities.
- Manage event participants, speakers, artists, and sponsors.
- Notifications and organizer settings.

### 4. Management Dashboard
- Management workspace.
- Event approval-related workflows.
- Operational management screens.

### 5. Field Staff Dashboard
- Staff workspace.
- Ticket validation interface.
- QR-code-based check-in experience.
- Attendance tracking.

### 6. Super Admin Dashboard
- Platform overview and analytics.
- Host application management.
- Event curation and management.
- User directory and role management.
- Financial settlement and payout screens.

### 7. Shared Application Features
- Centralized Axios API client.
- Centralized API error handling.
- Authentication and role-based route guards.
- Angular Signals for reactive state management.
- Reusable confirmation dialogs.
- Reusable pagination component.
- Toast notification system.
- Responsive layouts.
- Lazy-loaded application routes.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Angular 21 | Frontend framework |
| TypeScript 5.9 | Application development |
| HTML5 & CSS3 | UI and styling |
| Angular Signals | Reactive state management |
| Angular Router | Routing and navigation |
| Axios | API communication |
| RxJS | Reactive programming |
| json-server | Mock REST API |
| LowDB | Local JSON data persistence |
| qrcode | QR code generation |
| Vitest | Unit testing |
| npm | Package management |

---

## Project Structure

The application follows a modular structure to keep features, shared components, and application services separate.

```text
src/
└── app/
    ├── core/
    │   ├── api/
    │   ├── auth/
    │   ├── authorization/
    │   ├── constants/
    │   ├── models/
    │   ├── state/
    │   ├── storage/
    │   └── utils/
    │
    ├── features/
    │   ├── auth/
    │   ├── bookings/
    │   ├── checkout/
    │   ├── discover/
    │   ├── event-details/
    │   ├── gift-cards/
    │   ├── offers/
    │   ├── payment-gateway/
    │   ├── profile/
    │   └── host-event/
    │
    ├── layout/
    │   ├── admin-layout/
    │   ├── host-layout/
    │   ├── management-layout/
    │   ├── staff-layout/
    │   ├── main-layout/
    │   └── shell/
    │
    ├── shared/
    │   ├── components/
    │   └── forms/
    │
    ├── app.routes.ts
    └── app.config.ts
```

### Architecture Approach

- **Core:** Application-wide services, authentication, API communication, models, and state management.
- **Features:** Individual application modules such as discovery, bookings, checkout, and profiles.
- **Layout:** Separate workspaces for different user roles.
- **Shared:** Reusable UI components and forms.

For API communication, the application follows this structure:

```text
Feature Component
       |
       v
Feature Service
       |
       v
Centralized ApiClient
       |
       v
Axios Instance
       |
       v
Mock API
```

---

## Authentication

EventHub currently uses a custom mock authentication implementation.

It includes:
- Login and registration endpoints.
- JWT generation using HMAC-SHA256.
- Token signature and expiration verification.
- Session validation through `/auth/me`.
- Role-based frontend route guards.
- Environment-based demo credentials.

### User Roles

| Role | Landing Route |
|---|---|
| Super Admin | `/admin` |
| Host | `/host/dashboard` |
| Management | `/management` |
| Field Staff | `/staff` |
| Standard User | `/discover` |

Frontend route guards control navigation. Backend authorization must be implemented independently for production use.

---

## Getting Started

### Prerequisites

- Node.js compatible with Angular 21
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/JeetBhavsar14/Eventhub.git
cd Eventhub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create your local `.env` file:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure your local demo credentials and JWT secret in `.env`.

### 4. Start the mock API

```bash
npm run mock-api
```

The mock API runs on:

```text
http://localhost:3000
```

### 5. Start Angular

Open another terminal:

```bash
npm start
```

Open the application:

```text
http://127.0.0.1:4200
```

Keep both servers running while using the application.

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Mock API port |
| `NODE_ENV` | Runtime environment |
| `ALLOWED_ORIGINS` | Allowed CORS origins |
| `JWT_SECRET` | JWT signing secret |
| `DEMO_ADMIN_PASSWORD` | Admin demo password |
| `DEMO_HOST_PASSWORD` | Host demo password |
| `DEMO_MANAGEMENT_PASSWORD` | Management demo password |
| `DEMO_STAFF_PASSWORD` | Staff demo password |
| `DEMO_USER_PASSWORD` | User demo password |
| `API_BASE_URL` | API URL setting in the environment template |

Never commit your actual `.env` file or credentials.

---

## Mock API

The project currently uses a local JSON-based mock backend.

Important files:

| File | Purpose |
|---|---|
| `mock-server.mjs` | Mock API and authentication logic |
| `db.seed.example.json` | Initial sample data |
| `db.json` | Local database created at runtime |
| `.env.example` | Environment configuration template |

### Custom Authentication Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | User login |
| POST | `/auth/register` | User registration |
| GET | `/auth/me` | Session validation |

Other REST-style endpoints are handled by json-server.

---

## Available Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm start` | Start Angular application |
| `npm run mock-api` | Start mock API server |
| `npm run build` | Build the application |
| `npm run watch` | Watch and rebuild source files |
| `npm test` | Run configured unit tests |

---

## Current Limitations

EventHub is currently a development and demonstration project.

- Authentication uses a custom mock backend.
- Demo and registered-user passwords are maintained in memory by the mock server.
- The application does not currently have a verified external payment gateway integration.
- Frontend route guards do not replace backend authorization.
- Production database, payment, and identity integrations are still required.

Do not use real payment details or sensitive user information with the mock backend.

---

## Future Development

Some planned improvements include:

- Permission Management Center.
- Complete in-app notification workflows.
- Event reviews and ratings.
- Corporate and group booking workflows.
- Django REST Framework backend integration.
- Production database and payment gateway integration.
- Backend-side authentication and authorization.

---

## Developer

**Jeet Bhavsar**

GitHub: [@JeetBhavsar14](https://github.com/JeetBhavsar14)

Repository: [EventHub](https://github.com/JeetBhavsar14/Eventhub)
