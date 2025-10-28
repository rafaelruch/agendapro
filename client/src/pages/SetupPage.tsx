import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Database, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const setupSchema = z.object({
  username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres"),
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
  });

  const onSubmit = async (data: SetupFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao configurar aplicação");
      }

      setSetupComplete(true);
      toast({
        title: "Instalação concluída!",
        description: "O sistema foi configurado com sucesso. Redirecionando...",
      });

      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erro na instalação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Instalação Concluída!</CardTitle>
            <CardDescription>
              O AgendaPro foi configurado com sucesso. Você será redirecionado para a tela de login.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Database className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">Instalação do AgendaPro</CardTitle>
          <CardDescription>
            Configure o sistema criando o primeiro usuário administrador master
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> O usuário master tem acesso total ao sistema, incluindo gerenciamento de todos os tenants e configurações.
              Guarde as credenciais em local seguro.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Dados do Administrador Master</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário *</Label>
                  <Input
                    id="username"
                    {...register("username")}
                    placeholder="admin"
                    data-testid="input-setup-username"
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Administrador do Sistema"
                    data-testid="input-setup-name"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="admin@empresa.com"
                  data-testid="input-setup-email"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="••••••••"
                    data-testid="input-setup-password"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                    placeholder="••••••••"
                    data-testid="input-setup-confirm-password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
                data-testid="button-setup-submit"
              >
                {isSubmitting ? "Instalando..." : "Instalar AgendaPro"}
              </Button>
            </div>
          </form>

          <Alert className="mt-6">
            <AlertDescription className="text-sm">
              <p className="font-semibold mb-2">Requisitos do Sistema:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Banco de dados PostgreSQL configurado</li>
                <li>Variável DATABASE_URL definida corretamente</li>
                <li>Conexão de rede funcionando</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
