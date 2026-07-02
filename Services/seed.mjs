/**
 * Unified seed script for all Travel CRM microservice schemas.
 * Run from the Services/ directory:  node seed.mjs
 *
 * Insertion order respects cross-schema UUID dependencies:
 *   crm_users → crm_packages → crm_leads → crm_bookings
 *               → crm_billing → crm_careers → crm_auth
 */

import { PrismaClient as AuthClient }    from './auth-service/node_modules/@prisma/client/index.js';
import { PrismaClient as UserClient }    from './user-service/node_modules/@prisma/client/index.js';
import { PrismaClient as PkgClient }     from './package-service/node_modules/@prisma/client/index.js';
import { PrismaClient as LeadClient }    from './lead-service/node_modules/@prisma/client/index.js';
import { PrismaClient as BookClient }    from './booking-service/node_modules/@prisma/client/index.js';
import { PrismaClient as BillClient }    from './billing-service/node_modules/@prisma/client/index.js';
import { PrismaClient as CareerClient }  from './career-service/node_modules/@prisma/client/index.js';

const DB_URL     = 'postgresql://postgres.javgkcjscdhrnlnsgczs:KZ9MNnBwR4eslIsI@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const DIRECT_URL = 'postgresql://postgres.javgkcjscdhrnlnsgczs:KZ9MNnBwR4eslIsI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

const opts = { datasources: { db: { url: DB_URL } } };

const auth   = new AuthClient(opts);
const users  = new UserClient(opts);
const pkg    = new PkgClient(opts);
const leads  = new LeadClient(opts);
const books  = new BookClient(opts);
const bill   = new BillClient(opts);
const career = new CareerClient(opts);

// ─── Fixed UUIDs so cross-schema refs are consistent ──────────
const ID = {
  superAdmin:  'a0000000-0000-0000-0000-000000000001',
  admin:       'a0000000-0000-0000-0000-000000000002',
  salesRep1:   'a0000000-0000-0000-0000-000000000003',
  salesRep2:   'a0000000-0000-0000-0000-000000000004',
  customer1:   'a0000000-0000-0000-0000-000000000005',
  customer2:   'a0000000-0000-0000-0000-000000000006',
  vendor1:     'a0000000-0000-0000-0000-000000000007',
  pkg1:        'b0000000-0000-0000-0000-000000000001',
  pkg2:        'b0000000-0000-0000-0000-000000000002',
  pkg3:        'b0000000-0000-0000-0000-000000000003',
  itin1:       'c0000000-0000-0000-0000-000000000001',
  itin2:       'c0000000-0000-0000-0000-000000000002',
  lead1:       'd0000000-0000-0000-0000-000000000001',
  lead2:       'd0000000-0000-0000-0000-000000000002',
  lead3:       'd0000000-0000-0000-0000-000000000003',
  booking1:    'e0000000-0000-0000-0000-000000000001',
  booking2:    'e0000000-0000-0000-0000-000000000002',
  invoice1:    'f0000000-0000-0000-0000-000000000001',
  invoice2:    'f0000000-0000-0000-0000-000000000002',
  quotation1:  'f0000000-0000-0000-0000-000000000003',
  receipt1:    'f0000000-0000-0000-0000-000000000004',
  vacancy1:    'g0000000-0000-0000-0000-000000000001',
  vacancy2:    'g0000000-0000-0000-0000-000000000002',
};

