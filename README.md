# EventHub — Modern Event Management & Discovery Platform

[![Angular](https://img.shields.io/badge/Angular-21.0-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Prototype-Active_Development-4F46E5?style=for-the-badge)](#)

**EventHub** is a modern, full-featured event discovery, hosting, operations, and governance web application built with **Angular 21 (Standalone Components & Signals)** and powered by a local REST mock backend (`json-server`).

The platform provides a complete ecosystem for all event stakeholders:
- 🎟️ **Attendees & Public Users**: Discover events, filter by category/city/date, inspect venue details, book tickets with interactive seat selection, apply gift cards/offers, and manage tickets with live QR codes.
- 🏢 **Event Hosts**: Create and edit event listings, manage tier pricing, monitor ticket sales & revenue analytics, manage team staff permissions, and submit organizer verification dossiers.
- ⚡ **Management / Operations Staff**: Review incoming event approvals, inspect changes requested, manage live operational incidents, and monitor attendance metrics.
- 🛡️ **Super Admin**: Platform-wide governance, user directory role reassignment (freeze/suspend/assign roles), event curation gatekeeping (Hero showcase / Delist), host verification queue (with responsive mobile cards), and financial GMV / 5% platform cut escrow settlements.

---

## 🚀 Quick Start & Development Setup

### Prerequisites
- **Node.js**: v18+ or v20+
- **npm**: v9+ (or v11)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd Eventhub
npm install
```

### 2. Run Local Mock Backend (`json-server`)
The application uses `db.json` on port `3000` to simulate database records and REST endpoints:
```bash
npm run mock-api
```
*(Starts REST API at `http://localhost:3000`)*

### 3. Start Angular Development Server
In a separate terminal, launch the Angular application:
```bash
npm start
# or: ng serve
```
Open your browser and navigate to: **`http://localhost:4200/`**

---

## 🔐 Demo Credentials & Role Access

| Role | Email | Password | Assigned Landing Route |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@eventhub.com` | `admin123` | `/admin` |
| **Host / Organizer** | `host@eventhub.com` | `host123` | `/host/dashboard` |
| **Management / Ops** | `management@eventhub.com` | `manage123` | `/management` |
| **Field Staff** | `staff@eventhub.com` | `staff123` | `/staff` |
| **Standard User** | `jeet@eventhub.com` | `password123` | `/discover` |

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Angular 21** | 100% Standalone components, reactive Signals, inject-based DI |
| **Language** | **TypeScript 5.9** | Strict type-safety, robust interface contracts |
| **Styling** | **Vanilla CSS3** | Custom design tokens, glassmorphism, responsive flex/grid layouts |
| **State Management** | **Angular Signals** | `signal()`, `computed()`, and reactive service stores |
| **HTTP Client** | **Axios + ApiClient** | Wrapped under `@core/api/api-client.service.ts` returning `{ data, error }` |
| **Mock Database** | **json-server** | `db.json` containing users, events, host applications, payouts, & tickets |
| **QR Code Generation**| **qrcode** | Dynamic QR code generation for digital event ticket check-ins |

---

## 📁 Repository Directory Structure

```text
Eventhub/
├── db.json                     # Mock database (Users, Events, Applications, Settlements)
├── generate-events.js          # Generator script for mock event data
├── src/
│   ├── app/
│   │   ├── core/               # Singleton services, models, auth guards, API client
│   │   │   ├── api/            # Axios instance, error handler, API client wrapper
│   │   │   ├── auth/           # AuthService, JWT storage, role-based route guards
│   │   │   ├── models/         # TypeScript interfaces (User, Event, HostApp, Payout)
│   │   │   └── state/          # Signal-driven stores (ManagementService, HostDashboardService)
│   │   ├── features/           # Routed domain views
│   │   │   ├── auth/           # Login & Register components
│   │   │   ├── discover/       # Event discovery catalog with search and filters
│   │   │   ├── event-details/  # Single event deep dive, venue details & ticket selection
│   │   │   ├── checkout/       # Checkout flow, discount codes & payment methods
│   │   │   ├── bookings/       # User ticket dashboard with live QR codes & receipt modal
│   │   │   ├── offers/         # Active promo codes and seasonal discounts
│   │   │   ├── gift-cards/     # Digital gift card catalog and gifting checkout
│   │   │   ├── profile/        # User profile, notifications, and security settings
│   │   │   └── host-event/     # Onboarding form to register as a verified event host
│   │   ├── layout/             # Platform shells and role workspaces
│   │   │   ├── shell/          # Outer application shell and navigation wrapper
│   │   │   ├── main-layout/    # Public customer header, search, and footer
│   │   │   ├── admin-layout/   # Super Admin dashboard (Governance, Curation, Payouts)
│   │   │   ├── host-layout/    # Host workspace (Event creation, stats, team members)
│   │   │   ├── management-layout/ # Operations dashboard (Approval pipeline, live events)
│   │   │   └── staff-layout/   # Check-in scanner portal for field staff
│   │   ├── shared/             # Reusable UI components, modals, and SVG icon sets
│   │   ├── app.routes.ts       # Master route definitions and role-based guards
│   │   └── app.config.ts       # Application providers
└── README.md
```

---

## 🛣️ Roadmap & Future Engineering Enhancements

The current prototype provides an end-to-end dynamic workflow. The following tasks are prioritized for subsequent development phases:

### 1. ⚡ Performance & Lazy Loading Architecture
- **Route-Level Code Splitting**: Currently, feature components and layout workspaces are eagerly imported in `app.routes.ts`. Refactor all routes to use `loadComponent()` and `loadChildren()`:
  ```ts
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout/admin-layout').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard]
  }
  ```
- **Heavy Dependency Lazy Loading**: Lazy-load secondary utility libraries like `qrcode` dynamically only when a ticket receipt or modal is opened.
- **Image Optimization**: Replace standard `<img>` tags with Angular's `@defer` blocks and `NgOptimizedImage` (`ngSrc`) with priority hints for hero banners.

### 2. 🎯 Change Detection Optimization (`ChangeDetectionStrategy.OnPush`)
- **Adopt `OnPush` Across All Components**: Explicitly configure `changeDetection: ChangeDetectionStrategy.OnPush` on all feature components and layout shells.
- **Signal-Native Reactivity**: Because state is managed via Angular `signal()` and `computed()`, switching to `OnPush` will eliminate unnecessary component tree re-evaluations, improving frame rates and rendering performance.

### 3. 🎨 UI & UX Improvements
- **Micro-Interactions & Transitions**:
  - Add page transition animations using Angular View Transitions API (`withViewTransitions()` in `provideRouter`).
  - Skeleton loading states for event cards, user dossiers, and analytics charts.
- **Mobile & Accessibility (a11y)**:
  - Add ARIA attributes (`aria-expanded`, `aria-modal`, `role="dialog"`) across all custom confirmation modals and slide-out drawers.
  - Implement full keyboard accessibility (`Tab`, `Esc`, arrow keys) for dropdowns and filter chips.
- **Advanced Data Visualizations**:
  - Integrate interactive vector sparklines or SVG charts in the Admin Financial performance and Host Analytics panels.
  - Export CSV / PDF receipts for payouts and ticket bookings.
- **Form Validation & Toast Notifications**:
  - Convert remaining template-driven forms to reactive forms with real-time inline validation feedback.
  - Global toast notification queue service replacing ad-hoc inline alerts.

### 4. 🔒 Production Readiness & Backend Integration
- Replace local `json-server` mock with a production backend (NestJS / Node / Go / Spring Boot).
- Real JWT authentication with HTTP-only cookies, refresh token rotation, and BCrypt password hashing.
- Cloud storage integration (AWS S3 / Cloudinary) for event banners, organizer identity proofs, and profile avatars.

---

## 📜 Available Scripts

| Script | Purpose |
| :--- | :--- |
| `npm start` | Runs Angular dev server on `http://localhost:4200` |
| `npm run mock-api` | Runs json-server watching `db.json` on port `3000` |
| `npm run build` | Builds the production bundle in `dist/Eventhub` |
| `npm run watch` | Builds and watches for changes in development mode |
| `npm test` | Runs unit test suite using Vitest |
| `node generate-events.js` | Generates a fresh mock batch of events into `db.json` |

---

## 📋 Live Implementation Tracker

This tracker documents our progress against the architecture specifications in `docs/PROJECT_CONTEXT.md` and `docs/DEVELOPMENT_CHECKLIST.md`. As remaining items are developed and verified, they are moved to the Completed list.

### ✅ Completed & Verified
- [x] **Foundation Architecture**: Centralized Axios `ApiClient`, Angular Signals reactive store, Storage services, and Route Guards.
- [x] **Authentication & Role Redirection**: Mock JWT auth with automated role-based landing redirection (`/admin`, `/host/dashboard`, `/management`, `/staff`, `/discover`).
- [x] **Phase 1 — Public Event Discovery**: Full event discovery catalog, search, multi-category filters, city switcher, responsive hero banner, and event detail views.
- [x] **Phase 3 — Booking & Dynamic QR Tickets**: Interactive seat/ticket selection, checkout flow with discounts/gift cards, and ticket dashboard with live QR code generation.
- [x] **Phase 4 — Host SaaS Platform**: Host dashboard, event creator, sales KPIs, and team staff management.
- [x] **Phase 5 — Event Ownership & Multi-Owner Allocation**:
  - [x] Multiple co-owners allocation totaling exactly 100% equity with real-time pool validation.
  - [x] Interactive visual equity progress bar & dynamic stake range sliders.
  - [x] Multiple Event Manager assignments with operational portfolios (Operations, Logistics, Sponsorships, AV, Safety).
  - [x] Temporary management authority delegation toggles.
  - [x] Event Participant management (Speakers, Artists, Brand Sponsors).
- [x] **Phase 7 — Attendance & Staff Portal**: Field staff check-in portal (`/staff`), ticket validator scanner, and real-time attendance counter.
- [x] **Phase 11 — Super Admin Governance**: Platform analytics, Host Approvals, Event Curation gatekeeper (hero showcase / delist), User Directory & Dossier management, and Financial Settlement queue (all views mobile-optimized with card layouts).
- [x] **High-Resolution Typography**: Preconnected Google Fonts, subpixel font antialiasing (`-webkit-font-smoothing`, `-moz-osx-font-smoothing`), OpenType Inter glyphs (`cv02`, `cv03`, `cv04`, `cv11`), and tabular numerals (`tabular-nums`) for currency and stats.
- [x] **Phase 8.1 — Global Toast Notification System**: Signal-driven reactive Toast service with dynamic queues, multi-severity styling (success, error, warning, info), auto-dismiss, and accessibility.
- [x] **Shared UI Architecture & Layout Refactoring**:
  - [x] **Reusable Pagination System**: `PaginationBarComponent` with dynamic page slicing, page-size selectors (`6 / 12 / 24`), item counting, and smooth scroll.
  - [x] **Reusable Confirmation Modals**: `ConfirmDialogComponent` replacing ad-hoc modals across admin governance and host destructive actions.
  - [x] **Event Edit & Admin Approval Workflow**: Full in-drawer event editing with change-request rationale submitted directly to Admin re-approval queue.
  - [x] **Host Layout Decomposition (Complete)**: Fully modularized the monolithic `HostLayoutComponent` into 7 scoped standalone components with encapsulated styles, responsive breakpoints (desktop down to 320px mobile), and typed inputs/outputs:
    - [x] `HostOverviewComponent`: Stats KPI cards, SVG trend performance chart, recent events table, and timeline sidebar.
    - [x] `HostMyEventsComponent`: Full event portfolio grid, search/filter controls, and pagination bar.
    - [x] `HostBookingsComponent`: Attendee roster data table, CSV exporter, search filtering, and page-size selector.
    - [x] `HostTeamComponent`: 100% equity governance bar, co-owners sliders, manager portfolios, staff roster, participant management, and dispatched invites tracker.
    - [x] `HostAnalyticsComponent`: Time-period toggle, KPI summary cards, traffic source bars, and top-performing events.
    - [x] `HostNotificationsComponent`: Notification activity cards, unread badges, action tags, and mark-all-read action.
    - [x] `HostSettingsComponent`: Host organizer profile, business credentials, and bank payout verification banner.

### ⏳ Remaining Things To Do (Backlog)
- [ ] **Phase 6 — Permission Management Center UI**:
  - [ ] Visual UI for inspecting and editing permission policies (Registration, Venue, Technical, Security).
  - [ ] Direct permission overrides per user.
  - [ ] Effective Permission computation viewer (Policy + Direct).
- [ ] **Phase 8 — In-App Notifications Center**:
  - [ ] Top-nav notification bell with interactive dropdown panel.
  - [ ] Role-specific notifications (event approval/rejection, booking confirmation, payout released, staff invite).
  - [ ] Read/unread state persistence in `db.json`.
- [ ] **Phase 9 — Post-Attendance Event Reviews & Ratings**:
  - [ ] Verified attendee review submission form ($1-5$ stars + comments) after check-in.
  - [ ] Public ratings display and reviews list on Event Details page.
- [ ] **Phase 10 — Corporate & Group Booking Workflow**:
  - [ ] Corporate bulk ticket request entry point and custom organization quote form.
  - [ ] Host/Management review and invoice approval queue.
- [ ] **Phase 12 — Django REST Framework Backend Integration**:
  - [ ] Replace `json-server` (`db.json`) with Django REST API endpoints while preserving the current frontend `ApiClient` layer.



