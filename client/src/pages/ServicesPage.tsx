import { useState, useRef } from "react";
import { Plus, Search, MoreVertical, Download, Upload } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServiceDialog } from "@/components/ServiceDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@shared/schema";
import { getServiceEffectiveValue, isServiceInPromotion } from "@shared/schema";

export default function ServicesPage() {
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Serviços</h1>
        <p className="text-muted-foreground">
          Gerencie os serviços oferecidos
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
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
          <Button
            onClick={() => {
              setEditingService(null);
              setShowServiceDialog(true);
            }}
            data-testid="button-new-service"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Carregando serviços...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
          <p className="text-muted-foreground">
            {searchQuery
              ? "Nenhum serviço encontrado."
              : "Nenhum serviço cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => {
                const inPromotion = isServiceInPromotion(service);
                const effectiveValue = getServiceEffectiveValue(service);
                return (
                  <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {service.name}
                        {inPromotion && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Promoção
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>
                      <div>
                        {inPromotion && (
                          <span className="text-xs text-muted-foreground line-through block">
                            {formatCurrency(service.value)}
                          </span>
                        )}
                        <span className={inPromotion ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                          {formatCurrency(String(effectiveValue))}
                        </span>
                      </div>
                    </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-service-menu-${service.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingService(service);
                            setShowServiceDialog(true);
                          }}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (
                              confirm(
                                `Tem certeza que deseja excluir ${service.name}?`
                              )
                            ) {
                              deleteServiceMutation.mutate(service.id);
                            }
                          }}
                          className="text-destructive"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
