const evidenceId = (ruleId, fact) => `business:${ruleId}:${fact}`;

const number = (value) => Number(value) || 0;
const integer = (value) => Math.round(number(value));
const percentage = (value) => Math.round(number(value) * 10) / 10;
const money = (value, currency) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(number(value));

const countFact = (ruleId, value) => ({
  kind: 'count',
  value: String(integer(value)),
  evidenceId: evidenceId(ruleId, 'count'),
  derivation: 'grouped-by',
});
const amountFact = (ruleId, value, currency) => ({
  kind: 'amount',
  value: money(value, currency),
  evidenceId: evidenceId(ruleId, 'amount'),
  unit: 'currency',
  derivation: 'sum-of',
});
const percentageFact = (ruleId, value, name) => ({
  kind: 'percentage',
  value: `${percentage(value)}%`,
  evidenceId: evidenceId(ruleId, name),
  unit: 'percent',
  derivation: 'ratio-of',
});
const durationFact = (ruleId, value, name = 'duration') => ({
  kind: 'duration',
  value: `${percentage(value)} days`,
  evidenceId: evidenceId(ruleId, name),
  unit: 'days',
  derivation: 'elapsed-since',
});

const withIds = (path, label, ids, query = {}) => ({
  path,
  label,
  query: {
    ...query,
    ...(Array.isArray(ids) && ids.length > 0 ? { ids: ids.join(',') } : {}),
  },
});

/** Leading counts read as prose: "1 quote", not "1 quotes". */
const counted = (value, singular, plural) => {
  const total = integer(value);
  return `${total} ${total === 1 ? singular : plural}`;
};

/** The verb that agrees with a leading count: "1 quote remains", "2 quotes remain". */
const verb = (value, singular, plural) => (integer(value) === 1 ? singular : plural);

const simpleMaterial = (signal) => `${integer(signal.count)}:${integer(signal.value)}`;
const countMaterial = (signal) => String(integer(signal.count));

export const NOTIFICATION_SIGNAL_KEYS = Object.freeze([
  'unconvertedQuotes',
  'coldLeads',
  'departuresOutstanding',
  'conversionTrend',
  'lostQuotes',
  'lapsedCustomers',
  'lowMarginBookings',
  'responseTimeTrend',
  'destinationConcentration',
  'agingOverdue',
  'unassignedLeads',
  'stalledDrafting',
  'expiringQuotes',
  'noDeposit',
  'voucherMissing',
  'cancellationSpike',
  'silentPackages',
  'quotedSilence',
  'partialAging',
]);

/**
 * Business notification declarations. Data access stays in analytics-service;
 * this table owns thresholds, wording, facts, severity, and navigation.
 */
