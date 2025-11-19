import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md mx-4 rounded-lg border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-dark">
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8 text-error-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">404 Página Não Encontrada</h1>
        </div>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Você esqueceu de adicionar essa página no roteador?
        </p>
      </div>
    </div>
  );
}
