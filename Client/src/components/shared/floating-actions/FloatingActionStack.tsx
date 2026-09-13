import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, MessageCircle, Phone, X } from 'lucide-react';
import {
  FLOATING_ACTIONS_CONFIG,
  FLOATING_ACTION_BASE_OFFSET_PX,
  FLOATING_ACTION_RIGHT_OFFSET_PX,
  FLOATING_ACTION_SCROLL_TOP_RIGHT_OFFSET_PX,
} from '../../../config/floatingActions';
import { isAssistantExcludedPath } from '../../../config/assistantRoutes';
import BRANDING, { getWhatsAppUrl } from '../../../config/branding';
import { setAssistantLauncherOpen } from './assistantLauncherState';
import WhatsAppIcon from './WhatsAppIcon';
import ScrollTopButton from './ScrollTopButton';

const CONTACT_MENU_ID = 'floating-contact-options-menu';
const WHATSAPP_MESSAGE = "Hello! I'm interested in your holiday packages.";

// Shared row styling for the launcher's expanded actions (Call, WhatsApp,
// Travel Assistant) — one full-width labelled row per channel, warmer and
// clearer than a stack of icon-only circles, all tinted with the single
// brand accent per DESIGN.md (icons/icon-chips use brand-50/brand-600).
const ROW_CLASS =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';
const ROW_ICON_CLASS = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600';

const whatsappEnabled = FLOATING_ACTIONS_CONFIG.whatsapp.enabled;
const callEnabled = FLOATING_ACTIONS_CONFIG.call.enabled;
const scrollTopEnabled = FLOATING_ACTIONS_CONFIG.scrollTop.enabled;

/**
 * Single expandable floating-action launcher (Phase 1). Call, WhatsApp and
 * the site-wide assistant — previously 3-4 permanently stacked circles —
 * collapse into ONE bottom-right anchor that expands into a labelled menu on
 * click. The assistant chat panel itself still lives in AssistantWidget
 * (mounted in App.tsx, outside the route Suspense boundary for telemetry
 * reasons); this launcher opens it through the shared assistantLauncherState
 * store, so the two never need a shared React ancestor.
 *
 * ScrollTop stays a separate, smaller affordance to the anchor's left (a
 * page-scroll utility, not a contact channel) — it never joins the menu and
 * keeps its own scroll threshold.
 *
 * Visibility scope: the launcher renders on every route except the four
 * assistant-excluded ones (/planner, /package/:id/customize, /login,
 * /my-account — see isAssistantExcludedPath), and it is visible immediately
 * wherever it renders. ScrollTop stays a separate affordance and keeps its
 * own scroll threshold.
 */
const FloatingActionStack = () => {
  const location = useLocation();
  const { pathname } = location;

  // The launcher is the assistant's only opener, so it renders on exactly the
  // routes where the assistant mounts. Always immediately: no scroll gate, no
  // fade-in — a contact channel the visitor has to scroll to discover is not
  // a contact channel. The four excluded routes render nothing at all.
  const launcherRoutable = !isAssistantExcludedPath(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the menu on navigation so it never carries over onto another page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Outside click / Escape closes the expanded menu.
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleToggleMenu = () => {
    if (!menuOpen) setAssistantLauncherOpen(false);
    setMenuOpen((open) => !open);
  };

  const handleAssistantSelect = () => {
    setMenuOpen(false);
    setAssistantLauncherOpen(true);
  };

  return (
    <>
      {scrollTopEnabled && (
        <div
          className="fixed z-floating-action"
          style={{ bottom: FLOATING_ACTION_BASE_OFFSET_PX, right: FLOATING_ACTION_SCROLL_TOP_RIGHT_OFFSET_PX }}
        >
          <ScrollTopButton />
        </div>
      )}

      {launcherRoutable && (
        <div
          ref={rootRef}
          className="fixed z-floating-action flex flex-col items-end"
          style={{ bottom: FLOATING_ACTION_BASE_OFFSET_PX, right: FLOATING_ACTION_RIGHT_OFFSET_PX }}
        >
          {menuOpen && (
            <div
              id={CONTACT_MENU_ID}
              aria-label="Contact options"
              className="mb-3 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-floating"
            >
              {callEnabled && (
                <a
                  href={`tel:${BRANDING.contact.phone}`}
                  aria-label="Call us"
                  onClick={closeMenu}
                  className={ROW_CLASS}
                >
                  <span className={ROW_ICON_CLASS}>
                    <Phone className="h-[18px] w-[18px]" />
                  </span>
                  Call us
                </a>
              )}
              {whatsappEnabled && (
                <a
                  href={getWhatsAppUrl(WHATSAPP_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  onClick={closeMenu}
                  className={ROW_CLASS}
                >
                  <span className={ROW_ICON_CLASS}>
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                  </span>
                  WhatsApp
                </a>
              )}
              <button type="button" onClick={handleAssistantSelect} aria-label="Travel assistant" className={ROW_CLASS}>
                <span className={ROW_ICON_CLASS}>
                  <Bot className="h-[18px] w-[18px]" />
                </span>
                Travel assistant
              </button>
            </div>
          )}

          <button
            type="button"
            aria-label="Contact options"
            aria-expanded={menuOpen}
            aria-controls={CONTACT_MENU_ID}
            onClick={handleToggleMenu}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white shadow-floating transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {menuOpen ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
          </button>
        </div>
      )}
    </>
  );
};

export default FloatingActionStack;
