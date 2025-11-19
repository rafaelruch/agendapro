import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, CalendarDays } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Theme Toggle - Fixed Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 dark:bg-brand-400/10">
            <CalendarDays className="h-8 w-8 text-brand-500 dark:text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Entrar no AgendaPro
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Digite seu usuário e senha para acessar
          </p>
        </div>

        {/* Sign In Form */}
        <div className="rounded-lg bg-white dark:bg-gray-800 p-8 shadow-lg border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="mb-2.5 block text-sm font-medium text-gray-900 dark:text-white"
              >
                Usuário
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:border-brand-500 dark:focus:border-brand-400"
                required
                autoFocus
                data-testid="input-username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="mb-2.5 block text-sm font-medium text-gray-900 dark:text-white"
              >
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 pr-12 text-gray-900 dark:text-white focus:border-brand-500 dark:focus:border-brand-400"
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                  data-testid="checkbox-remember"
                />
                <label
                  htmlFor="remember"
                  className="ml-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  Lembrar de mim
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  toast({
                    title: "Recuperação de senha",
                    description: "Entre em contato com o administrador",
                  });
                }}
                className="text-sm text-brand-600 hover:underline dark:text-brand-400"
                data-testid="link-forgot-password"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-lg bg-brand-600 dark:bg-brand-500 px-4 py-3 font-medium text-white hover:bg-brand-700 dark:hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-300 dark:focus:ring-brand-800"
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Não tem uma conta?{" "}
            <a
              href="https://wa.me/5562996918770?text=Quero%20o%20sistema%20de%20agendamento%20para%20o%20meu%20neg%C3%B3cio"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              data-testid="link-whatsapp-admin"
            >
              Fale com o administrador
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          © 2024 AgendaPro. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
