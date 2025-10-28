import { Clock, User, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Appointment {
  id: string;
  clientName: string;
  time: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusLabels = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors = {
  scheduled: "bg-chart-1 text-white",
  completed: "bg-chart-2 text-white",
  cancelled: "bg-muted text-muted-foreground",
};

export function AppointmentCard({ appointment, onEdit, onDelete }: AppointmentCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-appointment-${appointment.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid={`text-client-name-${appointment.id}`}>
                {appointment.clientName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {appointment.time} • {appointment.duration} min
              </span>
            </div>
            {appointment.notes && (
              <p className="text-sm text-muted-foreground line-clamp-2">{appointment.notes}</p>
            )}
          </div>
          <div className="flex items-start gap-2">
            <Badge className={statusColors[appointment.status]}>
              {statusLabels[appointment.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid={`button-appointment-menu-${appointment.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(appointment.id)} data-testid={`button-edit-${appointment.id}`}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(appointment.id)}
                  className="text-destructive"
                  data-testid={`button-delete-${appointment.id}`}
                >
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
