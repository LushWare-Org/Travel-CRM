import { Outlet } from 'react-router-dom';
import Header from '../pages/Header';
import Footer from '../pages/Footer';
import FloatingActionStack from '../components/shared/floating-actions/FloatingActionStack';

interface MainLayoutProps {
  currentPage: string;
  onNavigate: (page: string, filter?: string | null, force?: boolean) => void;
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
    <Header currentPage={currentPage} onNavigate={onNavigate} />
    <div className="flex-1 overflow-auto">
      <Outlet />
    </div>
    <Footer onNavigate={onNavigate} />
    <FloatingActionStack />
  </div>
);

export default MainLayout;
