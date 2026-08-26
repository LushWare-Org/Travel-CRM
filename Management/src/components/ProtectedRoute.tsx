import type { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string | string[] | null;
}

export default function ProtectedRoute({
  children,
  requiredRoles = null,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="animate-spin h-12 w-12 text-primary mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && user) {
    const hasAccess = Array.isArray(requiredRoles)
      ? requiredRoles.includes(user.role)
      : user.role === requiredRoles;

    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground mb-2">
              Access Denied
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-xs text-muted-foreground">
              Your role: <span className="font-semibold text-foreground">{user.role}</span>
            </p>
          </div>
        </div>
      );
    }
  }

  return children;
}
