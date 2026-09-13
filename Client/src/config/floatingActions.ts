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
// Header/rail right inset shared by the launcher anchor and the ScrollTop chip.
export const FLOATING_ACTION_RIGHT_OFFSET_PX = 12;
// Anchor diameter (64px — h-16). The expanded action menu and the assistant
// panel sit exactly one anchor-height + gap above the anchor.
export const FLOATING_ACTION_ANCHOR_SIZE_PX = 64;
export const FLOATING_ACTION_GAP_PX = 12;
// ScrollTop chip sits to the anchor's left, one anchor + gap further in.
export const FLOATING_ACTION_SCROLL_TOP_RIGHT_OFFSET_PX =
  FLOATING_ACTION_RIGHT_OFFSET_PX + FLOATING_ACTION_ANCHOR_SIZE_PX + FLOATING_ACTION_GAP_PX; // 88
// Bottom offset for the assistant panel so it floats just above the anchor
// instead of covering it.
export const ASSISTANT_PANEL_BOTTOM_OFFSET_PX =
  FLOATING_ACTION_BASE_OFFSET_PX + FLOATING_ACTION_ANCHOR_SIZE_PX + FLOATING_ACTION_GAP_PX;

// Scroll depth at which the ScrollTop affordance fades in — it is now the
// only scroll-gated floating control. The launcher renders immediately on
// every route where the assistant is available (see isAssistantExcludedPath
// in config/assistantRoutes.ts), with no reveal animation.
export const FLOATING_ACTION_SCROLL_THRESHOLD_PX = 400;
