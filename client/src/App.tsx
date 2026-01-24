import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import Intake from "@/pages/intake";
import Inventory from "@/pages/inventory";
import WorkQueue from "@/pages/work-queue";
import ItemDetail from "@/pages/item-detail";
import EbayScript from "@/pages/ebay-script";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: { component: any, path?: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/intake">
        <ProtectedRoute component={Intake} />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute component={Inventory} />
      </Route>
      <Route path="/work-queue">
        <ProtectedRoute component={WorkQueue} />
      </Route>
      <Route path="/items/:id">
        <ProtectedRoute component={ItemDetail} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/ebay-script">
        <ProtectedRoute component={EbayScript} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dispolist-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