export const BUSINESS_NOTIFICATION_RULES = Object.freeze([
  {
    id: 'quotes.unconverted_value',
    signal: 'unconvertedQuotes',
    category: 'revenue',
    severity: 'critical',
    scope: 'both',
    floor: { minCount: 3, minValue: 1_000 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'quote', 'quotes')} worth ${money(s.value, currency)} ${verb(s.count, 'remains', 'remain')} unconverted from the last 30 days. Make sure to follow ${verb(s.count, 'it', 'them')} up.`,
      facts: [countFact('quotes.unconverted_value', s.count), amountFact('quotes.unconverted_value', s.value, currency), durationFact('quotes.unconverted_value', s.oldestAgeDays)],
      target: withIds('/billing', 'View quotes', s.ids, { tab: 'quotation' }),
    }),
  },
  {
    id: 'leads.cold_high_value',
    signal: 'coldLeads',
    category: 'pipeline',
    severity: 'critical',
    scope: 'both',
    floor: { minCount: 3, minValue: 5_000 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'high-value lead', 'high-value leads')} worth ${money(s.value, currency)} ${verb(s.count, 'has', 'have')} had no activity for more than ${integer(s.oldestAgeDays)} days. Follow up before they go cold.`,
      facts: [countFact('leads.cold_high_value', s.count), amountFact('leads.cold_high_value', s.value, currency), durationFact('leads.cold_high_value', s.oldestAgeDays)],
      target: withIds('/leads', 'View leads', s.ids),
    }),
  },
  {
    id: 'bookings.departure_outstanding',
    signal: 'departuresOutstanding',
    category: 'operations',
    severity: 'critical',
    scope: 'both',
    floor: { minCount: 1, minValue: 1_000 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'confirmed booking', 'confirmed bookings')} departing within the next 14 days ${verb(s.count, 'has', 'have')} ${money(s.value, currency)} in outstanding payments. Review payment follow-ups.`,
      facts: [countFact('bookings.departure_outstanding', s.count), amountFact('bookings.departure_outstanding', s.value, currency)],
      target: withIds('/billing', 'View bookings', s.ids, { tab: 'invoice' }),
    }),
  },
  {
    id: 'sales.conversion_drop',
    signal: 'conversionTrend',
    category: 'revenue',
    severity: 'warning',
    scope: 'both',
    floor: {},
    materialValue: (s) => `${integer(s.curTotal)}:${integer(s.curWon)}:${integer(s.prevTotal)}:${integer(s.prevWon)}`,
    build: (s) => {
      if (number(s.curTotal) < 30 || number(s.prevTotal) < 30) return null;
      const current = number(s.curWon) / number(s.curTotal) * 100;
      const previous = number(s.prevWon) / number(s.prevTotal) * 100;
      if (previous - current < 8) return null;
      return {
        text: `Your quote conversion rate dropped from ${percentage(previous)}% to ${percentage(current)}% this month. Review the main reasons for the decline.`,
        facts: [percentageFact('sales.conversion_drop', previous, 'previous'), percentageFact('sales.conversion_drop', current, 'current')],
        target: withIds('/analytics', 'Analyze conversion', [], { tab: 'leads' }),
      };
    },
  },
  {
    id: 'quotes.lost_value',
    signal: 'lostQuotes',
    category: 'revenue',
    severity: 'warning',
    scope: 'both',
    floor: { minCount: 3, minValue: 2_000 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'quote', 'quotes')} worth ${money(s.value, currency)} ${verb(s.count, 'was', 'were')} lost this month. ${counted(s.rejectedWithReason, 'was', 'were')} lost after the final quotation stage. Review your follow-up and pricing strategy.`,
      facts: [countFact('quotes.lost_value', s.count), amountFact('quotes.lost_value', s.value, currency)],
      target: withIds('/billing', 'Analyze lost quotes', s.ids, { tab: 'quotation' }),
    }),
  },
  {
    id: 'customers.lapsed_repeat',
    signal: 'lapsedCustomers',
    category: 'customer',
    severity: 'info',
    scope: 'org',
    floor: { minCount: 3 },
    materialValue: countMaterial,
    build: (s) => ({
      text: `${counted(s.count, 'customer', 'customers')} who travelled around this time last year ${verb(s.count, 'has', 'have')} not made a booking this year. Consider re-engaging them.`,
      facts: [countFact('customers.lapsed_repeat', s.count)],
      target: withIds('/leads', 'View customers', s.ids),
    }),
  },
  {
    id: 'bookings.low_margin',
    signal: 'lowMarginBookings',
    category: 'risk',
    severity: 'warning',
    scope: 'both',
    floor: { minCount: 1 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'booking', 'bookings')} worth ${money(s.value, currency)} ${verb(s.count, 'has', 'have')} margins below 5% (average ${percentage(s.avgMargin)}%). Review their pricing and supplier costs.`,
      facts: [countFact('bookings.low_margin', s.count), amountFact('bookings.low_margin', s.value, currency), percentageFact('bookings.low_margin', s.avgMargin, 'margin')],
      target: withIds('/leads', 'Review margins', s.ids),
    }),
  },
  {
    id: 'sales.response_time',
    signal: 'responseTimeTrend',
    category: 'operations',
    severity: 'warning',
    scope: 'org',
    floor: {},
    materialValue: (s) => `${percentage(s.curHours)}:${percentage(s.prevHours)}:${integer(s.curN)}:${integer(s.prevN)}`,
    build: (s) => {
      if (number(s.curN) < 5 || number(s.prevN) < 20 || number(s.curHours) < 4 || number(s.curHours) < number(s.prevHours) * 2) return null;
      return {
        text: `Average quote response time increased from ${percentage(s.prevHours)} hours to ${percentage(s.curHours)} hours this week. Faster follow-up may help recover opportunities.`,
        facts: [durationFact('sales.response_time', number(s.prevHours) / 24, 'previous'), durationFact('sales.response_time', number(s.curHours) / 24, 'current')],
        target: withIds('/analytics', 'View sales performance', [], { tab: 'leads' }),
      };
    },
  },
  {
    id: 'revenue.destination_concentration',
    signal: 'destinationConcentration',
    category: 'risk',
    severity: 'info',
    scope: 'org',
    floor: {},
    materialValue: (s) => `${s.destination ?? ''}:${percentage(s.share)}:${percentage(s.baseline)}`,
    build: (s) => {
      if (!s.destination || number(s.share) < 35 || number(s.share) - number(s.baseline) < 15) return null;
      return {
        text: `${percentage(s.share)}% of this month's revenue comes from ${s.destination}, compared with ${percentage(s.baseline)}% over the previous 6 months. Review your revenue concentration risk.`,
        facts: [percentageFact('revenue.destination_concentration', s.share, 'current'), percentageFact('revenue.destination_concentration', s.baseline, 'baseline')],
        target: withIds('/analytics', 'Analyze revenue mix', [], { tab: 'billing' }),
      };
    },
  },
  {
    id: 'invoices.aging_overdue',
    signal: 'agingOverdue',
    category: 'revenue',
    severity: 'critical',
    scope: 'both',
    floor: { minCount: 3, minValue: 2_000 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'invoice', 'invoices')} worth ${money(s.value, currency)} ${verb(s.count, 'is', 'are')} past due, the oldest by ${integer(s.oldestDays)} days. Review collections.`,
      facts: [countFact('invoices.aging_overdue', s.count), amountFact('invoices.aging_overdue', s.value, currency), durationFact('invoices.aging_overdue', s.oldestDays)],
      target: withIds('/billing', 'View invoices', s.ids, { tab: 'invoice' }),
    }),
  },
  {
    id: 'leads.unassigned',
    signal: 'unassignedLeads',
    category: 'pipeline',
    severity: 'critical',
    scope: 'org',
    floor: { minCount: 1 },
    materialValue: countMaterial,
    build: (s) => ({
      text: `${counted(s.count, 'new lead', 'new leads')} ${verb(s.count, 'has', 'have')} had no owner assigned for more than 4 hours. Assign ${verb(s.count, 'it', 'them')} before ${verb(s.count, 'it goes', 'they go')} cold.`,
      facts: [countFact('leads.unassigned', s.count)],
      target: withIds('/leads', 'View leads', s.ids),
    }),
  },
  {
    id: 'leads.stalled_drafting',
    signal: 'stalledDrafting',
    category: 'pipeline',
    severity: 'warning',
    scope: 'both',
    floor: { minCount: 3 },
    materialValue: countMaterial,
    build: (s) => ({
      text: `${counted(s.count, 'lead', 'leads')} ${verb(s.count, 'has', 'have')} sat in drafting for more than 7 days, the oldest ${integer(s.oldestAgeDays)} days. Review what is blocking ${verb(s.count, 'it', 'them')}.`,
      facts: [countFact('leads.stalled_drafting', s.count), durationFact('leads.stalled_drafting', s.oldestAgeDays)],
      target: withIds('/leads', 'View leads', s.ids),
    }),
  },
  {
    id: 'quotes.expiring_soon',
    signal: 'expiringQuotes',
    category: 'revenue',
    severity: 'warning',
    scope: 'both',
    floor: { minCount: 1 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'quote', 'quotes')} worth ${money(s.value, currency)} ${verb(s.count, 'expires', 'expire')} within the next 5 days. Confirm ${verb(s.count, 'it', 'them')} or follow up.`,
      facts: [countFact('quotes.expiring_soon', s.count), amountFact('quotes.expiring_soon', s.value, currency)],
      target: withIds('/billing', 'View quotes', s.ids, { tab: 'quotation' }),
    }),
  },
  {
    id: 'bookings.no_deposit',
    signal: 'noDeposit',
    category: 'operations',
    severity: 'critical',
    scope: 'both',
    floor: { minCount: 1 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'confirmed booking', 'confirmed bookings')} departing within 30 days still ${verb(s.count, 'has', 'have')} no deposit recorded (${money(s.value, currency)} outstanding). Confirm payment before departure.`,
      facts: [countFact('bookings.no_deposit', s.count), amountFact('bookings.no_deposit', s.value, currency)],
      target: withIds('/billing', 'View bookings', s.ids, { tab: 'invoice' }),
    }),
  },
  {
    id: 'bookings.voucher_missing',
    signal: 'voucherMissing',
    category: 'operations',
    severity: 'warning',
    scope: 'both',
    floor: { minCount: 1 },
    materialValue: countMaterial,
    build: (s) => ({
      text: `${counted(s.count, 'confirmed booking', 'confirmed bookings')} ${verb(s.count, 'departs', 'depart')} within 7 days and still ${verb(s.count, 'has', 'have')} no voucher issued. Issue ${verb(s.count, 'it', 'them')} before departure.`,
      facts: [countFact('bookings.voucher_missing', s.count)],
      target: withIds('/leads', 'View bookings', s.ids),
    }),
  },
  {
    id: 'sales.cancellation_spike',
    signal: 'cancellationSpike',
    category: 'risk',
    severity: 'warning',
    scope: 'org',
    floor: {},
    materialValue: (s) => `${integer(s.cur)}:${percentage(s.baseline)}`,
    build: (s) => {
      if (number(s.cur) < 3 || number(s.baseline) < 1 || number(s.cur) < number(s.baseline) * 2) return null;
      return {
        text: `${counted(s.cur, 'booking was', 'bookings were')} cancelled this month, against a recent average of ${percentage(s.baseline)}. Review what changed.`,
        facts: [countFact('sales.cancellation_spike', s.cur)],
        target: withIds('/billing', 'Review cancellations', [], { tab: 'invoice' }),
      };
    },
  },
  {
    id: 'packages.silent_active',
    signal: 'silentPackages',
    category: 'customer',
    severity: 'info',
    scope: 'org',
    floor: { minCount: 5 },
    materialValue: countMaterial,
    build: (s) => ({
      text: `${counted(s.count, 'active package has', 'active packages have')} had no inquiries in the last 30 days. Consider refreshing or promoting them.`,
      facts: [countFact('packages.silent_active', s.count)],
      target: withIds('/packages', 'View packages', []),
    }),
  },
  {
    id: 'leads.quote_silence',
    signal: 'quotedSilence',
    category: 'pipeline',
    severity: 'warning',
    scope: 'both',
    floor: { minCount: 3 },
    materialValue: countMaterial,
    build: (s) => ({
      text: `${counted(s.count, 'lead has', 'leads have')} had a quotation out for over 7 days with no recorded contact. Follow up.`,
      facts: [countFact('leads.quote_silence', s.count), durationFact('leads.quote_silence', s.oldestAgeDays)],
      target: withIds('/leads', 'View leads', s.ids),
    }),
  },
  {
    id: 'invoices.partial_aging',
    signal: 'partialAging',
    category: 'revenue',
    severity: 'warning',
    scope: 'both',
    floor: { minCount: 2, minValue: 500 },
    materialValue: simpleMaterial,
    build: (s, { currency }) => ({
      text: `${counted(s.count, 'invoice', 'invoices')} worth ${money(s.value, currency)} ${verb(s.count, 'is', 'are')} part-paid and more than 14 days past due. Chase the balance.`,
      facts: [countFact('invoices.partial_aging', s.count), amountFact('invoices.partial_aging', s.value, currency), durationFact('invoices.partial_aging', s.oldestDays)],
      target: withIds('/billing', 'View invoices', s.ids, { tab: 'invoice' }),
    }),
  },
]);
