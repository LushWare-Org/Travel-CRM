import { z } from 'zod';
import { createPageAdapter } from '../collectionEngine.js';

const PAGE_LIMIT = 200;

export const hotelsAdapter = createPageAdapter({
  key: 'hotels',
  scopeSchema: z.object({}).strict(),
  scopeLabel: () => 'Hotels',
  sources: [
    {
      name: 'hotel-bookings',
      envKey: 'PACKAGE_SERVICE_URL',
      path: `/api/v1/hotels/bookings?limit=${PAGE_LIMIT}&page=1&sortBy=checkin&order=asc`,
      listPath: 'data',
      recordKind: 'hotel-booking',
      idField: 'id',
      fields: [
        'id',
        'hotelName',
        'status',
        'checkin',
        'checkout',
        'currency',
        'totalAmount',
        'guestInfo',
        'pnrCode',
        'leadId',
        'createdAt',
        'updatedAt',
      ],
      label: 'Hotel bookings',
      paging: { param: 'limit', defaultLimit: PAGE_LIMIT, totalPath: 'pagination.total' },
    },
  ],
  aggregates: [
    { name: 'hotel-booking-count', op: 'count', label: 'Hotel bookings' },
  ],
  rules: [
    {
      source: 'hotel-bookings',
      rule: 'stuckInStatus',
      statusField: 'status',
      statuses: ['pending'],
      dateField: 'updatedAt',
      days: 3,
      section: 'attention',
      severity: 'warning',
      text: 'Pending hotel booking has been unedited for more than three days.',
    },
    {
      source: 'hotel-bookings',
      rule: 'unassigned',
      field: 'pnrCode',
      section: 'attention',
      severity: 'info',
      text: 'Hotel booking has no supplier confirmation code.',
    },
    {
      run(bundle) {
        const now = Date.now();
        const DAY_MS = 86_400_000;
        const insights = [];
        for (const booking of bundle.records) {
          if (booking.__source !== 'hotel-bookings' || booking.status !== 'confirmed') continue;
          const checkin = booking.checkin ? new Date(booking.checkin).getTime() : NaN;
          if (Number.isNaN(checkin) || checkin < now || checkin - now > 7 * DAY_MS) continue;
          const evidenceId = bundle.index?.[booking.id]?.checkin;
          if (!evidenceId) continue;
          insights.push({
            id: `checkin-soon:${booking.id}`,
            section: 'attention',
            severity: 'warning',
            text: 'Stay begins within a week — confirm the guest and supplier details.',
            fact: { kind: 'date', value: new Date(checkin).toISOString(), evidenceId },
            evidenceIds: [evidenceId],
          });
        }
        return insights;
      },
    },
  ],
  questionTemplates: [
    'Which stays are coming up soonest?',
    'Which bookings are missing confirmation?',
    'What has been pending too long?',
  ],
});
