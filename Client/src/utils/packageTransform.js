const slugify = (value = '') => value
  .toString()
  .toLowerCase()
  .trim()
  .replace(/[\s_]+/g, '-')
  .replace(/[^a-z0-9-]+/g, '')
  .replace(/-{2,}/g, '-')
  .replace(/^-|-$/g, '');

const DOMESTIC_KEYWORDS = [
  'india',
  'andaman',
  'andaman & nicobar',
  'goa',
  'kerala',
  'kashmir',
  'himachal',
  'himachal pradesh',
  'rajasthan',
  'northeast',
  'northeast india',
  'delhi',
  'mumbai',
  'jaipur',
  'udaipur',
  'varanasi',
  'sikkim',
  'uttarakhand',
  'ladakh',
  'leh',
  'shimla',
  'manali',
  'pondicherry',
  'lakshadweep',
  'agra',
  'darjeeling',
  'coorg',
  'amritsar',
  'gujarat',
  'bhopal',
  'kolkata',
  'bangalore',
];

const COUNTRY_REGION_MAP = {
  'indonesia': 'Asia',
  'maldives': 'Asia',
  'thailand': 'Asia',
  'uae': 'Middle East',
  'united arab emirates': 'Middle East',
  'dubai': 'Middle East',
  'abu dhabi': 'Middle East',
  'malaysia': 'Asia',
  'singapore': 'Asia',
  'kazakhstan': 'Asia',
  'mauritius': 'Africa',
  'seychelles': 'Africa',
  'vietnam': 'Asia',
  'sri lanka': 'Asia',
  'nepal': 'Asia',
  'bhutan': 'Asia',
  'japan': 'Asia',
  'south korea': 'Asia',
  'china': 'Asia',
  'hong kong': 'Asia',
  'indian ocean': 'Asia',
  'bali': 'Asia',
  'switzerland': 'Europe',
  'france': 'Europe',
  'italy': 'Europe',
  'spain': 'Europe',
  'greece': 'Europe',
  'turkey': 'Europe',
  'austria': 'Europe',
  'germany': 'Europe',
  'netherlands': 'Europe',
  'united kingdom': 'Europe',
  'england': 'Europe',
  'scotland': 'Europe',
  'ireland': 'Europe',
  'portugal': 'Europe',
  'croatia': 'Europe',
  'sweden': 'Europe',
  'norway': 'Europe',
  'finland': 'Europe',
  'denmark': 'Europe',
  'czech republic': 'Europe',
  'hungary': 'Europe',
  'egypt': 'Africa',
  'kenya': 'Africa',
  'south africa': 'Africa',
  'tanzania': 'Africa',
  'morocco': 'Africa',
  'canada': 'Americas',
  'united states': 'Americas',
  'usa': 'Americas',
  'mexico': 'Americas',
  'brazil': 'Americas',
  'argentina': 'Americas',
  'peru': 'Americas',
  'chile': 'Americas',
  'australia': 'Oceania',
  'new zealand': 'Oceania',
  'fiji': 'Oceania',
  'oman': 'Middle East',
  'qatar': 'Middle East',
  'saudi arabia': 'Middle East',
  'jordan': 'Middle East',
};

const ACTIVITY_RULES = [
  { label: 'Beach', pattern: /(beach|island|sea|snorkel|water|cruise|coast)/i },
  { label: 'Mountains', pattern: /(mountain|hill|trek|hike|peak|snow|valley)/i },
  { label: 'Culture', pattern: /(culture|temple|heritage|palace|museum|historic|tradition|cultural)/i },
  { label: 'Adventure', pattern: /(adventure|safari|dive|rafting|skydiv|zipline|paragliding|trek)/i },
  { label: 'Luxury', pattern: /(luxury|villa|spa|5-star|resort|premium|exclusive)/i },
  { label: 'Food', pattern: /(food|cuisine|dining|restaurant|wine|culinary|cook)/i },
  { label: 'Shopping', pattern: /(shopping|market|mall|souvenir|bazaar)/i },
  { label: 'Nature', pattern: /(nature|wildlife|forest|park|garden|backwater|scenic|waterfall)/i },
  { label: 'Romance', pattern: /(honeymoon|romance|romantic|couple|love)/i },
  { label: 'Family', pattern: /(family|kids|children|child|friendly)/i },
];

