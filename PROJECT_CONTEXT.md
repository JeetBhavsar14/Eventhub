# EventHub — AI Project Context

Use this document as context when asking an AI to review, extend, or debug this repository.

## Purpose and status

EventHub is an Angular single-page event-discovery application. Users can browse events by city, filter events, view details, register/login, and edit their profile. It currently uses `json-server` and `db.json` as a local mock backend; it is not production authentication or authorization.

The application is actively being built. The discovery and profile flows are implemented; bookings, payment methods, favourites, management dashboards, and admin screens are currently placeholders or demos.

## Technology

| Area | Choice |
| --- | --- |
| Frontend | Angular 21 standalone components |
| Language | TypeScript 5.9, strict mode |
| State | Angular signals plus services |
| Forms | Template-driven forms and Reactive Forms |
| HTTP | Axios behind `ApiClient` |
| Mock backend | `json-server` on `http://localhost:3000` |
| Testing | Vitest setup; only a small number of specs currently exist |

## Run commands

Run these in separate terminals from the repository root (`Eventhub`):

```powershell
npm install
npm run mock-api  # watches db.json on port 3000
npm start         # Angular dev server
```

Other useful commands:

```powershell
npm run build
npm test
node generate-events.js  # regenerates the mock event collection in db.json
```

## Project structure

```text
src/app/
  core/       # API, auth, storage, models, global state, authorization
  features/   # routed screens: auth, discover, event-details, profile
  layout/     # shell and layouts for public, management, and admin areas
  shared/     # reusable UI components, form components, SVG assets
  app.routes.ts
  app.config.ts
db.json       # local mock API database
```

Path aliases are defined in `tsconfig.json`:

```ts
@core/*     -> src/app/core/*
@shared/*   -> src/app/shared/*
@layout/*   -> src/app/layout/*
@features/* -> src/app/features/*
```

## Routing and layouts

`src/app/app.routes.ts` defines the application routes.

| Route | Component / behavior | Status |
| --- | --- | --- |
| `/`, `/discover` | `DiscoverComponent` in `MainLayoutComponent` | Implemented |
| `/events/:id` | `EventDetailsComponent` | Implemented; booking is placeholder |
| `/auth/login`, `/auth/register` | Auth screens | Implemented against mock API |
| `/profile` | `Profile` | Guarded; profile details persist |
| `/bookings` | `DummyUser` | Placeholder |
| `/manage/:eventId` | `DummyDashboard` | Guarded placeholder |
| `/admin` | `DummyAdmin` | Guarded placeholder |

`ShellComponent` is the outer route host. `MainLayoutComponent` supplies the shared header/footer for the main public/user pages. Management and admin have separate layout components for future work.

## Core services and data flow

### API (`core/api`)

- `axios-instance.ts`: Axios instance with base URL `http://localhost:3000`, JSON headers, and a mock Bearer-token interceptor.
- `api-client.service.ts`: typed `get`, `post`, `put`, `patch`, and `delete` methods. Each returns `{ data, error }` rather than throwing API errors to callers.
- `api-error.handler.ts`: maps Axios errors to the app's `ApiError` shape.

### Authentication (`core/auth`)

`AuthService` owns the session through an internal signal and exposes computed signals:

- `currentUser`
- `isAuthenticated`
- `isLoading`
- `token`

On successful login or registration it stores a safe user object (without the mock password) under `eventhub_user`, creates a mock JWT under `eventhub_token`, and updates the signal. On application construction it restores the session from local storage. `authGuard` protects authenticated routes.

Important: passwords and tokens are mock development behavior. Do not treat this implementation as secure production auth.

### Profile persistence

The profile page delegates editable personal details to `shared/forms/profile-form`.

```text
ProfileFormComponent emits UserProfileUpdate
  -> Profile.saveProfile(...)
  -> AuthService.updateProfile(...)
  -> PATCH /users/:id (json-server writes db.json)
  -> update AuthService signal + localStorage
  -> Header and profile UI react through currentUser()
```

Editable fields are `firstName`, `lastName`, `phone`, and `bio`. Email is intentionally disabled because email changes need a separate uniqueness and verification workflow. `UserProfileUpdate` is in `core/models/user.model.ts`.

### Global state and authorization

- `LocationService` owns `selectedCity` as a signal (default: Mumbai). Header city selection updates this signal; discovery reloads events reactively.
- `PermissionService` computes permissions from an active `EventMembership`, policy registry, direct permissions, and a `super_admin` override.
- `HasPermissionDirective` conditionally renders template content with `*appHasPermission`.

