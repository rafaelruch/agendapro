import { Calendar, LayoutDashboard, Users, Settings, Briefcase, UserCog, ChevronDown, UserCheck, Clock, Key } from "lucide-react";
import { useLocation } from "wouter";
import { useSidebar } from "@/context/SidebarContext";

interface AppSidebarProps {
  userRole?: string;
  allowedModules?: string[];
}

export function AppSidebarNew({ userRole, allowedModules = [] }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const isAdmin = userRole === 'admin' || userRole === 'master_admin';

  const isActive = (path: string) => location === path;

  const hasModule = (moduleId: string) => allowedModules.includes(moduleId);

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/",
      testId: "link-dashboard",
      moduleId: null
    },
    {
      name: "Calendário",
      icon: <Calendar className="h-5 w-5" />,
      path: "/calendar",
      testId: "link-calendário",
      moduleId: "calendar"
    },
    {
      name: "Clientes",
      icon: <Users className="h-5 w-5" />,
      path: "/clients",
      testId: "link-clientes",
      moduleId: "clients"
    },
    {
      name: "Serviços",
      icon: <Briefcase className="h-5 w-5" />,
      path: "/services",
      testId: "link-serviços",
      moduleId: "services"
    },
    {
      name: "Profissionais",
      icon: <UserCheck className="h-5 w-5" />,
      path: "/professionals",
      testId: "link-profissionais",
      moduleId: "professionals"
    },
  ].filter(item => item.moduleId === null || hasModule(item.moduleId));

  const adminItems = isAdmin ? [
    {
      name: "Usuários",
      icon: <UserCog className="h-5 w-5" />,
      path: "/users",
      testId: "link-usuários",
      moduleId: "users"
    },
    {
      name: "Horários",
      icon: <Clock className="h-5 w-5" />,
      path: "/business-hours",
      testId: "link-horários",
      moduleId: "business-hours"
    },
    {
      name: "Tokens API",
      icon: <Key className="h-5 w-5" />,
      path: "/api-tokens",
      testId: "link-api-tokens",
      moduleId: "api-tokens"
    },
    {
      name: "Configurações",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
      testId: "link-configurações",
      moduleId: null
    },
  ].filter(item => item.moduleId === null || hasModule(item.moduleId)) : [];

  const allItems = [...menuItems, ...adminItems];

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="sidebar-container"
    >
      {/* Logo/Header */}
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <button onClick={() => setLocation("/")} className="flex items-center gap-2">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Calendar className="h-8 w-8 text-brand-500 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-800 dark:text-white/90">AgendaPro</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">v1.0</span>
              </div>
            </>
          ) : (
            <Calendar className="h-8 w-8 text-brand-500" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "MENU" : "···"}
              </h2>
              <ul className="flex flex-col gap-4">
                {allItems.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => setLocation(item.path)}
                      className={`flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium text-sm duration-300 ease-in-out w-full ${
                        isActive(item.path)
                          ? "bg-brand-50 text-brand-500 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                      } ${
                        !isExpanded && !isHovered
                          ? "lg:justify-center"
                          : "justify-start"
                      }`}
                      data-testid={item.testId}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span>{item.name}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
