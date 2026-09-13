/**
 * Post-run row-count audit.
 *
 * The seed reports what it *intended* to create; this reports what the database
 * actually holds. Printing both makes a silent no-op (a wrong unique key, a
 * cascade that ate a child) visible immediately instead of at demo time.
 */
const TABLES = [
  ['crm_users', 'User'],
  ['crm_users', 'VendorProfile'],
  ['crm_users', 'OrganizationSettings'],
  ['crm_users', 'PolicyDocument'],
  ['crm_packages', 'Package'],
  ['crm_packages', 'Package_Image'],
  ['crm_packages', 'Itinerary_Day'],
  ['crm_packages', 'Package_Day_Place'],
  ['crm_packages', 'Package_Day_Activity'],
  ['crm_packages', 'Package_Day_Transport'],
  ['crm_packages', 'Place'],
  ['crm_packages', 'Activity_Catalog'],
  ['crm_packages', 'Review'],
  ['crm_packages', 'HotelBooking'],
  ['crm_leads', 'Lead'],
  ['crm_leads', 'LeadPackageSelection'],
  ['crm_leads', 'LeadPricing'],
  ['crm_leads', 'LeadCostLine'],
  ['crm_leads', 'LeadItineraryDay'],
  ['crm_leads', 'LeadOptionalFlight'],
  ['crm_leads', 'LeadRemark'],
  ['crm_leads', 'LeadStatusHistory'],
  ['crm_leads', 'LeadCommunicationLog'],
  ['crm_leads', 'CustomizedPackage'],
  ['crm_leads', 'ManualItinerary'],
  ['crm_bookings', 'Booking'],
  ['crm_bookings', 'BookingTraveler'],
  ['crm_billing', 'Quotation'],
  ['crm_billing', 'QuotationItem'],
  ['crm_billing', 'Invoice'],
  ['crm_billing', 'InvoiceItem'],
  ['crm_billing', 'PaymentReceipt'],
  ['crm_billing', 'PaymentHistory'],
  ['crm_billing', 'CreditNote'],
  ['crm_billing', 'Voucher'],
  ['crm_billing', 'VoucherItinerarySummary'],
  ['crm_careers', 'Career'],
  ['crm_careers', 'Vacancy'],
  ['crm_flights', 'FlightBooking'],
  ['crm_flights', 'FlightSegment'],
  ['crm_flights', 'FlightTraveler'],
  ['crm_assistant', 'AssistantSession'],
  ['crm_assistant', 'AssistantMessage'],
  ['crm_assistant', 'AssistantEvent'],
  ['crm_assistant', 'InsightState'],
  ['crm_assistant', 'InsightDecision'],
  ['crm_auth', 'Otp'],
];

export async function audit(db, { title = 'Row counts', log = console.log } = {}) {
  const out = [];
  let total = 0;
  for (const [schema, table] of TABLES) {
    try {
      const { rows } = await db.sql.query(`SELECT count(*)::int AS n FROM ${schema}."${table}"`);
      const n = rows[0].n;
      total += n;
      out.push([`${schema}.${table}`, n]);
    } catch (err) {
      out.push([`${schema}.${table}`, `ERR ${err.message}`]);
    }
  }
  log(`\n  ${title}  ·  ${total} rows across ${TABLES.length} tables`);
  log(`  ─────────────────────────────────────────────────────────`);
  for (const [name, n] of out) log(`    ${name.padEnd(34)} ${String(n).padStart(7)}`);
  log('');
}
