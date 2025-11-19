import { useState } from "react";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import Avatar from "@/components/ui/avatar/Avatar";

interface HeaderDropdownProfileProps {
  userName: string;
  userRole: string;
  onLogout: () => void;
}

export function HeaderDropdownProfile({ userName, userRole, onLogout }: HeaderDropdownProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Create initials avatar image URL (SVG data)
  const avatarSrc = `data:image/svg+xml,${encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" fill="#3C50E0"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="16" font-weight="600" font-family="system-ui">
        ${initials}
      </text>
    </svg>
  `)}`;

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="relative">
      <button 
        onClick={toggleDropdown}
        className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-meta-4 rounded-md px-2 py-2 dropdown-toggle"
      >
        <div className="flex items-center gap-3">
          <Avatar src={avatarSrc} alt={userName} size="medium" />
          <div className="hidden lg:block text-left">
            <p className="text-sm font-medium text-gray-700 dark:text-white">{userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 hidden lg:block transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="w-56 p-2"
      >
        <button
          onClick={() => {
            window.location.href = "/settings";
            closeDropdown();
          }}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <User className="h-4 w-4" />
          <span>Meu Perfil</span>
        </button>
        
        <button
          onClick={() => {
            window.location.href = "/settings";
            closeDropdown();
          }}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <Settings className="h-4 w-4" />
          <span>Configurações</span>
        </button>
        
        <div className="my-1 h-px bg-gray-200 dark:bg-gray-800" />
        
        <button
          onClick={() => {
            onLogout();
            closeDropdown();
          }}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </Dropdown>
    </div>
  );
}
