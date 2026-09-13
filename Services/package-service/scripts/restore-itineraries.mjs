/**
 * Restore all itinerary data from old JSONB format to new relational model.
 * Reads the old seed data (mapped inline) and creates ItineraryDay +
 * Place + ActivityCatalog + junction rows.
 * Run from package-service/: node scripts/restore-itineraries.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ID = {
  pkg3: 'b0000000-0000-0000-0000-000000000003', // Thailand
  pkg4: 'b0000000-0000-0000-0000-000000000004', // Dubai
  pkg5: 'b0000000-0000-0000-0000-000000000005', // Bali
  pkg6: 'b0000000-0000-0000-0000-000000000006', // Europe
  pkg7: 'b0000000-0000-0000-0000-000000000007', // Japan
};

// ── Old day data (from git history) ──────────────────────────

const OLD_DAYS = {
  // Thailand (pkg3) — 5 days
  pkg3: [
    { dayNumber:1, title:'Bangkok Arrival & Grand Palace', description:'Arrive Bangkok, visit the magnificent Grand Palace', locations:['Bangkok'], activities:['Grand Palace tour','Wat Pho temple'], meals:{breakfast:false,lunch:true,dinner:true}, transport:'private car', accommodation:{name:'Mandarin Oriental',type:'hotel',rating:5}, places:[], notes:'VIP airport pickup' },
    { dayNumber:2, title:'Floating Market & City Tour', description:'Explore Damnoen Saduak floating market', locations:['Bangkok','Damnoen Saduak'], activities:['Floating market visit','Canal boat ride'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'boat', accommodation:{name:'Mandarin Oriental',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:3, title:'Chiang Mai Temples', description:'Fly to Chiang Mai, temple tour', locations:['Chiang Mai'], activities:['Doi Suthep temple','Night bazaar'], meals:{breakfast:true,lunch:false,dinner:true}, transport:'flight', accommodation:{name:'137 Pillars House',type:'resort',rating:5}, places:[], notes:'Flight: BKK-CNX 08:00' },
    { dayNumber:4, title:'Elephant Sanctuary', description:'Full day at ethical elephant sanctuary', locations:['Chiang Mai'], activities:['Elephant feeding','River bathing','Jungle walk'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'4x4', accommodation:{name:'137 Pillars House',type:'resort',rating:5}, places:[], notes:'' },
    { dayNumber:5, title:'Phuket Beach & Departure', description:'Fly to Phuket, beach relaxation before evening flight', locations:['Phuket'], activities:['Beach time','Spa treatment'], meals:{breakfast:true,lunch:true,dinner:false}, transport:'flight', accommodation:null, places:[], notes:'Flight: HKT-BKK 19:00' },
  ],
  // Dubai (pkg4) — 4 days
  pkg4: [
    { dayNumber:1, title:'Dubai Arrival & City Tour', description:'Arrive Dubai, check in & city overview', locations:['Dubai'], activities:['City tour','Dubai Mall'], meals:{breakfast:false,lunch:false,dinner:true}, transport:'private car', accommodation:{name:'Burj Al Arab',type:'hotel',rating:5}, places:[], notes:'VIP transfer included' },
    { dayNumber:2, title:'Desert Safari', description:'Full day desert adventure with dune bashing', locations:['Dubai Desert'], activities:['Dune bashing','Camel ride','Belly dance show'], meals:{breakfast:true,lunch:false,dinner:true}, transport:'4x4', accommodation:{name:'Burj Al Arab',type:'hotel',rating:5}, places:[], notes:'Depart 14:00' },
    { dayNumber:3, title:'Burj Khalifa & Dubai Creek', description:'Top of the world views and old Dubai', locations:['Downtown Dubai','Dubai Creek'], activities:['Burj Khalifa observation deck','Abra ride','Spice Souk'], meals:{breakfast:true,lunch:true,dinner:false}, transport:'metro', accommodation:{name:'Burj Al Arab',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:4, title:'Abu Dhabi Day Trip', description:'Sheikh Zayed Mosque and Ferrari World', locations:['Abu Dhabi'], activities:['Sheikh Zayed Grand Mosque','Ferrari World'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'coach', accommodation:{name:'Burj Al Arab',type:'hotel',rating:5}, places:[], notes:'Depart 07:30' },
  ],
  // Bali (pkg5) — 5 days
  pkg5: [
    { dayNumber:1, title:'Bali Arrival & Seminyak Beach', description:'Arrive, relax on Seminyak beach', locations:['Seminyak'], activities:['Beach relaxation','Sunset cocktails'], meals:{breakfast:false,lunch:false,dinner:true}, transport:'private transfer', accommodation:{name:'The Layar Seminyak',type:'villa',rating:5}, places:[], notes:'' },
    { dayNumber:2, title:'Ubud & Rice Terraces', description:'Cultural heart of Bali', locations:['Ubud','Tegallalang'], activities:['Rice terrace walk','Monkey Forest','Traditional dance show'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'private car', accommodation:{name:'The Layar Seminyak',type:'villa',rating:5}, places:[], notes:'' },
    { dayNumber:3, title:'Water Temple & Spa', description:'Sacred water blessing and couples spa', locations:['Tirta Empul','Ubud'], activities:['Water temple purification ritual','Couples spa'], meals:{breakfast:true,lunch:false,dinner:true}, transport:'private car', accommodation:{name:'The Layar Seminyak',type:'villa',rating:5}, places:[], notes:'Spa booking required in advance' },
    { dayNumber:4, title:'Nusa Penida Island', description:'Dramatic cliffs and crystal clear waters', locations:['Nusa Penida'], activities:['Kelingking Beach','Crystal Bay snorkeling'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'speedboat', accommodation:{name:'The Layar Seminyak',type:'villa',rating:5}, places:[], notes:'' },
    { dayNumber:5, title:'Cooking Class & Departure', description:'Learn Balinese cuisine before heading home', locations:['Seminyak'], activities:['Balinese cooking class'], meals:{breakfast:true,lunch:true,dinner:false}, transport:'private transfer', accommodation:null, places:[], notes:'Check-out at noon' },
  ],
  // European Grand Tour (pkg6) — 7 days
  pkg6: [
    { dayNumber:1, title:'London Arrival',   description:'Arrive Heathrow, city orientation walk', locations:['London'], activities:['Big Ben','Westminster'],     meals:{breakfast:false,lunch:false,dinner:true}, transport:'Tube', accommodation:{name:'The Savoy',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:2, title:'London Museums',   description:'British Museum and Tate Modern',         locations:['London'], activities:['British Museum','Tower of London'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'Tube', accommodation:{name:'The Savoy',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:3, title:'Paris by Eurostar',description:'Travel to Paris, Eiffel Tower evening',  locations:['Paris'], activities:['Eiffel Tower','Seine cruise'],  meals:{breakfast:true,lunch:false,dinner:true}, transport:'Eurostar', accommodation:{name:'Le Grand Hôtel',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:4, title:'Paris Highlights', description:'Louvre, Versailles gardens',            locations:['Paris','Versailles'], activities:['Louvre Museum','Palace of Versailles'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'RER', accommodation:{name:'Le Grand Hôtel',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:5, title:'Amsterdam Canal Day', description:'Bike along canals, Van Gogh Museum', locations:['Amsterdam'], activities:['Canal bike tour','Van Gogh Museum','Anne Frank House'], meals:{breakfast:true,lunch:true,dinner:true}, transport:'Thalys train', accommodation:{name:'Waldorf Astoria Amsterdam',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:6, title:'Rome Eternal City', description:'Colosseum, Vatican City',              locations:['Rome'], activities:['Colosseum','Vatican Museums','Trevi Fountain'], meals:{breakfast:true,lunch:false,dinner:true}, transport:'Trenitalia', accommodation:{name:'Rome Cavalieri',type:'hotel',rating:5}, places:[], notes:'' },
    { dayNumber:7, title:'Rome & Departure',  description:'Morning in Trastevere, afternoon flight', locations:['Rome'], activities:['Trastevere walk'],              meals:{breakfast:true,lunch:true,dinner:false}, transport:'taxi', accommodation:null, places:[], notes:'Flight at 18:00' },
  ],
};

function mapTransport(transport) {
  const t = (transport || '').toLowerCase();
  if (t.includes('flight') || t.includes('plane')) return { mode: 'FLIGHT', route: 'POINT_TO_POINT', pricing: 'PER_PERSON', cost: 200 };
  if (t.includes('train') || t.includes('rail') || t.includes('eurostar') || t.includes('thalys') || t.includes('trenitalia') || t.includes('tube') || t.includes('metro') || t.includes('rer')) return { mode: 'TRAIN', route: 'DAILY_ROUTING', pricing: 'PER_PERSON', cost: 15 };
  if (t.includes('boat') || t.includes('speedboat') || t.includes('ferry') || t.includes('canal')) return { mode: 'BOAT', route: 'DAILY_ROUTING', pricing: 'PER_PERSON', cost: 30 };
  if (t.includes('bus') || t.includes('coach')) return { mode: 'VAN', route: 'DAILY_ROUTING', pricing: 'PER_VEHICLE', cost: 120 };
  if (t.includes('4x4') || t.includes('jeep')) return { mode: 'CAR', route: 'DAILY_ROUTING', pricing: 'PER_VEHICLE', cost: 150 };
  if (t.includes('taxi')) return { mode: 'CAR', route: 'DAILY_ROUTING', pricing: 'PER_VEHICLE', cost: 50 };
  return { mode: 'CAR', route: 'DAILY_ROUTING', pricing: 'PER_VEHICLE', cost: 80 };
}

// ── Collect all unique locations and activities ──────────────

async function main() {
  console.log('Restoring itinerary data...');

  const allLocations = new Set();
  const allActivities = new Set();

  for (const [pkgId, days] of Object.entries(OLD_DAYS)) {
    for (const day of days) {
      for (const loc of day.locations) allLocations.add(loc);
      for (const act of day.activities) allActivities.add(act);
    }
  }

  // ── Create Place entries ──────────────────────────────────
  const placeMap = {};
  for (const name of allLocations) {
    const existing = await prisma.place.findUnique({ where: { name } });
    if (existing) {
      placeMap[name] = existing.id;
    } else {
      const p = await prisma.place.create({ data: { name, type: 'CITY' } });
      placeMap[name] = p.id;
      console.log(`  Place: ${name}`);
    }
  }

  // ── Create ActivityCatalog entries ────────────────────────
  const activityMap = {};
  for (const name of allActivities) {
    const existing = await prisma.activityCatalog.findUnique({ where: { name } });
    if (existing) {
      activityMap[name] = existing.id;
    } else {
      const a = await prisma.activityCatalog.create({ data: { name, defaultCost: 0 } });
      activityMap[name] = a.id;
      console.log(`  Activity: ${name}`);
    }
  }

  // ── Create ItineraryDay + junctions ───────────────────────
  for (const [pkgId, days] of Object.entries(OLD_DAYS)) {
    const pkg = await prisma.package.findUnique({ where: { id: ID[pkgId] } });
    if (!pkg) { console.log(`  SKIP ${pkgId}: package not found`); continue; }

    console.log(`  ${pkg.title}: ${days.length} days`);

    for (const day of days) {
      const t = mapTransport(day.transport);

      // Skip if already exists (idempotent)
      const existing = await prisma.itineraryDay.findFirst({
        where: { packageId: ID[pkgId], dayNumber: day.dayNumber },
      });
      if (existing) { console.log(`    Day ${day.dayNumber}: already exists, skipping`); continue; }

      await prisma.itineraryDay.create({
        data: {
          packageId: ID[pkgId],
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description || '',
          breakfastCount: day.meals?.breakfast ? 1 : 0,
          lunchCount: day.meals?.lunch ? 1 : 0,
          dinnerCount: day.meals?.dinner ? 1 : 0,
          places: {
            create: day.locations.map((loc, i) => ({
              placeId: placeMap[loc] || null,
              customName: !placeMap[loc] ? loc : null,
              orderIndex: i,
            })),
          },
          activities: {
            create: day.activities.map((act, i) => ({
              activityId: activityMap[act],
              orderIndex: i,
            })),
          },
          transports: {
            create: [{
              routeType: t.route,
              transportMode: t.mode,
              pricingModel: t.pricing,
              unitCost: t.cost,
            }],
          },
        },
      });
    }
  }

  console.log('Done. Verifying...');

  const counts = await Promise.all([
    prisma.itineraryDay.count(),
    prisma.place.count(),
    prisma.activityCatalog.count(),
    prisma.packageDayPlace.count(),
    prisma.packageDayActivity.count(),
    prisma.packageDayTransport.count(),
  ]);

  console.log(`  ItineraryDays: ${counts[0]}`);
  console.log(`  Places: ${counts[1]}`);
  console.log(`  Activities: ${counts[2]}`);
  console.log(`  DayPlaces: ${counts[3]}`);
  console.log(`  DayActivities: ${counts[4]}`);
  console.log(`  DayTransports: ${counts[5]}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
