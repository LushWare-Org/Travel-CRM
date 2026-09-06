import BRANDING from './branding';
import { flag } from './envFlag';

export const FLOATING_ACTIONS_CONFIG = {
  whatsapp: { enabled: flag('VITE_FEATURE_WHATSAPP_BUTTON', Boolean(BRANDING.contact.whatsapp)) },
  call: { enabled: flag('VITE_FEATURE_CALL_BUTTON', Boolean(BRANDING.contact.phone)) },
  scrollTop: { enabled: flag('VITE_FEATURE_SCROLL_TOP', true) },
} as const;

// Shared geometry for the single bottom-right launcher (Phase 1: Call,
// WhatsApp and the site-wide assistant collapse into ONE expandable anchor;
// ScrollTop stays a separate, smaller affordance). Every value here is the
// single source of truth for the anchor and the panel/menu that float above
// it, so the assistant panel (rendered by AssistantWidget on the same
// z-floating-action tier) can clear the anchor without duplicating numbers
// or covering it when an action is disabled.
//
// Bottom edge of the launcher anchor and the ScrollTop affordance.
export const FLOATING_ACTION_BASE_OFFSET_PX = 16;
// Anchor diameter (56px — h-14). The expanded action menu and the assistant
// panel sit exactly one anchor-height + gap above the anchor.
export const FLOATING_ACTION_ANCHOR_SIZE_PX = 56;
export const FLOATING_ACTION_GAP_PX = 12;
// Bottom offset for the assistant panel so it floats just above the anchor
// instead of covering it.
export const ASSISTANT_PANEL_BOTTOM_OFFSET_PX =
  FLOATING_ACTION_BASE_OFFSET_PX + FLOATING_ACTION_ANCHOR_SIZE_PX + FLOATING_ACTION_GAP_PX;

// Marketing pages keep the launcher out of the hero's first viewport: it
// fades in only once the window has scrolled past this depth. App pages
// (see isLauncherAlwaysVisiblePath in config/assistantRoutes.ts) render it
// immediately. Same threshold the ScrollTop affordance already used before
// Phase 1 — one shared constant so the two scroll-gated controls never
// disagree about what "past the hero" means.
export const FLOATING_ACTION_SCROLL_THRESHOLD_PX = 400;
