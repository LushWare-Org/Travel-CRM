import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './pages/Header';
import Footer from './pages/Footer';
import Home from './pages/Home';
import DestinationsInternational from './pages/DestinationsInternational';
import DestinationsDomestic from './pages/DestinationsDomestic';
import PackageDetails from './pages/PackageDetails';
import Packages from './pages/Packages';
import AboutUs from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import PlanYourTrip from './pages/PlanYourTrip';

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
          ? path.includes('domestic') ? 'state' : 'region'
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/destinations-international" element={<DestinationsInternational />} />
          <Route path="/destinations-domestic" element={<DestinationsDomestic />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/planner" element={<PlanYourTrip />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/package/:id" element={<PackageDetails />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
      <Footer onNavigate={handleNavigate} />
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
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#10b981',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            error: {
              duration: 4000,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
            loading: {
              style: {
                background: '#3b82f6',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#3b82f6',
              },
            },
          }}
        />
        <ScrollToTop />
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;