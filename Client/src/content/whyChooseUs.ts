export type WhyChooseUsItem = {
  title: string;
  description: string;
  media: { kind: 'video'; file: string } | { kind: 'image'; src: string };
};

export const WHY_CHOOSE_US_ITEMS: WhyChooseUsItem[] = [
  { title: 'Itineraries Crafted Around You', description: 'Every journey is shaped by your pace, your passions, and your definition of unforgettable.', media: { kind: 'image', src: '/lush/why/itinerary.jpg' } },
  { title: 'Guided by Local Experts', description: 'Our on-the-ground partners open doors that guidebooks never mention.', media: { kind: 'image', src: '/lush/why/guide.jpg' } },
  { title: 'Transparent, Fair Pricing', description: 'No hidden fees, no surprises — just honest value for extraordinary travel.', media: { kind: 'image', src: '/lush/why/pricing.jpg' } },
];
