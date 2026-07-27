---

# Travel CRM: Master Workflow & System Architecture

This document outlines the complete operational lifecycle within the Travel CRM, mapping the journey from initial inquiry to final invoicing. It integrates templated Packages, dynamic Lead state management, booking action handlers, pricing logic, and phased implementation guidelines for AI coding agents.

## 1. System Terminology & Core Objects

* **Packages (Templates):** Pre-configured, static itinerary blueprints (e.g., "7-Day Classic Dubai"). Packages contain predefined daily activities, suggested transport routes, and placeholder accommodation types.
* **Leads:** A dynamic, client-specific instance of a potential trip. It captures the client's intent, customizes the base Package, and stores estimated costs for quotation purposes. No live inventory is held here.
* **Bookings (Reservations):** Confirmed, real-world inventory tied to a live PNR (Passenger Name Record) or Hotel Confirmation Number. Executed via dedicated search dashboards or external supplier portals.

## 2. Lead Status Lifecycle (State Machine)

To maintain a clean pipeline, a Lead must transition through strict statuses, including roadblocks and cancellations.

| Lead State | Definition & Required Actions |
| --- | --- |
| **NEW** | Lead is captured. Rep selects a base Package template and assigns client details. |
| **DRAFTING** | Rep is actively customizing the itinerary, adjusting days, and modifying estimated costs. |
| **QUOTED** | A formal proposal (PDF/Link) has been generated and dispatched to the client. |
| **REVISION** | Client requested changes (e.g., "Upgrade to a 5-star hotel"). Rep adjusts the draft. |
| **APPROVED** | Client accepted the quote and terms. The lead is now ready for live fulfillment. |
| **BOOKING_IN_PROGRESS** | Rep is using action handlers to secure live inventory and attach PNRs. |
| **CONFIRMED** | All inventory is booked. Final invoice is generated. |
| **CLOSED_LOST** | Client rejected the quote or ghosted. Lead is archived (requires a loss reason). |
| **BOOKING_FAILED** | Inventory unavailable or payment failed during live booking. Requires manual intervention. |
| **CANCELLED** | Client cancelled post-confirmation. Triggers refunds and vendor cancellation logic. |

## 3. Inventory Fulfillment & Booking Lifecycle (Action Handlers)

While the overall Lead has a macro-status, individual items inside the itinerary (e.g., Flight, Hotel) have a micro-lifecycle. The UI must render dynamic **Action Links/Buttons** depending on the state of the parent Lead and the specific item.

### Item Micro-States & Dynamic UI Behaviors

* **State: PENDING (Lead is DRAFTING or QUOTED)**
* **Action:** Only "Search Alternatives" or "Estimate Cost" is available. Real booking links are disabled to prevent accidental premature purchases.


* **State: READY_TO_BOOK (Lead is APPROVED)**
* **Action:** The UI unlocks the primary fulfillment handlers. The button triggers one of two paths:
* *Path A (Internal API):* "Book via Dashboard" routes to `/flights?leadId=123` to purchase via connected API.
* *Path B (External Supplier):* "Open Supplier Portal" opens a new tab to an external agent portal, accompanied by an input field to paste the resulting PNR/Confirmation Code back into the CRM.




* **State: BOOKED (Inventory secured)**
* **Action:** The booking button transforms into "View PNR", "Download Voucher", or "Manage Booking".


* **State: FAILED (API failure or sold out)**
* **Action:** Shows a red warning. Button changes to "Resolve Error" or "Search Alternatives".



## 4. Exception Handling & Sad Path Workflows

* **Scenario A: The Lost Lead (Phase 2)**
* *Trigger:* Client rejects the price or ghosts.
* *Action:* Rep logs a loss reason. System releases holds and archives the lead.
* *State Transition:* `QUOTED` / `REVISION` → `CLOSED_LOST`.


