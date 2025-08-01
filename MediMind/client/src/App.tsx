import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Landing from "@/pages/landing";
import Signup from "@/pages/signup";
import DemoLogin from "@/pages/demo-login";
import RoleSetup from "@/pages/role-setup";
import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import MedicalRecords from "@/pages/medical-records";
import EMRDashboard from "@/pages/emr-dashboard";
import HIPAACompliance from "@/pages/hipaa-compliance";
import Billing from "@/pages/billing";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import Kiosk from "@/pages/kiosk";
import Patients from "@/pages/patients";
import QueueManagement from "@/pages/queue-management";
import Pharmacy from "@/pages/pharmacy";
import Insurance from "@/pages/insurance";
import Support from "@/pages/support";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [kioskMode, setKioskMode] = useState(false);

  // Show kiosk mode if enabled
  if (kioskMode) {
    return <Kiosk onExit={() => setKioskMode(false)} />;
  }

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={DemoLogin} />
          <Route path="/demo-login" component={DemoLogin} />
          <Route path="/landing" component={Landing} />
          <Route path="/signup" component={Signup} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/patients" component={Patients} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/queue-management" component={QueueManagement} />
          <Route path="/medical-records" component={MedicalRecords} />
          <Route path="/emr-dashboard" component={EMRDashboard} />
          <Route path="/pharmacy" component={Pharmacy} />
          <Route path="/insurance" component={Insurance} />
          <Route path="/administration" component={Admin} />
          <Route path="/admin" component={Admin} />
          <Route path="/support" component={Support} />
          <Route path="/security" component={HIPAACompliance} />
          <Route path="/hipaa-compliance" component={HIPAACompliance} />
          <Route path="/billing" component={Billing} />
          <Route path="/settings" component={Settings} />
          <Route 
            path="/kiosk" 
            component={() => <Kiosk onExit={() => setKioskMode(false)} />} 
          />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
