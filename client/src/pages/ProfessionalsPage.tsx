import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProfessionalDialog } from "@/components/ProfessionalDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Professional {
  id: string;
  tenantId: string;
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
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ProfessionalsPage() {
  const [showProfessionalDialog, setShowProfessionalDialog] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const { data: professionals = [], isLoading } = useQuery<Professional[]>({
    queryKey: ["/api/professionals"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createProfessionalMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/professionals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      setShowProfessionalDialog(false);
      setEditingProfessional(null);
      toast({
        title: "Profissional criado",
        description: "O profissional foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar profissional",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfessionalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/professionals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      setShowProfessionalDialog(false);
      setEditingProfessional(null);
      toast({
        title: "Profissional atualizado",
        description: "O profissional foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar profissional",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProfessionalMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/professionals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Profissional excluído",
        description: "O profissional foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir profissional",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredProfessionals = professionals.filter((professional) =>
    professional.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProfessionals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProfessionals = filteredProfessionals.slice(startIndex, startIndex + itemsPerPage);

  const handleSaveProfessional = (data: any) => {
    if (editingProfessional) {
      updateProfessionalMutation.mutate({ id: editingProfessional.id, data });
    } else {
      createProfessionalMutation.mutate(data);
    }
  };

  const handleDeleteProfessional = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o profissional "${name}"?`)) {
      deleteProfessionalMutation.mutate(id);
    }
  };

  const getServiceNames = (serviceIds: string[]) => {
    return serviceIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Nenhum serviço';
  };

  const getScheduleSummary = (schedules: Professional['schedules']) => {
    if (schedules.length === 0) return 'Sem horários';
    
    const groupedByDay = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push(`${schedule.startTime}-${schedule.endTime}`);
      return acc;
    }, {} as Record<number, string[]>);

    const days = Object.keys(groupedByDay).map(Number).sort();
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    
    const isConsecutive = days.every((day, i) => i === 0 || day === days[i - 1] + 1);
    
    if (days.length === 1) {
      return WEEKDAY_NAMES[firstDay];
    } else if (isConsecutive && days.length >= 3) {
      return `${WEEKDAY_NAMES[firstDay]}-${WEEKDAY_NAMES[lastDay]}`;
    } else {
      return days.map(d => WEEKDAY_NAMES[d]).join(', ');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-bodydark2">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black dark:text-white">Profissionais</h1>
          <p className="text-bodydark2">Gerencie os profissionais da sua empresa</p>
        </div>
        <Button 
          onClick={() => {
            setEditingProfessional(null);
            setShowProfessionalDialog(true);
          }} 
          data-testid="button-new-professional"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Profissional
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bodydark2" />
          <Input
            type="text"
            placeholder="Buscar profissional por nome..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
            data-testid="input-search-professional"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <Table>
          <TableHead>
            <TableRow>
              <th className="px-4 py-4 text-left font-medium text-black dark:text-white">
                Nome
              </th>
              <th className="px-4 py-4 text-left font-medium text-black dark:text-white">
                Serviços
              </th>
              <th className="px-4 py-4 text-left font-medium text-black dark:text-white">
                Dias de Atendimento
              </th>
              <th className="px-4 py-4 text-left font-medium text-black dark:text-white">
                Status
              </th>
              <th className="px-4 py-4 text-center font-medium text-black dark:text-white">
                Ações
              </th>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProfessionals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-bodydark2">
                  {searchQuery ? "Nenhum profissional encontrado." : "Nenhum profissional cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedProfessionals.map((professional) => (
                <TableRow key={professional.id} data-testid={`row-professional-${professional.id}`}>
                  <TableCell className="px-4 py-4">
                    <p className="text-black dark:text-white font-medium">
                      {professional.name}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <p className="text-sm text-bodydark2">
                      {professional.serviceIds.length} serviço(s)
                    </p>
                    <p className="text-xs text-bodydark2 mt-0.5 truncate max-w-xs" title={getServiceNames(professional.serviceIds)}>
                      {getServiceNames(professional.serviceIds)}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <p className="text-sm text-bodydark2">
                      {getScheduleSummary(professional.schedules)}
                    </p>
                    <p className="text-xs text-bodydark2 mt-0.5">
                      {professional.schedules.length} período(s)
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge variant={professional.active ? "success" : "secondary"}>
                      {professional.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingProfessional(professional);
                          setShowProfessionalDialog(true);
                        }}
                        data-testid={`button-edit-professional-${professional.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProfessional(professional.id, professional.name)}
                        data-testid={`button-delete-professional-${professional.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stroke px-4 py-4 dark:border-strokedark">
            <p className="text-sm text-bodydark2">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredProfessionals.length)} de {filteredProfessionals.length} profissionais
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                Anterior
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      <ProfessionalDialog
        open={showProfessionalDialog}
        onOpenChange={setShowProfessionalDialog}
        professional={editingProfessional}
        services={services}
        onSave={handleSaveProfessional}
      />
    </div>
  );
}
