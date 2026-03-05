import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "./pages/dashboard";
import Threats from "./pages/threats";
import Deception from "./pages/deception";
import Deepfake from "./pages/deepfake";
import Risk from "./pages/risk";
import Audit from "./pages/audit";
import ExternalIntel from "./pages/external-intel";
import ThreatMap from "./pages/threat-map";
import AttackMatrix from "./pages/attack-matrix";
import Topology from "./pages/topology";
import Terminal from "./pages/terminal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/threats" component={Threats}/>
      <Route path="/deception" component={Deception}/>
      <Route path="/deepfake" component={Deepfake}/>
      <Route path="/risk" component={Risk}/>
      <Route path="/audit" component={Audit}/>
      <Route path="/external-intel" component={ExternalIntel}/>
      <Route path="/threat-map" component={ThreatMap}/>
      <Route path="/attack-matrix" component={AttackMatrix}/>
      <Route path="/topology" component={Topology}/>
      <Route path="/terminal" component={Terminal}/>
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
