import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, CalendarDays } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
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
    <div className="relative p-6 bg-white dark:bg-gray-900 z-1 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {/* Left Side - Form */}
        <div className="flex flex-col flex-1">
          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md text-2xl sm:text-3xl">
                  Entrar
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Digite seu usuário e senha para entrar!
                </p>
              </div>
              <div>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Usuário <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Digite seu usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1.5"
                        data-testid="input-username"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Senha <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          data-testid="input-password"
                        />
                        <span
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                          {showPassword ? (
                            <Eye className="size-5 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <EyeOff className="size-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={keepLoggedIn}
                          onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                          data-testid="checkbox-keep-logged-in"
                        />
                        <span className="block text-sm font-normal text-gray-700 dark:text-gray-400">
                          Manter conectado
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          toast({
                            title: "Recuperação de senha",
                            description: "Entre em contato com o administrador",
                          });
                        }}
                        className="text-sm text-primary hover:text-primary/80"
                        data-testid="button-forgot-password"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div>
                      <Button
                        type="submit"
                        className="w-full"
                        size="default"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? "Entrando..." : "Entrar"}
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="mt-5">
                  <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                    Não tem uma conta?{" "}
                    <a
                      href="https://wa.me/5562996918770?text=Quero%20o%20sistema%20de%20agendamento%20para%20o%20meu%20neg%C3%B3cio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                      data-testid="link-whatsapp-admin"
                    >
                      Fale com o administrador
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Brand Section */}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-primary dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                }}
              />
            </div>
            <div className="relative flex flex-col items-center max-w-xs z-10">
              <Link href="/" className="block mb-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-12 h-12 text-primary-foreground" />
                  <span className="text-3xl font-bold text-primary-foreground">
                    AgendaPro
                  </span>
                </div>
              </Link>
              <p className="text-center text-primary-foreground/80">
                Sistema de Gerenciamento de Agendas Multi-Tenant
              </p>
            </div>
          </div>
        </div>
        
        {/* Theme Toggle - Fixed Bottom Right */}
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
