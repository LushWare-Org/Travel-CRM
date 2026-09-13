# Flight Service — API Audit

**Date:** 2026-07-25  
**Service:** `@travel-crm/flight-service` (Port 3010)  
**Database:** PostgreSQL schema `crm_flights` (Prisma)  
**GDS Provider:** Travelport+ (mock mode until sandbox credentials available)

---

## 1. Implemented Endpoints

### POST /flights/search — ✅ Implemented (Mock Mode)
- **Controller:** `flight.controller.js:44` — `search`
- **Travelport:** `travelport.service.js:126` — `searchFlights`
- **Auth:** `requireAuth` + `authorize('salesRep', 'admin', 'superAdmin')`
- **Request:** `{ origin, destination, departureDate, returnDate?, adults, children, infants, cabinClass, tripType }`
- **Response:** `{ success, data: FlightOffer[] }`
- **Mock:** Returns 5 fake offers cycling through BA/EK/QR/SQ airlines

### POST /flights/price — ✅ Implemented (Mock Mode)
- **Controller:** `flight.controller.js:66` — `price`
- **Travelport:** `travelport.service.js:155` — `priceOffer`
- **Request:** `{ offerId }`
- **Response:** `{ success, data: { offerId, revalidated, priceChanged } }`
- **Mock:** Always returns `{ revalidated: true, priceChanged: false }`

### POST /flights/book — ✅ Implemented (Mock Mode)
- **Controller:** `flight.controller.js:74` — `book`
- **Travelport:** `travelport.service.js:171` — `createOrder`
- **DB:** Creates `FlightBooking` + `FlightSegment`(s) + `FlightTraveler`(s)
- **Cross-schema:** Finds or creates customer in `crm_users.User`
- **Request:** `{ offer, tripType, travelers[], contact { name, email, phone } }`
- **Response:** `201 { success, data: FlightBooking }`
- **Mock:** Returns fake PNR (`MOCK-XXXXXX`) and Travelport order ID

### GET /flights/bookings — ✅ Implemented (Real — DB Query)
- **Controller:** `flight.controller.js:141` — `listBookings`
- **DB:** `prisma.flightBooking.findMany` with `include: { segments, travelers }`
- **Scope:** Sales reps see only their own bookings; admin/superAdmin see all
- **Query params:** `?status=confirmed` for filtering

### GET /flights/bookings/:id — ✅ Implemented (Real — DB Query)
- **Controller:** `flight.controller.js:157` — `getBooking`
- **DB:** `prisma.flightBooking.findFirst` with scope check for sales reps
- **Response:** `{ success, data: FlightBooking }` with segments and travelers

### POST /flights/bookings/:id/cancel — ✅ Implemented (Partial Mock)
- **Controller:** `flight.controller.js:170` — `cancelBooking`
- **Travelport:** Calls `cancelOrder` if `travelportOrderId` exists (mock)
- **DB:** Updates status to `cancelled`, sets `cancelledAt` and `cancellationReason`
- **Validation:** Prevents double-cancellation (400 if already cancelled)

---

## 2. Missing / Pending APIs

These are defined in the OpenAPI spec but not yet implemented. Prioritised by business value.

| Priority | Endpoint | Rationale |
|----------|----------|-----------|
| **P1** | `GET /flights/details` | Flight status, terminal, gate, baggage — needed for customer service |
| **P2** | `GET /flights/airports` | Airport autocomplete — the Management UI has only raw 3-letter code inputs today |
| **P2** | `GET /flights/airlines` | Airline lookup — UI shows codes but no airline name search |
| **P3** | `GET /flights/bookings/:id/checkin` | Check-in URL/status — adds post-booking value |
| **P3** | `POST /flights/bookings/:id/retrieve` | Refresh booking from GDS — needed when airlines change schedules |

---

## 3. Technical Debt / Architecture Issues

### 3.1 Mock Mode via Environment Variable (`HIGH`)
**File:** `travelport.service.js:10`
```js
const isMockMode = () => process.env.TRAVELPORT_MOCK_MODE !== 'false';
```
Every function in `travelport.service.js` has `if (isMockMode()) { return fakeData; }` branches. This means:
- The mock logic is entangled with production code
- Unit testing requires env var manipulation
- Adding a new GDS provider means more if/else branches

**Proposed fix:** Abstract a `FlightApiClient` interface. Two implementations:
- `TravelportClient` — real API calls
- `MockFlightClient` — deterministic fake data for dev/test
- Inject the client via constructor/dependency injection

### 3.2 No Tests (`CRITICAL`)
No test framework configured. No unit, integration, or E2E tests exist.

