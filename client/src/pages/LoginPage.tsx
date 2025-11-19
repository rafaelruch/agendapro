import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ThemeTogglerTwo from "@/components/ThemeTogglerTwo";

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
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {/* Left Side - Form (EXACT TailAdmin SignInForm) */}
        <div className="flex flex-col flex-1">
          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
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
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                        Usuário <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Digite seu usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
                        data-testid="input-username"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                        Senha <span className="text-error-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
                          data-testid="input-password"
                        />
                        <span
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                          {showPassword ? (
                            <Eye className="fill-gray-500 dark:fill-gray-400 size-5" />
                          ) : (
                            <EyeOff className="fill-gray-500 dark:fill-gray-400 size-5" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center space-x-3 group cursor-pointer">
                          <div className="relative w-5 h-5">
                            <input
                              type="checkbox"
                              className="w-5 h-5 appearance-none cursor-pointer dark:border-gray-700 border border-gray-300 checked:border-transparent rounded-md checked:bg-brand-500"
                              checked={keepLoggedIn}
                              onChange={(e) => setKeepLoggedIn(e.target.checked)}
                              data-testid="checkbox-keep-logged-in"
                            />
                            {keepLoggedIn && (
                              <svg
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none top-1/2 left-1/2"
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                                  stroke="white"
                                  strokeWidth="1.94437"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        </label>
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
                        className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                        data-testid="button-forgot-password"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-lg transition w-full px-4 py-3 text-sm bg-brand-500 text-white shadow-sm hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? "Entrando..." : "Entrar"}
                      </button>
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
                      className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
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

        {/* Right Side - Brand Section (EXACT TailAdmin AuthLayout) */}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid relative overflow-hidden">
          {/* Background Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20 dark:opacity-10"
            style={{
              backgroundImage: 'url(/images/shape/grid-01.svg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative flex items-center justify-center z-1">
            <div className="flex flex-col items-center max-w-xs">
              {/* Logo Textual - Calendar Icon + AgendaPro v1.0 */}
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-brand-500 rounded-2xl">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">AgendaPro</span>
                  <span className="text-sm font-medium text-gray-400">v1.0</span>
                </div>
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60">
                Sistema de gerenciamento de clínicas integradas com Agentes de IA
              </p>
            </div>
          </div>
        </div>

        {/* Theme Toggle - EXACT TailAdmin ThemeTogglerTwo */}
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
