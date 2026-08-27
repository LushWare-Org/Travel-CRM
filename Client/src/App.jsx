import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Landing/Home';
import { AuthProvider } from './context/AuthContext';
import { PAGE_CONFIG } from './config/pages';

const DestinationsInternational = lazy(() => import('./pages/DestinationsInternational'));
const PackageDetails = lazy(() => import('./pages/PackageDetails'));
const CustomizePackage = lazy(() => import('./pages/CustomizePackage'));
const Packages = lazy(() => import('./pages/Packages'));
const AboutUs = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Career = lazy(() => import('./pages/Career'));
const Login = lazy(() => import('./pages/Login'));
const MyAccount = lazy(() => import('./pages/MyAccount'));
const PlanYourTrip = lazy(() => import('./pages/PlanYourTrip'));

function AppContent() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState('home');

  const handleNavigate = (page, filter = null, force = false) => {
    setCurrentPage(page);
    let path = '/';
    if (page === 'home' || page === '/') path = '/';
    else if (page === 'destinations') path = '/destinations-international';
    else path = `/${page}`;

    if (filter) {
      if (typeof filter === 'string' && filter.includes('=')) {
        const url = `${path}?${filter}`;
        if (force) navigate(url, { state: { __force: Date.now() } });
        else navigate(url);
      } else {
        const qKey = path.includes('destinations')
          ? 'region'
          : /^\d+$/.test(String(filter)) ? 'id' : 'country';
        const url = `${path}?${qKey}=${filter}`;
        if (force) navigate(url, { state: { __force: Date.now() } });
        else navigate(url);
      }
    } else {
      if (force) navigate(path, { state: { __force: Date.now() } });
      else navigate(path);
    }
  };

  const LoadingFallback = () => <div className="min-h-screen" />;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<MainLayout currentPage={currentPage} onNavigate={handleNavigate} />}>
          <Route path="/" element={<Home />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/package/:id" element={<PackageDetails />} />
          <Route path="/contact" element={<Contact />} />
          {PAGE_CONFIG.destinations.enabled && (
            <Route path="/destinations-international" element={<DestinationsInternational />} />
          )}
          {PAGE_CONFIG.planner.enabled && <Route path="/planner" element={<PlanYourTrip />} />}
          {PAGE_CONFIG.planner.enabled && (
            <Route path="/package/:id/customize" element={<CustomizePackage />} />
          )}
          {PAGE_CONFIG.about.enabled && <Route path="/about" element={<AboutUs />} />}
          {PAGE_CONFIG.career.enabled && <Route path="/career" element={<Career />} />}
          {PAGE_CONFIG.account.enabled && <Route path="/my-account" element={<MyAccount />} />}
          {PAGE_CONFIG.account.enabled && <Route path="/login" element={<Login />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
