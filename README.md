# EventHub – Event Management System

EventHub is an event management web application built using Angular. The project aims to bring event discovery, ticket booking, event hosting, team management, and platform administration into one application.

The application provides separate workspaces for attendees, event hosts, management teams, field staff, and administrators.

I am developing this project with a focus on modular architecture, reusable components, centralized API communication, and maintainable frontend code.

**Project Status:** Active Development & Backend Integration

> **Note on Internship Context & Backend Integration:**
> Previously, I was working as a solo frontend intern developing EventHub using a local mock-server (`mock-server.mjs`) and mock data to design all features, user flows, and role-based workspaces.
> 
> Recently, our backend intern provided a local-network API (`http://192.168.1.3:8000`), and I have integrated this real Django backend into the frontend (including SimpleJWT authentication, modular API adapters, and live contact verification).
> 
> The mock server and mock data are **intentionally retained in this repository** as an offline fallback so the application can still be run, tested, and evaluated even when the backend intern's machine or local network is not accessible.

---

## Features

### 1. Event Discovery
- Browse and explore events.
- Search events.
- Filter events by category.
- Explore events based on location.
- View event details and live ticket pricing.

### 2. User / Attendee
- User registration and login (Django SimpleJWT & mock fallback).
- Event and ticket selection.
- Checkout and payment form interface.
- Apply offers and discounts.
- View booking details.
- Generate QR-code-based digital tickets.
- Manage user profile with Email and Phone OTP verification.

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
- Modular domain adapters (`event`, `booking`, `user`, `host`) mapping Django API to frontend models.
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
| Django REST Framework | Real backend API (provided by backend intern) |
| json-server / TinyHTTP | Offline mock REST API fallback |
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
    │   │   ├── adapters/    # Modular adapters for Django backend endpoints
    │   │   ├── api-client.ts
    │   │   └── axios-instance.ts
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

- **Core:** Application-wide services, authentication, API communication, adapters, models, and state management.
- **Features:** Individual application modules such as discovery, bookings, checkout, and profiles.
- **Layout:** Separate workspaces for different user roles.
- **Shared:** Reusable UI components and forms.

For API communication, the application follows this structure:

```text
Feature Component
       │
       ▼
Feature Service / Signals
       │
       ▼
Centralized ApiClient
       │
       ▼
Domain Adapters (event, booking, user, host)
       │
       ▼
Axios Instance with JWT Interceptors
       │
  ┌────┴─────────────────────────────┐
  ▼                                  ▼
Django Backend (Primary)       Mock API (Offline Fallback)
(http://192.168.1.3:8000)      (http://localhost:3000)
```

---

## Authentication

EventHub supports both the **integrated Django backend authentication** and the **offline mock authentication**:

- **Live Django Backend:** SimpleJWT token authentication (`/accounts/login/`, `/accounts/token/refresh/`, `/accounts/profile/`) with automatic token renewal and contact verification.
- **Offline Mock Fallback:** Custom JWT generation and local session validation.
- Role-based frontend route guards controlling access to admin, host, management, and staff screens.

### User Roles

| Role | Landing Route |
|---|---|
| Super Admin | `/admin` |
| Host | `/host/dashboard` |
| Management | `/management` |
| Field Staff | `/staff` |
| Standard User | `/discover` |

Frontend route guards control navigation. Backend authorization verifies requests server-side.

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

### 3. Environment Configuration

Check `src/environments/environment.ts`:
- **For Real Backend:** Configured with `apiBaseUrl: 'http://192.168.1.3:8000'` (the backend intern's server address).
- **For Offline Mock:** Change to `apiBaseUrl: 'http://localhost:3000'`.

You can also use `.env.example` as a template for your local `.env`.

### 4. Running the Application

#### Option A: Running with Real Backend (Default)
When the backend intern's server is running on the local network (`http://192.168.1.3:8000`):
```bash
npm start
```
The app will open on `http://localhost:4200` and communicate directly with the live Django API.

#### Option B: Running with Offline Mock Server
If the backend intern's server is not active or you are working offline:
1. In terminal 1, start the mock server:
   ```bash
   npm run mock-api
   ```
2. In terminal 2, start Angular:
   ```bash
   npm start
   ```

---

## Mock API & Offline Fallback

The project retains a local JSON-based mock backend created during the initial solo frontend phase.

Important files:

| File | Purpose |
|---|---|
| `mock-server.mjs` | Mock API and authentication logic |
| `db.seed.example.json` | Initial sample data |
| `db.json` | Local database created at runtime |
| `.env.example` | Environment configuration template |

### Why the Mock Server is Retained:
- **Offline Independence:** Allows running and reviewing the complete frontend without requiring the backend intern's machine to be online.
- **Safe Isolation:** `mock-server.mjs` and `db.json` are only development utilities and are never included in the production build bundle (`ng build`).

---

## Available Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm start` | Start Angular application |
| `npm run mock-api` | Start mock API server (offline fallback) |
| `npm run build` | Build the application |
| `npm run watch` | Watch and rebuild source files |
| `npm test` | Run configured unit tests |

---

## Current Limitations

EventHub is currently in active development:

- Integrated with the backend intern's API over the local network (`192.168.1.3:8000`).
- Mock server is kept as an offline fallback when outside the local network.
- Payment gateway uses a frontend demo interface pending full production merchant approval.
- Frontend route guards enforce UI access, backed by JWT validation on backend endpoints.

---

## Future Development

Some planned improvements include:

- Cloud deployment for both Django backend and Angular frontend.
- Production payment gateway integration (Stripe / Razorpay).
- Real-time turnstile sync with WebSockets.
- Event reviews and rating system.

---

## Developer

**Jeet Bhavsar**

GitHub: [@JeetBhavsar14](https://github.com/JeetBhavsar14)

Repository: [EventHub](https://github.com/JeetBhavsar14/Eventhub)
