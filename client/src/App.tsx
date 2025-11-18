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
import { LogOut, Search } from "lucide-react";
import { HeaderDropdownNotification } from "@/components/HeaderDropdownNotification";
import { HeaderDropdownMessage } from "@/components/HeaderDropdownMessage";
import { HeaderDropdownProfile } from "@/components/HeaderDropdownProfile";
import DashboardCRM from "@/pages/DashboardCRM";
import CalendarPage from "@/pages/CalendarPage";
import ClientsPage from "@/pages/ClientsPage";
import ServicesPage from "@/pages/ServicesPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import SetupPage from "@/pages/SetupPage";
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
      <Route path="/" component={DashboardCRM} />
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
          {/* Header EXATAMENTE como TailAdmin (SEM border-b, apenas drop-shadow) */}
          <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
            <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11 gap-4">
              {/* Lado Esquerdo - Busca */}
              <div className="flex items-center gap-3 sm:gap-4 lg:hidden">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </div>
              
              <div className="hidden sm:block">
                <div className="relative">
                  <button className="absolute left-0 top-1/2 -translate-y-1/2 pl-3">
                    <Search className="h-4 w-4 text-bodydark2" />
                  </button>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full bg-transparent pl-9 pr-4 font-medium focus:outline-none xl:w-125 border border-stroke dark:border-strokedark rounded-lg py-2.5 px-4 shadow-inner"
                    data-testid="input-search"
                  />
                </div>
              </div>

              {/* Lado Direito - Notificações, Mensagens, Theme, Perfil */}
              <div className="flex items-center gap-3 2xsm:gap-7">
                <ul className="flex items-center gap-2 2xsm:gap-4">
                  {/* Dark Mode Toggle */}
                  <li>
                    <ThemeToggle />
                  </li>

                  {/* Notificações */}
                  <li>
                    <HeaderDropdownNotification />
                  </li>

                  {/* Mensagens */}
                  <li>
                    <HeaderDropdownMessage />
                  </li>
                </ul>

                {/* Perfil */}
                <HeaderDropdownProfile
                  userName={authData.user.name}
                  userRole={authData.user.role}
                  onLogout={() => logoutMutation.mutate()}
                />
              </div>
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
  // Check if system is installed
  const { data: setupStatus, isLoading: setupLoading } = useQuery<{ installed: boolean }>({
    queryKey: ["/api/setup/status"],
    retry: false,
  });

  const { data: authData, isLoading, error } = useQuery<AuthData>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: setupStatus?.installed === true,
  });

  if (setupLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold">Carregando...</div>
        </div>
      </div>
    );
  }

  // Show setup page if not installed
  if (setupStatus && !setupStatus.installed) {
    return <SetupPage />;
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
