import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ClientSelector } from "@/components/ClientSelector";
import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/CalendarPage";
import ClientsPage from "@/pages/ClientsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";
import { useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  // TODO: remove mock functionality
  const [selectedClient, setSelectedClient] = useState({ 
    id: "1", 
    name: "João Silva", 
    email: "joao@example.com" 
  });

  const mockClients = [
    { id: "1", name: "João Silva", email: "joao@example.com" },
    { id: "2", name: "Maria Santos", email: "maria@example.com" },
    { id: "3", name: "Pedro Oliveira", email: "pedro@example.com" },
  ];

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b gap-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ClientSelector
                    clients={mockClients}
                    selectedClient={selectedClient}
                    onSelectClient={setSelectedClient}
                    onAddClient={() => console.log("Adicionar novo cliente")}
                  />
                </div>
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
