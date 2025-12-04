import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza texto removendo acentos e convertendo para minúsculas.
 * Útil para buscas accent-insensitive.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Formata um valor numérico para exibição em formato brasileiro (R$ 1.234,56)
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";
  return numValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata um valor numérico para exibição completa com símbolo (R$ 1.234,56)
 */
export function formatCurrencyDisplay(value: number | string | null | undefined): string {
  const formatted = formatCurrency(value);
  return formatted ? `R$ ${formatted}` : "";
}

/**
 * Converte uma string formatada em moeda brasileira para número
 * Ex: "1.234,56" -> 1234.56
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.replace(/[^\d,.-]/g, "");
  // Substitui vírgula por ponto para formato numérico
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Aplica máscara de moeda brasileira enquanto o usuário digita
 * Aceita apenas números e formata automaticamente com centavos
 */
export function maskCurrency(value: string): string {
  // Remove tudo que não é número
  let numbers = value.replace(/\D/g, "");
  
  // Se vazio, retorna vazio
  if (!numbers) return "";
  
  // Limita a 12 dígitos (até 999.999.999,99)
  numbers = numbers.slice(0, 12);
  
  // Converte para centavos e depois para reais
  const cents = parseInt(numbers, 10);
  const reais = cents / 100;
  
  // Formata com separadores brasileiros
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
