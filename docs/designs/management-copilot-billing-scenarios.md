# Travel AR Scenario Catalogue — billing descriptor evaluation corpus

Seed corpus for `Services/assistant-service/src/evaluation/managementBriefingEvaluation.js`, for the `billing` page key in `docs/designs/management-copilot-all-pages.md`.

**Provenance.** Assembled 2026-09-10 from primary industry sources read directly (the search tool was unavailable). Each item is marked `[S]` when read from a cited source and `[K]` when it comes from domain knowledge of agency operations. **No item is derived from LushWare data** — these are detection patterns, not records. Anything used as a fixture must be constructed, never copied from the live database.

**How to use it.** Each item names the real fields or dates a system needs to detect it. Items whose fields do not exist in `Services/billing-service/prisma/schema.prisma` are marked **NEW FIELD**, and double as the field-gap list for the billing descriptor.

---

## A. Pre-sale — a quotation is a price hold, not a commitment

**1. Airline ticketing time limit about to lapse** `[S]`
A held PNR must be ticketed by the carrier's time limit or the fare and seat are lost, and the agency must fund the airline at issuance — before the customer has paid.
Detect: `pnr.ticketingTimeLimit`, `fareClass`, `customerPaymentReceivedAt`, `settlementMethod`. **NEW FIELD** (nothing in billing-service models ticketing deadlines).

**2. BSP remittance lands before customer collection** `[S]`
Airline cash sales must reach the IATA clearing bank by the 5th working or 7th calendar day after the reporting date (15th and last day on twice-monthly cycles), so the agency fronts the gap.
Detect: `reportingDate`, `remittanceDueDate`, `airlineSalesAmount`, `customerReceiptDate`. **NEW FIELD**

**3. Airline debit memo (ADM) after ticketing** `[S]`
The carrier bills back a fare-rule breach post-sale on a short dispute clock; the agency absorbs it unless it can recover from the customer.
Detect: `admReference`, `admIssueDate`, `disputeDeadline`, `linkedTicketNumber`, `customerInvoiceId`. **NEW FIELD**

**4. Quotation price-hold expiry** `[K]`
Travel quotes re-fare: fare classes and hotel rates expire, so a valid-looking quotation silently stops being payable at the quoted total.
Detect: `Quotation.validUntil`, `quotedTotal`, `status`. Fields exist.

**5. FX movement between quote, deposit and balance** `[K]`
Suppliers bill in foreign currency while the customer pays locally; the rate at quote is not the rate at balance.
Detect: `quoteCurrency`, `settlementCurrency`, `fxRateAtQuote`, `fxRateAtPayment`, `fxVariance`. `Invoice.currency` exists; the rate fields are **NEW FIELD**.

## B. Deposit and balance — hard forfeiture dates

**6. Non-refundable deposit forfeiture at the balance deadline** `[S]`
Operator deposits are non-refundable, and a missed balance lets the operator cancel and retain the deposit.
Detect: `depositAmount`, `depositRefundable`, `balanceDueDate`, `departureDate`. **NEW FIELD** (billing-service has no deposit model).

**7. Balance due 60/90 days before departure** `[S]`
Late balance triggers a re-rate or cancellation, and the window differs by product (90 days for premium trips).
Detect: `balanceDueDate`, `departureDate`, `paidToDate`, `outstandingBalance`, `productType`. `Invoice.dueDate` and `outstandingAmount` exist; `departureDate` lives on the Voucher (`travelStartDate`), so this is a cross-document read.

**8. Instalment plan behind schedule** `[K]`
Agencies sell multi-payment plans; a missed instalment breaches terms before the balance date.
Detect: `planId`, `instalmentDueDate`, `instalmentsPaid`, `instalmentsRemaining`. `PaymentHistory` covers individual payments; the plan itself is **NEW FIELD**.

## C. Supplier-facing obligations that must precede customer payment

