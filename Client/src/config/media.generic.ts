// Media asset manifest for the generic theme's hero and review videos.
// A new deployment replaces the files under Client/public/ and edits this manifest.
import type { HeroMediaItem } from './media';

export const HERO_MEDIA: HeroMediaItem[] = [
  { id: 'v1', kind: 'video', video: '/v1.mp4', poster: '/v1-poster.webp' },
  { id: 'v2', kind: 'video', video: '/v2.mp4', poster: '/v2-poster.webp' },
  { id: 'v3', kind: 'video', video: '/v3.mp4', poster: '/v3-poster.webp' },
  { id: 'v4', kind: 'video', video: '/v4.mp4', poster: '/v4-poster.webp' },
];

export const REVIEW_VIDEOS = [
  { name: 'Bali Tour', location: 'Bali', file: '/reviews/bali.mp4' },
  { name: 'Maldives Tour', location: 'Maldives', file: '/reviews/maldives7.mp4' },
  { name: 'Thailand Tour', location: 'Thailand', file: '/reviews/thailand2.mp4' },
  { name: 'Maldives Tour', location: 'Maldives', file: '/reviews/maldives3.mp4' },
  { name: 'Maldives Tour', location: 'Maldives', file: '/reviews/maldives2.mp4' },
  { name: 'Dubai Tour', location: 'Dubai', file: '/reviews/dubai.mp4' },
  { name: 'Machachafushi Tour', location: 'Machachafushi', file: '/reviews/machachafushi.mp4' },
  { name: 'Maldives Tour', location: 'Maldives', file: '/reviews/maldives1.mp4' },
  { name: 'Thailand Tour', location: 'Thailand', file: '/reviews/thailand.mp4' },
  { name: 'Mauritius Tour', location: 'Mauritius', file: '/reviews/mauritius.mp4' },
  { name: 'Maldives Tour', location: 'Maldives', file: '/reviews/maldives4.mp4' },
  { name: 'Maldives Tour', location: 'Maldives', file: '/reviews/maldives6.mp4' },
  { name: 'Maldives Tour', location: 'Maldives', file: '/reviews/maldives5.mp4' },
];

// Shared placeholder shown when a package/destination has no real image.
// A new deployment replaces this with a branded placeholder asset.
export const FALLBACK_IMAGE = 'https://via.placeholder.com/1200x800?text=Trip+Sky+Way';