async function seedUsers() {
  console.log('  → crm_users');
  await users.user.createMany({
    data: [
      {
        id: ID.superAdmin,
        name: 'Super Admin',
        email: 'superadmin@travelcrm.com',
        password: '$2a$12$placeholder_bcrypt_hash_superadmin',
        role: 'superAdmin',
        isSuperAdmin: true,
        canBeDeleted: false,
        permissions: ['manage_users','manage_sales_reps','manage_vendors','manage_admins','view_reports','manage_billing','view_billing','manage_leads','manage_packages'],
        isActive: true,
        isEmailVerified: true,
      },
      {
        id: ID.admin,
        name: 'Alice Admin',
        email: 'alice.admin@travelcrm.com',
        password: '$2a$12$placeholder_bcrypt_hash_admin',
        role: 'admin',
        permissions: ['manage_users','manage_leads','manage_packages','view_reports','manage_billing','view_billing'],
        isActive: true,
        isEmailVerified: true,
        createdById: ID.superAdmin,
      },
      {
        id: ID.salesRep1,
        name: 'Bob Sales',
        email: 'bob.sales@travelcrm.com',
        password: '$2a$12$placeholder_bcrypt_hash_salesrep1',
        role: 'salesRep',
        permissions: ['manage_leads','view_billing'],
        isActive: true,
        isEmailVerified: true,
        createdById: ID.admin,
        lastActivity: new Date(),
      },
      {
        id: ID.salesRep2,
        name: 'Carol Sales',
        email: 'carol.sales@travelcrm.com',
        password: '$2a$12$placeholder_bcrypt_hash_salesrep2',
        role: 'salesRep',
        permissions: ['manage_leads','view_billing'],
        isActive: true,
        isEmailVerified: true,
        createdById: ID.admin,
      },
      {
        id: ID.customer1,
        name: 'David Kumar',
        email: 'david.kumar@gmail.com',
        password: '$2a$12$placeholder_bcrypt_hash_customer1',
        phone: '+94771234567',
        phoneCountry: 'LK',
        role: 'customer',
        isActive: true,
        isEmailVerified: true,
      },
      {
        id: ID.customer2,
        name: 'Emily Chen',
        email: 'emily.chen@gmail.com',
        password: '$2a$12$placeholder_bcrypt_hash_customer2',
        phone: '+6591234567',
        phoneCountry: 'SG',
        role: 'customer',
        isActive: true,
        isEmailVerified: false,
      },
      {
        id: ID.vendor1,
        name: 'Saman Perera',
        email: 'saman@ceylonhotels.lk',
        password: '$2a$12$placeholder_bcrypt_hash_vendor1',
        role: 'vendor',
        isActive: true,
        isEmailVerified: true,
        createdById: ID.admin,
      },
    ],
    skipDuplicates: true,
  });

  await users.vendorProfile.createMany({
    data: [
      {
        userId: ID.vendor1,
        businessName: 'Ceylon Hotels & Resorts',
        serviceType: 'hotel',
        businessRegistrationNumber: 'CRM-VND-001',
        addressCity: 'Colombo',
        addressCountry: 'Sri Lanka',
        contactPersonName: 'Saman Perera',
        contactPersonPhone: '+94112345678',
        contactPersonEmail: 'saman@ceylonhotels.lk',
        vendorStatus: 'verified',
        rating: 4.5,
        totalBookings: 38,
      },
    ],
    skipDuplicates: true,
  });
}

