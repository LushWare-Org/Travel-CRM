# AI Workflow Roadmap — Travel CRM Client & Management

## Context: what's shipped, what's still manual

Client itinerary building is now a hybrid manual/conversational flow
(`PlanYourTripContainer`'s "Enter manually" vs "Chat with AI" tabs) plus a
one-shot "Regenerate with AI" button on `CustomizePackageContainer`. Both
call package-service's Gemini-backed endpoints (`generate-itinerary-preview`,
`itinerary-chat`). Everything else customer-facing is still fully
static/manual: `content/faq.js` renders a fixed accordion; `/packages`
search/filter (`FiltersSidebar`/`Toolbar`) is manual dropdown/checkbox
filtering; package reviews (`ReviewModal`) render as a raw list with no
summarization; `MyAccount` only lists past bookings/requests with no
proactive assistance; floating actions (`FloatingActionStack`) are
WhatsApp/Call/ScrollTop only — every "talk to us" path routes straight to
a human, with no AI-mediated step first.

Confirmed across Kayak Ask AI, Expedia Romie, and Booking.com's AI Trip
Planner: none of them replaced their existing manual search/browse UI
with AI — each layers a conversational assistant alongside the existing
interface and lets it progressively narrow/fill the same underlying
search or itinerary data. Every item below follows that same principle:
augment an existing manual workflow, don't replace it outright.

## Evaluated opportunities, in priority order

1. **Conversational itinerary builder — shipped.** `PlanYourTripContainer`'s
   chat entry point, slot-filling (destination, duration, travelers,
   budget, preferences) via the `itinerary-chat` endpoint, handing off to
   the existing `generate-itinerary-preview` pipeline once dates are
   confirmed. Current workflow was a fully manual step-by-step form;
   upgrade is natural-language trip description with progressive
   clarifying questions, matching Kayak Ask AI's "open request, then hone
   criteria progressively" pattern.

2. **UI-driven trip-planning wizard — shipped.** A second `PlanYourTripContainer`
   entry mode ("Find a package with AI") that drives the same slot-filling
   loop but proposes real inventory from `package-service` (`propose_packages`)
   and answers policy questions from a server-verified `policyDocuments` store
   (`answer_policy_question`) instead of building a from-scratch itinerary —
   terminating at `CustomizePackageContainer` on a real, DB-validated package.
   See `docs/designs/ai-trip-planning-assistant.md` for the full design.

3. **Natural-language package search ("Smart Filter").** Current
   workflow: `/packages`' `FiltersSidebar`/`Toolbar` requires manually
   picking category, price range, and duration from dropdowns/checkboxes.
   Upgrade, modeled on Booking.com's Smart Filter: a text input above the
   existing filters sends free text to a small `generateStructured`
   endpoint extracting `{category?, minPrice?, maxPrice?, minDuration?,
   maxDuration?}`, then applies those values to the *existing* filter
   state — the manual filters stay visible and adjustable afterward.
   Lowest new-infrastructure cost of the unshipped items (one small
   endpoint, one input component, reuses the existing filter state
   machine end-to-end). Recommended as the next build after this plan.

4. **AI review summarization.** Current workflow: `PackageDetailsContainer`
   renders a raw review list with no synthesis. Upgrade, modeled on
   Booking.com's Review Summaries: a cacheable per-package
   `generateStructured` call producing a 2-3 sentence summary shown above
   the raw list (reviews change rarely, so this can be generated
   infrequently, not per page view). No conversation state, no new
   client-side form. Recommended as a quick follow-up alongside item 3.

5. **Sitewide FAQ/concierge chat widget.** Current workflow:
   `content/faq.js`'s static accordion plus WhatsApp/Call floating
   buttons are the only "ask a question" paths. Upgrade: a floating chat
   widget (new entry in `FloatingActionStack`, alongside `WhatsAppButton`/
   `CallButton`) answering general questions grounded in the existing FAQ
   content and live package catalog, with an explicit "Chat with a human
   on WhatsApp" escalation path for anything it can't answer — directly
   matching the confirmed best practice that complex or judgment-call
   requests still need a human. Higher cost than items 3-4 (a persistent
   widget shell, its own conversation endpoint, a retrieval step over
   FAQ/catalog content) — scope as its own plan once items 3-4 ship and
   this plan's stateless multi-turn pattern has proven out in production.

6. **Post-booking trip companion (Expedia Romie-style).** Current
   workflow: `MyAccountContainer` only lists past bookings/requests — no
   proactive check-ins, no real-time updates, no in-app messaging after
   booking. This needs infrastructure the CRM doesn't have yet
   (push/SMS notifications, live disruption data, a persistent per-trip
   conversation thread). Highest cost, lowest readiness of the items
   here — not recommended before items 2-5 ship and notification-service
   gains a delivery channel beyond email.

7. **Sales-rep AI copilot (Management app, Intercom Fin-style).** A
   different surface (Management, not Client) and a different user
   (staff, not visitor): an assistant surfacing relevant past-lead
   context, suggested replies, and quotation drafts inside Management's
   lead-management views. Intercom reports a 31% agent-efficiency lift
   from the equivalent pattern. Out of this plan's build scope (wrong
   app, wrong user) — a candidate for its own dedicated plan once items
   1-3 validate the Gemini-conversation pattern this plan establishes.

## Recommendation

Items 1-2 are shipped (this plan). Item 3 (Smart Filter) is the next
highest-value, lowest-cost follow-up: it reuses this plan's exact
`generateStructured`-extraction pattern against an already-built filter
UI. Items 5-7 are real opportunities but each has its own data/session/
escalation design decisions and need their own dedicated plans rather
than being folded into this one.
