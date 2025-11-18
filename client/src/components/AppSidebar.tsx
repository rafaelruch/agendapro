import { Calendar, LayoutDashboard, Users, Settings, Briefcase, UserCog, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
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
  const [location] = useLocation();
  const isAdmin = userRole === 'admin' || userRole === 'master_admin';

  return (
    <Sidebar className="border-r border-stroke dark:border-strokedark bg-white dark:bg-boxdark">
      {/* Header/Logo - EXATAMENTE como TailAdmin */}
      <SidebarHeader className="border-b border-stroke dark:border-strokedark px-6 py-5.5">
        <Link href="/" className="flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-black dark:text-white">AgendaPro</span>
            <Badge variant="default" className="bg-meta-3 text-white text-xs px-2 py-0.5 rounded">
              v1.0
            </Badge>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        {/* Menu Group - Visão Geral */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-bodydark uppercase mb-2">
            MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/"}
                  className="relative group rounded-sm py-2 px-4 font-medium duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
                >
                  <Link href="/" data-testid="link-dashboard">
                    <LayoutDashboard className="h-4.5 w-4.5" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/calendar"}
                  className="relative group rounded-sm py-2 px-4 font-medium duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
                >
                  <Link href="/calendar" data-testid="link-calendário">
                    <Calendar className="h-4.5 w-4.5" />
                    <span>Calendário</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Group - Gestão */}
        <SidebarGroup className="mt-5">
          <SidebarGroupLabel className="text-xs font-semibold text-bodydark uppercase mb-2">
            GESTÃO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/clients"}
                  className="relative group rounded-sm py-2 px-4 font-medium duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
                >
                  <Link href="/clients" data-testid="link-clientes">
                    <Users className="h-4.5 w-4.5" />
                    <span>Clientes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/services"}
                  className="relative group rounded-sm py-2 px-4 font-medium duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
                >
                  <Link href="/services" data-testid="link-serviços">
                    <Briefcase className="h-4.5 w-4.5" />
                    <span>Serviços</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Group - Administração (apenas para admin) */}
        {isAdmin && (
          <SidebarGroup className="mt-5">
            <SidebarGroupLabel className="text-xs font-semibold text-bodydark uppercase mb-2">
              ADMINISTRAÇÃO
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/users"}
                    className="relative group rounded-sm py-2 px-4 font-medium duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
                  >
                    <Link href="/users" data-testid="link-usuários">
                      <UserCog className="h-4.5 w-4.5" />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/settings"}
                    className="relative group rounded-sm py-2 px-4 font-medium duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
                  >
                    <Link href="/settings" data-testid="link-configurações">
                      <Settings className="h-4.5 w-4.5" />
                      <span>Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