async function seedPackages() {
  console.log('  → crm_packages');

  await pkg.itinerary.createMany({
    data: [
      {
        id: ID.itin1,
        packageId: ID.pkg1,
        packageModelType: 'Package',
        status: 'published',
        version: 1,
        metaTotalActivities: 6,
        metaTotalLocations: 4,
        metaBreakfastCount: 4,
        metaLunchCount: 2,
        metaDinnerCount: 4,
        createdById: ID.admin,
        days: [
          { dayNumber: 1, title: 'Arrival in Colombo', description: 'Airport pickup and city tour', locations: ['Colombo'], activities: ['City tour', 'Welcome dinner'], meals: { breakfast: false, lunch: false, dinner: true }, transport: 'car', accommodation: { name: 'Cinnamon Grand', type: 'hotel', rating: 5 }, places: [], notes: 'Pick up at 10am' },
          { dayNumber: 2, title: 'Sigiriya Rock Fortress', description: 'UNESCO Heritage site visit', locations: ['Sigiriya', 'Dambulla'], activities: ['Rock climbing', 'Cave temples'], meals: { breakfast: true, lunch: true, dinner: true }, transport: 'bus', accommodation: { name: 'Jetwing Lake', type: 'resort', rating: 4 }, places: [{ name: 'Sigiriya Rock', description: 'Ancient rock fortress', duration: '3h' }], notes: '' },
          { dayNumber: 3, title: 'Kandy & Tea Estates', description: 'Temple of Tooth and tea plantation', locations: ['Kandy', 'Nuwara Eliya'], activities: ['Temple visit', 'Tea tasting'], meals: { breakfast: true, lunch: false, dinner: true }, transport: 'train', accommodation: { name: 'Heritance Tea Factory', type: 'hotel', rating: 4 }, places: [], notes: '' },
          { dayNumber: 4, title: 'Beach Day at Bentota', description: 'Relax on pristine beaches', locations: ['Bentota'], activities: ['Swimming', 'Water sports'], meals: { breakfast: true, lunch: true, dinner: true }, transport: 'car', accommodation: { name: 'Taj Bentota Resort', type: 'resort', rating: 5 }, places: [], notes: '' },
        ],
      },
      {
        id: ID.itin2,
        packageId: ID.pkg2,
        packageModelType: 'Package',
        status: 'published',
        version: 1,
        metaTotalActivities: 4,
        metaTotalLocations: 3,
        metaBreakfastCount: 3,
        metaDinnerCount: 3,
        createdById: ID.admin,
        days: [
          { dayNumber: 1, title: 'Maldives Arrival', description: 'Seaplane transfer to resort', locations: ['Malé', 'North Malé Atoll'], activities: ['Snorkeling orientation'], meals: { breakfast: false, lunch: true, dinner: true }, transport: 'boat', accommodation: { name: 'Soneva Jani', type: 'resort', rating: 5 }, places: [], notes: '' },
          { dayNumber: 2, title: 'Reef Exploration', description: 'Full day diving and snorkeling', locations: ['House Reef'], activities: ['Scuba diving', 'Dolphin watching'], meals: { breakfast: true, lunch: true, dinner: true }, transport: 'boat', accommodation: { name: 'Soneva Jani', type: 'resort', rating: 5 }, places: [], notes: '' },
          { dayNumber: 3, title: 'Sunset Cruise & Departure', description: 'Luxury sunset cruise before departure', locations: ['Malé'], activities: ['Sunset cruise', 'Island shopping'], meals: { breakfast: true, lunch: false, dinner: true }, transport: 'boat', accommodation: { name: 'Soneva Jani', type: 'resort', rating: 5 }, places: [], notes: '' },
        ],
      },
    ],
    skipDuplicates: true,
  });

  await pkg.package.createMany({
    data: [
      {
        id: ID.pkg1,
        name: 'Sri Lanka Heritage Explorer',
        slug: 'sri-lanka-heritage-explorer',
        description: 'Discover the ancient wonders and pristine beaches of Sri Lanka on this 4-day journey through UNESCO Heritage sites, lush tea estates, and tropical coastlines.',
        destination: 'Sri Lanka',
        duration: 4,
        price: 1200,
        maxGroupSize: 12,
        category: 'family',
        packageType: 'Standard',
        inclusions: ['Airport transfers', 'Accommodation (4 nights)', 'Daily breakfast', 'All entry tickets', 'English-speaking guide'],
        exclusions: ['International flights', 'Travel insurance', 'Personal expenses', 'Lunch on day 3'],
        highlights: ['Sigiriya Rock Fortress', 'Temple of the Tooth', 'Train ride through tea estates', 'Bentota beach'],
        terms: ['50% advance payment required', 'Cancellation 7 days before: full refund', 'No refund within 48 hours'],
        isActive: true,
        isFeatured: true,
        status: 'published',
        itineraryId: ID.itin1,
        rating: 4.7,
        numReviews: 23,
        views: 412,
        bookings: 18,
        createdById: ID.admin,
        coverImagePublicId: 'travel-crm/packages/sri-lanka-cover',
        coverImageUrl: 'https://images.unsplash.com/photo-1568797629192-789acf8e4df3?w=800',
      },
      {
        id: ID.pkg2,
        name: 'Maldives Luxury Escape',
        slug: 'maldives-luxury-escape',
        description: 'Three nights of pure indulgence in a private overwater villa. Crystal-clear lagoons, world-class diving, and breathtaking sunsets await.',
        destination: 'Maldives',
        duration: 3,
        price: 3500,
        maxGroupSize: 4,
        category: 'honeymoon',
        packageType: 'Luxury',
        inclusions: ['Seaplane transfers', 'Overwater villa (3 nights)', 'All-inclusive meals', 'Two diving sessions', 'Sunset cruise'],
        exclusions: ['International flights', 'Spa treatments', 'Alcoholic beverages beyond package'],
        highlights: ['Overwater villa', 'Coral reef diving', 'Private beach', 'Sunset dolphin cruise'],
        terms: ['Full payment required at booking', 'Non-refundable after 14 days before travel'],
        isActive: true,
        isFeatured: true,
        status: 'published',
        itineraryId: ID.itin2,
        rating: 4.9,
        numReviews: 11,
        views: 887,
        bookings: 9,
        createdById: ID.admin,
        coverImagePublicId: 'travel-crm/packages/maldives-cover',
        coverImageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800',
      },
      {
        id: ID.pkg3,
        name: 'Thailand Family Adventure',
        slug: 'thailand-family-adventure',
        description: 'A fun-filled 5-day family package covering Bangkok temples, floating markets, and the golden beaches of Phuket.',
        destination: 'Thailand',
        duration: 5,
        price: 1800,
        maxGroupSize: 20,
        category: 'family',
        packageType: 'Deluxe',
        inclusions: ['All hotel stays', 'Daily breakfast and dinner', 'Guided city tours', 'Beach transfers'],
        exclusions: ['International flights', 'Lunch', 'Personal shopping'],
        highlights: ['Grand Palace Bangkok', 'Floating Market', 'Phi Phi Islands', 'Elephant Sanctuary'],
        terms: ['30% deposit to confirm', '14-day cancellation policy'],
        isActive: true,
        isFeatured: false,
        status: 'published',
        rating: 4.5,
        numReviews: 7,
        views: 263,
        bookings: 5,
        createdById: ID.admin,
        coverImagePublicId: 'travel-crm/packages/thailand-cover',
        coverImageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
      },
    ],
    skipDuplicates: true,
  });

  await pkg.review.createMany({
    data: [
      { packageId: ID.pkg1, authorId: ID.customer1, name: 'David Kumar', email: 'david.kumar@gmail.com', rating: 5, comment: 'Absolutely incredible trip! The guide was knowledgeable and the itinerary was perfectly paced. Sigiriya at sunrise was unforgettable.', isApproved: true, helpful: 12 },
      { packageId: ID.pkg1, name: 'Priya S.', email: 'priya.s@hotmail.com', rating: 4, comment: 'Great value for money. The tea train ride was a highlight. Would have liked one more beach day.', isApproved: true, helpful: 5 },
      { packageId: ID.pkg2, authorId: ID.customer2, name: 'Emily Chen', email: 'emily.chen@gmail.com', rating: 5, comment: 'Perfection. The overwater villa was exactly as advertised. The diving instructor was outstanding. Worth every penny.', isApproved: true, helpful: 20 },
      { packageId: ID.pkg3, name: 'James T.', email: 'james.t@yahoo.com', rating: 4, comment: 'Kids loved the elephant sanctuary. Bangkok temple tour was a bit rushed but overall great family experience.', isApproved: true, helpful: 8 },
    ],
    skipDuplicates: true,
  });
}

