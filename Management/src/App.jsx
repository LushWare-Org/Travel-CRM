import { Route, Switch } from "wouter";
import Sidebar from "./pages/Sidebar";
import Dashboard from "./pages/Dashboard";
import LeadManagement from "./pages/LeadManagement";
import ItineraryGeneration from "./pages/ItineraryGeneration";
import BillingInvoicing from "./pages/BillingInvoicing";
import UserManagement from "./pages/UserManagement";

function App() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
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