This authorization model is only scaffolded: memberships are not loaded from the API yet, and management/admin pages are placeholders.

## Features

### Discover (`features/discover`)

`DiscoverComponent` loads city-specific events from `/events`, supports category/type/date/price filtering, reflects filters in URL query parameters, and runs a promotional carousel for `isPopular` events. `EventFilterComponent` emits the selected filter state. Some filtering is client-side because the mock data/API is deliberately simple.

Current caveats:

- Event values are broadly typed as `any[]`; create event models before expanding this feature.
- “Today”, “Tomorrow”, etc. are hard-coded to the mock November 2026 data, not calculated from the clock.
- Currency labels have character-encoding corruption in some source/data strings and should be normalized to `₹`.

### Event details (`features/event-details`)

Loads a single event by route id (`GET /events/:id`) and shows loading/error state. `bookTicket()` currently only displays an alert; no booking is written yet.

### Auth (`features/auth`)

- Login queries `GET /users?email=...` then compares the password locally.
- Register first checks email availability and then `POST`s a new user to `/users`.
- Forms use the shared `app-input` and `app-button` controls.

### Profile (`features/profile`)

Contains sidebar tabs for personal info, preferences, payments, and favourites. Only personal info is implemented. It hosts `app-profile-form` and displays save success/failure feedback. The profile header reacts to the current authenticated user.

## Shared UI

- `shared/components/input`: ControlValueAccessor-compatible input used with template-driven and reactive forms.
- `shared/components/button`: styled reusable button.
- `shared/components/header`: navigation, auth menu, city picker, and app-wide location interactions.
- `shared/components/footer`: application footer.
- `shared/components/event-filter`: discover-page filter controls.
- `shared/forms/profile-form`: reusable Reactive Form for personal-profile editing; it emits data and does not directly perform HTTP work.
- `shared/assets/svgs.ts`: SVG-string collection. Components sanitize trusted internal SVG strings before binding them as HTML.

## Data model and mock API

`db.json` is the data source used by json-server. Main collections are:

| Collection | Main use |
| --- | --- |
| `users` | Authentication and profile data; mock records include `password` |
| `events` | Discovery and details data, including nested location and ticket types |
| `categories` | Category seed data; not yet the primary source for UI categories |
| `bookings` | Empty/incomplete future feature |
| `notifications` | Empty/incomplete future feature |

User shape: `id`, `email`, `password` (mock database only), `firstName`, `lastName`, `phone`, optional `bio`, optional `avatarUrl`, verification flags, host/role fields, and `createdAt`.

Event records currently contain id, title, description, category/subcategory, format/status, promotional flags, thumbnail, date/time, location, capacity, ticket types, host id, and created time.

## Important current development behavior

`src/app/app.ts` contains **temporary foundation-test code** in `ngOnInit()` that automatically calls login with the seeded Jeet user and sets a sample manager membership while writing diagnostic logs. Remove this before user-facing testing or production work; otherwise it overrides normal session expectations.

## Engineering conventions

- Prefer standalone Angular components.
- Keep page orchestration in `features/`; extract reusable visual controls to `shared/components` and reusable forms to `shared/forms`.
- Put API/session behavior in services, not templates or form presentation components.
- Prefer `@core`, `@shared`, etc. aliases over long relative imports.
- `ApiClient` returns `{ data, error }`; callers should check `error` instead of assuming a request succeeds.
- Keep the local authenticated-user signal and local storage synchronized after mutations, as done in `AuthService.updateProfile`.

## Recommended review priorities

1. Remove the automatic login and permission demo from `app.ts`.
2. Replace `any` event/filter types with explicit models and centralize filter types (they are currently declared in more than one location).
3. Replace mock password comparison/JWT generation with a real backend authentication flow before deployment.
4. Turn hard-coded date filtering into date-based calculations and repair malformed currency/emoji encoding.
5. Implement bookings, user preferences, payment methods, favourites, and real management/admin pages.
6. Add tests for auth, profile saving, API error states, filters, and route guards.
7. Add server-side authorization; the current client-side permission layer is only for UI visibility, not security.

## Suggested prompt for a reviewing AI

> Review this Angular 21 EventHub application. It uses standalone components, Angular signals, Axios, and json-server (`db.json`) as a mock backend. Read `PROJECT_CONTEXT.md` first. Focus on correctness, strict TypeScript quality, Angular best practices, state synchronization, security boundaries, accessibility, and maintainability. Do not propose production authentication based on the current mock-password implementation; describe a proper migration path instead. Identify concrete issues by file and give prioritized fixes.
