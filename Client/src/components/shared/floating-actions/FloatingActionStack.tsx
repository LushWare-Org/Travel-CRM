import { useLocation } from 'react-router-dom';
import { FLOATING_ACTIONS_CONFIG, FLOATING_ACTION_BASE_OFFSET_PX, FLOATING_ACTION_STEP_PX } from '../../../config/floatingActions';
import { isAssistantExcludedPath } from '../../../config/assistantRoutes';
import WhatsAppButton from './WhatsAppButton';
import CallButton from './CallButton';
import ScrollTopButton from './ScrollTopButton';

// Fixed bottom-to-top order; each enabled button's vertical offset is
// computed by its index among enabled buttons only, so disabling one never
// leaves a gap in the stack. Call sits at the very bottom, then WhatsApp,
// then the site-wide assistant launcher (AssistantWidget, rendered
// separately — see ASSISTANT_LAUNCHER_BOTTOM_OFFSET_PX), then ScrollTop.
const ACTIONS = [
  { key: 'call', enabled: FLOATING_ACTIONS_CONFIG.call.enabled, Component: CallButton },
  { key: 'whatsapp', enabled: FLOATING_ACTIONS_CONFIG.whatsapp.enabled, Component: WhatsAppButton },
  { key: 'scrollTop', enabled: FLOATING_ACTIONS_CONFIG.scrollTop.enabled, Component: ScrollTopButton },
] as const;

const FloatingActionStack = () => {
  const location = useLocation();
  const enabledActions = ACTIONS.filter((action) => action.enabled);

  // The assistant launcher isn't rendered by this component, but it reserves
  // a slot between WhatsApp and ScrollTop on every route it actually mounts
  // on — so ScrollTop (the only action after that slot) shifts up by one
  // step instead of colliding with it.
  const scrollTopIndex = enabledActions.findIndex((action) => action.key === 'scrollTop');
  const assistantReservesSlot = scrollTopIndex !== -1 && !isAssistantExcludedPath(location.pathname);

  return (
    <div aria-hidden={enabledActions.length === 0}>
      {enabledActions.map(({ key, Component }, index) => {
        const reservedOffset = assistantReservesSlot && index >= scrollTopIndex ? FLOATING_ACTION_STEP_PX : 0;
        return (
          <div key={key} className="fixed z-floating-action right-3" style={{ bottom: `${FLOATING_ACTION_BASE_OFFSET_PX + index * FLOATING_ACTION_STEP_PX + reservedOffset}px` }}>
            <Component />
          </div>
        );
      })}
    </div>
  );
};

export default FloatingActionStack;
