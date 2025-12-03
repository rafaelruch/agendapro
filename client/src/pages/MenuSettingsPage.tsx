import { useState, useEffect, useRef } from "react";
import { Upload, X, Copy, ExternalLink, Palette, Link as LinkIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MenuSettings {
  menuSlug: string | null;
  menuLogoUrl: string | null;
  menuBrandColor: string;
}

export default function MenuSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    menuSlug: "",
    menuLogoUrl: "",
    menuBrandColor: "#ea7c3f",
  });
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<MenuSettings>({
    queryKey: ["/api/menu-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        menuSlug: settings.menuSlug || "",
        menuLogoUrl: settings.menuLogoUrl || "",
        menuBrandColor: settings.menuBrandColor || "#ea7c3f",
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    setUploading(true);
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
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, menuLogoUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
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
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                data-testid="input-logo-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="button-upload-logo"
              >
                {uploading ? (
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
    </div>
  );
}
