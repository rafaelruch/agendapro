import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock } from "lucide-react";
import type { BusinessHours } from "@shared/schema";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export function BusinessHoursManager() {
  const { toast } = useToast();
  const [newHour, setNewHour] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "18:00",
    active: true,
  });

  const { data: businessHours = [], isLoading } = useQuery<BusinessHours[]>({
    queryKey: ["/api/business-hours"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newHour) => apiRequest("POST", "/api/business-hours", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-hours"] });
      setNewHour({ dayOfWeek: 1, startTime: "09:00", endTime: "18:00", active: true });
      toast({
        title: "Horário adicionado",
        description: "Horário de funcionamento criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar horário de funcionamento",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest("PUT", `/api/business-hours/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-hours"] });
      toast({
        title: "Horário atualizado",
        description: "Status do horário atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar horário",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/business-hours/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-hours"] });
      toast({
        title: "Horário removido",
        description: "Horário de funcionamento removido com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover horário",
        variant: "destructive",
      });
    },
  });

  const groupedHours = businessHours.reduce((acc, hour) => {
    if (!acc[hour.dayOfWeek]) {
      acc[hour.dayOfWeek] = [];
    }
    acc[hour.dayOfWeek].push(hour);
    return acc;
  }, {} as Record<number, BusinessHours[]>);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Adicionar Horário de Funcionamento</Label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select
                value={newHour.dayOfWeek.toString()}
                onValueChange={(value) => setNewHour({ ...newHour, dayOfWeek: parseInt(value) })}
              >
                <SelectTrigger data-testid="select-day-of-week">
                  <SelectValue placeholder="Dia da semana" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="time"
                value={newHour.startTime}
                onChange={(e) => setNewHour({ ...newHour, startTime: e.target.value })}
                data-testid="input-start-time"
              />

              <Input
                type="time"
                value={newHour.endTime}
                onChange={(e) => setNewHour({ ...newHour, endTime: e.target.value })}
                data-testid="input-end-time"
              />

              <Button
                onClick={() => createMutation.mutate(newHour)}
                disabled={createMutation.isPending}
                data-testid="button-add-business-hour"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando horários...</p>
        ) : businessHours.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum horário de funcionamento configurado</p>
                <p className="text-xs mt-1">Adicione os horários em que sua empresa funciona</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          DAYS_OF_WEEK.map((day) => {
            const dayHours = groupedHours[day.value] || [];
            if (dayHours.length === 0) return null;

            return (
              <Card key={day.value}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">{day.label}</Label>
                    <div className="space-y-2">
                      {dayHours.map((hour) => (
                        <div
                          key={hour.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                          data-testid={`business-hour-${hour.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">
                              {hour.startTime} - {hour.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`active-${hour.id}`} className="text-sm">
                                {hour.active ? "Ativo" : "Inativo"}
                              </Label>
                              <Switch
                                id={`active-${hour.id}`}
                                checked={hour.active}
                                onCheckedChange={(checked) =>
                                  updateMutation.mutate({ id: hour.id, active: checked })
                                }
                                data-testid={`switch-active-${hour.id}`}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(hour.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${hour.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
