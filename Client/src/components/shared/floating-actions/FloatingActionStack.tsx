import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, MessageCircle, Phone, X } from 'lucide-react';
import {
  FLOATING_ACTIONS_CONFIG,
  FLOATING_ACTION_BASE_OFFSET_PX,
  FLOATING_ACTION_SCROLL_THRESHOLD_PX,
} from '../../../config/floatingActions';
import { isAssistantExcludedPath, isLauncherAlwaysVisiblePath } from '../../../config/assistantRoutes';
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
 * Visibility scope (added by /plan-design-review): on app pages
 * (/planner, /package/:id/customize, /login, /my-account) the launcher is
 * always visible; on marketing pages it stays out of the hero's first
 * viewport and fades in only after the shared scroll threshold — and closes
 * any open menu/assistant panel again if the user scrolls back above it.
 */
const FloatingActionStack = () => {
  const location = useLocation();
  const { pathname } = location;

  // The assistant panel never mounts on excluded routes, so its menu item
  // (and the widget behind it) only exists when the route is eligible.
  const assistantAvailable = !isAssistantExcludedPath(pathname);
  const alwaysVisible = isLauncherAlwaysVisiblePath(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const [hasScrolledPastThreshold, setHasScrolledPastThreshold] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isRevealed = alwaysVisible || hasScrolledPastThreshold;
  const launcherAvailable = callEnabled || whatsappEnabled || assistantAvailable;

  // App pages: always visible. Marketing pages: reveal once the window has
  // scrolled past the hero threshold. The initial handleScroll() call keeps
  // the state honest on route changes (e.g. a marketing page reached from a
  // previously-scrolled app page) without waiting for the next scroll event.
  useEffect(() => {
    if (alwaysVisible) return;
    const handleScroll = () => setHasScrolledPastThreshold(window.scrollY > FLOATING_ACTION_SCROLL_THRESHOLD_PX);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [alwaysVisible]);

  // Close the menu on navigation so it never carries over onto another page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Hidden launcher (marketing page, scrolled back above the hero) must not
  // leave an open menu or a floating assistant panel with no anchor beneath
  // it — collapse both the moment the launcher stops being revealed.
  useEffect(() => {
    if (isRevealed) return;
    setMenuOpen(false);
    setAssistantLauncherOpen(false);
  }, [isRevealed]);

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
        <div className="fixed z-floating-action right-20" style={{ bottom: FLOATING_ACTION_BASE_OFFSET_PX }}>
          <ScrollTopButton />
        </div>
      )}

      {launcherAvailable && (
        <div
          ref={rootRef}
          className={`fixed right-3 z-floating-action flex flex-col items-end transition-all duration-300 ease-out ${
            isRevealed ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
          }`}
          style={{ bottom: FLOATING_ACTION_BASE_OFFSET_PX }}
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
              {assistantAvailable && (
                <button type="button" onClick={handleAssistantSelect} aria-label="Travel assistant" className={ROW_CLASS}>
                  <span className={ROW_ICON_CLASS}>
                    <Bot className="h-[18px] w-[18px]" />
                  </span>
                  Travel assistant
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            aria-label="Contact options"
            aria-expanded={menuOpen}
            aria-controls={CONTACT_MENU_ID}
            onClick={handleToggleMenu}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-floating transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </button>
        </div>
      )}
    </>
  );
};

export default FloatingActionStack;
