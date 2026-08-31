import { isLushTheme } from '../config/activeTheme';
import { REVIEW_VIDEOS } from '../config/media';

export type WhyChooseUsItem = {
  title: string;
  description: string;
  media: { kind: 'video'; file: string } | { kind: 'image'; src: string };
};

const GENERIC_ITEMS: WhyChooseUsItem[] = [
  { title: 'Personalized Itineraries', description: 'Every journey is uniquely crafted to match your dreams and preferences', media: { kind: 'video', file: REVIEW_VIDEOS[0].file } },
  { title: 'Expert Local Guides', description: 'Connect with authentic experiences through our expert local guides', media: { kind: 'video', file: REVIEW_VIDEOS[1].file } },
  { title: 'Best Price Guarantee', description: 'Transparent pricing with no hidden fees, your trust matters to us', media: { kind: 'video', file: REVIEW_VIDEOS[2].file } },
];

const LUSH_ITEMS: WhyChooseUsItem[] = [
  { title: 'Itineraries Crafted Around You', description: 'Every journey is shaped by your pace, your passions, and your definition of unforgettable.', media: { kind: 'image', src: '/lush/why/itinerary.jpg' } },
  { title: 'Guided by Local Experts', description: 'Our on-the-ground partners open doors that guidebooks never mention.', media: { kind: 'image', src: '/lush/why/guide.jpg' } },
  { title: 'Transparent, Fair Pricing', description: 'No hidden fees, no surprises — just honest value for extraordinary travel.', media: { kind: 'image', src: '/lush/why/pricing.jpg' } },
];

export const WHY_CHOOSE_US_ITEMS = isLushTheme ? LUSH_ITEMS : GENERIC_ITEMS;
