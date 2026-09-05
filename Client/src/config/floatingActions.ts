import BRANDING from './branding';
import { flag } from './envFlag';

export const FLOATING_ACTIONS_CONFIG = {
  whatsapp: { enabled: flag('VITE_FEATURE_WHATSAPP_BUTTON', Boolean(BRANDING.contact.whatsapp)) },
  call: { enabled: flag('VITE_FEATURE_CALL_BUTTON', Boolean(BRANDING.contact.phone)) },
  scrollTop: { enabled: flag('VITE_FEATURE_SCROLL_TOP', true) },
} as const;

// Shared vertical rhythm for the bottom-right floating action stack
// (Call/WhatsApp/ScrollTop, rendered by FloatingActionStack) — exported so
// components outside that stack can slot in above it without duplicating
// these numbers or leaving/covering a gap when an action is disabled.
export const FLOATING_ACTION_BASE_OFFSET_PX = 16;
export const FLOATING_ACTION_STEP_PX = 68;

const floatingActionStackSize = Object.values(FLOATING_ACTIONS_CONFIG).filter((action) => action.enabled).length;

// The site-wide assistant launcher is the priority action: it always sits
// one slot above whichever of Call/WhatsApp/ScrollTop are actually enabled,
// so it's never covering (or covered by) the stack and never leaves a gap
// when one of those three is toggled off.
export const ASSISTANT_LAUNCHER_BOTTOM_OFFSET_PX = FLOATING_ACTION_BASE_OFFSET_PX + floatingActionStackSize * FLOATING_ACTION_STEP_PX;
