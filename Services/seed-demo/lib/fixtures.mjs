/**
 * People, org identity and prose fixtures for the demo seed.
 *
 * Names, phone prefixes and email domains are chosen per source market so the
 * book of business reads like a real Colombo-based DMC selling to Europe,
 * India, the Gulf, East Asia and Australasia — not like lorem ipsum.
 */

// ─── Agency identity ────────────────────────────────────────────────────────
// Replaces the placeholder "Test-Stage Travel Partner" row the old
// seed-org-settings.mjs wrote, so quotation and invoice PDFs render with a
// credible letterhead.
export const AGENCY = {
  companyName: 'Lush Travel Cloud',
  companyShortName: 'Lush Travel',
  companyLegalName: 'Lush Travel Cloud (Pvt) Ltd',
  companyAddress: 'Level 7, 128 Union Place, Colombo 02, 00200, Sri Lanka',
  companyGstNumber: '114356789-7000',
  tagline: 'Handcrafted journeys across Asia, the Indian Ocean and beyond',
  logoUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=240&auto=format&fit=crop&q=70',
  contactEmail: 'hello@lushtravelcloud.com',
  salesEmail: 'reservations@lushtravelcloud.com',
  supportEmail: 'support@lushtravelcloud.com',
  contactPhone: '+94 11 745 2200',
  whatsappNumber: '+94 77 345 2200',
  website: 'https://lushtravelcloud.com',
  themeInk: '#12303f',
  themeMuted: '#5b7285',
  themeAccent: '#f0a63c',
  themeAccentDark: '#c9821f',
  defaultCurrency: 'USD',
  defaultTaxRate: 0,
  defaultServiceChargeRate: 5,
  quotationValidityDays: 21,
  quotationTerms:
    'This quotation is valid until the date shown. Prices are quoted in USD per person and are subject to availability at the time of confirmation. A signed acceptance and deposit are required to hold services.',
  cancellationPolicy:
    'Cancellation more than 45 days before travel: deposit refunded in full less bank charges. 45–21 days: 50% of the total is retained. 20–8 days: 75% is retained. Within 7 days or no-show: no refund. Peak-season and non-refundable supplier fares are advised separately on the invoice.',
  invoicePaymentTerms: 'Deposit to confirm, with the balance due 21 days before travel unless the invoice states otherwise.',
  invoicePaymentInstructions:
    'Please quote the invoice number on all remittances and email the payment confirmation to accounts@lushtravelcloud.com. Card payments carry a 2.9% gateway fee.',
  ratingTagline: 'Rated 4.8/5 by 1,200+ travellers',
  paymentMethods: ['bank-transfer', 'card', 'cash', 'online'],
  docNumberPrefixes: { quotation: 'QUO', invoice: 'INV', receipt: 'REC', payment: 'PAY', creditNote: 'CRN', voucher: 'VCH' },
  bankName: 'Commercial Bank of Ceylon PLC',
  bankAccountName: 'LUSH TRAVEL CLOUD PVT LTD',
  bankAccountNumber: '8001234567',
  bankIfscCode: 'CCEYLKLX',
  bankSwiftCode: 'CCEYLKLXXXX',
  bankBranch: 'Union Place, Colombo 02',
  bankAccountType: 'Current Account',
  upiId: 'lushtravel@cbceylon',
};

export const POLICY_DOCUMENTS = [
  {
    title: 'Booking & Payment Policy',
    body: 'A booking is confirmed only when the deposit has cleared and a written confirmation has been issued. Deposits are 25% of the total unless the itinerary includes non-refundable supplier services, in which case those amounts are payable in full at the time of booking. The balance is due 21 days before travel. Bookings made within 21 days of travel require payment in full. We accept bank transfer, card and cash payments; card payments carry a 2.9% gateway fee. All prices are quoted in USD and are subject to change until the booking is confirmed.',
  },
  {
    title: 'Cancellation Policy',
    body: 'Cancellation more than 45 days before travel: the deposit is refunded in full less bank charges. Between 45 and 21 days: 50% of the total is retained. Between 20 and 8 days: 75% is retained. Within 7 days of travel or in the case of a no-show: no refund is available. Air tickets, safari permits and peak-season hotel deposits are governed by the supplier\u2019s own rules and are advised in writing on the invoice. No refunds are payable for unused services, early departures or missed connections.',
  },
  {
    title: 'Refund Policy',
    body: 'Where a refund is due, it is processed to the original payment method within 14 working days of written approval. Bank charges and gateway fees are non-refundable. Refunds for services cancelled by the supplier are passed through in full, less any fee already paid by us to secure the service. Where a supplier offers a credit voucher instead of cash, we will pass that option to the customer and hold the value for 12 months.',
  },
  {
    title: 'Amendment Policy',
    body: 'Date changes made more than 30 days before travel are free of charge, subject to supplier availability and any rate difference. Changes made within 30 days may attract supplier amendment fees, which will be advised before we proceed. The customer will be issued a revised invoice for any amount payable. Name changes on airline tickets are generally not permitted and may require a new ticket to be issued.',
  },
  {
    title: 'Visa & Entry Requirements',
    body: 'Entry requirements are the responsibility of the traveller. Sri Lanka requires an ETA for most nationalities, Vietnam an e-visa, Kenya an eTA, Egypt a visa on arrival for many passports, and Bhutan a permit arranged by us against prepayment. Passports must be valid for at least six months beyond the return date and hold at least two blank pages. We will advise on requirements in good faith but cannot accept liability for denied boarding or entry.',
  },
  {
    title: 'Travel Insurance',
    body: 'Comprehensive travel insurance covering medical treatment, evacuation, cancellation and curtailment is a condition of travel on all of our itineraries, and is mandatory on the Nepal and Kenya programmes. A certificate of cover must be presented before the final documents are released. We can arrange cover on request but we do not act as an insurer.',
  },
  {
    title: 'Child & Family Policy',
    body: 'Infants under two travel free of charge when sharing with an adult, other than airfare and any park fees. Children aged 2 to 11 sharing with two adults receive a 25% reduction on land arrangements. Family rooms and interconnecting rooms are subject to availability and must be requested at the time of booking. Child safety seats are provided at no cost, and car seats for infants must be advised in advance.',
  },
  {
    title: 'Baggage Policy',
    body: 'Domestic flights within Sri Lanka, Nepal and the Maldives carry a 15 kg checked allowance and 5 kg of cabin baggage per passenger; excess is charged by the carrier at the airport. On the Maldives seaplane transfers the allowance is 20 kg checked and 5 kg cabin, with hard cases not permitted. Soft bags are recommended on all light-aircraft sectors. Our trekking programmes include 15 kg of porter support per trekker on the mountain sectors.',
  },
  {
    title: 'Privacy & Data Policy',
    body: 'We collect only the information needed to arrange and operate your travel. Passport details and dates of birth are shared only with the airlines, hotels and authorities that require them. We do not sell personal data. Payment card details are handled by our payment gateway and are never stored on our systems. You may request a copy or the deletion of your data at any time by writing to privacy@lushtravelcloud.com.',
  },
  {
    title: 'Responsible Travel Policy',
    body: 'We do not sell elephant riding, tiger temples or any product involving the exploitation of wild animals. Our wildlife programmes are operated only with licensed parks and conservancies that follow national regulations on vehicle density and distance. We pay a living wage to our guides and drivers, and we ask travellers not to hand out money or sweets to children. Where possible we book locally owned accommodation and restaurants.',
  },
];

