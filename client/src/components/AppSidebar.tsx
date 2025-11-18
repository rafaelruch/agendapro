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
    <Sidebar className="border-r border-stroke dark:border-strokedark bg-white dark:bg-boxdark">
      {/* Header/Logo - EXATAMENTE como TailAdmin (SEM border-b) */}
      <SidebarHeader className="px-6 py-5.5">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 w-full">
          <Calendar className="h-8 w-8 text-primary" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-black dark:text-white">AgendaPro</span>
            <Badge variant="default" className="bg-meta-3 text-white text-xs px-2 py-0.5 rounded">
              v1.0
            </Badge>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        {/* MENU Section - TailAdmin Style */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-bodydark uppercase mb-4">
            MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/")}
                  isActive={location === "/"}
                  className={`relative w-full rounded-sm py-2 px-4 font-medium text-sm duration-300 ease-in-out hover:bg-graydark/10 dark:hover:bg-meta-4/10 ${
                    location === "/" ? "bg-graydark dark:bg-meta-4 before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-r before:bg-primary" : ""
                  }`}
                  data-testid="link-dashboard"
                  data-active={location === "/"}
                >
                  <LayoutDashboard className="h-4.5 w-4.5" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Calendar */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/calendar")}
                  isActive={location === "/calendar"}
                  className={`relative w-full rounded-sm py-2 px-4 font-medium text-sm duration-300 ease-in-out hover:bg-graydark/10 dark:hover:bg-meta-4/10 ${
                    location === "/calendar" ? "bg-graydark dark:bg-meta-4 before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-r before:bg-primary" : ""
                  }`}
                  data-testid="link-calendário"
                  data-active={location === "/calendar"}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Calendário</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Clientes */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/clients")}
                  isActive={location === "/clients"}
                  className={`relative w-full rounded-sm py-2 px-4 font-medium text-sm duration-300 ease-in-out hover:bg-graydark/10 dark:hover:bg-meta-4/10 ${
                    location === "/clients" ? "bg-graydark dark:bg-meta-4 before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-r before:bg-primary" : ""
                  }`}
                  data-testid="link-clientes"
                  data-active={location === "/clients"}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Clientes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Serviços */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setLocation("/services")}
                  isActive={location === "/services"}
                  className={`relative w-full rounded-sm py-2 px-4 font-medium text-sm duration-300 ease-in-out hover:bg-graydark/10 dark:hover:bg-meta-4/10 ${
                    location === "/services" ? "bg-graydark dark:bg-meta-4 before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-r before:bg-primary" : ""
                  }`}
                  data-testid="link-serviços"
                  data-active={location === "/services"}
                >
                  <Briefcase className="h-4.5 w-4.5" />
                  <span>Serviços</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Usuários (apenas admin) */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setLocation("/users")}
                    isActive={location === "/users"}
                    className={`relative w-full rounded-sm py-2 px-4 font-medium text-sm duration-300 ease-in-out hover:bg-graydark/10 dark:hover:bg-meta-4/10 ${
                      location === "/users" ? "bg-graydark dark:bg-meta-4 before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-r before:bg-primary" : ""
                    }`}
                    data-testid="link-usuários"
                    data-active={location === "/users"}
                  >
                    <UserCog className="h-4.5 w-4.5" />
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
                    className={`relative w-full rounded-sm py-2 px-4 font-medium text-sm duration-300 ease-in-out hover:bg-graydark/10 dark:hover:bg-meta-4/10 ${
                      location === "/settings" ? "bg-graydark dark:bg-meta-4 before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-r before:bg-primary" : ""
                    }`}
                    data-testid="link-configurações"
                    data-active={location === "/settings"}
                  >
                    <Settings className="h-4.5 w-4.5" />
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
