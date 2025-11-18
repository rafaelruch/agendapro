import { MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function HeaderDropdownMessage() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stroke hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4">
          <MessageSquare className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 z-1 h-2 w-2 rounded-full bg-meta-1">
            <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-stroke dark:border-strokedark mt-2.5">
        <div className="px-4.5 py-3">
          <h5 className="text-sm font-medium">Mensagens</h5>
        </div>

        <div className="flex flex-col">
          <div className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4">
            <div className="flex gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">João Silva</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Gostaria de remarcar meu agendamento...
                </p>
                <p className="text-xs text-muted-foreground mt-1">há 5 minutos</p>
              </div>
            </div>
          </div>

          <div className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4">
            <div className="flex gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback>MS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Maria Santos</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Obrigada pelo atendimento!
                </p>
                <p className="text-xs text-muted-foreground mt-1">há 30 minutos</p>
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
