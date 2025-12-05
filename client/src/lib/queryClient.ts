import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { showGlobalToast } from "@/context/ToastContext";

let lastUnauthorizedRedirect = 0;

function isTenantRequiredError(text: string): boolean {
  try {
    const json = JSON.parse(text);
    const errorMsg = json.error || json.message || "";
    return errorMsg.includes("tenantId") || 
           errorMsg.includes("Master admin deve especificar") ||
           errorMsg.includes("Tenant ID");
  } catch {
    return text.includes("tenantId") || text.includes("Master admin");
  }
}

function handleUnauthorized(responseText?: string) {
  if (responseText && isTenantRequiredError(responseText)) {
    return;
  }
  
  const now = Date.now();
  if (now - lastUnauthorizedRedirect < 3000) {
    return;
  }
  lastUnauthorizedRedirect = now;
  
  showGlobalToast({
    title: "Sessão expirada",
    message: "Faça login novamente para continuar.",
    variant: "warning",
    duration: 4000,
  });
  
  setTimeout(() => {
    window.location.href = "/login";
  }, 1500);
}

function parseErrorMessage(text: string): { title: string; message: string; variant: "error" | "warning" } {
  try {
    const json = JSON.parse(text);
    const errorMsg = json.error || json.message || text;
    
    if (errorMsg.includes("já cadastrado") || errorMsg.includes("já existe") || errorMsg.includes("duplicado")) {
      return { title: "Registro duplicado", message: errorMsg, variant: "warning" };
    }
    if (errorMsg.includes("obrigatório") || errorMsg.includes("required") || errorMsg.includes("faltando")) {
      return { title: "Campo obrigatório", message: errorMsg, variant: "warning" };
    }
    if (errorMsg.includes("inválido") || errorMsg.includes("invalid")) {
      return { title: "Dados inválidos", message: errorMsg, variant: "warning" };
    }
    if (errorMsg.includes("Conflito") || errorMsg.includes("conflict")) {
      return { title: "Conflito de horário", message: errorMsg, variant: "warning" };
    }
    
    return { title: "Erro", message: errorMsg, variant: "error" };
  } catch {
    return { title: "Erro", message: text, variant: "error" };
  }
}

async function throwIfResNotOk(res: Response, showToast = true) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    if (res.status === 401) {
      handleUnauthorized(text);
      throw new Error("401: Sessão expirada");
    }
    
    if (showToast && res.status >= 400) {
      const { title, message, variant } = parseErrorMessage(text);
      showGlobalToast({ title, message, variant });
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { showToast?: boolean }
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res, options?.showToast ?? true);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const queryPath = queryKey.join("/") as string;
    const res = await fetch(queryPath, {
      credentials: "include",
    });

    if (res.status === 401) {
      const text = await res.clone().text();
      
      if (unauthorizedBehavior === "returnNull") {
        const isAuthCheck = queryPath.includes("/api/auth/me") || queryPath.includes("/api/setup/status");
        if (!isAuthCheck) {
          handleUnauthorized(text);
        }
        return null;
      }
      handleUnauthorized(text);
      throw new Error("401: Sessão expirada");
    }

    await throwIfResNotOk(res, true);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