// ─── Staff ──────────────────────────────────────────────────────────────────
// Existing accounts (superadmin@, alice.admin@, bob.sales@, carol.sales@,
// mark.admin@, diana.sales@, ethan.sales@) keep their ids and passwords; these
// are additive so the assignment pickers, commission table and RBAC screens
// have real people behind them.
export const STAFF = [
  { key: 'nuwan', name: 'Nuwan Jayasuriya', email: 'nuwan.jayasuriya@lushtravelcloud.com', role: 'superAdmin', permissions: ['manage_users', 'manage_sales_reps', 'manage_vendors', 'manage_admins', 'view_reports', 'manage_billing', 'view_billing', 'manage_leads', 'manage_packages'], title: 'Director' },
  { key: 'priyanka', name: 'Priyanka Weerasinghe', email: 'priyanka.weerasinghe@lushtravelcloud.com', role: 'admin', permissions: ['manage_users', 'manage_leads', 'manage_packages', 'view_reports', 'manage_billing', 'view_billing'], title: 'Head of Operations' },
  { key: 'ruwan', name: 'Ruwan de Silva', email: 'ruwan.desilva@lushtravelcloud.com', role: 'admin', permissions: ['manage_leads', 'manage_packages', 'view_reports', 'manage_billing', 'view_billing'], title: 'Operations Manager' },
  { key: 'hasitha', name: 'Hasitha Bandara', email: 'hasitha.bandara@lushtravelcloud.com', role: 'salesRep', permissions: ['manage_leads', 'view_billing', 'view_reports', 'manage_packages'], title: 'Senior Travel Consultant' },
  { key: 'thilini', name: 'Thilini Rajapaksa', email: 'thilini.rajapaksa@lushtravelcloud.com', role: 'salesRep', permissions: ['manage_leads', 'view_billing', 'view_reports'], title: 'Travel Consultant' },
  { key: 'amila', name: 'Amila Gunathilaka', email: 'amila.gunathilaka@lushtravelcloud.com', role: 'salesRep', permissions: ['manage_leads', 'view_billing'], title: 'Travel Consultant' },
  { key: 'nadeesha', name: 'Nadeesha Kularatne', email: 'nadeesha.kularatne@lushtravelcloud.com', role: 'salesRep', permissions: ['manage_leads', 'view_billing', 'view_reports'], title: 'Maldives Specialist' },
  { key: 'ishara', name: 'Ishara Pathirana', email: 'ishara.pathirana@lushtravelcloud.com', role: 'salesRep', permissions: ['manage_leads', 'view_billing'], title: 'Africa & Safari Specialist' },
  { key: 'danushka', name: 'Danushka Ekanayake', email: 'danushka.ekanayake@lushtravelcloud.com', role: 'salesRep', permissions: ['manage_leads', 'view_billing'], title: 'Far East Specialist' },
  { key: 'shaheen', name: 'Shaheen Rahman', email: 'shaheen.rahman@lushtravelcloud.com', role: 'salesRep', permissions: ['manage_leads', 'view_billing', 'view_reports'], title: 'Gulf & Middle East Specialist' },
];

/** The sales reps a lead may be assigned to, in round-robin order. */
export const REP_KEYS = ['bob', 'carol', 'hasitha', 'thilini', 'amila', 'nadeesha', 'ishara', 'danushka', 'shaheen', 'diana', 'ethan'];

