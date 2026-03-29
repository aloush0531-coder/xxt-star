import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Markets from "./pages/Markets";
import Trade from "./pages/Trade";
import Wallet from "./pages/Wallet";
import Transactions from "./pages/Transactions";
import Deposit from "./pages/Deposit";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/markets" component={Markets} />
      <Route path="/trade/:coinId?" component={Trade} />
      <Route path="/wallet" component={Wallet} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/deposit" component={Deposit} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/members" component={AdminMembers} />
      <Route path="/admin/transactions" component={AdminTransactions} />
      <Route path="/admin/deposits" component={AdminDeposits} />
      <Route path="/admin/notifications" component={AdminNotifications} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
