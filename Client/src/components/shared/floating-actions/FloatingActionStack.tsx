import { FLOATING_ACTIONS_CONFIG, FLOATING_ACTION_BASE_OFFSET_PX, FLOATING_ACTION_STEP_PX } from '../../../config/floatingActions';
import WhatsAppButton from './WhatsAppButton';
import CallButton from './CallButton';
import ScrollTopButton from './ScrollTopButton';

// Fixed bottom-to-top order; each enabled button's vertical offset is
// computed by its index among enabled buttons only, so disabling one never
// leaves a gap in the stack. Call sits at the very bottom, then WhatsApp,
// then ScrollTop — the site-wide assistant launcher (AssistantWidget) slots
// in one step above this whole stack via ASSISTANT_LAUNCHER_BOTTOM_OFFSET_PX.
const ACTIONS = [
  { key: 'call', enabled: FLOATING_ACTIONS_CONFIG.call.enabled, Component: CallButton },
  { key: 'whatsapp', enabled: FLOATING_ACTIONS_CONFIG.whatsapp.enabled, Component: WhatsAppButton },
  { key: 'scrollTop', enabled: FLOATING_ACTIONS_CONFIG.scrollTop.enabled, Component: ScrollTopButton },
] as const;

const FloatingActionStack = () => {
  const enabledActions = ACTIONS.filter((action) => action.enabled);

  return (
    <div aria-hidden={enabledActions.length === 0}>
      {enabledActions.map(({ key, Component }, index) => (
        <div key={key} className="fixed z-floating-action right-3" style={{ bottom: `${FLOATING_ACTION_BASE_OFFSET_PX + index * FLOATING_ACTION_STEP_PX}px` }}>
          <Component />
        </div>
      ))}
    </div>
  );
};

export default FloatingActionStack;
