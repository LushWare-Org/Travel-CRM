import { Route, Switch, Redirect } from "wouter";
import { useState, useEffect } from "react";
import { authAPI } from "./services/api";
import Login from "./pages/Login";
import Sidebar from "./pages/Sidebar";
import Dashboard from "./pages/Dashboard";
import LeadManagement from "./pages/LeadManagement";
import ItineraryGeneration from "./pages/ItineraryGeneration";
import BillingInvoicing from "./pages/BillingInvoicing";
import UserManagement from "./pages/UserManagement";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (authAPI.isAuthenticated()) {
      try {
        const storedUser = authAPI.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        handleLogout();
      }
    }
    setIsLoading(false);
  };

  const handleLogin = () => {
    const storedUser = authAPI.getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = async () => {
    await authAPI.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar user={user} onLogout={handleLogout} />
      
      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/leads" component={LeadManagement} />
          <Route path="/itineraries" component={ItineraryGeneration} />
          <Route path="/billing" component={BillingInvoicing} />
          <Route path="/users" component={UserManagement} />
        </Switch>
      </div>
    </div>
  );
}

export default App;