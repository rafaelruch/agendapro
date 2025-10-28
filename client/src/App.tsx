import { Switch, Route, Redirect } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ClientSelector } from "@/components/ClientSelector";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/CalendarPage";
import ClientsPage from "@/pages/ClientsPage";
import ServicesPage from "@/pages/ServicesPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

interface AuthData {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    tenantId: string;
  };
  tenant: {
    id: string;
    name: string;
  } | null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ authData }: { authData: AuthData }) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
      toast({ title: "Logout realizado com sucesso" });
    },
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Master admin vai direto para a página admin
  if (authData.user.role === 'master_admin') {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">AgendaPro - Admin Master</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{authData.user.name}</span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <AdminPage />
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={authData.user.role} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ClientSelector
                clients={clients.map(c => ({ id: c.id, name: c.name, email: c.email }))}
                selectedClient={selectedClient ? { id: selectedClient.id, name: selectedClient.name, email: selectedClient.email } : null}
                onSelectClient={(client) => {
                  const fullClient = clients.find(c => c.id === client.id);
                  if (fullClient) setSelectedClient(fullClient);
                }}
                onAddClient={() => window.location.href = "/clients"}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <strong>{authData.tenant?.name}</strong> - {authData.user.name}
              </div>
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { data: authData, isLoading, error } = useQuery<AuthData>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!authData || error) {
    return <LoginPage />;
  }

  return <AuthenticatedApp authData={authData} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