**Proposed fix:** Add Vitest, write:
- Unit tests for controllers (with mocked client)
- Unit tests for middleware (auth, errorHandler)
- Integration tests for routes (with MockFlightClient)
- Contract tests against the OpenAPI spec

### 3.3 No Input Validation Middleware
Controllers do manual validation (`if (!origin || !destination) throw...`). No Joi/Zod schemas.

**Proposed fix:** Add validation middleware with Zod schemas that match the OpenAPI spec.

### 3.4 Hardcoded Travelport Dependencies
The controller imports `travelport.service.js` directly:
```js
import * as travelport from '../services/travelport.service.js';
```
No way to swap implementations. Testing the controller means mocking the entire module.

---

## 4. Database Schema (crm_flights)

### FlightBooking
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (text) | PK |
| pnr | text? | Airline record locator |
| travelportOrderId | text? | Travelport universal record ID |
| createdById | text | Agent UUID (cross-schema ref → crm_users.User) |
| customerId | text? | Customer UUID (cross-schema ref → crm_users.User) |
| invoiceId | text? | Future billing integration (not wired) |
| tripType | enum | oneWay, roundTrip, multiCity |
| cabinClass | text | Economy, Premium Economy, Business, First |
| currency | text | ISO 4217 |
| baseFare | float | |
| taxes | float | |
| totalAmount | float | baseFare + taxes |
| status | enum | quoted, pending, confirmed, ticketed, cancelled, failed |
| searchSnapshot | jsonb | Raw offer at booking time (audit/debug) |
| ticketingDeadline | timestamp? | |
| bookedAt | timestamp? | |
| cancelledAt | timestamp? | |
| cancellationReason | text? | |
| notes | text? | |

### FlightSegment
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| flightBookingId | UUID | FK → FlightBooking (CASCADE) |
| sequence | int | Segment order |
| marketingCarrier | text | IATA code |
| operatingCarrier | text? | If different from marketing |
| flightNumber | text | Including carrier prefix |
| bookingClass | text? | RBD code |
| origin | text | IATA code |
| destination | text | IATA code |
| departureAt | timestamp | |
| arrivalAt | timestamp | |
| durationMinutes | int? | |
| stops | int | Default 0 |

### FlightTraveler
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| flightBookingId | UUID | FK → FlightBooking (CASCADE) |
| type | enum | adult, child, infant |
| title | text? | Mr, Mrs, Ms, Miss |
| firstName | text | |
| lastName | text | |
| dob | date? | |
| gender | text? | |
| passportNumber | text? | |
| passportExpiry | date? | |
| nationality | text? | ISO 3166-1 alpha-2 |
| frequentFlyerNumber | text? | |

---

## 5. Recommendations for Step 2 (Tests) and Step 3 (Abstraction)

1. **Install Vitest** + supertest for HTTP-level testing
2. **Extract `FlightApiClient` interface** (JSDoc typedef) with methods: `searchFlights`, `priceOffer`, `createOrder`, `getOrder`, `cancelOrder`, `getFlightDetails`
3. **Create `MockFlightClient`** as the first implementation — move mock data from travelport.service.js
4. **Create `TravelportClient`** as the second implementation — keep existing OAuth2 + axios logic
5. **Refactor controller** to accept client via factory/dependency injection (default to env-configured client)
6. **Write tests** that inject MockFlightClient and verify controller behaviour without network calls
7. **Keep Prisma queries in the controller** — they're persistence logic, not GDS logic

---

## 6. Configuration Audit

| Env Var | Required | Used In | Status |
|---------|----------|---------|--------|
| `PORT` | Yes | index.js | ✅ 3010 |
| `DATABASE_URL` | Yes | Prisma | ✅ Set in .env |
| `DIRECT_URL` | Yes | Prisma | ✅ Set in .env |
| `TRAVELPORT_MOCK_MODE` | Yes | travelport.service.js | ✅ `true` |
| `TRAVELPORT_TOKEN_URL` | Only if not mock | travelport.service.js | ❌ Empty |
| `TRAVELPORT_CLIENT_ID` | Only if not mock | travelport.service.js | ❌ Empty |
| `TRAVELPORT_CLIENT_SECRET` | Only if not mock | travelport.service.js | ❌ Empty |
| `TRAVELPORT_API_BASE_URL` | Only if not mock | travelport.service.js | ❌ Empty |
| `TRAVELPORT_ACCESS_GROUP` | Optional | travelport.service.js | ❌ Empty |
| `CLIENT_URL` | Yes | CORS (index.js) | ✅ Set |
| `MANAGEMENT_URL` | Yes | CORS (index.js) | ✅ Set |
