/**
 * Add Japan Cultural Journey itinerary data.
 * Run from package-service/: node scripts/add-japan-itinerary.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PKG_ID = 'b0000000-0000-0000-0000-000000000007';

const DAYS = [
  { day:1, title:'Tokyo Arrival — Shinjuku', desc:'Arrive at Narita/Haneda, private transfer to Shinjuku hotel. Evening exploration of neon-lit streets and izakaya dinner.',
    locations:['Tokyo','Shinjuku'], activities:['Shinjuku Gyoen garden','Tokyo Metropolitan Government Building','Izakaya dinner'], meals:{b:false,l:false,d:true}, transport:'private car' },
  { day:2, title:'Asakusa, Shibuya & Harajuku', desc:'Classic Tokyo highlights: ancient temple, iconic crossing, and youth culture.',
    locations:['Tokyo','Asakusa','Shibuya','Harajuku'], activities:['Senso-ji temple','Nakamise shopping street','Shibuya Crossing','Meiji Shrine','Takeshita Street'], meals:{b:true,l:true,d:true}, transport:'metro' },
  { day:3, title:'Tsukiji, Akihabara & teamLab', desc:'Morning sushi breakfast, anime electronics district, immersive digital art.',
    locations:['Tokyo','Tsukiji','Akihabara','Odaiba'], activities:['Tsukiji Outer Market','Sushi breakfast','Akihabara electronics','teamLab Borderless'], meals:{b:true,l:true,d:true}, transport:'metro' },
  { day:4, title:'Hakone — Mt Fuji & Onsen', desc:'Bullet train to Hakone. Ropeway ride with Mt Fuji views, volcanic valley, traditional onsen ryokan.',
    locations:['Hakone','Mt Fuji'], activities:['Shinkansen to Odawara','Hakone Ropeway','Owakudani volcanic valley','Lake Ashi cruise','Onsen ryokan experience'], meals:{b:true,l:true,d:true}, transport:'train' },
  { day:5, title:'Kyoto — Fushimi Inari & Gion', desc:'Shinkansen to Kyoto. Walk through 10,000 vermillion torii gates. Evening stroll through geisha district.',
    locations:['Kyoto','Fushimi','Gion'], activities:['Fushimi Inari shrine','1000 torii gates walk','Gion geisha district','Tea ceremony','Pontocho alley'], meals:{b:true,l:false,d:true}, transport:'train' },
  { day:6, title:'Kyoto — Bamboo & Gold', desc:'Arashiyama bamboo grove at dawn, golden pavilion, Zen rock garden.',
    locations:['Kyoto','Arashiyama'], activities:['Arashiyama Bamboo Grove','Tenryu-ji temple','Kinkaku-ji Golden Pavilion','Ryoan-ji rock garden','Nishiki Market'], meals:{b:true,l:true,d:true}, transport:'private car' },
  { day:7, title:'Osaka — Food Capital', desc:'Train to Osaka. Castle visit, street food, neon-lit Dotonbori canal.',
    locations:['Osaka'], activities:['Osaka Castle','Dotonbori canal walk','Kuromon Market','Takoyaki tasting','Umeda Sky Building'], meals:{b:true,l:true,d:true}, transport:'train' },
  { day:8, title:'Hiroshima — Peace & Miyajima', desc:'Day trip by Shinkansen. Peace Memorial Park, then ferry to sacred Miyajima Island for the floating torii gate.',
    locations:['Hiroshima','Miyajima'], activities:['Hiroshima Peace Memorial','Atomic Bomb Dome','Miyajima ferry','Itsukushima Shrine','Floating torii gate','Hiroshima okonomiyaki'], meals:{b:true,l:true,d:true}, transport:'train' },
  { day:9, title:'Osaka Departure', desc:'Morning visit to Sumiyoshi Taisha shrine. Transfer to Kansai Airport for departure.',
    locations:['Osaka'], activities:['Sumiyoshi Taisha shrine','Last-minute shopping','Airport transfer'], meals:{b:true,l:false,d:false}, transport:'private car' },
];

function mapTransport(t) {
  const m = (t || '').toLowerCase();
  if (m.includes('train') || m.includes('shinkansen') || m.includes('bullet')) return { mode:'TRAIN', route:'DAILY_ROUTING', pricing:'PER_PERSON', cost:25 };
  if (m.includes('metro') || m.includes('subway')) return { mode:'TRAIN', route:'DAILY_ROUTING', pricing:'PER_PERSON', cost:5 };
  return { mode:'CAR', route:'DAILY_ROUTING', pricing:'PER_VEHICLE', cost:100 };
}

async function main() {
  console.log('Adding Japan itinerary...');

  for (const day of DAYS) {
    // Create places
    const placeIds = [];
    for (const loc of day.locations) {
      let p = await prisma.place.findUnique({ where: { name: loc } });
      if (!p) p = await prisma.place.create({ data: { name: loc, type: 'CITY' } });
      placeIds.push(p.id);
    }

    // Create activities
    const activityIds = [];
    for (const act of day.activities) {
      let a = await prisma.activityCatalog.findUnique({ where: { name: act } });
      if (!a) a = await prisma.activityCatalog.create({ data: { name: act, defaultCost: 0 } });
      activityIds.push(a.id);
    }

    const t = mapTransport(day.transport);

    await prisma.itineraryDay.create({
      data: {
        packageId: PKG_ID,
        dayNumber: day.day,
        title: day.title,
        description: day.desc,
        breakfastCount: day.meals.b ? 1 : 0,
        lunchCount: day.meals.l ? 1 : 0,
        dinnerCount: day.meals.d ? 1 : 0,
        places: { create: placeIds.map((pid, i) => ({ placeId: pid, orderIndex: i })) },
        activities: { create: activityIds.map((aid, i) => ({ activityId: aid, orderIndex: i })) },
        transports: { create: [{ routeType: t.route, transportMode: t.mode, pricingModel: t.pricing, unitCost: t.cost }] },
      },
    });
    console.log(`  Day ${day.day}: ${day.title}`);
  }

  const count = await prisma.itineraryDay.count({ where: { packageId: PKG_ID } });
  console.log(`Done. Japan itinerary days: ${count}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
