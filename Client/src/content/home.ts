import { isLushTheme } from '../config/activeTheme';
import { HERO_SLIDES as GENERIC_HERO_SLIDES } from './home.generic';
import { HERO_SLIDES as LUSH_HERO_SLIDES } from './home.lush';

export const HERO_SLIDES = isLushTheme ? LUSH_HERO_SLIDES : GENERIC_HERO_SLIDES;