async function seedLeads() {
  console.log('  → crm_leads');

  await leads.leadStatusOption.createMany({
    data: [
      { statusName: 'new', displayName: 'New', color: '#3B82F6', icon: 'star', order: 1, isActive: true, isDefault: true },
      { statusName: 'contacted', displayName: 'Contacted', color: '#8B5CF6', icon: 'phone', order: 2, isActive: true },
      { statusName: 'interested', displayName: 'Interested', color: '#F59E0B', icon: 'heart', order: 3, isActive: true },
      { statusName: 'quoted', displayName: 'Quoted', color: '#06B6D4', icon: 'document', order: 4, isActive: true },
      { statusName: 'converted', displayName: 'Converted', color: '#10B981', icon: 'check', order: 5, isActive: true },
      { statusName: 'lost', displayName: 'Lost', color: '#EF4444', icon: 'x', order: 6, isActive: true },
      { statusName: 'not-interested', displayName: 'Not Interested', color: '#6B7280', icon: 'ban', order: 7, isActive: true },
    ],
    skipDuplicates: true,
  });

  await leads.settings.createMany({
    data: [
      {
        assignmentMode: 'auto',
        autoStrategy: 'round_robin',
        enabledSalesRepIds: [ID.salesRep1, ID.salesRep2],
        roundRobinIndex: 0,
        maxOpenLeadsPerRep: 50,
        skipInactive: true,
        updatedById: ID.superAdmin,
      },
    ],
    skipDuplicates: true,
  });

  const lead1 = await leads.lead.upsert({
    where: { id: ID.lead1 },
    update: {},
    create: {
      id: ID.lead1,
      name: 'David Kumar',
      email: 'david.kumar@gmail.com',
      phone: '+94771234567',
      whatsapp: '+94771234567',
      city: 'Colombo',
      source: 'website',
      platform: 'Website_Form',
      fromCountry: 'Sri Lanka',
      destinationCountry: 'Maldives',
      destination: 'Maldives',
      travelDate: new Date('2025-02-14'),
      endDate: new Date('2025-02-17'),
      packageId: ID.pkg2,
      packageName: 'Maldives Luxury Escape',
      numberOfTravelers: 2,
      budget: 'USD 7000',
      message: 'Planning honeymoon trip for February. Looking for luxury overwater villa.',
      status: 'converted',
      priority: 'high',
      assignedToId: ID.salesRep1,
      assignedById: ID.admin,
      assignmentMode: 'auto',
      quoteSent: true,
      quoteAmount: 7000,
      convertedBookingId: ID.booking1,
      tags: ['honeymoon', 'luxury', 'high-value'],
      notifNewLead: true,
      notifStatusChange: true,
      notifAssignment: true,
      notifFollowUp: true,
      remarks: {
        create: [
          { text: 'Customer is very interested in the overwater villa package. Prefers Feb 14 for Valentine\'s Day.', addedById: ID.salesRep1, addedAt: new Date('2024-12-02') },
          { text: 'Sent customized quote with room upgrade. Awaiting confirmation.', addedById: ID.salesRep1, addedAt: new Date('2024-12-05') },
        ],
      },
      statusHistory: {
        create: [
          { status: 'new', changedById: ID.admin, changedAt: new Date('2024-12-01'), notes: 'Lead created via website' },
          { status: 'contacted', changedById: ID.salesRep1, changedAt: new Date('2024-12-02'), notes: 'Called customer' },
          { status: 'interested', changedById: ID.salesRep1, changedAt: new Date('2024-12-03') },
          { status: 'quoted', changedById: ID.salesRep1, changedAt: new Date('2024-12-05') },
          { status: 'converted', changedById: ID.salesRep1, changedAt: new Date('2024-12-10'), notes: 'Booking confirmed' },
        ],
      },
      communicationLogs: {
        create: [
          { type: 'call', notes: 'Initial call — discussed package details and pricing', byId: ID.salesRep1, date: new Date('2024-12-02') },
          { type: 'email', notes: 'Sent detailed brochure and custom quote PDF', byId: ID.salesRep1, date: new Date('2024-12-05') },
        ],
      },
    },
  });

  const lead2 = await leads.lead.upsert({
    where: { id: ID.lead2 },
    update: {},
    create: {
      id: ID.lead2,
      name: 'Rajesh Nair',
      email: 'rajesh.nair@outlook.com',
      phone: '+919876543210',
      city: 'Mumbai',
      source: 'social_media',
      platform: 'Social_Media',
      fromCountry: 'India',
      destinationCountry: 'Sri Lanka',
      destination: 'Sri Lanka',
      travelDate: new Date('2025-03-15'),
      endDate: new Date('2025-03-19'),
      packageId: ID.pkg1,
      packageName: 'Sri Lanka Heritage Explorer',
      numberOfTravelers: 4,
      budget: 'USD 5000',
      message: 'Family of 4 (2 adults, 2 kids aged 8 and 12). Interested in Sri Lanka Heritage package.',
      status: 'quoted',
      priority: 'medium',
      assignedToId: ID.salesRep2,
      assignedById: ID.admin,
      assignmentMode: 'auto',
      quoteSent: true,
      quoteAmount: 4800,
      followUpDate: new Date('2025-01-10'),
      tags: ['family', 'kids', 'heritage'],
      remarks: {
        create: [
          { text: 'Family trip with young children. Need child-friendly hotel options.', addedById: ID.salesRep2 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'new', changedById: ID.admin, changedAt: new Date('2024-12-15') },
          { status: 'contacted', changedById: ID.salesRep2, changedAt: new Date('2024-12-16') },
          { status: 'interested', changedById: ID.salesRep2, changedAt: new Date('2024-12-18') },
          { status: 'quoted', changedById: ID.salesRep2, changedAt: new Date('2024-12-20') },
        ],
      },
      communicationLogs: {
        create: [
          { type: 'call', notes: 'Discussed family needs — child-friendly activities and hotels required', byId: ID.salesRep2, date: new Date('2024-12-16') },
        ],
      },
    },
  });

  await leads.lead.upsert({
    where: { id: ID.lead3 },
    update: {},
    create: {
      id: ID.lead3,
      name: 'Sophie Laurent',
      email: 'sophie.laurent@gmail.com',
      phone: '+33612345678',
      city: 'Paris',
      source: 'email',
      platform: 'Email',
      fromCountry: 'France',
      destinationCountry: 'Thailand',
      destination: 'Thailand',
      travelDate: new Date('2025-04-01'),
      packageId: ID.pkg3,
      packageName: 'Thailand Family Adventure',
      numberOfTravelers: 3,
      budget: 'USD 5500',
      status: 'new',
      priority: 'low',
      assignedToId: ID.salesRep1,
      tags: ['group', 'beach'],
      remarks: { create: [] },
      statusHistory: {
        create: [
          { status: 'new', changedById: ID.admin, changedAt: new Date('2024-12-28') },
        ],
      },
      communicationLogs: { create: [] },
    },
  });
}

