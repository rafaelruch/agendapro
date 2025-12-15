import { Switch, Route, Redirect } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { ToastProvider, useToast as useGlobalToast, setGlobalToast } from "@/context/ToastContext";
import { AppSidebarNew } from "@/components/AppSidebarNew";
import Backdrop from "@/components/Backdrop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ClientSelector } from "@/components/ClientSelector";
import Button from "@/components/ui/button/Button";
import { LogOut, Search } from "lucide-react";
import { HeaderDropdownNotification } from "@/components/HeaderDropdownNotification";
import { HeaderDropdownProfile } from "@/components/HeaderDropdownProfile";
import DashboardCRM from "@/pages/DashboardCRM";
import CalendarPage from "@/pages/CalendarPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import ClientsPage from "@/pages/ClientsPage";
import ServicesPage from "@/pages/ServicesPage";
import ProfessionalsPage from "@/pages/ProfessionalsPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import SetupPage from "@/pages/SetupPage";
import InventoryPage from "@/pages/InventoryPage";
import ProductCategoriesPage from "@/pages/ProductCategoriesPage";
import MenuSettingsPage from "@/pages/MenuSettingsPage";
import OrdersPage from "@/pages/OrdersPage";
import KitchenPage from "@/pages/KitchenPage";
import FinancePage from "@/pages/FinancePage";
import PublicMenuPage from "@/pages/PublicMenuPage";
import WebhooksPage from "@/pages/WebhooksPage";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

function ToastConnector() {
  const { showToast } = useGlobalToast();
  
  useEffect(() => {
    setGlobalToast(showToast);
  }, [showToast]);
  
  return null;
}

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
  allowedModules: string[];
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardCRM} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/appointments" component={AppointmentsPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/professionals" component={ProfessionalsPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/inventory/categories" component={ProductCategoriesPage} />
      <Route path="/menu-settings" component={MenuSettingsPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/kitchen" component={KitchenPage} />
      <Route path="/finance" component={FinancePage} />
      <Route path="/webhooks" component={WebhooksPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ authData }: { authData: AuthData }) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  // const { toast } = useToast(); // TODO: Implement TailAdmin toast
  const { isExpanded } = useSidebar();

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
      // toast({ title: "Logout realizado com sucesso" }); // TODO: Implement TailAdmin toast
    },
  });

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
              startIcon={<LogOut className="w-4 h-4" />}
              data-testid="button-logout"
            >
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
    <>
      <Backdrop />
      <AppSidebarNew userRole={authData.user.role} allowedModules={authData.allowedModules} />
      <div 
        className={`flex flex-col h-screen transition-all duration-300 ${
          isExpanded ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
        }`}
      >
        {/* Header TailAdmin EXACT */}
        <Header onLogout={() => logoutMutation.mutate()} userName={authData.user.name} userRole={authData.user.role} />
        <main className="flex-1 overflow-auto p-6">
          <Router />
        </main>
      </div>
    </>
  );
}

function Header({ onLogout, userName, userRole }: { onLogout: () => void; userName: string; userRole: string }) {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:border-b-0 lg:px-0 lg:py-4">
          {/* Sidebar Toggle - TailAdmin exact */}
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg dark:border-gray-800 flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            data-testid="button-sidebar-toggle"
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between w-full gap-4 px-5 py-4 lg:flex lg:justify-end lg:px-0 lg:shadow-none">
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* Dark Mode Toggle */}
            <ThemeToggle />
            
            {/* Notifications */}
            <HeaderDropdownNotification />
          </div>
          
          {/* User Profile */}
          <HeaderDropdownProfile
            userName={userName}
            userRole={userRole}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  // Check if current path is a public menu page
  const isPublicMenuPage = window.location.pathname.startsWith('/menu/');
  
  // If it's a public menu page, render it directly without authentication
  if (isPublicMenuPage) {
    return <PublicMenuPage />;
  }

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
      <ToastProvider>
        <ToastConnector />
        <SidebarProvider>
          <AppContent />
        </SidebarProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
