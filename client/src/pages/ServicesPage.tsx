import { useState, useRef } from "react";
import { Plus, Search, Download, Upload, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ServiceDialog } from "@/components/ServiceDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@shared/schema";
import { getServiceEffectiveValue, isServiceInPromotion } from "@shared/schema";

export default function ServicesPage() {
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowServiceDialog(false);
      setEditingService(null);
      toast({
        title: "Serviço criado",
        description: "O serviço foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowServiceDialog(false);
      setEditingService(null);
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço excluído",
        description: "O serviço foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importServicesMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/services/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao importar serviços');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      const message = data.errors > 0 
        ? `${data.imported} serviços importados com sucesso. ${data.errors} erros encontrados.`
        : `${data.imported} serviços importados com sucesso!`;
      
      toast({
        title: "Importação concluída",
        description: message,
        variant: data.errors > 0 ? "destructive" : "default",
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao importar serviços",
        description: error.message,
        variant: "destructive",
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/services/template', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao baixar modelo');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo-servicos.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Modelo baixado",
        description: "O modelo CSV foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao baixar modelo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        });
        return;
      }
      importServicesMutation.mutate(file);
    }
  };

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
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
          <h1 className="text-3xl font-semibold text-black dark:text-white">Serviços</h1>
          <p className="text-bodydark2">Gerencie os serviços oferecidos</p>
        </div>
        <Button onClick={() => {
          setEditingService(null);
          setShowServiceDialog(true);
        }} data-testid="button-new-service">
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Search Bar & Import Buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
          <Input
            placeholder="Buscar serviços por nome..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="pl-12"
            data-testid="input-search-services"
          />
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-csv-file"
          />
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            data-testid="button-download-template"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Modelo
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importServicesMutation.isPending}
            data-testid="button-import-csv"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importServicesMutation.isPending ? "Importando..." : "Importar CSV"}
          </Button>
        </div>
      </div>

      {/* TailAdmin DataTable */}
      {filteredServices.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="text-bodydark2 mb-4">
            {searchQuery ? "Nenhum serviço encontrado para sua busca." : "Nenhum serviço cadastrado."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowServiceDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Serviço
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                {/* Table Header */}
                <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                  <tr>
                    <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Serviço
                    </TableHead>
                    <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Duração
                    </TableHead>
                    <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Preço
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
                  {paginatedServices.map((service) => {
                    const inPromotion = isServiceInPromotion(service);
                    const effectiveValue = getServiceEffectiveValue(service);

                    return (
                      <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {service.name}
                            </span>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                              {service.category}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {service.duration} min
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div>
                            {inPromotion && (
                              <span className="block text-xs text-gray-400 line-through dark:text-gray-500">
                                {formatCurrency(service.value)}
                              </span>
                            )}
                            <span className={`block text-theme-sm ${inPromotion ? 'text-meta-3 font-semibold dark:text-green-400' : 'text-gray-800 dark:text-white/90'}`}>
                              {formatCurrency(String(effectiveValue))}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          {inPromotion ? (
                            <Badge variant="default" className="bg-meta-3 text-xs">
                              Promoção
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">
                              Ativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingService(service);
                                setShowServiceDialog(true);
                              }}
                              data-testid={`button-edit-service-${service.id}`}
                              className="hover-elevate"
                            >
                              <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const confirmed = confirm(`Tem certeza que deseja excluir ${service.name}?`);
                                if (!confirmed) return;
                                deleteServiceMutation.mutate(service.id);
                              }}
                              data-testid={`button-delete-service-${service.id}`}
                              className="hover-elevate"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Próxima
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredServices.length)}</span> de{' '}
                    <span className="font-medium">{filteredServices.length}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="rounded-r-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="rounded-l-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ServiceDialog
        open={showServiceDialog}
        onOpenChange={(open) => {
          setShowServiceDialog(open);
          if (!open) setEditingService(null);
        }}
        initialData={editingService}
        onSave={(data) => {
          if (editingService) {
            updateServiceMutation.mutate({ id: editingService.id, data });
          } else {
            createServiceMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
