import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  Search,
  Filter,
  Calendar,
  Tag,
  Receipt,
  PiggyBank,
  CreditCard,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  PAYMENT_METHODS, 
  PAYMENT_METHOD_LABELS,
  type FinanceCategory,
  type FinancialTransaction,
  type PaymentMethod
} from "@shared/schema";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  incomeByPaymentMethod: Record<string, number>;
  expenseByCategory: Record<string, number>;
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "categories">("transactions");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    categoryId: "",
    paymentMethod: "" as PaymentMethod | "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const [incomeForm, setIncomeForm] = useState({
    description: "",
    amount: "",
    categoryId: "",
    paymentMethod: "" as PaymentMethod | "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "expense" as "income" | "expense",
  });

  const { toast } = useToast();

  const { data: summary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/finance/summary", dateRange.startDate, dateRange.endDate],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/finance/transactions", { 
      startDate: dateRange.startDate, 
      endDate: dateRange.endDate,
      type: typeFilter !== "all" ? typeFilter : undefined,
      paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
    }],
  });

  const { data: categories = [] } = useQuery<FinanceCategory[]>({
    queryKey: ["/api/finance/categories"],
  });

  const expenseCategories = categories.filter(c => c.type === "expense");
  const incomeCategories = categories.filter(c => c.type === "income");

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      setExpenseDialogOpen(false);
      resetExpenseForm();
      toast({ title: "Despesa registrada", description: "A despesa foi registrada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const createIncomeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/incomes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      setIncomeDialogOpen(false);
      resetIncomeForm();
      toast({ title: "Receita registrada", description: "A receita foi registrada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/categories"] });
      setCategoryDialogOpen(false);
      setCategoryForm({ name: "", type: "expense" });
      toast({ title: "Categoria criada", description: "A categoria foi criada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/categories"] });
      toast({ title: "Categoria excluída", description: "A categoria foi excluída com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({ title: "Transação excluída", description: "A transação foi excluída com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resetExpenseForm = () => {
    setExpenseForm({
      description: "",
      amount: "",
      categoryId: "",
      paymentMethod: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const resetIncomeForm = () => {
    setIncomeForm({
      description: "",
      amount: "",
      categoryId: "",
      paymentMethod: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const handleExpenseSubmit = () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.paymentMethod) return;
    createExpenseMutation.mutate({
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      categoryId: expenseForm.categoryId || undefined,
      paymentMethod: expenseForm.paymentMethod,
      date: expenseForm.date,
      notes: expenseForm.notes || undefined,
    });
  };

  const handleIncomeSubmit = () => {
    if (!incomeForm.description || !incomeForm.amount || !incomeForm.paymentMethod) return;
    createIncomeMutation.mutate({
      description: incomeForm.description,
      amount: parseFloat(incomeForm.amount),
      categoryId: incomeForm.categoryId || undefined,
      paymentMethod: incomeForm.paymentMethod,
      date: incomeForm.date,
      notes: incomeForm.notes || undefined,
    });
  };

  const handleCategorySubmit = () => {
    if (!categoryForm.name) return;
    createCategoryMutation.mutate(categoryForm);
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || "-";
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (searchQuery) {
      return tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white" data-testid="text-page-title">
            Financeiro
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Acompanhe suas receitas e despesas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setExpenseDialogOpen(true)}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            data-testid="button-new-expense"
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
          <Button 
            onClick={() => setIncomeDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-new-income"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Nova Receita
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receitas</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-income">
                {summaryLoading ? "..." : formatCurrency(summary?.totalIncome || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Despesas</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-expenses">
                {summaryLoading ? "..." : formatCurrency(summary?.totalExpenses || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
              (summary?.balance || 0) >= 0 
                ? "bg-primary/10" 
                : "bg-red-100 dark:bg-red-900/20"
            }`}>
              <Wallet className={`h-6 w-6 ${
                (summary?.balance || 0) >= 0 
                  ? "text-primary" 
                  : "text-red-600 dark:text-red-400"
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
              <p className={`text-xl font-bold ${
                (summary?.balance || 0) >= 0 
                  ? "text-primary" 
                  : "text-red-600 dark:text-red-400"
              }`} data-testid="text-balance">
                {summaryLoading ? "..." : formatCurrency(summary?.balance || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de Data */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Label className="text-sm">Período:</Label>
        </div>
        <Input
          type="date"
          value={dateRange.startDate}
          onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          className="w-40"
          data-testid="input-start-date"
        />
        <span className="text-gray-500">até</span>
        <Input
          type="date"
          value={dateRange.endDate}
          onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          className="w-40"
          data-testid="input-end-date"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "transactions"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          data-testid="tab-transactions"
        >
          <Receipt className="h-4 w-4 inline mr-2" />
          Transações
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          data-testid="tab-categories"
        >
          <Tag className="h-4 w-4 inline mr-2" />
          Categorias
        </button>
      </div>

      {activeTab === "transactions" && (
        <>
          {/* Filtros de Transações */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
                <Input
                  type="text"
                  placeholder="Buscar transação..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-12"
                  data-testid="input-search"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-payment-filter">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredTransactions.length} transação(ões)
            </div>
          </div>

          {/* Tabela de Transações */}
          {transactionsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
              <PiggyBank className="mx-auto h-12 w-12 text-bodydark2 mb-4" />
              <p className="text-bodydark2 mb-4">
                {searchQuery || typeFilter !== "all" || paymentMethodFilter !== "all"
                  ? "Nenhuma transação encontrada com os filtros aplicados."
                  : "Nenhuma transação registrada neste período."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Data
                        </TableHead>
                        <TableHead className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Descrição
                        </TableHead>
                        <TableHead className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Categoria
                        </TableHead>
                        <TableHead className="px-4 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                          Pagamento
                        </TableHead>
                        <TableHead className="px-4 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">
                          Valor
                        </TableHead>
                        <TableHead className="px-4 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                          <TableCell className="px-5 py-4 sm:px-6 text-start">
                            <span className="text-gray-800 text-theme-sm dark:text-white/90">
                              {formatDate(tx.date)}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-start">
                            <div>
                              <p className="text-gray-800 text-theme-sm dark:text-white/90">
                                {tx.description}
                              </p>
                              {tx.source !== "manual" && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {tx.source === "order" ? "Pedido" : "Agendamento"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-start">
                            <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                              {getCategoryName(tx.categoryId)}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <Badge variant="secondary">
                              {PAYMENT_METHOD_LABELS[tx.paymentMethod as PaymentMethod] || tx.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-end">
                            <span className={`text-theme-sm font-medium ${
                              tx.type === "income" 
                                ? "text-green-600 dark:text-green-400" 
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {tx.type === "income" ? "+" : "-"}
                              {formatCurrency(tx.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            {tx.source === "manual" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja excluir esta transação?")) {
                                    deleteTransactionMutation.mutate(tx.id);
                                  }
                                }}
                                className="text-meta-1 hover:text-meta-1"
                                data-testid={`button-delete-transaction-${tx.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} até{" "}
                    {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de{" "}
                    {filteredTransactions.length} transações
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          size="sm"
                          variant={currentPage === page ? "default" : "ghost"}
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[36px]"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "categories" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setCategoryDialogOpen(true)} data-testid="button-new-category">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Categorias de Receita */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 dark:border-white/[0.05] px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Categorias de Receita
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {incomeCategories.length === 0 ? (
                  <p className="px-5 py-8 text-center text-gray-500 text-sm">
                    Nenhuma categoria de receita
                  </p>
                ) : (
                  incomeCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between px-5 py-3" data-testid={`category-income-${cat.id}`}>
                      <span className="text-gray-800 dark:text-white/90">{cat.name}</span>
                      {!cat.isSystem && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir esta categoria?")) {
                              deleteCategoryMutation.mutate(cat.id);
                            }
                          }}
                          className="text-meta-1 hover:text-meta-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Categorias de Despesa */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 dark:border-white/[0.05] px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Categorias de Despesa
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {expenseCategories.length === 0 ? (
                  <p className="px-5 py-8 text-center text-gray-500 text-sm">
                    Nenhuma categoria de despesa
                  </p>
                ) : (
                  expenseCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between px-5 py-3" data-testid={`category-expense-${cat.id}`}>
                      <span className="text-gray-800 dark:text-white/90">{cat.name}</span>
                      {!cat.isSystem && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir esta categoria?")) {
                              deleteCategoryMutation.mutate(cat.id);
                            }
                          }}
                          className="text-meta-1 hover:text-meta-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Nova Despesa */}
      <Modal isOpen={expenseDialogOpen} onClose={() => setExpenseDialogOpen(false)}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Nova Despesa
          </h3>
        </div>
        <div className="grid gap-5 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <div className="grid gap-2">
            <Label>Descrição <span className="text-meta-1">*</span></Label>
            <Input
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="Ex: Conta de luz"
              data-testid="input-expense-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor (R$) <span className="text-meta-1">*</span></Label>
              <Input
                type="number"
                step={0.01}
                min={0}
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0,00"
                data-testid="input-expense-amount"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data <span className="text-meta-1">*</span></Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                data-testid="input-expense-date"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <select
                value={expenseForm.categoryId}
                onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                data-testid="select-expense-category"
              >
                <option value="">Sem categoria</option>
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Forma de Pagamento <span className="text-meta-1">*</span></Label>
              <select
                value={expenseForm.paymentMethod}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                data-testid="select-expense-payment"
              >
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              placeholder="Observações opcionais..."
              rows={2}
              data-testid="input-expense-notes"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleExpenseSubmit}
            disabled={!expenseForm.description || !expenseForm.amount || !expenseForm.paymentMethod || createExpenseMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="button-submit-expense"
          >
            {createExpenseMutation.isPending ? "Salvando..." : "Registrar Despesa"}
          </Button>
        </div>
      </Modal>

      {/* Modal Nova Receita */}
      <Modal isOpen={incomeDialogOpen} onClose={() => setIncomeDialogOpen(false)}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Nova Receita
          </h3>
        </div>
        <div className="grid gap-5 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <div className="grid gap-2">
            <Label>Descrição <span className="text-meta-1">*</span></Label>
            <Input
              value={incomeForm.description}
              onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
              placeholder="Ex: Venda avulsa"
              data-testid="input-income-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor (R$) <span className="text-meta-1">*</span></Label>
              <Input
                type="number"
                step={0.01}
                min={0}
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                placeholder="0,00"
                data-testid="input-income-amount"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data <span className="text-meta-1">*</span></Label>
              <Input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                data-testid="input-income-date"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <select
                value={incomeForm.categoryId}
                onChange={(e) => setIncomeForm({ ...incomeForm, categoryId: e.target.value })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                data-testid="select-income-category"
              >
                <option value="">Sem categoria</option>
                {incomeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Forma de Pagamento <span className="text-meta-1">*</span></Label>
              <select
                value={incomeForm.paymentMethod}
                onChange={(e) => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                data-testid="select-income-payment"
              >
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea
              value={incomeForm.notes}
              onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
              placeholder="Observações opcionais..."
              rows={2}
              data-testid="input-income-notes"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <Button variant="outline" onClick={() => setIncomeDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleIncomeSubmit}
            disabled={!incomeForm.description || !incomeForm.amount || !incomeForm.paymentMethod || createIncomeMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-submit-income"
          >
            {createIncomeMutation.isPending ? "Salvando..." : "Registrar Receita"}
          </Button>
        </div>
      </Modal>

      {/* Modal Nova Categoria */}
      <Modal isOpen={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Nova Categoria
          </h3>
        </div>
        <div className="grid gap-5 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <div className="grid gap-2">
            <Label>Nome <span className="text-meta-1">*</span></Label>
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="Nome da categoria"
              data-testid="input-category-name"
            />
          </div>
          <div className="grid gap-2">
            <Label>Tipo <span className="text-meta-1">*</span></Label>
            <select
              value={categoryForm.type}
              onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as "income" | "expense" })}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              data-testid="select-category-type"
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCategorySubmit}
            disabled={!categoryForm.name || createCategoryMutation.isPending}
            data-testid="button-submit-category"
          >
            {createCategoryMutation.isPending ? "Salvando..." : "Criar Categoria"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
