import { FLOATING_ACTIONS_CONFIG } from '../../../config/floatingActions';
import WhatsAppButton from './WhatsAppButton';
import CallButton from './CallButton';
import ScrollTopButton from './ScrollTopButton';

const BASE_OFFSET_PX = 16;
const STEP_PX = 68;

// Fixed bottom-to-top order; each enabled button's vertical offset is
// computed by its index among enabled buttons only, so disabling one never
// leaves a gap in the stack.
const ACTIONS = [
  { key: 'whatsapp', enabled: FLOATING_ACTIONS_CONFIG.whatsapp.enabled, Component: WhatsAppButton },
  { key: 'call', enabled: FLOATING_ACTIONS_CONFIG.call.enabled, Component: CallButton },
  { key: 'scrollTop', enabled: FLOATING_ACTIONS_CONFIG.scrollTop.enabled, Component: ScrollTopButton },
] as const;

const FloatingActionStack = () => {
  const enabledActions = ACTIONS.filter((action) => action.enabled);

  return (
    <div aria-hidden={enabledActions.length === 0}>
      {enabledActions.map(({ key, Component }, index) => (
        <div key={key} className="fixed z-floating-action right-3" style={{ bottom: `${BASE_OFFSET_PX + index * STEP_PX}px` }}>
          <Component />
        </div>
      ))}
    </div>
  );
};

export default FloatingActionStack;