const isDomesticDestination = (value = '') => {
  const normalized = value.toLowerCase();
  return DOMESTIC_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const inferRegion = (countryOrLocation = '') => {
  const normalized = countryOrLocation.toLowerCase();
  return COUNTRY_REGION_MAP[normalized] || 'Global';
};

export const normalizeDestination = (destinationValue = '') => {
  const raw = `${destinationValue || ''}`.trim();
  if (!raw) {
    return {
      raw,
      name: '',
      country: '',
      type: 'unknown',
      region: 'Global',
      slug: '',
      key: '',
      nameSlug: '',
      countrySlug: '',
    };
  }

  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const name = parts[0] || raw;
  const lastSegment = parts.length > 1 ? parts[parts.length - 1] : '';
  const type = isDomesticDestination(raw) ? 'domestic' : 'international';
  const country = type === 'domestic'
    ? 'India'
    : (lastSegment || raw);
  const region = type === 'domestic' ? 'India' : inferRegion(country);
  const nameSlug = slugify(name);
  const countrySlug = slugify(country);
  const slug = type === 'domestic'
    ? nameSlug
    : (countrySlug || nameSlug);
  const key = slug || slugify(raw);

  return {
    raw,
    name,
    country,
    type,
    region,
    slug,
    key,
    nameSlug,
    countrySlug,
  };
};

const extractItinerary = (itinerary) => {
  if (!itinerary || !Array.isArray(itinerary.days)) {
    return [];
  }

  return itinerary.days
    .slice()
    .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
    .map((day) => ({
      dayNumber: day.dayNumber || 0,
      title: day.title || `Day ${day.dayNumber || ''}`,
      description: day.description || '',
    }));
};

const extractImages = (images = [], coverImage) => {
  const normalizedImages = Array.isArray(images)
    ? images.map((img) => img?.url).filter(Boolean)
    : [];

  const cover = coverImage?.url || normalizedImages[0] || '';

  return {
    coverImage: cover,
    images: normalizedImages,
  };
};

const extractActivitiesFromPackage = (pkg) => {
  const texts = [
    ...(Array.isArray(pkg?.highlights) ? pkg.highlights : []),
    ...(Array.isArray(pkg?.inclusions) ? pkg.inclusions : []),
    pkg?.description || '',
  ].join(' | ');

  const activities = new Set();
  ACTIVITY_RULES.forEach((rule) => {
    if (rule.pattern.test(texts)) {
      activities.add(rule.label);
    }
  });

  return activities;
};

export const normalizePackage = (apiPackage = {}) => {
  const destinationMeta = normalizeDestination(apiPackage.destination);
  const { coverImage, images } = extractImages(apiPackage.images, apiPackage.coverImage);
  const itinerary = extractItinerary(apiPackage.itinerary);
  const activities = Array.from(extractActivitiesFromPackage(apiPackage));

  return {
    id: apiPackage._id || apiPackage.id,
    slug: apiPackage.slug || (apiPackage.name ? slugify(apiPackage.name) : ''),
    title: apiPackage.name || '',
    name: apiPackage.name || '',
    description: apiPackage.description || '',
    destinationRaw: apiPackage.destination || '',
    destination: destinationMeta,
    duration_days: apiPackage.duration || 0,
    price_from: apiPackage.price || 0,
    category: apiPackage.category || 'other',
    difficulty: apiPackage.difficulty || null,
    rating: apiPackage.rating || apiPackage.averageRating || 0,
    reviews_count: apiPackage.numReviews || apiPackage.reviewCount || 0,
    bookings: apiPackage.bookings || 0,
    image_url: coverImage,
    images,
    highlights: Array.isArray(apiPackage.highlights) ? apiPackage.highlights : [],
    inclusions: Array.isArray(apiPackage.inclusions) ? apiPackage.inclusions : [],
    exclusions: Array.isArray(apiPackage.exclusions) ? apiPackage.exclusions : [],
    activities,
    itinerary,
    isFeatured: Boolean(apiPackage.isFeatured),
    isActive: apiPackage.isActive !== false,
    createdAt: apiPackage.createdAt ? new Date(apiPackage.createdAt) : null,
    updatedAt: apiPackage.updatedAt ? new Date(apiPackage.updatedAt) : null,
    raw: apiPackage,
  };
};

export const aggregateDestinations = (normalizedPackages = []) => {
  const destinationMap = new Map();

  normalizedPackages.forEach((pkg) => {
    const destinationKey = pkg.destination?.key;
    if (!destinationKey) return;

    if (!destinationMap.has(destinationKey)) {
      destinationMap.set(destinationKey, {
        id: destinationKey,
        name: pkg.destination.name || pkg.destinationRaw,
        country: pkg.destination.country,
        type: pkg.destination.type,
        region: pkg.destination.region,
        slug: pkg.destination.slug || destinationKey,
        nameSlug: pkg.destination.nameSlug,
        countrySlug: pkg.destination.countrySlug,
        raw: pkg.destination.raw,
        description: pkg.description,
        image_url: pkg.image_url,
        packages: [],
        minPrice: Number.POSITIVE_INFINITY,
        minDuration: Number.POSITIVE_INFINITY,
        maxDuration: 0,
        ratingSum: 0,
        reviewCount: 0,
        activities: new Set(),
      });
    }

    const entry = destinationMap.get(destinationKey);
    entry.packages.push(pkg);
    entry.minPrice = Math.min(entry.minPrice, pkg.price_from || Number.POSITIVE_INFINITY);
    entry.minDuration = Math.min(entry.minDuration, pkg.duration_days || Number.POSITIVE_INFINITY);
    entry.maxDuration = Math.max(entry.maxDuration, pkg.duration_days || 0);
    entry.ratingSum += pkg.rating || 0;
    entry.reviewCount += pkg.reviews_count || 0;
    if (!entry.image_url && pkg.image_url) {
      entry.image_url = pkg.image_url;
    }
    if (!entry.description && pkg.description) {
      entry.description = pkg.description;
    }

    const activities = extractActivitiesFromPackage(pkg);
    activities.forEach((activity) => entry.activities.add(activity));
  });

  return Array.from(destinationMap.values()).map((entry) => {
    const averageRating = entry.packages.length
      ? Number((entry.ratingSum / entry.packages.length).toFixed(1))
      : 0;

    const price = entry.minPrice === Number.POSITIVE_INFINITY ? 0 : entry.minPrice;
    const minDuration = entry.minDuration === Number.POSITIVE_INFINITY ? 0 : entry.minDuration;
    const maxDuration = entry.maxDuration;

    const durationLabel = (() => {
      if (!minDuration) return '';
      if (maxDuration && maxDuration !== minDuration) {
        return `${minDuration}-${maxDuration}D`;
      }
      const nights = Math.max(minDuration - 1, 1);
      return `${minDuration}D/${nights}N`;
    })();

    return {
      ...entry,
      price,
      rating: averageRating,
      reviews: entry.reviewCount,
      packagesCount: entry.packages.length,
      durationLabel,
      activities: Array.from(entry.activities),
      minDuration,
      maxDuration,
    };
  });
};

export const createSlug = slugify;

