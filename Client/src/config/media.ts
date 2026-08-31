// Theme-driven media manifest selector. Generic keeps its video hero
// carousel; Lush swaps in curated photography. See media.generic.ts /
// media.lush.ts for the per-theme manifests.
import { isLushTheme } from './activeTheme';
import * as generic from './media.generic';
import * as lush from './media.lush';

export type HeroMediaItem =
  | { id: string; kind: 'video'; video: string; poster: string }
  | { id: string; kind: 'image'; src: string };

const active = isLushTheme ? lush : generic;

export const HERO_MEDIA: HeroMediaItem[] = active.HERO_MEDIA;
export const FALLBACK_IMAGE: string = active.FALLBACK_IMAGE;
// Only ever consumed by the generic-only ReviewsVideoSlider, so it never
// needs a Lush variant.
export const REVIEW_VIDEOS = generic.REVIEW_VIDEOS;