**9. Supplier payment precedes customer payment (negative float)** `[K]`
DMCs, hotels and cruise lines demand payment before the customer's balance is due, so the agency fronts cash.
Detect: `supplierPaymentDueDate`, `supplierAmount`, `customerBalanceDueDate`. **NEW FIELD**, and it is the canonical cross-entity comparison the rule vocabulary cannot express.

**10. Unticketed hold / option auto-release** `[K]`
Hotel and non-ticketed air holds expire automatically if no deposit lands.
Detect: `holdExpiresAt`, `bookingStatus`, `supplierConfirmStatus`. **NEW FIELD**

**11. Hotel free-cancellation window closing** `[K]`
Resorts and group blocks charge a night or the whole stay after the free-cancel date; the agency must act before it, not after.
Detect: `freeCancellationUntil`, `checkInDate`, `penaltyAmountAfter`. **NEW FIELD**

**12. Voucher issued without matching supplier payment, or vice versa** `[K]`
Prepaid vouchers are the customer's proof of a paid service; a voucher out before the supplier is paid — or a supplier paid with no voucher out — is an exception.
Detect: `Voucher.status`, `Voucher.createdAt`, supplier payment record. Both documents exist in billing-service; the comparison is cross-document.

## D. Change and cancellation

**13. Held deposit not re-applied** `[S]`
A cancelled trip's deposit is retained as a transferable credit; unapplied it is a dead liability, and the customer may forfeit it when applied to a cheaper trip.
Detect: `heldDepositAmount`, `heldSince`, `appliedToBookingId`. **NEW FIELD**

**14. Refund versus credit note after cancellation or force majeure** `[S]`
Operators may offer a 110% travel credit (expiry no sooner than 2 years, not cashable) or a refund minus unrecoverable costs — the wrong instrument misstates both cash and liability.
Detect: `cancellationReason`, `settlementInstrument`, `CreditNote.creditExpiryDate`, `unrecoverableCosts`, `originalInvoiceId`. `CreditNote` exists and is currently unmodelled in the plan.

**15. Commission / service-fee clawback on void or refund** `[S]`
Commission and issuance service fees paid at issue reverse on refund or void, and refunds run back through BSP.
Detect: `commissionPaid`, `commissionStatus`, `ticketStatus`, `refundReference`. **NEW FIELD**

## E. Document and traveller-data gates

**16. Passport or visa timing blocks the booking** `[S]`
A passport must be valid six months past travel, and visas must be lodged before supplier deadlines; missing documents can cancel the booking with no refund.
Detect: `passportExpiry`, `visaRequired`, `visaApplicationDeadline`. **NEW FIELD** — and note the deadline is relative to the *travel date*, not to now, which the vocabulary cannot express either.

**17. Name mismatch or change after ticketing** `[S]`
Names must match the passport at issue, changes are barred inside 10 days of departure and penalised otherwise, and a mismatch is an ADM waiting to happen.
Detect: `ticketIssuedAt`, `bookedName`, `passportName`, `changeDeadline`. **NEW FIELD**, and it needs an equality comparison the vocabulary has no predicate for.

**18. Mandatory document deadline gating the tour** `[S]`
Medical forms and permit data are due by a fixed date, often at final payment, or the operator may cancel and levy fees.
Detect: `documentRequiredType`, `documentDueDate`, `documentReceivedAt`, `finalPaymentDate`. **NEW FIELD**

---

## Mapping to the shared predicates

After the plan adds `groupedCount` and `groupedShare`:

| Predicate | Items it covers |
|---|---|
| `expiringWithin` | 1, 4, 8 (as holds), 10, 11 |
| `overdueBy` (status-gated) | 2, 6, 7, 8, 18 |
| `thresholdExceeded` | 5 (on a stored variance) |
| `missingField` | 12, 18 |
| `groupedCount` / `groupedShare` | any per-customer concentration across items 6, 7, 13 |
| **Still needs the escape hatch** | 3, 9, 14, 15, 16, 17 |

The seven that still escape split into three causes: **cross-entity date precedence** (9), **categorical or equality checks** (3, 14, 15, 17), and **deadlines relative to a domain date rather than to now** (16). None of the three is closed by a keyed aggregate. If a second vocabulary addition is ever warranted, `equalityMismatch(fieldA, fieldB)` covers the largest group of those (four items).