async function seedBookings() {
  console.log('  → crm_bookings');
  await books.booking.upsert({
    where: { id: ID.booking1 },
    update: {},
    create: {
      id: ID.booking1,
      userId: ID.customer1,
      packageId: ID.pkg2,
      invoiceId: ID.invoice1,
      assignedToId: ID.salesRep1,
      travelDate: new Date('2025-02-14'),
      endDate: new Date('2025-02-17'),
      numberOfTravelers: 2,
      totalAmount: 7000,
      paidAmount: 7000,
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      specialRequests: 'Honeymoon setup in villa — rose petals and champagne on arrival please.',
      confirmedAt: new Date('2024-12-10'),
      travelers: {
        create: [
          { name: 'David Kumar', age: 32, gender: 'male', idType: 'passport', idNumber: 'N1234567' },
          { name: 'Priya Kumar', age: 29, gender: 'female', idType: 'passport', idNumber: 'N7654321' },
        ],
      },
    },
  });

  await books.booking.upsert({
    where: { id: ID.booking2 },
    update: {},
    create: {
      id: ID.booking2,
      userId: ID.customer2,
      packageId: ID.pkg1,
      assignedToId: ID.salesRep2,
      travelDate: new Date('2025-03-20'),
      endDate: new Date('2025-03-24'),
      numberOfTravelers: 1,
      totalAmount: 1200,
      paidAmount: 600,
      paymentStatus: 'partial',
      bookingStatus: 'pending',
      specialRequests: 'Vegetarian meals preferred.',
      travelers: {
        create: [
          { name: 'Emily Chen', age: 27, gender: 'female', idType: 'passport', idNumber: 'E9876543' },
        ],
      },
    },
  });
}

