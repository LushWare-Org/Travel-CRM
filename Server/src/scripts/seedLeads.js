import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';

dotenv.config();

export const seedLeads = async () => {
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Get users for assignment
    const users = await User.find({});
    const adminUser = users.find((u) => u.role === 'admin');
    const salesRepUser = users.find((u) => u.role === 'salesRep');

    // Sample leads data - 15 leads with ALL statuses represented
    const leads = [
      // Status: new (2 leads)
      {
        name: 'James Mitchell',
        email: 'james.mitchell@example.com',
        phone: '+1-555-0101',
        whatsapp: '+1-555-0101',
        city: 'New York',
        destination: 'Paris, France',
        fromCountry: 'United States',
        destinationCountry: 'France',
        source: 'manual',
        platform: 'Phone Call',
        status: 'new',
        priority: 'high',
        assignedTo: salesRepUser?._id,
        assignedBy: adminUser?._id,
        assignmentMode: 'manual',
        leadDateTime: new Date('2024-10-15T10:30:00Z'),
        travelDate: new Date('2024-12-15'),
        time: '10:30 AM',
        salesRep: 'Sarah Johnson',
        numberOfTravelers: 2,
        remarks: [
          { text: 'Interested in romantic getaway', date: new Date('2024-10-15'), addedBy: adminUser?._id },
          { text: 'Prefers 5-star hotels', date: new Date('2024-10-16'), addedBy: adminUser?._id },
          { text: 'Budget flexible - awaiting quote', date: new Date('2024-10-17'), addedBy: adminUser?._id },
        ],
      },
      {
        name: 'Emily Thompson',
        email: 'emily.thompson@email.com',
        phone: '+1-555-0102',
        whatsapp: '+1-555-0102',
        city: 'Los Angeles',
        destination: 'Bali, Indonesia',
        fromCountry: 'United States',
        destinationCountry: 'Indonesia',
        source: 'website',
        platform: 'Website Form',
        status: 'new',
        priority: 'medium',
        assignmentMode: 'auto',
        leadDateTime: new Date('2024-10-20T14:30:00Z'),
        travelDate: new Date('2025-01-20'),
        time: '2:00 PM',
        salesRep: 'Mike Chen',
        numberOfTravelers: 3,
        message: 'Family vacation planning',
        remarks: [
          { text: 'Family of 3 - looking for beach resort', date: new Date('2024-10-20'), addedBy: adminUser?._id },
          { text: 'Kid-friendly activities required', date: new Date('2024-10-21'), addedBy: adminUser?._id },
          { text: 'Interested in all-inclusive package', date: new Date('2024-10-22'), addedBy: adminUser?._id },
        ],
      },

      // Status: contacted (2 leads)
      {
        name: 'Michael Parker',
        email: 'michael.parker@email.com',
        phone: '+1-555-0103',
        whatsapp: '+1-555-0103',
        city: 'Chicago',
        destination: 'Tokyo, Japan',
        fromCountry: 'United States',
        destinationCountry: 'Japan',
        source: 'manual',
        platform: 'Email',
        status: 'contacted',
        priority: 'medium',
        leadDateTime: new Date('2024-10-18T09:00:00Z'),
        travelDate: new Date('2025-02-15'),
        time: '11:00 AM',
        salesRep: 'Lisa Anderson',
        numberOfTravelers: 2,
        remarks: [
          { text: 'Initial inquiry received', date: new Date('2024-10-18'), addedBy: salesRepUser?._id },
          { text: 'Called to discuss itinerary details', date: new Date('2024-10-19'), addedBy: salesRepUser?._id },
          { text: 'Follow-up scheduled for next week', date: new Date('2024-10-20'), addedBy: salesRepUser?._id },
        ],
      },
      {
        name: 'Sophia Martinez',
        email: 'sophia.martinez@email.com',
        phone: '+1-555-0104',
        whatsapp: '+1-555-0104',
        city: 'Miami',
        destination: 'Dubai, UAE',
        fromCountry: 'United States',
        destinationCountry: 'United Arab Emirates',
        source: 'website',
        platform: 'Website Form',
        status: 'contacted',
        priority: 'high',
        assignmentMode: 'auto',
        leadDateTime: new Date('2024-10-16T16:00:00Z'),
        travelDate: new Date('2025-01-10'),
        time: '4:00 PM',
        salesRep: 'David Brown',
        numberOfTravelers: 2,
        message: 'Luxury Dubai trip',
        remarks: [
          { text: 'Inquired about luxury package', date: new Date('2024-10-16'), addedBy: adminUser?._id },
          { text: 'First contact made by phone', date: new Date('2024-10-17'), addedBy: salesRepUser?._id },
          { text: 'Discussing suite preferences', date: new Date('2024-10-18'), addedBy: salesRepUser?._id },
        ],
      },

      // Status: interested (2 leads)
      {
        name: 'Robert Foster',
        email: 'robert.foster@email.com',
        phone: '+1-555-0105',
        whatsapp: '+1-555-0105',
        city: 'Seattle',
        destination: 'Santorini, Greece',
        fromCountry: 'United States',
        destinationCountry: 'Greece',
        source: 'manual',
        platform: 'Referral',
        status: 'interested',
        priority: 'high',
        leadDateTime: new Date('2024-10-12T10:30:00Z'),
        travelDate: new Date('2025-03-20'),
        time: '3:00 PM',
        salesRep: 'Sarah Johnson',
        numberOfTravelers: 2,
        remarks: [
          { text: 'Honeymoon trip planning', date: new Date('2024-10-12'), addedBy: salesRepUser?._id },
          { text: 'View sunset view rooms preferred', date: new Date('2024-10-13'), addedBy: salesRepUser?._id },
          { text: 'Very interested - reviewing options', date: new Date('2024-10-14'), addedBy: salesRepUser?._id },
        ],
      },
      {
        name: 'Olivia Rogers',
        email: 'olivia.rogers@example.com',
        phone: '+1-555-0106',
        whatsapp: '+1-555-0106',
        city: 'Boston',
        destination: 'Swiss Alps',
        fromCountry: 'United States',
        destinationCountry: 'Switzerland',
        source: 'website',
        platform: 'Social Media',
        status: 'interested',
        priority: 'medium',
        assignmentMode: 'auto',
        leadDateTime: new Date('2024-10-14T11:15:00Z'),
        travelDate: new Date('2024-12-01'),
        time: '9:00 AM',
        salesRep: 'Mike Chen',
        numberOfTravelers: 4,
        message: 'Family ski trip',
        remarks: [
          { text: 'Family skiing vacation inquiry', date: new Date('2024-10-14'), addedBy: adminUser?._id },
          { text: 'Need beginner-friendly slopes', date: new Date('2024-10-15'), addedBy: salesRepUser?._id },
          { text: 'Very engaged - multiple follow-ups', date: new Date('2024-10-16'), addedBy: salesRepUser?._id },
        ],
      },

      // Status: quoted (2 leads)
      {
        name: 'Daniel Wright',
        email: 'daniel.wright@email.com',
        phone: '+1-555-0107',
        whatsapp: '+1-555-0107',
        city: 'San Francisco',
        destination: 'Singapore',
        fromCountry: 'United States',
        destinationCountry: 'Singapore',
        source: 'booking',
        platform: 'Paid Package',
        status: 'quoted',
        priority: 'high',
        leadDateTime: new Date('2024-09-25T12:00:00Z'),
        travelDate: new Date('2024-11-30'),
        time: '10:00 AM',
        salesRep: 'Lisa Anderson',
        numberOfTravelers: 2,
        quoteSent: true,
        quoteAmount: 1899,
        remarks: [
          { text: 'Shopping tour interest', date: new Date('2024-09-25'), addedBy: salesRepUser?._id },
          { text: 'Quote prepared and sent', date: new Date('2024-09-26'), addedBy: adminUser?._id },
          { text: 'Awaiting customer response', date: new Date('2024-09-28'), addedBy: salesRepUser?._id },
        ],
      },
      {
        name: 'Amanda Taylor',
        email: 'amanda.taylor@email.com',
        phone: '+1-555-0108',
        whatsapp: '+1-555-0108',
        city: 'Dallas',
        destination: 'Barcelona, Spain',
        fromCountry: 'United States',
        destinationCountry: 'Spain',
        source: 'manual',
        platform: 'Phone Call',
        status: 'quoted',
        priority: 'medium',
        leadDateTime: new Date('2024-09-28T14:30:00Z'),
        travelDate: new Date('2025-04-15'),
        time: '2:00 PM',
        salesRep: 'David Brown',
        numberOfTravelers: 2,
        remarks: [
          { text: 'Cultural tour inquiry', date: new Date('2024-09-28'), addedBy: salesRepUser?._id },
          { text: 'Detailed quote provided', date: new Date('2024-09-29'), addedBy: adminUser?._id },
          { text: 'Reviewing itinerary details', date: new Date('2024-09-30'), addedBy: salesRepUser?._id },
        ],
      },

      // Status: converted (2 leads)
      {
        name: 'William Harris',
        email: 'william.harris@example.com',
        phone: '+1-555-0109',
        whatsapp: '+1-555-0109',
        city: 'Austin',
        destination: 'Maldives',
        fromCountry: 'United States',
        destinationCountry: 'Maldives',
        source: 'booking',
        platform: 'Paid Package',
        status: 'converted',
        priority: 'high',
        leadDateTime: new Date('2024-08-20T10:00:00Z'),
        travelDate: new Date('2025-01-15'),
        time: '11:00 AM',
        salesRep: 'Sarah Johnson',
        numberOfTravelers: 2,
        quoteSent: true,
        quoteAmount: 5499,
        remarks: [
          { text: 'Honeymoon package booked', date: new Date('2024-08-20'), addedBy: salesRepUser?._id },
          { text: 'Full payment received', date: new Date('2024-08-25'), addedBy: adminUser?._id },
          { text: 'Overwater bungalow confirmed', date: new Date('2024-08-30'), addedBy: salesRepUser?._id },
        ],
      },
      {
        name: 'Charlotte Lee',
        email: 'charlotte.lee@email.com',
        phone: '+1-555-0110',
        whatsapp: '+1-555-0110',
        city: 'Portland',
        destination: 'Machu Picchu, Peru',
        fromCountry: 'United States',
        destinationCountry: 'Peru',
        source: 'website',
        platform: 'Website Form',
        status: 'converted',
        priority: 'high',
        assignmentMode: 'auto',
        leadDateTime: new Date('2024-09-10T13:00:00Z'),
        travelDate: new Date('2025-02-20'),
        time: '9:00 AM',
        salesRep: 'Mike Chen',
        numberOfTravelers: 2,
        message: 'Adventure tour booked',
        remarks: [
          { text: 'Adventure trekking package', date: new Date('2024-09-10'), addedBy: adminUser?._id },
          { text: 'Payment processed successfully', date: new Date('2024-09-15'), addedBy: adminUser?._id },
          { text: 'Tour guide and equipment assigned', date: new Date('2024-09-20'), addedBy: salesRepUser?._id },
        ],
      },

      // Status: lost (2 leads)
      {
        name: 'Benjamin Cooper',
        email: 'benjamin.cooper@email.com',
        phone: '+1-555-0111',
        whatsapp: '+1-555-0111',
        city: 'Denver',
        destination: 'Iceland',
        fromCountry: 'United States',
        destinationCountry: 'Iceland',
        source: 'manual',
        platform: 'Phone Call',
        status: 'lost',
        priority: 'medium',
        leadDateTime: new Date('2024-07-15T14:00:00Z'),
        travelDate: new Date('2024-11-10'),
        time: '12:00 PM',
        salesRep: 'Lisa Anderson',
        numberOfTravelers: 2,
        lostReason: 'Found better rates elsewhere',
        remarks: [
          { text: 'Northern lights tour inquiry', date: new Date('2024-07-15'), addedBy: salesRepUser?._id },
          { text: 'Quoted premium package', date: new Date('2024-07-16'), addedBy: adminUser?._id },
          { text: 'Customer chose different agency', date: new Date('2024-07-20'), addedBy: salesRepUser?._id },
        ],
      },
      {
        name: 'Grace Miller',
        email: 'grace.miller@email.com',
        phone: '+1-555-0112',
        whatsapp: '+1-555-0112',
        city: 'Philadelphia',
        destination: 'Bali, Indonesia',
        fromCountry: 'United States',
        destinationCountry: 'Indonesia',
        source: 'website',
        platform: 'Website Form',
        status: 'lost',
        priority: 'low',
        assignmentMode: 'auto',
        leadDateTime: new Date('2024-06-20T15:30:00Z'),
        travelDate: new Date('2024-10-05'),
        time: '3:00 PM',
        salesRep: 'David Brown',
        numberOfTravelers: 4,
        message: 'Family trip',
        remarks: [
          { text: 'Family beach vacation inquiry', date: new Date('2024-06-20'), addedBy: adminUser?._id },
          { text: 'Budget concerns discussed', date: new Date('2024-06-22'), addedBy: salesRepUser?._id },
          { text: 'Unresponsive after initial contact', date: new Date('2024-06-28'), addedBy: adminUser?._id },
        ],
      },

      // Status: not-interested (3 leads to reach 15 total)
      {
        name: 'Henry Bailey',
        email: 'henry.bailey@example.com',
        phone: '+1-555-0113',
        whatsapp: '+1-555-0113',
        city: 'San Diego',
        destination: 'Amsterdam, Netherlands',
        fromCountry: 'United States',
        destinationCountry: 'Netherlands',
        source: 'website',
        platform: 'Social Media',
        status: 'not-interested',
        priority: 'low',
        assignmentMode: 'auto',
        leadDateTime: new Date('2024-06-05T11:00:00Z'),
        travelDate: new Date('2024-09-25'),
        time: '10:00 AM',
        salesRep: 'Sarah Johnson',
        numberOfTravelers: 1,
        message: 'Solo traveler',
        remarks: [
          { text: 'Budget traveler inquiry', date: new Date('2024-06-05'), addedBy: adminUser?._id },
          { text: 'Found cheaper alternatives', date: new Date('2024-06-08'), addedBy: salesRepUser?._id },
          { text: 'Booking independently', date: new Date('2024-06-12'), addedBy: adminUser?._id },
        ],
      },
      {
        name: 'Isabella Turner',
        email: 'isabella.turner@email.com',
        phone: '+1-555-0114',
        whatsapp: '+1-555-0114',
        city: 'Atlanta',
        destination: 'Rome, Italy',
        fromCountry: 'United States',
        destinationCountry: 'Italy',
        source: 'manual',
        platform: 'Email',
        status: 'not-interested',
        priority: 'low',
        leadDateTime: new Date('2024-05-15T12:00:00Z'),
        travelDate: new Date('2024-09-10'),
        time: '1:00 PM',
        salesRep: 'Mike Chen',
        numberOfTravelers: 2,
        remarks: [
          { text: 'Cultural tour inquiry', date: new Date('2024-05-15'), addedBy: salesRepUser?._id },
          { text: 'Prices too high for budget', date: new Date('2024-05-18'), addedBy: salesRepUser?._id },
          { text: 'Planning independent travel', date: new Date('2024-05-22'), addedBy: adminUser?._id },
        ],
      },
      {
        name: 'Christopher Moore',
        email: 'christopher.moore@email.com',
        phone: '+1-555-0115',
        whatsapp: '+1-555-0115',
        city: 'Phoenix',
        destination: 'Thailand',
        fromCountry: 'United States',
        destinationCountry: 'Thailand',
        source: 'booking',
        platform: 'Paid Package',
        status: 'not-interested',
        priority: 'low',
        assignmentMode: 'auto',
        leadDateTime: new Date('2024-04-10T14:00:00Z'),
        travelDate: new Date('2024-08-20'),
        time: '11:00 AM',
        salesRep: 'Lisa Anderson',
        numberOfTravelers: 2,
        remarks: [
          { text: 'Beach vacation inquiry', date: new Date('2024-04-10'), addedBy: adminUser?._id },
          { text: 'Travel dates changed', date: new Date('2024-04-15'), addedBy: salesRepUser?._id },
          { text: 'Cannot proceed with booking', date: new Date('2024-04-20'), addedBy: adminUser?._id },
        ],
      },
    ];

    // Clear existing data
    await Lead.deleteMany({});
    console.log('✓ Cleared existing leads');

    // Insert leads
    const createdLeads = await Lead.create(leads);
    console.log(`✓ Created ${createdLeads.length} sample leads`);

    // Display summary
    console.log('\n--- Lead Summary ---');
    const summary = createdLeads.reduce(
      (acc, lead) => {
        acc.total += 1;
        acc.bySource[lead.source] = (acc.bySource[lead.source] || 0) + 1;
        acc.byStatus[lead.status] = (acc.byStatus[lead.status] || 0) + 1;
        acc.bySalesRep[lead.salesRep] = (acc.bySalesRep[lead.salesRep] || 0) + 1;
        return acc;
      },
      {
        total: 0, bySource: {}, byStatus: {}, bySalesRep: {},
      },
    );

    console.log(`Total Leads: ${summary.total}`);
    console.log('By Source:', summary.bySource);
    console.log('By Status:', summary.byStatus);
    console.log('By Sales Rep:', summary.bySalesRep);

    return createdLeads;
  } catch (error) {
    console.error('Error seeding leads:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLeads()
    .then(() => {
      console.log('\n✓ Leads seeded successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
