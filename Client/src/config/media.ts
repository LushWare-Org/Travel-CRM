// Media asset manifest for the site's hero images.
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