async function seedBilling() {
  console.log('  → crm_billing');

  // Invoice 1 — paid in full
  await bill.invoice.upsert({
    where: { id: ID.invoice1 },
    update: {},
    create: {
      id: ID.invoice1,
      invoiceNumber: 'INV-202412-00001',
      leadId: ID.lead1,
      bookingId: ID.booking1,
      createdById: ID.salesRep1,
      customerName: 'David Kumar',
      customerEmail: 'david.kumar@gmail.com',
      customerPhone: '+94771234567',
      customerAddress: 'Colombo, Sri Lanka',
      type: 'invoice',
      subtotal: 7000,
      taxRate: 0,
      taxAmount: 0,
      discountType: 'none',
      discountValue: 0,
      discountAmount: 0,
      totalAmount: 7000,
      paidAmount: 7000,
      outstandingAmount: 0,
      status: 'paid',
      paymentStatus: 'paid',
      dueDate: new Date('2024-12-15'),
      issueDate: new Date('2024-12-10'),
      paidDate: new Date('2024-12-12'),
      emailSent: true,
      sentAt: new Date('2024-12-10'),
      items: {
        create: [
          { description: 'Maldives Luxury Escape — 2 persons (3 nights)', category: 'package', quantity: 1, unitPrice: 6000, totalPrice: 6000, order: 0 },
          { description: 'Valentine\'s Honeymoon Room Upgrade', category: 'accommodation', quantity: 1, unitPrice: 800, totalPrice: 800, order: 1 },
          { description: 'Airport Transfer Premium', category: 'transportation', quantity: 1, unitPrice: 200, totalPrice: 200, order: 2 },
        ],
      },
    },
  });

  // Invoice 2 — partial payment
  await bill.invoice.upsert({
    where: { id: ID.invoice2 },
    update: {},
    create: {
      id: ID.invoice2,
      invoiceNumber: 'INV-202412-00002',
      leadId: ID.lead2,
      createdById: ID.salesRep2,
      customerName: 'Rajesh Nair',
      customerEmail: 'rajesh.nair@outlook.com',
      customerPhone: '+919876543210',
      customerAddress: 'Mumbai, India',
      type: 'invoice',
      subtotal: 4800,
      taxRate: 5,
      taxAmount: 240,
      discountType: 'fixed',
      discountValue: 200,
      discountAmount: 200,
      totalAmount: 4840,
      paidAmount: 1500,
      outstandingAmount: 3340,
      status: 'partial',
      paymentStatus: 'partial',
      dueDate: new Date('2025-01-15'),
      issueDate: new Date('2024-12-20'),
      emailSent: true,
      sentAt: new Date('2024-12-20'),
      items: {
        create: [
          { description: 'Sri Lanka Heritage Explorer — 4 persons (4 nights)', category: 'package', quantity: 4, unitPrice: 1100, totalPrice: 4400, order: 0 },
          { description: 'Child Activity Supplement (2 children)', category: 'activity', quantity: 2, unitPrice: 200, totalPrice: 400, order: 1 },
        ],
      },
    },
  });

  // Quotation 1
  await bill.quotation.upsert({
    where: { id: ID.quotation1 },
    update: {},
    create: {
      id: ID.quotation1,
      quotationNumber: 'QT-202412-00001',
      leadId: ID.lead2,
      createdById: ID.salesRep2,
      customerName: 'Rajesh Nair',
      customerEmail: 'rajesh.nair@outlook.com',
      customerPhone: '+919876543210',
      type: 'package_based',
      mode: 'detailed',
      packageId: ID.pkg1,
      subtotal: 4800,
      taxRate: 5,
      taxAmount: 214,
      discountType: 'fixed',
      discountValue: 200,
      discountAmount: 200,
      totalAmount: 4814,
      status: 'accepted',
      issueDate: new Date('2024-12-18'),
      validUntil: new Date('2025-01-18'),
      emailSent: true,
      sentAt: new Date('2024-12-18'),
      acceptedAt: new Date('2024-12-20'),
      version: 1,
      includedServices: ['Airport transfers', 'Accommodation', 'Daily breakfast', 'Guided tours', 'Entry tickets'],
      excludedServices: ['International flights', 'Travel insurance', 'Lunch & dinner (except included days)', 'Personal expenses'],
      convertedToInvoiceId: ID.invoice2,
      items: {
        create: [
          { description: 'Sri Lanka Heritage Explorer — 4 persons', category: 'package', quantity: 4, unitPrice: 1100, totalPrice: 4400, order: 0 },
          { description: 'Child Activity Supplement', category: 'activity', quantity: 2, unitPrice: 200, totalPrice: 400, order: 1 },
        ],
      },
    },
  });

  // Payment Receipt for invoice1
  await bill.paymentReceipt.upsert({
    where: { id: ID.receipt1 },
    update: {},
    create: {
      id: ID.receipt1,
      receiptNumber: 'REC-202412-00001',
      leadId: ID.lead1,
      invoiceId: ID.invoice1,
      createdById: ID.salesRep1,
      customerName: 'David Kumar',
      customerEmail: 'david.kumar@gmail.com',
      customerPhone: '+94771234567',
      amount: 7000,
      currency: 'USD',
      paymentMethod: 'card',
      paymentDate: new Date('2024-12-12'),
      transactionId: 'stripe_pi_3QAbc123xyz',
      receiptStatus: 'paid_in_full',
      paymentType: 'full_payment',
      previousBalance: 7000,
      outstandingBalance: 0,
      cardType: 'visa',
      cardLastFour: '4242',
      paymentGateway: 'stripe',
      gatewayTransactionId: 'pi_3QAbc123xyz',
      verified: true,
      verifiedById: ID.admin,
      verifiedAt: new Date('2024-12-12'),
      emailSent: true,
      sentAt: new Date('2024-12-12'),
      paymentHistories: {
        create: [
          {
            paymentHistoryNumber: 'PH-202412-00001',
            leadId: ID.lead1,
            invoiceId: ID.invoice1,
            customerName: 'David Kumar',
            customerEmail: 'david.kumar@gmail.com',
            amount: 7000,
            currency: 'USD',
            paymentMethod: 'card',
            paymentDate: new Date('2024-12-12'),
            transactionId: 'stripe_pi_3QAbc123xyz',
            paymentType: 'full_payment',
            status: 'verified',
            createdById: ID.salesRep1,
            verifiedById: ID.admin,
            verifiedAt: new Date('2024-12-12'),
          },
        ],
      },
    },
  });
}

