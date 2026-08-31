import { Outlet } from 'react-router-dom';
import Header from '../pages/Header';
import LushHeader from '../components/lush/LushHeader';
import Footer from '../pages/Footer';
import FloatingActionStack from '../components/shared/floating-actions/FloatingActionStack';
import { isLushTheme } from '../config/activeTheme';

interface MainLayoutProps {
  currentPage: string;
  onNavigate: (page: string, filter?: string | null, force?: unknown) => void;
}

/**
 * Composition root for every route: Header + routed page content (via
 * react-router's <Outlet/>) + Footer + floating action buttons. Replaces
 * App.jsx's previous manual <div className="flex flex-col min-h-screen ...">
 * wrapper (Phase 2). Still forwards currentPage/onNavigate to Header/Footer
 * — this phase only adds page-visibility gating to their nav lists, not a
 * rewrite of the app's existing navigate-by-prop pattern.
 */
const MainLayout = ({ currentPage, onNavigate }: MainLayoutProps) => (
  <div className="flex flex-col min-h-screen bg-gray-50">
    {isLushTheme ? (
      <LushHeader currentPage={currentPage} onNavigate={onNavigate} />
    ) : (
      <Header currentPage={currentPage} onNavigate={onNavigate} />
    )}
    {/* No overflow-auto here: this div's parent is min-h-screen (grows with
        content, not a fixed height), so overflow-auto never actually shows
        its own scrollbar — the window scrolls instead. But per spec, any
        `overflow` other than visible still makes this the containing block
        for `position: sticky` descendants, which silently breaks every
        sticky element inside <Outlet/> (page toolbars, filter sidebars,
        booking summary panels) since they end up stuck relative to this
        div's (never-moving) internal scroll instead of the real window
        scroll. Plain flow lets sticky descendants track the window like the
        header (a sibling here, not nested inside this div) already does. */}
    <div className="flex-1">
      <Outlet />
    </div>
    <Footer onNavigate={onNavigate} />
    <FloatingActionStack />
  </div>
);

export default MainLayout;
