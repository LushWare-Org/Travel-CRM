import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../pages/Dashboard';

// The Dashboard is not part of an agent's sidebar, so an agent's home is Leads.
//
// Both login flows navigate to "/", which makes this the seam where an agent's
// first screen is decided. Redirecting rather than wrapping the Dashboard in
// ProtectedRoute is deliberate: that guard renders an "Access Denied" screen,
// and meeting a denial the instant you log in reads as a bug, not as a
// permission boundary. The role gate and the landing target are the same
// decision, so they are made in one place.
export default function HomeRoute() {
  const { user } = useAuth();

  if (user?.role === 'salesRep') {
    return <Navigate to="/leads" replace />;
  }

  return <Dashboard />;
}
