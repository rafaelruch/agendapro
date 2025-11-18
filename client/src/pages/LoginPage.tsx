import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarDays, User, Lock } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate("/");
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao AgendaPro!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Usuário não encontrado ou inativo",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha usuário e senha",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Brand Section (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-primary-foreground">
          <div className="flex items-center gap-4 mb-6">
            <CalendarDays className="w-16 h-16" />
            <h1 className="text-5xl font-bold">AgendaPro</h1>
          </div>
          <p className="text-xl text-center max-w-md opacity-90">
            Sistema de Gerenciamento de Agendas Multi-Tenant
          </p>
          <div className="mt-12 space-y-4 max-w-md">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-foreground mt-2" />
              <p className="text-lg opacity-90">Gerencie seus agendamentos de forma eficiente</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-foreground mt-2" />
              <p className="text-lg opacity-90">Controle completo de clientes e serviços</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-foreground mt-2" />
              <p className="text-lg opacity-90">Relatórios e análises em tempo real</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <CalendarDays className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">AgendaPro</h1>
          </div>

          <Card className="border-border shadow-lg">
            <CardContent className="pt-8 pb-8 px-6 sm:px-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground">
                  Digite suas credenciais para acessar sua conta
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Usuário
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Digite seu usuário"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      data-testid="input-username"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      data-testid="input-password"
                    />
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      data-testid="checkbox-remember"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Lembrar-me
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => {
                      toast({
                        title: "Recuperação de senha",
                        description: "Entre em contato com o administrador do sistema",
                      });
                    }}
                    data-testid="button-forgot-password"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {/* Footer Note */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => {
                      toast({
                        title: "Criar conta",
                        description: "Entre em contato com o administrador para criar uma conta",
                      });
                    }}
                    data-testid="button-signup"
                  >
                    Fale com o administrador
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Copyright */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AgendaPro. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
