import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { ServiceSearchMultiSelect } from "./ServiceSearchMultiSelect";

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface Professional {
  id: string;
  name: string;
  active: boolean;
  serviceIds: string[];
  schedules: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

interface Service {
  id: string;
  name: string;
  category: string;
  value: string;
  duration: number;
}

interface ProfessionalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional: Professional | null;
  services: Service[];
  onSave: (data: any) => void;
}

interface ScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function ProfessionalDialog({
  open,
  onOpenChange,
  professional,
  services,
  onSave,
}: ProfessionalDialogProps) {
  const [name, setName] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    if (open) {
      if (professional) {
        setName(professional.name);
        setServiceIds(professional.serviceIds);
        setSchedules(professional.schedules.length > 0 ? professional.schedules : []);
      } else {
        setName("");
        setServiceIds([]);
        setSchedules([]);
      }
    }
  }, [open, professional]);

  const handleAddSchedule = () => {
    setSchedules([
      ...schedules,
      {
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "18:00",
      },
    ]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index: number, field: keyof ScheduleEntry, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index] = {
      ...newSchedules[index],
      [field]: value,
    };
    setSchedules(newSchedules);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Por favor, informe o nome do profissional.");
      return;
    }

    if (serviceIds.length === 0) {
      alert("Por favor, selecione pelo menos um serviço.");
      return;
    }

    if (schedules.length === 0) {
      alert("Por favor, adicione pelo menos um horário de atendimento.");
      return;
    }

    for (const schedule of schedules) {
      if (schedule.startTime >= schedule.endTime) {
        alert("O horário de início deve ser menor que o horário de término.");
        return;
      }
    }

    onSave({
      name: name.trim(),
      serviceIds,
      schedules,
      active: true,
    });
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {professional ? "Editar Profissional" : "Novo Profissional"}
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha as informações do profissional abaixo.
          </p>
        </div>

        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5 max-h-[60vh] overflow-y-auto">
          {/* Nome */}
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Profissional</Label>
            <Input
              id="name"
              type="text"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-professional-name"
              required
            />
          </div>

          {/* Serviços */}
          <div className="grid gap-2">
            <ServiceSearchMultiSelect
              services={services}
              selected={serviceIds}
              onChange={setServiceIds}
              label="Serviços que realiza"
              placeholder="Digite para buscar e selecionar serviços..."
            />
          </div>

          {/* Horários */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Horários de Atendimento</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddSchedule}
                data-testid="button-add-schedule"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Horário
              </Button>
            </div>

            {schedules.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border-2 border-dashed rounded-lg">
                Nenhum horário adicionado. Clique em "Adicionar Horário" para começar.
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule, index) => (
                  <div
                    key={index}
                    className="flex items-end gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    data-testid={`schedule-entry-${index}`}
                  >
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {/* Dia da Semana */}
                      <div className="grid gap-1">
                        <Label className="text-xs">Dia</Label>
                        <select
                          value={schedule.dayOfWeek}
                          onChange={(e) =>
                            handleScheduleChange(index, "dayOfWeek", parseInt(e.target.value))
                          }
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 px-3 text-sm outline-none transition focus:border-brand-500 dark:focus:border-brand-400"
                          data-testid={`select-day-${index}`}
                        >
                          {WEEKDAY_NAMES.map((day, i) => (
                            <option key={i} value={i}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Horário Início */}
                      <div className="grid gap-1">
                        <Label className="text-xs">Início</Label>
                        <Input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) =>
                            handleScheduleChange(index, "startTime", e.target.value)
                          }
                          data-testid={`input-start-time-${index}`}
                        />
                      </div>

                      {/* Horário Término */}
                      <div className="grid gap-1">
                        <Label className="text-xs">Término</Label>
                        <Input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) =>
                            handleScheduleChange(index, "endTime", e.target.value)
                          }
                          data-testid={`input-end-time-${index}`}
                        />
                      </div>
                    </div>

                    {/* Botão Remover */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveSchedule(index)}
                      data-testid={`button-remove-schedule-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4 sm:px-9.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button type="submit" data-testid="button-save">
            {professional ? "Atualizar" : "Criar"} Profissional
          </Button>
        </div>
      </form>
    </Modal>
  );
}
