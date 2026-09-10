import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';

const PAGE_LIMIT = 200;
const DAY_MS = 86_400_000;

export const flightsAdapter = createPageAdapter({
  key: 'flights',
  scopeSchema: z.object({}).strict(),
  scopeLabel: () => 'Flights',
  sources: [
    {
      name: 'flight-bookings',
      envKey: 'FLIGHT_SERVICE_URL',
      path: `/api/v1/flights/bookings?limit=${PAGE_LIMIT}&page=1&sortBy=ticketingDeadline&order=asc`,
      listPath: 'data',
      recordKind: 'flight-booking',
      idField: 'id',
      fields: [
        'id',
        'pnr',
        'status',
        'tripType',
        'cabinClass',
        'currency',
        'totalAmount',
        'ticketingDeadline',
        'bookedAt',
        'leadId',
        'createdAt',
        'updatedAt',
      ],
      label: 'Flight bookings',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'pagination.total' },
    },
  ],
  aggregates: [
    { name: 'flight-booking-count', op: 'count', label: 'Flight bookings' },
  ],
  rules: [
    {
      source: 'flight-bookings',
      rule: 'stuckInStatus',
      statusField: 'status',
      statuses: ['quoted', 'pending'],
      dateField: 'updatedAt',
      days: 2,
      section: 'attention',
      severity: 'warning',
      text: 'Unticketed flight booking has been unedited for more than two days.',
    },
    {
      run(bundle) {
        const now = Date.now();
        const insights = [];
        for (const booking of bundle.records) {
          if (booking.__source !== 'flight-bookings') continue;
          if (!['quoted', 'pending', 'confirmed'].includes(booking.status)) continue;
          const deadline = booking.ticketingDeadline ? new Date(booking.ticketingDeadline).getTime() : NaN;
          if (Number.isNaN(deadline) || deadline < now || deadline - now > 3 * DAY_MS) continue;
          const evidenceId = bundle.index?.[booking.id]?.ticketingDeadline;
          if (!evidenceId) continue;
          insights.push({
            id: `ticketing-deadline:${booking.id}`,
            section: 'attention',
            severity: 'critical',
            text: 'Flight ticketing deadline is within three days.',
            fact: { kind: 'date', value: new Date(deadline).toISOString(), evidenceId },
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
    {
      run(bundle) {
        const insights = [];
        for (const booking of bundle.records) {
          if (booking.__source !== 'flight-bookings' || booking.status !== 'ticketed') continue;
          if (booking.pnr) continue;
          const evidenceId = bundle.index?.[booking.id]?.id;
          if (!evidenceId) continue;
          insights.push({
            id: `missing-pnr:${booking.id}`,
            section: 'attention',
            severity: 'critical',
            text: 'Ticketed flight booking has no PNR.',
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
  ],
  questionTemplates: [
    'Which ticketing deadlines are closest?',
    'Which bookings are missing a PNR?',
    'What has been pending too long?',
  ],
});
