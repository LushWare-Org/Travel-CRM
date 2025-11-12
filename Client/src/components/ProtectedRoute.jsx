import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute Component
 * Restricts access to routes based on authentication and optional role requirements
 * 
 * @param {React.ComponentType} Component - The component to render if authorized
 * @param {string|string[]} requiredRoles - Optional role(s) required to access the route
 * @returns {React.ReactNode} Protected component or redirect to login
 * 
 * @example
 * <Route 
 *   path="/dashboard" 
 *   element={<ProtectedRoute Component={Dashboard} />} 
 * />
 * 
 * @example With role requirement
 * <Route 
 *   path="/admin" 
 *   element={<ProtectedRoute Component={AdminPanel} requiredRoles="admin" />} 
 * />
 */
export default function ProtectedRoute({ Component, requiredRoles = null }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading state if still checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required roles are specified
  if (requiredRoles) {
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!user || !rolesArray.includes(user.role)) {
      // Redirect to home or 403 page based on preference
      return <Navigate to="/" replace />;
    }
  }

  // User is authenticated and authorized
  return <Component />;
}
