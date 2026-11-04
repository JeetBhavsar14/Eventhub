# EventHub – Event Management System

EventHub is an enterprise-grade event management web application built using **Angular 21** and integrated with a **Django REST Framework (DRF)** backend. The platform provides unified workspaces for attendees, event organizers (hosts), operations managers, venue scanner staff, and platform administrators.

> **Evaluation Note:** This repository has been updated following the internal code review report. It features a complete **Django REST Framework integration** with SimpleJWT authentication and modular API adapters, while retaining a lightweight, isolated mock server as an offline development and demonstration fallback.

---

## Architecture & Backend Integration

### 1. Dual-Mode Backend Strategy

To ensure zero downtime during evaluations, reviews, and offline development, the frontend is built to operate in two distinct modes:

| Mode | Target Backend | Command | Description |
|---|---|---|---|
| **Live Backend (Primary)** | Django REST Framework (`http://192.168.1.3:8000`) | `npm start` | Production-grade integration with real Django database, cryptographic SimpleJWT tokens, and live endpoints. |
| **Offline Mock (Fallback)** | Local Node/TinyHTTP (`http://localhost:3000`) | `npm run mock-api` | Zero-dependency, offline demonstration fallback. Used when testing UI without starting Python/PostgreSQL services. |

> **Security & Build Hygiene:** `mock-server.mjs`, `db.json`, and `json-server` are isolated development utilities (`devDependencies`). The Angular production builder (`ng build`) completely excludes them, ensuring **0 KB** overhead and zero mock vulnerabilities in production builds.

---

### 2. Django REST Framework Integration & Modular Adapters

API communication is managed through a multi-tier decoupled architecture:

```text
Angular UI Components
         │
         ▼
Angular Feature Services & Signals State
         │
         ▼
Centralized ApiClient (@core/api)
         │
         ▼
Domain Adapters (@core/api/adapters)
   ├── event.adapter.ts    (Django Event & Ticket Tier Normalizer)
   ├── booking.adapter.ts  (Bookings, QR Passes & Pricing Normalizer)
   ├── user.adapter.ts     (Profile, Roles & Contact Verification Normalizer)
   └── host.adapter.ts     (Organizer Verification & Metrics Normalizer)
         │
         ▼
Axios HTTP Client with JWT Interceptors (Environment-driven Base URL)
         │
         ▼
Django REST Framework Backend (SimpleJWT /accounts/, /events/, /bookings/)
```

#### Key Architecture Highlights:
- **Clean Separation of Concerns:** Frontend domain interfaces use idiomatic camelCase (`isEmailVerified`, `ticketPasses`, `totalAmount`). Django's snake_case schema (`is_email_verified`, `ticket_passes`, `total_amount`) is mapped cleanly within domain adapters, so backend schema updates never break UI components.
- **True Cryptographic Auth:** Session restoration verifies the access token against `/accounts/profile/`. Expired tokens trigger silent background renewal via `/accounts/token/refresh/` before dispatching requests.
- **Live Email & Phone Verification:** Dedicated verification layouts with 6-digit OTP grid, automatic key navigation, paste support, 30-second resend countdown, and direct sync with Django verification endpoints.

---

## Features

### 1. User / Attendee Workspace
- **Dynamic Event Discovery:** Category filters, city selection, real-time ticket starting price sync (`From ₹<price>` / `Free Entry`), and search.
- **Interactive Ticket Booking:** Live ticket tier selection, seat quota validation, and multi-step checkout.
- **Live Digital QR Passes:** Dynamic QR-code admissions pass generation (`qrcode` library) with offline admission reference.
- **Self-Service Ticket Cancellation:** Multi-ticket selective cancellation or full booking revocation with instant status reflection.
- **Account Credentials & Verification:** Full profile editor (First Name, Last Name, Email, Phone, Bio) with interactive OTP verification dialogs.

### 2. Host / Organizer Workspace
- **Accreditation Application:** Multi-step host accreditation application with document verification status.
- **Event Creator & Tier Configuration:** Concert, festival, and conference publishing with VIP, General Admission, and Early-bird tiers.
- **Sales Analytics:** Ticket sales breakdown, earnings tracking, and attendee lists.
- **Team Dispatch:** Venue staff scanner assignment and operational coordination.