async function seedCareers() {
  console.log('  → crm_careers');
  await career.vacancy.createMany({
    data: [
      {
        id: ID.vacancy1,
        position: 'Senior Travel Consultant',
        description: 'We are looking for an experienced travel consultant to join our growing team. You will be responsible for crafting personalised travel itineraries, managing client relationships, and achieving sales targets.',
        type: 'Full_Time',
        location: 'Colombo, Sri Lanka',
        experienceMin: 3,
        status: 'active',
        createdById: ID.admin,
        closingDate: new Date('2025-02-28'),
      },
      {
        id: ID.vacancy2,
        position: 'Digital Marketing Executive',
        description: 'Manage social media campaigns, SEO, and paid advertising for our travel packages. Experience with Google Ads and Meta Ads required.',
        type: 'Full_Time',
        location: 'Remote',
        experienceMin: 2,
        status: 'active',
        createdById: ID.admin,
        closingDate: new Date('2025-01-31'),
      },
    ],
    skipDuplicates: true,
  });

  await career.career.createMany({
    data: [
      {
        fullName: 'Nimal Silva',
        email: 'nimal.silva@gmail.com',
        phone: '+94701234567',
        position: 'Senior Travel Consultant',
        coverLetter: 'I have 5 years of experience in the travel industry with a proven track record of exceeding sales targets. I am passionate about creating memorable travel experiences for clients.',
        agreeTerms: true,
        status: 'shortlisted',
        reviewedById: ID.admin,
        reviewedAt: new Date('2024-12-20'),
        emailSent: true,
      },
      {
        fullName: 'Kasun Mendis',
        email: 'kasun.mendis@yahoo.com',
        phone: '+94711234567',
        position: 'Digital Marketing Executive',
        coverLetter: 'I specialise in performance marketing for travel brands. I have managed campaigns with budgets exceeding $50k/month and consistently delivered ROAS above 4x.',
        agreeTerms: true,
        status: 'pending',
        emailSent: false,
      },
    ],
    skipDuplicates: true,
  });
}

async function seedAuth() {
  console.log('  → crm_auth');
  // OTPs are short-lived; seed one example for dev testing
  await auth.otp.createMany({
    data: [
      {
        userId: ID.customer2,
        code: '482910',
        type: 'emailVerification',
        email: 'emily.chen@gmail.com',
        isUsed: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // expires in 24h
      },
    ],
    skipDuplicates: true,
  });
}

async function main() {
  console.log('Seeding Travel CRM database...\n');
  try {
    await seedUsers();
    await seedPackages();
    await seedLeads();
    await seedBookings();
    await seedBilling();
    await seedCareers();
    await seedAuth();
    console.log('\n✓ All schemas seeded successfully.');
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    throw err;
  } finally {
    await Promise.all([auth.$disconnect(), users.$disconnect(), pkg.$disconnect(), leads.$disconnect(), books.$disconnect(), bill.$disconnect(), career.$disconnect()]);
  }
}

main();