// ─── Customers ──────────────────────────────────────────────────────────────
// Source markets with plausible phone country codes and city choices.
export const CUSTOMERS = [
  { name: 'Oliver Bennett', email: 'oliver.bennett@gmail.com', country: 'United Kingdom', city: 'London', phone: '+44 7700 900112' },
  { name: 'Charlotte Hughes', email: 'charlotte.hughes@outlook.com', country: 'United Kingdom', city: 'Manchester', phone: '+44 7700 900233' },
  { name: 'Thomas Müller', email: 'thomas.mueller@web.de', country: 'Germany', city: 'Munich', phone: '+49 151 2345678' },
  { name: 'Anja Schneider', email: 'anja.schneider@gmx.de', country: 'Germany', city: 'Hamburg', phone: '+49 160 8876543' },
  { name: 'Marie Dubois', email: 'marie.dubois@orange.fr', country: 'France', city: 'Lyon', phone: '+33 6 12 45 78 90' },
  { name: 'Lucas Martin', email: 'lucas.martin@free.fr', country: 'France', city: 'Bordeaux', phone: '+33 6 98 32 14 77' },
  { name: 'Sanne de Vries', email: 'sanne.devries@ziggo.nl', country: 'Netherlands', city: 'Utrecht', phone: '+31 6 12345678' },
  { name: 'Bram Jansen', email: 'bram.jansen@gmail.com', country: 'Netherlands', city: 'Rotterdam', phone: '+31 6 87654321' },
  { name: 'Giulia Romano', email: 'giulia.romano@libero.it', country: 'Italy', city: 'Milan', phone: '+39 347 1234567' },
  { name: 'Marco Ferrari', email: 'marco.ferrari@gmail.com', country: 'Italy', city: 'Rome', phone: '+39 333 9876543' },
  { name: 'Carlos Mendoza', email: 'carlos.mendoza@gmail.com', country: 'Spain', city: 'Barcelona', phone: '+34 611 223 344' },
  { name: 'Lucía Ortega', email: 'lucia.ortega@hotmail.com', country: 'Spain', city: 'Madrid', phone: '+34 622 334 455' },
  { name: 'Erik Lundqvist', email: 'erik.lundqvist@gmail.com', country: 'Sweden', city: 'Stockholm', phone: '+46 70 123 45 67' },
  { name: 'Ingrid Halvorsen', email: 'ingrid.halvorsen@online.no', country: 'Norway', city: 'Oslo', phone: '+47 912 34 567' },
  { name: 'Aoife O\u2019Connor', email: 'aoife.oconnor@gmail.com', country: 'Ireland', city: 'Dublin', phone: '+353 86 123 4567' },
  { name: 'Liam Murphy', email: 'liam.murphy@eircom.net', country: 'Ireland', city: 'Cork', phone: '+353 87 987 6543' },
  { name: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', country: 'India', city: 'Mumbai', phone: '+91 98201 45678' },
  { name: 'Priya Raghavan', email: 'priya.raghavan@yahoo.in', country: 'India', city: 'Bengaluru', phone: '+91 99860 12345' },
  { name: 'Vikram Singh', email: 'vikram.singh@outlook.com', country: 'India', city: 'Delhi', phone: '+91 98110 22334' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@gmail.com', country: 'India', city: 'Chennai', phone: '+91 90030 55667' },
  { name: 'Rohan Kulkarni', email: 'rohan.kulkarni@gmail.com', country: 'India', city: 'Pune', phone: '+91 98220 77889' },
  { name: 'Ahmed Al Mansoori', email: 'ahmed.almansoori@eim.ae', country: 'United Arab Emirates', city: 'Dubai', phone: '+971 50 123 4567' },
  { name: 'Fatima Al Zaabi', email: 'fatima.alzaabi@gmail.com', country: 'United Arab Emirates', city: 'Abu Dhabi', phone: '+971 55 987 6543' },
  { name: 'Khalid Al Harbi', email: 'khalid.alharbi@outlook.sa', country: 'Saudi Arabia', city: 'Riyadh', phone: '+966 55 123 4567' },
  { name: 'Noura Al Qahtani', email: 'noura.alqahtani@gmail.com', country: 'Saudi Arabia', city: 'Jeddah', phone: '+966 50 987 6543' },
  { name: 'Wei Zhang', email: 'wei.zhang@qq.com', country: 'China', city: 'Shanghai', phone: '+86 138 1234 5678' },
  { name: 'Li Chen', email: 'li.chen@163.com', country: 'China', city: 'Beijing', phone: '+86 139 8765 4321' },
  { name: 'Yuki Tanaka', email: 'yuki.tanaka@docomo.ne.jp', country: 'Japan', city: 'Tokyo', phone: '+81 90 1234 5678' },
  { name: 'Haruto Sato', email: 'haruto.sato@gmail.com', country: 'Japan', city: 'Osaka', phone: '+81 80 8765 4321' },
  { name: 'Min-jun Park', email: 'minjun.park@naver.com', country: 'South Korea', city: 'Seoul', phone: '+82 10 1234 5678' },
  { name: 'Ji-woo Kim', email: 'jiwoo.kim@gmail.com', country: 'South Korea', city: 'Busan', phone: '+82 10 8765 4321' },
  { name: 'Sarah Mitchell', email: 'sarah.mitchell@gmail.com', country: 'Australia', city: 'Sydney', phone: '+61 412 345 678' },
  { name: 'Daniel O\u2019Brien', email: 'daniel.obrien@bigpond.com', country: 'Australia', city: 'Melbourne', phone: '+61 423 456 789' },
  { name: 'Emma Wilson', email: 'emma.wilson@xtra.co.nz', country: 'New Zealand', city: 'Auckland', phone: '+64 21 123 4567' },
  { name: 'Michael Brown', email: 'michael.brown@gmail.com', country: 'United States', city: 'New York', phone: '+1 212 555 0143' },
  { name: 'Jessica Davis', email: 'jessica.davis@gmail.com', country: 'United States', city: 'San Francisco', phone: '+1 415 555 0198' },
  { name: 'Robert Miller', email: 'robert.miller@outlook.com', country: 'Canada', city: 'Toronto', phone: '+1 416 555 0177' },
  { name: 'Emily Tremblay', email: 'emily.tremblay@gmail.com', country: 'Canada', city: 'Vancouver', phone: '+1 604 555 0132' },
  { name: 'Dinesh Ratnayake', email: 'dinesh.ratnayake@gmail.com', country: 'Sri Lanka', city: 'Colombo', phone: '+94 77 123 4567' },
  { name: 'Sanduni Fernando', email: 'sanduni.fernando@yahoo.com', country: 'Sri Lanka', city: 'Negombo', phone: '+94 71 987 6543' },
  { name: 'Nimal Perera', email: 'nimal.perera@gmail.com', country: 'Sri Lanka', city: 'Galle', phone: '+94 76 445 5667' },
  { name: 'Ayesha Wickramasinghe', email: 'ayesha.w@gmail.com', country: 'Sri Lanka', city: 'Kandy', phone: '+94 75 223 3445' },
  { name: 'Joseph Kamau', email: 'joseph.kamau@gmail.com', country: 'Kenya', city: 'Nairobi', phone: '+254 722 123 456' },
  { name: 'Grace Wanjiru', email: 'grace.wanjiru@yahoo.com', country: 'Kenya', city: 'Mombasa', phone: '+254 733 987 654' },
  { name: 'Sofia Rossi', email: 'sofia.rossi@gmail.com', country: 'Switzerland', city: 'Zurich', phone: '+41 79 123 45 67' },
  { name: 'Lukas Meier', email: 'lukas.meier@bluewin.ch', country: 'Switzerland', city: 'Geneva', phone: '+41 78 987 65 43' },
  { name: 'Maya Sharma', email: 'maya.sharma@gmail.com', country: 'Singapore', city: 'Singapore', phone: '+65 8123 4567' },
  { name: 'Tan Wei Lim', email: 'tanwei.lim@gmail.com', country: 'Malaysia', city: 'Kuala Lumpur', phone: '+60 12 345 6789' },
];

// ─── Vendors ────────────────────────────────────────────────────────────────
export const VENDORS = [
  { key: 'ceylonhotels', name: 'Saman Perera', business: 'Ceylon Hotels & Resorts', type: 'hotel', city: 'Colombo', country: 'Sri Lanka', reg: 'CRM-VND-001', email: 'saman@ceylonhotels.lk', phone: '+94 11 234 5678', rating: 4.5, bookings: 38 },
  { key: 'islandtrans', name: 'Pradeep Fernando', business: 'Island Transport Services', type: 'transport', city: 'Colombo', country: 'Sri Lanka', reg: 'CRM-VND-002', email: 'pradeep@islandtransport.lk', phone: '+94 77 723 4567', rating: 4.3, bookings: 22 },
  { key: 'asiaguides', name: 'Mei Lin', business: 'Asia Guides & Tours', type: 'guide', city: 'Bangkok', country: 'Thailand', reg: 'CRM-VND-003', email: 'mei.lin@asiaguides.com', phone: '+66 81 234 5678', rating: 4.8, bookings: 61 },
  { key: 'tropicalescapes', name: 'Aisha Rasheed', business: 'Tropical Escapes Maldives', type: 'hotel', city: 'Malé', country: 'Maldives', reg: 'CRM-VND-004', email: 'aisha@tropicalescapes.mv', phone: '+960 777 1234', rating: 4.7, bookings: 44 },
  { key: 'andesjourneys', name: 'Carlos Vega', business: 'Andes & Beyond Journeys', type: 'other', city: 'Barcelona', country: 'Spain', reg: 'CRM-VND-005', email: 'carlos@andesbeyond.es', phone: '+34 611 998 877', rating: 4.2, bookings: 12 },
  { key: 'saharasafaris', name: 'Youssef Benali', business: 'Sahara Nomad Safaris', type: 'activity', city: 'Marrakech', country: 'Morocco', reg: 'CRM-VND-006', email: 'youssef@saharanomad.ma', phone: '+212 661 234 567', rating: 4.6, bookings: 29 },
  { key: 'marasafari', name: 'Daniel Kiptoo', business: 'Mara Sky Safari Ltd', type: 'transport', city: 'Nairobi', country: 'Kenya', reg: 'CRM-VND-007', email: 'daniel@marasky.co.ke', phone: '+254 720 456 789', rating: 4.4, bookings: 18 },
  { key: 'kyototours', name: 'Hiroshi Nakamura', business: 'Kyoto Heritage Tours', type: 'guide', city: 'Kyoto', country: 'Japan', reg: 'CRM-VND-008', email: 'hiroshi@kyotoheritage.jp', phone: '+81 75 123 4567', rating: 4.9, bookings: 51 },
  { key: 'himalayanlodge', name: 'Pemba Sherpa', business: 'Himalayan Lodge Partners', type: 'hotel', city: 'Kathmandu', country: 'Nepal', reg: 'CRM-VND-009', email: 'pemba@himalayanlodge.com.np', phone: '+977 1 456 7890', rating: 4.5, bookings: 26 },
  { key: 'nilecruises', name: 'Mona Ibrahim', business: 'Nile Crown Cruises', type: 'other', city: 'Cairo', country: 'Egypt', reg: 'CRM-VND-010', email: 'mona@nilecrown.eg', phone: '+20 100 234 5678', rating: 4.3, bookings: 21 },
  { key: 'dubaiexperiences', name: 'Rashid Al Farsi', business: 'Desert Rose Experiences DMC', type: 'activity', city: 'Dubai', country: 'United Arab Emirates', reg: 'CRM-VND-011', email: 'rashid@desertrose.ae', phone: '+971 50 456 7890', rating: 4.6, bookings: 33 },
  { key: 'baliretreats', name: 'Made Wirawan', business: 'Bali Retreat Partners', type: 'hotel', city: 'Ubud', country: 'Indonesia', reg: 'CRM-VND-012', email: 'made@baliretreat.id', phone: '+62 812 3456 7890', rating: 4.7, bookings: 47 },
];

// ─── Review prose ───────────────────────────────────────────────────────────
// Written as real reviews: specific, occasionally critical, never 5 stars
// every time — an all-five-star wall reads as fake on a demo screen.
export const REVIEWS = [
  { rating: 5, comment: 'Every transfer was on time and every guide genuinely knew their subject. Our consultant answered WhatsApp messages within minutes even on a Sunday. We will book with them again.' },
  { rating: 5, comment: 'The itinerary had real breathing room — two nights in the same hotel more than once, which is rare on agency trips. The sunrise excursion was worth the early alarm.' },
  { rating: 4, comment: 'Excellent organisation and lovely hotels. Only note is that one internal flight was moved an hour earlier and we heard about it the same morning rather than the night before.' },
  { rating: 5, comment: 'Booked this for our honeymoon and it was faultless. The upgrade to the villa deck dinner was a surprise we will remember for years.' },
  { rating: 4, comment: 'Great value for what was included. The guide on day three was clearly new but the office stepped in when we mentioned it and the rest of the week was superb.' },
  { rating: 5, comment: 'Travelling with two children (9 and 12) can be a slog, but the pacing worked. The driver was endlessly patient with them and the vehicle had proper seat belts and air conditioning.' },
  { rating: 3, comment: 'The destinations were wonderful and the hotels exactly as described, but the first day was essentially a hotel arrival and we would rather have paid for an afternoon activity.' },
  { rating: 5, comment: 'Our consultant redid the whole itinerary twice without complaint when our dates shifted. The final documents arrived a week before travel in a single tidy PDF.' },
  { rating: 5, comment: 'The safari exceeded expectations — we saw four of the big five in two days. The camp was comfortable and the guide&#39;s knowledge of bird calls was astonishing.' },
  { rating: 4, comment: 'Really well put together. The only hiccup was a late check-in at one hotel which meant we lost an hour, but they arranged dinner while we waited.' },
  { rating: 5, comment: 'What stood out was the honesty: when a flight was cheaper than quoted they passed the saving on without us asking. That sort of thing earns repeat business.' },
  { rating: 4, comment: 'Wonderful trip overall. Note that the walking on the temple day is more than the description suggests — bring proper shoes.' },
];

export const REVIEWER_NAMES = [
  'Sarah M.', 'Peter K.', 'Anna L.', 'David W.', 'Yuki T.', 'Rohan S.', 'Claire D.', 'Mohammed A.',
  'Elena V.', 'James H.', 'Ingrid B.', 'Paolo R.', 'Sofia G.', 'Chen W.', 'Fatima Z.', 'Michael O.',
  'Louise P.', 'Anders N.', 'Nadia K.', 'Tom B.', 'Aisha R.', 'Diego F.', 'Hannah J.', 'Kenji S.',
];

// ─── Lead prose ─────────────────────────────────────────────────────────────
export const INQUIRY_MESSAGES = [
  'We are looking at the first two weeks of the month, two adults, and would like a beach stay plus a bit of culture. Can you suggest something?',
  'Travelling with my parents (both in their seventies) so please keep the walking reasonable and avoid too many hotel changes.',
  'Interested in this itinerary — do you have anything with a private pool? Budget is flexible for the right place.',
  'Family of four with two teenagers. They would like water sports, we would like somewhere quiet to read. Is that possible in one trip?',
  'Could you let me know what the weather is like in that period, and whether the safari is worth it if we only have three days?',
  'Second visit for us — we did the classic route last time and would like something less travelled this time.',
  'We are celebrating an anniversary during the trip. Nothing extravagant, but a nice dinner on the actual day would be lovely.',
  'Do you arrange the flights as well or just the land arrangements? We are flying from Frankfurt.',
  'My wife is vegetarian and I am allergic to shellfish. Will that be an issue on this route?',
  'Can this be shortened to five nights? We have limited leave and still want to see the highlights.',
  'Looking for something with a private guide rather than a group. Group tours are not for us.',
  'We would like to add two nights in the capital at the end for shopping. Can you quote that separately?',
  'Is the train journey included in the price or is that an extra? It is the main reason we picked this itinerary.',
  'Two couples travelling together. We would prefer separate rooms with a shared living space if available.',
  'Please send both a mid-range and a luxury version so we can compare. We are not sure yet what we want to spend.',
];

export const LEAD_REMARKS = [
  'Called back within the hour; they are comparing us with another operator. Following up Thursday.',
  'Confirmed the budget verbally — USD 4,000 for two people, land only. Flights excluded.',
  'Wants the quotation in EUR as well as USD. Sent both.',
  'Honeymoon couple — noted for a room upgrade if inventory allows.',
  'Asked about visa process; sent the ETA link and the passport validity note.',
  'Second enquiry from this family. Previous trip went well, they are likely to book.',
  'Price is the main objection. Offered the shoulder-season dates with a 12% saving.',
  'Referred by the Bennetts. Should prioritise — referral source converts well for us.',
  'Not answering WhatsApp; try email in the evening their time.',
  'Wants a firm quotation before speaking to their bank. No further questions at this stage.',
  'Allergies noted on the file: shellfish (severe) and peanuts. Advise every hotel and the guide.',
  'Travelling with an infant — requested a cot and a car seat for the first transfer.',
];

export const COMMUNICATION_NOTES = [
  'Discovery call — 22 minutes. Budget, dates and dietary requirements captured. Two itinerary options promised.',
  'Emailed the draft itinerary and pricing. Customer acknowledged and will revert after the weekend.',
  'WhatsApp follow-up: asked whether the beach extension can be three nights instead of two.',
  'Video call to walk through the hotels. They liked the second option but want a different beach.',
  'Sent the revised quotation with the date change applied. Awaiting acceptance.',
  'Customer called to confirm they are ready to book once the deposit instructions arrive.',
  'Chased the deposit — invoice is now due. Customer says the transfer is scheduled for tomorrow.',
  'Post-booking check-in: pre-departure documents sent, e-tickets attached, insurance confirmed.',
];

export const LOST_REASONS = [
  'Chose a lower-priced competitor for the same dates.',
  'Travel dates postponed indefinitely — family reasons.',
  'Decided on a different destination altogether.',
  'Budget would not stretch to the requested hotel category.',
  'Booked flights separately and aborted the land arrangements.',
  'No response after four follow-up attempts across three weeks.',
];

export const SPECIAL_REQUESTS = [
  'Honeymoon — please arrange a surprise dessert or flowers on the second evening if possible.',
  'Severe shellfish allergy. Please brief every hotel restaurant and the guide.',
  'Travelling with a 4-year-old; a cot and a car seat are needed for all road transfers.',
  'Mobility: one guest uses a walking stick. Ground-floor rooms and step-free access where possible.',
  'Celebrating a 60th birthday during the trip — a small cake at the final dinner would be a lovely touch.',
  'Vegetarian (no egg) for two guests on all included meals.',
  'Would like connecting rooms for the family where the hotel allows it.',
  'Window seats requested on the internal flights; aisle for one guest on medical advice.',
  'Anniversary dinner on the third night, ideally somewhere with a view.',
];

// ─── Career ─────────────────────────────────────────────────────────────────
export const VACANCIES = [
  { position: 'Senior Travel Consultant', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 4, status: 'active', description: 'Own a portfolio of inbound leisure clients from first enquiry to travel. You will build itineraries across Sri Lanka, the Maldives and South India, negotiate with our DMC partners and keep margins healthy without ever selling a trip you would not take yourself.' },
  { position: 'Maldives Specialist', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 3, status: 'active', description: 'Sell the Indian Ocean properly. Resort knowledge across the atolls, a feel for which villa category suits which couple, and the patience to explain seaplane transfers to someone nervous about small aircraft.' },
  { position: 'Africa & Safari Specialist', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 5, status: 'active', description: 'Design and sell safari programmes in Kenya, Tanzania and South Africa. You know the migration calendar, you know the difference between a conservancy and a national park, and you can brief a client honestly on what a game drive is actually like.' },
  { position: 'Travel Operations Coordinator', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 2, status: 'active', description: 'Keep live bookings moving: reconfirm services, chase vouchers, manage last-minute changes and be the calm voice when a flight is cancelled at 11pm. Operational accuracy matters more than speed, but speed helps.' },
  { position: 'Digital Marketing Executive', type: 'Full_Time', location: 'Remote', experienceMin: 2, status: 'active', description: 'Run our paid and organic channels end to end — Google, Meta and the travel metasearch feeds. You will own the content calendar with the consultants and be measured on qualified enquiries, not impressions.' },
  { position: 'Social Media & Content Creator', type: 'Part_Time', location: 'Remote', experienceMin: 1, status: 'active', description: 'Short-form video and photography for Instagram and TikTok, working alongside the consultants on trip. Editing skill and a genuine interest in travel matter more than follower counts.' },
  { position: 'Customer Relations Manager', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 5, status: 'active', description: 'Own the post-booking experience and the complaints process. You will be the escalation point for anything that goes wrong on the road and the person who turns a bad day into a returning client.' },
  { position: 'Finance & Billing Executive', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 3, status: 'active', description: 'Manage supplier payables, customer receipts and reconciliation across multi-currency bookings. Part-qualified accountants with travel industry exposure are encouraged to apply.' },
  { position: 'Junior Travel Consultant', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 0, status: 'active', description: 'A training role for someone who wants to learn this trade properly. You will support the senior consultants, build your first itineraries under supervision, and spend time on the road seeing what we actually sell.' },
  { position: 'Reservations Supervisor', type: 'Full_Time', location: 'Colombo, Sri Lanka', experienceMin: 6, status: 'closed', description: 'Lead the reservations desk across the peak season, manage supplier allocations and own the relationship with our key hotel partners. Closed for this intake.' },
];

export const APPLICANT_COVER_LETTERS = [
  'I have spent seven years selling the Indian Ocean and I still get a lift every time a client sends a photograph from a villa deck. I know the atolls well and I am comfortable owning a target rather than a task list.',
  'After four years in hotel reservations I want to move to the selling side. I am organised, I am good with systems, and I would rather learn itineraries properly under a senior consultant than pretend I already know everything.',
  'I have run paid search for two travel brands and grown qualified enquiry volume by 60% year on year. I care about the quality of the lead, not the click. I would love to bring that discipline to a specialist operator.',
  'I grew up in Kandy and have guided across the Cultural Triangle for three seasons. I want to move into design and sales, and I already know the properties, the drive times and which temples are actually worth the climb.',
  'Operations is where I am strongest: I have managed a peak-season desk of eleven coordinators and built the escalation rota that stopped our weekend cover from falling apart. I am looking for a smaller team where I can see the whole picture.',
  'I have been making travel content for three years, mostly short-form, and one of my reels has passed two million views. I am looking for a role where I can travel with the team and shoot properly rather than relying on stock.',
  'I have handled escalations for a luxury tour operator for five years, including two medical evacuations. I am calm, I document everything, and I believe a complaint handled well is worth more than a sale.',
  'Part-qualified CIMA with three years in a destination management company. I have run multi-currency reconciliation across LKR, USD and EUR and I am comfortable with supplier payment runs and credit control.',
  'I am a recent graduate in hospitality management and I am prepared to start at the bottom and learn. I have interned in a hotel front office and I know this is the industry I want to build a career in.',
  'Six years of reservations leadership across two properties. I am used to managing allocation in peak season and negotiating with revenue managers. I am looking to move to the agency side of the business.',
];

export const APPLICANT_NAMES = [
  { name: 'Kasun Mendis', email: 'kasun.mendis@yahoo.com', phone: '+94 71 123 4567' },
  { name: 'Nimal Silva', email: 'nimal.silva@gmail.com', phone: '+94 70 123 4567' },
  { name: 'Samantha Perera', email: 'samantha.p@gmail.com', phone: '+94 71 234 5678' },
  { name: 'Dinesh Wickramasinghe', email: 'dinesh.w@outlook.com', phone: '+94 72 345 6789' },
  { name: 'Rajan Krishnamurthy', email: 'rajan.k@outlook.in', phone: '+91 91234 56780' },
  { name: 'Iresha Madushani', email: 'iresha.m@gmail.com', phone: '+94 74 567 8901' },
  { name: 'Lucas Andersen', email: 'l.andersen@gmail.dk', phone: '+45 89 01 23 45' },
  { name: 'Kavitha Subramaniam', email: 'kavitha.s@gmail.com', phone: '+91 98765 01234' },
  { name: 'Mohammed Al-Rashid', email: 'm.alrashid@gmail.com', phone: '+971 50 123 4567' },
  { name: 'Anushka Fernando', email: 'anushka.f@yahoo.com', phone: '+94 73 456 7890' },
  { name: 'Tharindu Jayawardena', email: 'tharindu.j@gmail.com', phone: '+94 76 234 5678' },
  { name: 'Sanduni Herath', email: 'sanduni.herath@gmail.com', phone: '+94 77 345 6789' },
  { name: 'Chamara Dissanayake', email: 'chamara.d@yahoo.com', phone: '+94 71 456 7890' },
  { name: 'Pooja Nair', email: 'pooja.nair@gmail.com', phone: '+91 99456 78901' },
  { name: 'Ruwan Senanayake', email: 'ruwan.senanayake@gmail.com', phone: '+94 72 567 8901' },
  { name: 'Dilini Weerasooriya', email: 'dilini.w@gmail.com', phone: '+94 75 678 9012' },
  { name: 'Ashane Peiris', email: 'ashane.peiris@outlook.com', phone: '+94 78 789 0123' },
  { name: 'Nadeeka Amarasinghe', email: 'nadeeka.a@gmail.com', phone: '+94 70 890 1234' },
  { name: 'Farhan Ismail', email: 'farhan.ismail@gmail.com', phone: '+94 77 901 2345' },
  { name: 'Roberto Silva', email: 'roberto.silva@gmail.pt', phone: '+351 91 234 5678' },
];

// ─── Flights ────────────────────────────────────────────────────────────────
// Real carriers on plausible routes for a Colombo-based operator.
export const AIRLINES = {
  UL: 'SriLankan Airlines', EK: 'Emirates', QR: 'Qatar Airways', SQ: 'Singapore Airlines',
  TK: 'Turkish Airlines', EY: 'Etihad Airways', AI: 'Air India', '6E': 'IndiGo',
  MH: 'Malaysia Airlines', TG: 'Thai Airways', CX: 'Cathay Pacific', BA: 'British Airways',
  LH: 'Lufthansa', AF: 'Air France', KL: 'KLM', ET: 'Ethiopian Airlines', KQ: 'Kenya Airways',
  D7: 'AirAsia X', AK: 'AirAsia', '8D': 'FitsAir', GF: 'Gulf Air', WY: 'Oman Air',
};

/** [from, to, km, minutes, carriers] — the trunk routes this agency sells. */
export const ROUTES = [
  ['CMB', 'MLE', 780, 95, ['UL', 'EK', '8D']],
  ['CMB', 'BKK', 2400, 210, ['UL', 'TG', 'AK']],
  ['CMB', 'DXB', 3290, 275, ['EK', 'UL', 'FZ']],
  ['CMB', 'DPS', 3660, 290, ['UL', 'SQ', 'AK']],
  ['CMB', 'SIN', 2750, 240, ['UL', 'SQ', 'AK']],
  ['CMB', 'KUL', 2470, 220, ['UL', 'MH', 'AK']],
  ['CMB', 'NRT', 7370, 520, ['UL', 'SQ', 'CX']],
  ['CMB', 'IST', 6270, 480, ['TK', 'UL', 'QR']],
  ['CMB', 'CAI', 5860, 450, ['UL', 'QR', 'EK']],
  ['CMB', 'NBO', 4990, 400, ['ET', 'KQ', 'QR']],
  ['CMB', 'CMN', 9640, 640, ['QR', 'TK', 'AF']],
  ['CMB', 'PBH', 1980, 175, ['UL', 'AK']],
  ['CMB', 'KTM', 2270, 200, ['UL', 'AI']],
  ['CMB', 'SGN', 2850, 235, ['UL', 'SQ', 'VJ']],
  ['CMB', 'LHR', 8720, 660, ['UL', 'BA', 'QR']],
  ['CMB', 'CDG', 8520, 650, ['UL', 'AF', 'QR']],
  ['CMB', 'AMS', 8330, 645, ['UL', 'KL', 'QR']],
  ['CMB', 'FCO', 7690, 615, ['UL', 'QR', 'TK']],
  ['CMB', 'HRI', 210, 45, ['8D', 'UL']],
  ['CMB', 'BOM', 1530, 150, ['UL', 'AI', '6E']],
  ['CMB', 'DEL', 2440, 215, ['UL', 'AI', '6E']],
  ['CMB', 'BLR', 780, 100, ['UL', 'AI', '6E']],
  ['CMB', 'MAA', 640, 85, ['UL', 'AI', '6E']],
  ['CMB', 'SYD', 8760, 700, ['UL', 'SQ', 'EK']],
  ['CMB', 'JFK', 12980, 1010, ['EK', 'QR', 'UL']],
];

export const CABIN_CLASSES = ['economy', 'premium_economy', 'business'];

// ─── Assistant ──────────────────────────────────────────────────────────────
export const ASSISTANT_CONVERSATIONS = [
  {
    topic: 'Trip planning',
    turns: [
      ['user', 'Hi! We are thinking of Sri Lanka in February for about ten days, two adults. Where would you start?'],
      ['assistant', 'February is one of the best months for Sri Lanka — dry in the south and west, and the Cultural Triangle is comfortable. With ten days I would suggest four nights on the cultural circuit (Sigiriya, Dambulla, Kandy), two in the tea country around Ella, and four on the south coast. That keeps hotel changes to three and leaves room for a safari. Would you like me to look at specific itineraries?'],
      ['user', 'Yes, but we would rather not move hotels more than three times.'],
      ['assistant', 'That fits the shape above well. I can also hold the second night in Kandy and add a night in Udawalawe instead if the safari matters more than the beach. Shall I show both?'],
    ],
  },
  {
    topic: 'Billing question',
    turns: [
      ['user', 'Why is there a service charge on my invoice that was not in the quotation?'],
      ['assistant', 'Looking at the account: the quotation was issued with the service charge not yet applied, and the invoice picks up the 5% service charge from your booking profile. That is a genuine gap in how the quotation was generated. I can raise a credit note for the difference, or reissue the invoice without the charge — whichever your accounts team prefers.'],
      ['user', 'Reissue it please, without the charge.'],
      ['assistant', 'Understood. I have flagged the invoice for reissue and recorded the reason against the account. The revised invoice will carry the same number with a version mark so the audit trail stays intact.'],
    ],
  },
  {
    topic: 'Package question',
    turns: [
      ['user', 'What is included in the Maldives overwater villa package?'],
      ['assistant', 'It covers four nights in an overwater villa on half board, return seaplane transfers, snorkeling equipment and a honeymoon turndown. International flights to Malé, alcoholic drinks, spa treatments and scuba diving are excluded. The seaplane operates in daylight only, so arrivals after about 3pm overnight in Malé — worth knowing when you quote flight times.'],
    ],
  },
  {
    topic: 'Operations',
    turns: [
      ['user', 'Which of my leads have gone quiet for more than a week?'],
      ['assistant', 'Four of your open leads have had no logged contact for eight days or more. Two are quoted and awaiting a decision, one is still drafting, and one has never been contacted since assignment. The never-contacted one is the most urgent — it is 11 days old.'],
      ['user', 'Send a reminder to the rep for the quoted ones.'],
      ['assistant', 'I have noted the two quoted leads for follow-up. A reminder has not been sent automatically — I will leave the wording to you rather than send something generic to a client who is mid-decision.'],
    ],
  },
];

export const ASSISTANT_ROUTES = ['/dashboard', '/leads', '/packages', '/billing', '/users', '/analytics', '/settings', '/hotels'];
export const ASSISTANT_EVENT_TYPES = ['impression', 'opened', 'turn', 'response', 'nav_click', 'error', 'dismissed'];
export const ASSISTANT_TOOLS = ['search_packages', 'get_lead', 'list_invoices', 'answer_policy_question', 'create_booking_draft', 'get_analytics_summary', null];
export const INSIGHT_KEYS = [
  'overdue_invoices', 'stale_leads', 'unassigned_leads', 'revenue_at_risk', 'quote_expiring',
  'high_value_lead', 'repeated_contact_attempts', 'package_without_bookings', 'conversion_drop',
];
export const INSIGHT_SEVERITIES = ['info', 'notice', 'warning', 'critical'];
export const INSIGHT_DECISIONS = ['shown', 'suppressed_acknowledged', 'suppressed_snoozed', 'suppressed_unchanged', 'dropped_volume_cap'];
export const INSIGHT_REASONS = [
  'material_change_detected', 'unchanged_since_last_seen', 'acknowledged_within_window',
  'snoozed_until_future', 'below_severity_threshold', 'volume_cap_reached', 'scope_not_visible',
];
