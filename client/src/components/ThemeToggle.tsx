import { Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const switchTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stroke hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
          data-testid="button-theme-toggle"
        >
          {theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 border-stroke dark:border-strokedark mt-2.5">
        <div className="px-4.5 py-3">
          <h5 className="text-sm font-medium">Tema</h5>
        </div>

        <div className="flex flex-col">
          <DropdownMenuItem
            onClick={() => switchTheme("light")}
            className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4 cursor-pointer"
          >
            <Sun className="h-4 w-4 mr-2" />
            <span className="text-sm">Claro</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => switchTheme("dark")}
            className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4 cursor-pointer"
          >
            <Moon className="h-4 w-4 mr-2" />
            <span className="text-sm">Escuro</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
