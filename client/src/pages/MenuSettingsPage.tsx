import { useState, useEffect, useRef } from "react";
import { Upload, X, Copy, ExternalLink, Palette, Link as LinkIcon, Image, DollarSign, MapPin, Plus, Trash2, Edit2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Modal } from "@/components/ui/modal";

interface MenuSettings {
  menuSlug: string | null;
  menuLogoUrl: string | null;
  menuBrandColor: string;
  menuBannerUrl: string | null;
  minOrderValue: number | null;
}

interface DeliveryNeighborhood {
  id: string;
  name: string;
  deliveryFee: number;
  isActive: boolean;
}

export default function MenuSettingsPage() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [formData, setFormData] = useState({
    menuSlug: "",
    menuLogoUrl: "",
    menuBrandColor: "#ea7c3f",
    menuBannerUrl: "",
    minOrderValue: "",
  });
  const [neighborhoodModalOpen, setNeighborhoodModalOpen] = useState(false);
  const [editingNeighborhood, setEditingNeighborhood] = useState<DeliveryNeighborhood | null>(null);
  const [neighborhoodForm, setNeighborhoodForm] = useState({
    name: "",
    deliveryFee: "",
    isActive: true,
  });
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<MenuSettings>({
    queryKey: ["/api/menu-settings"],
  });

  const { data: neighborhoods = [], refetch: refetchNeighborhoods } = useQuery<DeliveryNeighborhood[]>({
    queryKey: ["/api/delivery-neighborhoods"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        menuSlug: settings.menuSlug || "",
        menuLogoUrl: settings.menuLogoUrl || "",
        menuBrandColor: settings.menuBrandColor || "#ea7c3f",
        menuBannerUrl: settings.menuBannerUrl || "",
        minOrderValue: settings.minOrderValue ? String(settings.minOrderValue) : "",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/menu-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações do cardápio foram atualizadas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createNeighborhoodMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/delivery-neighborhoods", data),
    onSuccess: () => {
      refetchNeighborhoods();
      setNeighborhoodModalOpen(false);
      setNeighborhoodForm({ name: "", deliveryFee: "", isActive: true });
      toast({ title: "Bairro adicionado", description: "O bairro foi adicionado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateNeighborhoodMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/delivery-neighborhoods/${id}`, data),
    onSuccess: () => {
      refetchNeighborhoods();
      setNeighborhoodModalOpen(false);
      setEditingNeighborhood(null);
      setNeighborhoodForm({ name: "", deliveryFee: "", isActive: true });
      toast({ title: "Bairro atualizado", description: "O bairro foi atualizado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteNeighborhoodMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/delivery-neighborhoods/${id}`),
    onSuccess: () => {
      refetchNeighborhoods();
      toast({ title: "Bairro excluído", description: "O bairro foi excluído com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    setUploadingLogo(true);
    try {
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formDataUpload,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer upload da imagem");
      }

      const { url } = await response.json();
      setFormData({ ...formData, menuLogoUrl: url });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    setUploadingBanner(true);
    try {
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formDataUpload,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer upload da imagem");
      }

      const { url } = await response.json();
      setFormData({ ...formData, menuBannerUrl: url });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, menuLogoUrl: "" });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleRemoveBanner = () => {
    setFormData({ ...formData, menuBannerUrl: "" });
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : null,
    });
  };

  const copyMenuUrl = () => {
    if (formData.menuSlug) {
      const url = `${window.location.origin}/menu/${formData.menuSlug}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "O link do cardápio foi copiado para a área de transferência.",
      });
    }
  };

  const openMenuPreview = () => {
    if (formData.menuSlug) {
      window.open(`/menu/${formData.menuSlug}`, "_blank");
    }
  };

  const openNeighborhoodModal = (neighborhood?: DeliveryNeighborhood) => {
    if (neighborhood) {
      setEditingNeighborhood(neighborhood);
      setNeighborhoodForm({
        name: neighborhood.name,
        deliveryFee: String(neighborhood.deliveryFee),
        isActive: neighborhood.isActive,
      });
    } else {
      setEditingNeighborhood(null);
      setNeighborhoodForm({ name: "", deliveryFee: "", isActive: true });
    }
    setNeighborhoodModalOpen(true);
  };

  const handleNeighborhoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: neighborhoodForm.name,
      deliveryFee: parseFloat(neighborhoodForm.deliveryFee),
      isActive: neighborhoodForm.isActive,
    };

    if (editingNeighborhood) {
      updateNeighborhoodMutation.mutate({ id: editingNeighborhood.id, data });
    } else {
      createNeighborhoodMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white" data-testid="text-page-title">
          Configurações do Cardápio
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Personalize seu cardápio público para seus clientes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Endereço do Cardápio
          </h2>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="menuSlug">Slug (endereço personalizado)</Label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center">
                  <span className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-300 dark:border-gray-700 rounded-l-lg text-sm text-gray-500">
                    /menu/
                  </span>
                  <Input
                    id="menuSlug"
                    value={formData.menuSlug}
                    onChange={(e) => setFormData({ ...formData, menuSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="meu-restaurante"
                    className="rounded-l-none"
                    data-testid="input-menu-slug"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use apenas letras minúsculas, números e hífens. Ex: minha-pizzaria
              </p>
            </div>

            {formData.menuSlug && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyMenuUrl}
                  data-testid="button-copy-url"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openMenuPreview}
                  data-testid="button-preview"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Logo do Cardápio
          </h2>
          
          <div className="flex items-start gap-4">
            {formData.menuLogoUrl ? (
              <div className="relative">
                <img
                  src={formData.menuLogoUrl}
                  alt="Logo"
                  className="w-32 h-32 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white"
                  data-testid="img-logo-preview"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  data-testid="button-remove-logo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-gray-400 text-sm text-center px-2">Sem logo</span>
              </div>
            )}
            <div className="flex-1">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                data-testid="input-logo-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                data-testid="button-upload-logo"
              >
                {uploadingLogo ? (
                  "Enviando..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.menuLogoUrl ? "Trocar Logo" : "Enviar Logo"}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Recomendado: Imagem quadrada, PNG com fundo transparente. Máx. 5MB.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Image className="h-5 w-5" />
            Banner Promocional
          </h2>
          
          <div className="space-y-4">
            {formData.menuBannerUrl ? (
              <div className="relative">
                <img
                  src={formData.menuBannerUrl}
                  alt="Banner"
                  className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  data-testid="img-banner-preview"
                />
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                  data-testid="button-remove-banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full h-40 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-gray-400 text-sm">Sem banner promocional</span>
              </div>
            )}
            <div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
                data-testid="input-banner-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                data-testid="button-upload-banner"
              >
                {uploadingBanner ? (
                  "Enviando..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.menuBannerUrl ? "Trocar Banner" : "Enviar Banner"}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Recomendado: Imagem 1200x400px. Aparece no topo do cardápio público.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Cor da Marca
          </h2>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="menuBrandColor">Cor Principal</Label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  id="menuBrandColor"
                  value={formData.menuBrandColor}
                  onChange={(e) => setFormData({ ...formData, menuBrandColor: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-700"
                  data-testid="input-brand-color"
                />
                <Input
                  type="text"
                  value={formData.menuBrandColor}
                  onChange={(e) => setFormData({ ...formData, menuBrandColor: e.target.value })}
                  placeholder="#ea7c3f"
                  className="max-w-[120px]"
                  data-testid="input-brand-color-hex"
                />
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: formData.menuBrandColor }}
                >
                  Preview
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Esta cor será usada no cabeçalho e nos botões do cardápio.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Valor Mínimo do Pedido
          </h2>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="minOrderValue">Valor Mínimo (R$)</Label>
              <Input
                id="minOrderValue"
                type="number"
                step={0.01}
                min="0"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                placeholder="0.00"
                className="max-w-[200px]"
                data-testid="input-min-order-value"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Deixe em branco para não exigir valor mínimo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-save"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Taxas de Entrega por Bairro
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure as taxas de entrega para cada bairro
            </p>
          </div>
          <Button
            type="button"
            onClick={() => openNeighborhoodModal()}
            data-testid="button-add-neighborhood"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Bairro
          </Button>
        </div>

        {neighborhoods.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhum bairro cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {neighborhoods.map((neighborhood) => (
              <div
                key={neighborhood.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  neighborhood.isActive 
                    ? 'border-gray-200 dark:border-gray-700' 
                    : 'border-gray-200 dark:border-gray-700 opacity-50'
                }`}
                data-testid={`row-neighborhood-${neighborhood.id}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-white">
                    {neighborhood.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Taxa: R$ {neighborhood.deliveryFee.toFixed(2)}
                    {!neighborhood.isActive && <span className="ml-2 text-red-500">(Inativo)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => openNeighborhoodModal(neighborhood)}
                    data-testid={`button-edit-neighborhood-${neighborhood.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNeighborhoodMutation.mutate(neighborhood.id)}
                    disabled={deleteNeighborhoodMutation.isPending}
                    data-testid={`button-delete-neighborhood-${neighborhood.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={neighborhoodModalOpen} onClose={() => setNeighborhoodModalOpen(false)}>
        <form onSubmit={handleNeighborhoodSubmit}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white" data-testid="text-neighborhood-modal-title">
              {editingNeighborhood ? "Editar Bairro" : "Novo Bairro"}
            </h3>
          </div>
          
          <div className="grid gap-4 px-6 pb-6">
            <div className="grid gap-2">
              <Label htmlFor="neighborhoodName">Nome do Bairro</Label>
              <Input
                id="neighborhoodName"
                value={neighborhoodForm.name}
                onChange={(e) => setNeighborhoodForm({ ...neighborhoodForm, name: e.target.value })}
                placeholder="Ex: Centro"
                data-testid="input-neighborhood-name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="neighborhoodFee">Taxa de Entrega (R$)</Label>
              <Input
                id="neighborhoodFee"
                type="number"
                step={0.01}
                min="0"
                value={neighborhoodForm.deliveryFee}
                onChange={(e) => setNeighborhoodForm({ ...neighborhoodForm, deliveryFee: e.target.value })}
                placeholder="0.00"
                data-testid="input-neighborhood-fee"
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="neighborhoodActive">Bairro Ativo</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bairros inativos não aparecem para seleção
                </p>
              </div>
              <Switch
                id="neighborhoodActive"
                checked={neighborhoodForm.isActive}
                onCheckedChange={(checked) => setNeighborhoodForm({ ...neighborhoodForm, isActive: checked })}
                data-testid="switch-neighborhood-active"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNeighborhoodModalOpen(false)}
              data-testid="button-cancel-neighborhood"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createNeighborhoodMutation.isPending || updateNeighborhoodMutation.isPending} 
              data-testid="button-submit-neighborhood"
            >
              {(createNeighborhoodMutation.isPending || updateNeighborhoodMutation.isPending) 
                ? "Salvando..." 
                : editingNeighborhood ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