## Sources

- IATA BSP overview and settlement framework — https://www.iata.org/en/services/finance/bsp/
- IATA BSP remittance rule change (Resolution 812) — https://www.iata.org/contentassets/2e17a392af2549e688bf04aa8065a05b/recent-changes-to-bsp-remittance-rules.pdf
- IATA Easy Pay (funds blocked at issuance) — https://www.iata.org/en/services/finance/iata-easy-pay/
- IATA financial services index (ICCS currency settlement) — https://www.iata.org/en/services/finance/
- G Adventures booking terms — deposit table, Lifetime Deposit, balance due 60/90 days, cancellation bands, 110% credit, passport validity, no-changes-within-10-days, medical form deadline — https://www.gadventures.com/terms-conditions/booking-terms/usa-booking-terms/

---

## Worked example — five constructed overdue invoices

**These are constructed scenarios, not records.** They use the real `Invoice` scalar fields so the vocabulary mapping is meaningful, but no LushWare customer was ever billed for them. Any fixture derived from this section must be re-constructed, never copied from the live database.

| # | Constructed record | Veteran sentence | Verdict |
|---|---|---|---|
| 1 | `INV-2026-0417` · USD 8,940 · `dueDate` +21d · `status: sent` · `paymentStatus: unpaid` · flights, `destination: DXB` | "This one's upside down. We ticket Thursday, the airline takes the money Friday out of BSP, and the customer isn't due until the 21st. We're financing them for three weeks and nobody agreed to that." | **ESCAPE** — cross-entity date precedence (item 9), and the supplier date does not exist in billing-service |
| 2 | `INV-2026-0388` · USD 12,400 · `dueDate` −14d · `paymentStatus: partial` · `paidAmount` 7,440 · last receipt 40 days ago | "They paid the deposit and went quiet. Forty days since the last receipt, balance was due a fortnight ago, and we've not heard a word." | **AWKWARD** — `overdueBy` gets the first half; "nothing since" needs `staleForDays` on the latest receipt, which the page must precompute |
| 3 | `INV-2026-0356` · USD 3,150 · `dueDate` −47d · `paymentStatus: unpaid` · `remindersSent: 4` | "Fourth reminder and still nothing. At this point the phone call is overdue, not the invoice." | **AWKWARD** — `thresholdExceeded(remindersSent, 3)` fires but has no status gate, so it also flags invoices since paid |
| 4 | `INV-2026-0402` / `-0409` / `-0411` · same `customerEmail` · USD 5,600 + 2,300 + 1,850, all past `dueDate` | "Don't chase these three separately. It's one customer, and together they owe more than any single invoice suggests." | **ESCAPE** — no predicate groups records; **closed by `groupedCount`** |
| 5 | `INV-2026-0431` · USD 15,800 · `sentAt` −30d · `viewedAt: null` · `dueDate` −3d · travel departs in 9 days | "They've never even opened the invoice and they fly in nine days. If the balance doesn't land by Friday we lose their deposit and the seats go back." | **ESCAPE** — two unlinked insights, plus the travel date lives on the Voucher |

**Result: 3 of 5 escaped.** All three shared the same root cause — no predicate can group, compare, or aggregate across records — which is what motivated `groupedCount` and `groupedShare` in the design doc's §1.

**Field traps this exercise verified** (each produces a silently wrong briefing, not an error):

- `Invoice.status` vs `Invoice.paymentStatus` — payment truth is `paymentStatus`; `status` receives only `sent`/`viewed`/`cancelled` writes.
- `overdue` is derived from `dueDate` at query time (`invoice.controller.js:218`), never stored.
- `unassigned` has no field on any billing document — assignment is `crm_leads.Lead.assignedToId` behind a raw cross-schema join.
- `stuckInStatus` has no status timestamp, only an `updatedAt` proxy, so any edit resets the clock.
- `CreditNote` exists in billing-service with `voucherExpiryDate` and is unmodelled in the design plan.
