// Media asset manifest for the site's hero and category images.
// A new deployment replaces the files under Client/public/lush/ and edits
// this manifest.
export type HeroMediaItem =
  | { id: string; kind: 'video'; video: string; poster: string }
  | { id: string; kind: 'image'; src: string };

export const HERO_MEDIA: HeroMediaItem[] = [
  { id: 'v1', kind: 'image', src: '/lush/hero/beach.jpg' },
  { id: 'v2', kind: 'image', src: '/lush/hero/mountain.jpg' },
  { id: 'v3', kind: 'image', src: '/lush/hero/safari.jpg' },
  { id: 'v4', kind: 'image', src: '/lush/hero/temple.jpg' },
];

export const FALLBACK_IMAGE = '/lush/fallback.jpg';

// Curated category imagery. One self-hosted photo per package category, replacing
// the "cheapest package's photo" heuristic the category cards used to render.
// Source: Pexels (https://www.pexels.com/license — free for commercial use,
// attribution not required, modification allowed). Per-file provenance:
//   honeymoon   https://www.pexels.com/photo/aerial-photography-of-bungalows-1287460/
//   couple      https://www.pexels.com/photo/couple-walking-through-elegant-urban-street-36227357/
//   family      https://www.pexels.com/photo/family-enjoying-a-sunny-day-at-the-beach-33270802/
//   group       https://www.pexels.com/photo/a-diverse-group-of-friends-sitting-on-a-rock-5098286/
//   wild-safari https://www.pexels.com/photo/a-car-in-a-field-at-sunset-20179680/
// Each key has a same-name `.webp` sibling under Client/public/lush/categories/;
// every `<picture>` in the app derives that sibling by regex from the `.jpg` path.
export const CATEGORY_IMAGES: Record<string, string> = {
  honeymoon: '/lush/categories/honeymoon.jpg',
  couple: '/lush/categories/couple.jpg',
  family: '/lush/categories/family.jpg',
  group: '/lush/categories/group.jpg',
  'wild-safari': '/lush/categories/wild-safari.jpg',
};

/**
 * Resolves a package category to its curated image. The CRM and the legacy
 * monolith disagree on casing and separators for the same category
 * ('HONEYMOON', 'honeymoon', 'WILD_SAFARI', 'wild safari'), so the key is
 * normalized before lookup; anything unmapped ('other', 'Adventure', empty)
 * falls back to the site-wide FALLBACK_IMAGE.
 */
export const categoryImage = (category?: string | null): string => {
  const key = (category ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return CATEGORY_IMAGES[key] || FALLBACK_IMAGE;
};
