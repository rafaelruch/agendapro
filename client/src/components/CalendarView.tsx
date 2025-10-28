import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CalendarAppointment {
  id: string;
  time: string;
  clientName: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface CalendarViewProps {
  appointments: CalendarAppointment[];
  onDateClick?: (date: Date) => void;
  onAppointmentClick?: (appointmentId: string) => void;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarView({ appointments, onDateClick, onAppointmentClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getAppointmentsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(apt => apt.time.startsWith(dateStr));
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="p-2" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayAppointments = getAppointmentsForDate(day);
    const isToday = 
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <Card
        key={day}
        className={`p-2 min-h-24 hover-elevate cursor-pointer ${isToday ? "border-primary" : ""}`}
        onClick={() => onDateClick?.(new Date(year, month, day))}
        data-testid={`calendar-day-${day}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
            {day}
          </span>
          {dayAppointments.length > 0 && (
            <Badge variant="secondary" className="h-5 text-xs">
              {dayAppointments.length}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          {dayAppointments.slice(0, 2).map((apt) => (
            <div
              key={apt.id}
              className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
              onClick={(e) => {
                e.stopPropagation();
                onAppointmentClick?.(apt.id);
              }}
            >
              {apt.time.split('T')[1]?.substring(0, 5)} {apt.clientName}
            </div>
          ))}
          {dayAppointments.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{dayAppointments.length - 2} mais
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={previousMonth}
            data-testid="button-previous-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-sm font-medium text-muted-foreground p-2">
            {name}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
}