* **Scenario B: The Inventory Failure (Phase 3)**
* *Trigger:* API returns `INVENTORY_UNAVAILABLE` during live booking.
* *Action:* Alerts the rep to manually intervene, find alternatives, or re-quote.
* *State Transition:* `BOOKING_IN_PROGRESS` → `BOOKING_FAILED`.


* **Scenario C: The Post-Confirmation Cancellation (Phase 4)**
* *Trigger:* Client requests an emergency cancellation after booking.
* *Action:* Generates a cancellation task list. Rep manually executes API cancellation endpoints, logs vendor penalties, and triggers partial refunds.
* *State Transition:* `CONFIRMED` → `CANCELLED`.



## 5. Pricing Engine Specification

The system maintains a unified financial entity attached to the Lead object, divided into three lifecycle phases: Estimated, Client, and Actual Pricing.

### Data Schema Requirements

* **Estimated Costs:** Package Base Cost, Estimated Flight Cost, Estimated Hotel Cost, Total Estimated Cost.
* **Client Pricing:** Markup Strategy (`PERCENTAGE` or `FLAT_FEE`), Markup Value, Quoted Selling Price, Deposit Paid, Balance Due.
* **Actual Costs:** Actual Flight Cost, Actual Hotel Cost, Total Actual Cost, Final Realized Profit.

### Calculation Rules & Business Logic

* **Rule 1 - Estimated Cost:** Total Estimated Cost = Package Base Cost + Estimated Flight Cost + Estimated Hotel Cost.
* **Rule 2 - Quoted Price:**
* If `PERCENTAGE`: Quoted Selling Price = Total Estimated Cost * (1 + (Markup Value / 100)).
* If `FLAT_FEE`: Quoted Selling Price = Total Estimated Cost + Markup Value.


* **Rule 3 - Balance:** Balance Due = Quoted Selling Price - Deposit Paid.
* **Rule 4 - Actual Cost:** Total Actual Cost = Package Base Cost + Actual Flight Cost + Actual Hotel Cost.
* **Rule 5 - Profit Reconciliation:** Final Realized Profit = Quoted Selling Price - Total Actual Cost.

### System Behaviors & State Gatekeepers

* **Quotation Gatekeeper:** A Lead in the `DRAFTING` state cannot transition to `QUOTED` unless the Quoted Selling Price is > 0.
* **Approval Gatekeeper:** A Lead in the `QUOTED` or `REVISION` state cannot transition to `APPROVED` unless a valid Deposit Paid amount is recorded.
* **Confirmation Gatekeeper:** A Lead in the `BOOKING_IN_PROGRESS` state cannot transition to `CONFIRMED` if the Actual Flight Cost or Actual Hotel Cost fields are missing or zero.
* **Profit Recalculation Trigger:** When an item state changes to `BOOKED`, the system must automatically recalculate and persistently update the Total Actual Cost and Final Realized Profit fields.

## 6. Phased Implementation Plan (For AI Agent)

When refactoring the existing codebase, execute commands in this exact sequence to maintain stability:

1. **Phase 1: Database & Schema Migration**
* Update Lead schemas to include the nested `financials` object.
* Add the micro-state enums (`PENDING`, `READY_TO_BOOK`, `BOOKED`, `FAILED`) to itinerary line items.
* Include optional fields for `supplierPortalUrl` and `pnrCode`.


2. **Phase 2: State Machine Gatekeepers (Backend)**
* Implement logic to block state transitions (`QUOTED`, `APPROVED`, `CONFIRMED`) based on the gatekeeper rules in Section 5.


3. **Phase 3: Dynamic Action Handlers (Frontend UI)**
* Refactor the Lead Itinerary components to support micro-state logic.
* Implement conditional rendering for the booking buttons: Disable links when `PENDING`, enable internal router handoffs or external supplier links when `READY_TO_BOOK`, and display PNR data when `BOOKED`.


4. **Phase 4: Pricing Engine Validation**
* Implement the 5 Calculation Rules in the backend utility classes.
* Write tests to ensure that moving a line item to `BOOKED` properly recalculates the `Final Realized Profit`.