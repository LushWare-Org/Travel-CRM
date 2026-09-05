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

const contactButtonsEnabledCount = [FLOATING_ACTIONS_CONFIG.call, FLOATING_ACTIONS_CONFIG.whatsapp].filter((action) => action.enabled).length;

// The site-wide assistant launcher sits directly above Call/WhatsApp (in
// that order, bottom-to-top) and below ScrollTop — never covering either —
// so it never leaves a gap if Call or WhatsApp is toggled off. ScrollTop's
// own offset is computed by FloatingActionStack, which reserves this same
// slot for the assistant so the two never collide.
export const ASSISTANT_LAUNCHER_BOTTOM_OFFSET_PX = FLOATING_ACTION_BASE_OFFSET_PX + contactButtonsEnabledCount * FLOATING_ACTION_STEP_PX;
