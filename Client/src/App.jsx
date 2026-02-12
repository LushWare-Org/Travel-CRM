import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header from './pages/Header';
import Footer from './pages/Footer';
import WhatsAppFloating from './components/WhatsAppFloating';
import Home from './pages/Landing/Home';
import { AuthProvider } from './context/AuthContext';

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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/destinations-international" element={<DestinationsInternational />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/planner" element={<PlanYourTrip />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/career" element={<Career />} />
            <Route path="/my-account" element={<MyAccount />} />
            <Route path="/package/:id" element={<PackageDetails />} />
            <Route path="/package/:id/customize" element={<CustomizePackage />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Suspense>
      </div>
      <Footer onNavigate={handleNavigate} />
      <WhatsAppFloating />
    </div>
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