### 3. Venue Scanner Staff & Management Workspaces
- **Staff Gate Scanner:** High-speed optical QR ticket validation preventing duplicate entry.
- **Operations Center:** Turnstile flow monitoring, gate inflow tracking, and admission dispute resolution.

### 4. Administrator Console
- **Platform Governance:** Host application queue review, approval/rejection audit trails, and global system health monitoring.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| **Angular 21** | Modern standalone component architecture and reactive UI |
| **TypeScript 5.9** | Strict typing with 0 compiler errors (`npx tsc --noEmit`) |
| **Angular Signals** | Fine-grained reactive state management (`signal`, `computed`) |
| **Axios** | HTTP client wrapped behind `ApiClient` with automated JWT refresh |
| **Django REST Framework** | Real backend handling authentication, events, and bookings |
| **SimpleJWT** | Industry-standard HMAC-SHA256 Bearer token authorization |
| **qrcode** | Turnstile QR code generation for ticket admissions |
| **Vitest** | Unit test suite |

---

## Review & Evaluation Compliance Checklist

This table details how items raised in the **Internal Code Review** have been resolved:

| Review Finding | Severity | Resolution in Codebase |
|---|---|---|
| **Hardcoded localhost API URL** | High | Resolved. Extracted all URLs into `src/environments/environment.ts` and `environment.production.ts`. Dynamically bound via `apiBaseUrl`. |
| **Missing .env and environment wiring** | High | Resolved. Added `.env.example` template with gitignored `.env` support and Angular environment integration. |
| **Plaintext passwords committed in Git** | Critical | Resolved. Primary auth runs through Django with bcrypt-hashed passwords. Mock database uses Git-safe `db.seed.example.json`. |
| **Client-only auth & fake JWTs** | High | Resolved. Authentic Django SimpleJWT access/refresh token workflow. Route guards now act as UX routing while backend validates every request. |
| **Monolithic Adapter / God Components** | Medium | Resolved. Refactored `django-adapter.ts` into specialized adapters (`event`, `booking`, `user`, `host`) under `src/app/core/api/adapters/`. |
| **Weak Forgot Password / Any OTP** | Critical | Resolved. Built true 6-digit OTP verification layout with countdown timer, stateful validation, and backend sync. |
| **Duplicate video binaries in Git** | High | Resolved. Media structure cleaned up to prevent duplicate asset tracking. |
| **Unused dependencies / TypeScript warnings** | Low | Resolved. Unused imports removed (`InputComponent`, etc.); strict TypeScript compilation passes with 0 errors. |

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended for Angular 21)
- npm (v10+)
- Python 3.10+ (if running Django backend locally)

### 1. Clone & Install
```bash
git clone https://github.com/JeetBhavsar14/Eventhub.git
cd Eventhub
npm install
```

### 2. Configure Environment
Check `src/environments/environment.ts`:
```typescript
export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://192.168.1.3:8000', // Points to your Django DRF backend
  demoAuth: true,
  stripePublishableKey: 'pk_test_...'
};
```
*(Optionally copy `.env.example` to `.env` for customized local variables).*

### 3. Running the Application

#### Option A: Running with Live Django Backend (Recommended)
1. Ensure your Django backend server is running on `http://192.168.1.3:8000`.
2. Start the Angular application:
   ```bash
   npm start
   ```
3. Open `http://localhost:4200` in your browser.

#### Option B: Running in Offline Demonstration Mode
If the Django backend is offline, you can run the isolated mock API server:
1. Terminal 1:
   ```bash
   npm run mock-api
   ```
2. Terminal 2:
   ```bash
   npm start
   ```

---

## Available NPM Scripts

| Command | Action |
|---|---|
| `npm start` | Starts Angular live dev server on port `4200` |
| `npm run build` | Compiles production bundle to `dist/` |
| `npm run mock-api` | Starts isolated offline mock server on port `3000` |
| `npm test` | Executes unit tests via Vitest |

---

## Developer

**Jeet Bhavsar**
- **GitHub:** [@JeetBhavsar14](https://github.com/JeetBhavsar14)
- **Project Repository:** [EventHub](https://github.com/JeetBhavsar14/Eventhub)
