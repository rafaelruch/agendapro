import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow, TableHead } from "@/components/ui/table";
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
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
        <Input
          placeholder="Buscar profissional por nome..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-12"
          data-testid="input-search-professional"
        />
      </div>

      {/* TailAdmin DataTable */}
      {filteredProfessionals.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="text-bodydark2 mb-4">
            {searchQuery ? "Nenhum profissional encontrado para sua busca." : "Nenhum profissional cadastrado."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowProfessionalDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Profissional
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              {/* Table Header */}
              <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                <tr>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Nome
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Serviços
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Status
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                    Ações
                  </TableHead>
                </tr>
              </thead>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedProfessionals.map((professional) => (
                  <TableRow key={professional.id} data-testid={`row-professional-${professional.id}`}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {professional.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {professional.serviceIds.length} serviço(s)
                      <span className="block text-gray-500 text-theme-xs dark:text-gray-400 truncate max-w-xs" title={getServiceNames(professional.serviceIds)}>
                        {getServiceNames(professional.serviceIds)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <Badge variant="default" className="text-xs">
                        {professional.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProfessional(professional);
                            setShowProfessionalDialog(true);
                          }}
                          data-testid={`button-edit-professional-${professional.id}`}
                          className="hover-elevate"
                        >
                          <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProfessional(professional.id, professional.name)}
                          data-testid={`button-delete-professional-${professional.id}`}
                          className="hover-elevate"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, filteredProfessionals.length)} de {filteredProfessionals.length} profissionais
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "ghost"}
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                      className="min-w-[36px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
