import BRANDING from './branding';
import { flag } from './envFlag';

export const FLOATING_ACTIONS_CONFIG = {
  whatsapp: { enabled: flag('VITE_FEATURE_WHATSAPP_BUTTON', Boolean(BRANDING.contact.whatsapp)) },
  call: { enabled: flag('VITE_FEATURE_CALL_BUTTON', Boolean(BRANDING.contact.phone)) },
  scrollTop: { enabled: flag('VITE_FEATURE_SCROLL_TOP', true) },
} as const;
