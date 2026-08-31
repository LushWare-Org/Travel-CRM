// Media asset manifest for the Lush theme's hero images.
// Index-aligned with content/home.lush.ts's HERO_SLIDES (v1..v4 = beach/mountain/safari/temple).
import type { HeroMediaItem } from './media';

export const HERO_MEDIA: HeroMediaItem[] = [
  { id: 'v1', kind: 'image', src: '/lush/hero/beach.jpg' },
  { id: 'v2', kind: 'image', src: '/lush/hero/mountain.jpg' },
  { id: 'v3', kind: 'image', src: '/lush/hero/safari.jpg' },
  { id: 'v4', kind: 'image', src: '/lush/hero/temple.jpg' },
];

export const FALLBACK_IMAGE = '/lush/fallback.jpg';
