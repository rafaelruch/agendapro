import { Calendar, LayoutDashboard, Users, Settings, Briefcase, UserCog, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  userRole?: string;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const isAdmin = userRole === 'admin' || userRole === 'master_admin';

  return (
    <Sidebar className="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header/Logo - TailAdmin EXACT */}
      <SidebarHeader className="px-5 py-8">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 w-full">
          <Calendar className="h-8 w-8 text-brand-500" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-800 dark:text-white/90">AgendaPro</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">v1.0</span>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-5">
        {/* MENU Section - TailAdmin Style */}
        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="mb-4 text-xs uppercase leading-[20px] text-gray-400">
            MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-4">
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/")}
                  isActive={location === "/"}
                  className={`flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium text-sm duration-300 ease-in-out ${
                    location === "/" 
                      ? "bg-brand-50 text-brand-500 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400" 
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                  data-testid="link-dashboard"
                  data-active={location === "/"}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Calendar */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/calendar")}
                  isActive={location === "/calendar"}
                  className={`flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium text-sm duration-300 ease-in-out ${
                    location === "/calendar" 
                      ? "bg-brand-50 text-brand-500 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400" 
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                  data-testid="link-calendário"
                  data-active={location === "/calendar"}
                >
                  <Calendar className="h-5 w-5" />
                  <span>Calendário</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Clientes */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/clients")}
                  isActive={location === "/clients"}
                  className={`flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium text-sm duration-300 ease-in-out ${
                    location === "/clients" 
                      ? "bg-brand-50 text-brand-500 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400" 
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                  data-testid="link-clientes"
                  data-active={location === "/clients"}
                >
                  <Users className="h-5 w-5" />
                  <span>Clientes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Serviços */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/services")}
                  isActive={location === "/services"}
                  className={`flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium text-sm duration-300 ease-in-out ${
                    location === "/services" 
                      ? "bg-brand-50 text-brand-500 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400" 
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                  data-testid="link-serviços"
                  data-active={location === "/services"}
                >
                  <Briefcase className="h-5 w-5" />
                  <span>Serviços</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Usuários (apenas admin) */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setLocation("/users")}
                    isActive={location === "/users"}
                    className={`flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium text-sm duration-300 ease-in-out ${
                      location === "/users" 
                        ? "bg-brand-50 text-brand-500 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400" 
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    }`}
                    data-testid="link-usuários"
                    data-active={location === "/users"}
                  >
                    <UserCog className="h-5 w-5" />
                    <span>Usuários</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Configurações (apenas admin) */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setLocation("/settings")}
                    isActive={location === "/settings"}
                    className={`flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium text-sm duration-300 ease-in-out ${
                      location === "/settings" 
                        ? "bg-brand-50 text-brand-500 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400" 
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    }`}
                    data-testid="link-configurações"
                    data-active={location === "/settings"}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Configurações</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
