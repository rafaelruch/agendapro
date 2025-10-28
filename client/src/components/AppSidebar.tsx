import { Calendar, LayoutDashboard, Users, Settings, Briefcase, UserCog } from "lucide-react";
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
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    title: "Calendário",
    url: "/calendar",
    icon: Calendar,
    adminOnly: false,
  },
  {
    title: "Clientes",
    url: "/clients",
    icon: Users,
    adminOnly: false,
  },
  {
    title: "Serviços",
    url: "/services",
    icon: Briefcase,
    adminOnly: false,
  },
  {
    title: "Usuários",
    url: "/users",
    icon: UserCog,
    adminOnly: true,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
    adminOnly: true,
  },
];

interface AppSidebarProps {
  userRole?: string;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const [location] = useLocation();

  const isAdmin = userRole === 'admin' || userRole === 'master_admin';

  const visibleItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span className="font-semibold text-lg">AgendaPro</span>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-4">
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
