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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/threats" component={Threats}/>
      <Route path="/deception" component={Deception}/>
      <Route path="/deepfake" component={Deepfake}/>
      <Route path="/risk" component={Risk}/>
      <Route path="/audit" component={Audit}/>
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
