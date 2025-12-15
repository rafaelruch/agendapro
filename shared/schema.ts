import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, numeric, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== MODULE DEFINITIONS ====================
// IMPORTANTE: Ao criar novos módulos, SEMPRE adicionar aqui!
// Isso garante que o sistema de permissões funcione corretamente.

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  isCore: boolean;      // Módulos core são sempre habilitados
  defaultEnabled: boolean; // Habilitado por padrão para novos tenants
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: "calendar",
    label: "Agenda",
    description: "Calendário e agendamentos",
    isCore: true,
    defaultEnabled: true,
  },
  {
    id: "clients",
    label: "Clientes",
    description: "Gestão de clientes",
    isCore: false,
    defaultEnabled: true,
  },
  {
    id: "services",
    label: "Serviços",
    description: "Gestão de serviços",
    isCore: false,
    defaultEnabled: true,
  },
  {
    id: "professionals",
    label: "Profissionais",
    description: "Gestão de profissionais",
    isCore: false,
    defaultEnabled: true,
  },
  {
    id: "business-hours",
    label: "Horários",
    description: "Horários de funcionamento",
    isCore: false,
    defaultEnabled: true,
  },
  {
    id: "users",
    label: "Usuários",
    description: "Gestão de usuários do tenant",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "inventory",
    label: "Estoque",
    description: "Gestão de produtos e estoque",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "orders",
    label: "Pedidos",
    description: "Gestão de pedidos delivery",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "finance",
    label: "Financeiro",
    description: "Gestão financeira com receitas e despesas",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "public-menu",
    label: "Cardápio Público",
    description: "Menu público para clientes fazerem pedidos ou agendamentos",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "appointments",
    label: "Agendamentos Públicos",
    description: "Permite agendamentos pelo cardápio público",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "webhooks",
    label: "Webhooks",
    description: "Integrações via webhooks para automações",
    isCore: false,
    defaultEnabled: false,
  },
];

// Helper para obter módulos habilitados por padrão
export function getDefaultEnabledModules(): string[] {
  return MODULE_DEFINITIONS
    .filter(m => m.isCore || m.defaultEnabled)
    .map(m => m.id);
}

// Helper para obter IDs de módulos core (sempre habilitados)
export function getCoreModuleIds(): string[] {
  return MODULE_DEFINITIONS.filter(m => m.isCore).map(m => m.id);
}

// Tipos de menu público
export const MENU_TYPES = ['delivery', 'services'] as const;
export type MenuType = typeof MENU_TYPES[number];

export const MENU_TYPE_LABELS: Record<MenuType, string> = {
  delivery: 'Delivery (Produtos)',
  services: 'Serviços (Agendamento)',
};

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  // Configurações do cardápio público
  menuSlug: text("menu_slug").unique(),
  menuLogoUrl: text("menu_logo_url"),
  menuBrandColor: text("menu_brand_color").default("#ea7c3f"),
  menuBannerUrl: text("menu_banner_url"),
  menuType: text("menu_type").default("delivery"), // 'delivery' ou 'services'
  minOrderValue: numeric("min_order_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  birthdate: text("birthdate"),
}, (table) => ({
  uniquePhonePerTenant: unique().on(table.tenantId, table.phone)
}));

// Endereços de clientes (1:N - um cliente pode ter múltiplos endereços)
export const clientAddresses = pgTable("client_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  label: text("label").notNull().default("Casa"), // Casa, Trabalho, Outro, etc.
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  zipCode: text("zip_code"),
  reference: text("reference"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"), // Descrição detalhada do serviço
  imageUrl: text("image_url"), // Imagem do serviço para cardápio público
  category: text("category").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull().default(60),
  promotionalValue: numeric("promotional_value", { precision: 10, scale: 2 }),
  promotionStartDate: text("promotion_start_date"),
  promotionEndDate: text("promotion_end_date"),
  isFeatured: boolean("is_featured").notNull().default(false), // Destaque no cardápio
  isActive: boolean("is_active").notNull().default(true), // Ativo no cardápio público
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  professionalId: varchar("professional_id"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  // Campos de pagamento (preenchidos quando registra pagamento)
  paymentMethod: text("payment_method"),
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }),
  paymentDiscount: numeric("payment_discount", { precision: 10, scale: 2 }),
  paymentDiscountType: text("payment_discount_type"), // 'amount' ou 'percent'
  paymentRegisteredAt: timestamp("payment_registered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointmentServices = pgTable("appointment_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  serviceId: varchar("service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
});

export const tenantApiTokens = pgTable("tenant_api_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdByMaster: boolean("created_by_master").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
});

export const businessHours = pgTable("business_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const professionals = pgTable("professionals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const professionalServices = pgTable("professional_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  serviceId: varchar("service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
});

export const professionalSchedules = pgTable("professional_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

// Tabela de permissões de módulos por tenant
export const tenantModulePermissions = pgTable("tenant_module_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  moduleId: text("module_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
}, (table) => ({
  uniqueTenantModule: unique().on(table.tenantId, table.moduleId)
}));

// ==================== DELIVERY SYSTEM ====================

// Status de pedidos
export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

// Labels em português para os status
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  preparing: 'Em Preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// Tabela de categorias de produtos
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  icon: text("icon").default("Package"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela de bairros de entrega (taxa por bairro)
export const deliveryNeighborhoods = pgTable("delivery_neighborhoods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela de produtos (estoque)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").references(() => productCategories.id, { onDelete: 'set null' }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  manageStock: boolean("manage_stock").notNull().default(false),
  quantity: integer("quantity"),
  isActive: boolean("is_active").notNull().default(true),
  // Campos para destaque e oferta
  isFeatured: boolean("is_featured").notNull().default(false),
  isOnSale: boolean("is_on_sale").notNull().default(false),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela de adicionais de produtos
export const productAddons = pgTable("product_addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  maxQuantity: integer("max_quantity").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela de pedidos
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  clientAddressId: varchar("client_address_id").references(() => clientAddresses.id, { onDelete: 'set null' }),
  orderNumber: integer("order_number").notNull(),
  status: text("status").notNull().default("pending"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  // Forma de pagamento (obrigatória na criação)
  paymentMethod: text("payment_method").notNull().default("cash"),
  // Troco para quanto (apenas para pagamento em dinheiro)
  changeFor: numeric("change_for", { precision: 10, scale: 2 }),
  // Snapshot do endereço no momento do pedido (imutável para histórico)
  deliveryStreet: text("delivery_street"),
  deliveryNumber: text("delivery_number"),
  deliveryComplement: text("delivery_complement"),
  deliveryNeighborhood: text("delivery_neighborhood"),
  deliveryCity: text("delivery_city"),
  deliveryZipCode: text("delivery_zip_code"),
  deliveryReference: text("delivery_reference"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de itens do pedido
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
});

// ==================== FINANCIAL MODULE ====================

// Formas de pagamento disponíveis
export const PAYMENT_METHODS = ['cash', 'pix', 'debit', 'credit', 'voucher', 'transfer', 'other'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

// Labels em português para formas de pagamento
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  debit: 'Cartão Débito',
  credit: 'Cartão Crédito',
  voucher: 'Vale/Voucher',
  transfer: 'Transferência',
  other: 'Outro',
};

// Tipos de transação financeira
export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];

// Labels em português para tipos de transação
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

// Fontes de transação
export const TRANSACTION_SOURCES = ['appointment', 'order', 'manual'] as const;
export type TransactionSource = typeof TRANSACTION_SOURCES[number];

// Labels em português para fontes de transação
export const TRANSACTION_SOURCE_LABELS: Record<TransactionSource, string> = {
  appointment: 'Agendamento',
  order: 'Pedido',
  manual: 'Manual',
};

// Status de transação
export const TRANSACTION_STATUSES = ['posted', 'voided'] as const;
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];

// Categorias financeiras
export const financeCategories = pgTable("finance_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'income' ou 'expense'
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transações financeiras
export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'income' ou 'expense'
  source: text("source").notNull(), // 'appointment', 'order' ou 'manual'
  sourceId: varchar("source_id"), // ID do appointment ou order (null para manual)
  categoryId: varchar("category_id").references(() => financeCategories.id, { onDelete: 'set null' }),
  categoryName: text("category_name"), // Snapshot do nome da categoria
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("posted"), // 'posted' ou 'voided'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueSourceTransaction: unique().on(table.tenantId, table.source, table.sourceId)
}));

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});

export const insertClientAddressSchema = createInsertSchema(clientAddresses).omit({
  id: true,
  createdAt: true,
});

// Schema base para serviços (sem validação de promoção)
const baseServiceSchema = createInsertSchema(services).omit({
  id: true,
}).extend({
  value: z.coerce.number().positive(),
  duration: z.coerce.number().int().positive().default(60),
  promotionalValue: z.coerce.number().positive().optional().nullable(),
  promotionStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Use YYYY-MM-DD").optional().nullable(),
  promotionEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Use YYYY-MM-DD").optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

// Schema para inserção com validação de promoção
export const insertServiceSchema = baseServiceSchema.refine((data) => {
  // Se tiver valor promocional, deve ter as datas
  if (data.promotionalValue && (!data.promotionStartDate || !data.promotionEndDate)) {
    return false;
  }
  // Se tiver as datas, deve ter valor promocional
  if ((data.promotionStartDate || data.promotionEndDate) && !data.promotionalValue) {
    return false;
  }
  // Se tiver ambas as datas, endDate deve ser >= startDate
  if (data.promotionStartDate && data.promotionEndDate) {
    return data.promotionEndDate >= data.promotionStartDate;
  }
  return true;
}, {
  message: "Para promoção, informe valor promocional e período completo (início e fim)",
});

// Schema para atualização (partial, MAS com validação de promoção)
export const updateServiceSchema = baseServiceSchema.partial().refine((data) => {
  // Verificar se há VALORES PREENCHIDOS (não null e não undefined)
  const hasFilledValue = data.promotionalValue !== undefined && data.promotionalValue !== null;
  const hasFilledStartDate = data.promotionStartDate !== undefined && data.promotionStartDate !== null && data.promotionStartDate !== '';
  const hasFilledEndDate = data.promotionEndDate !== undefined && data.promotionEndDate !== null && data.promotionEndDate !== '';
  
  // Se QUALQUER campo foi preenchido com valor válido, TODOS devem estar preenchidos
  if (hasFilledValue || hasFilledStartDate || hasFilledEndDate) {
    // Se tem valor mas falta alguma data, erro
    if (hasFilledValue && (!hasFilledStartDate || !hasFilledEndDate)) {
      return false;
    }
    // Se tem alguma data mas falta valor ou outra data, erro
    if ((hasFilledStartDate || hasFilledEndDate) && !hasFilledValue) {
      return false;
    }
    if (hasFilledStartDate && !hasFilledEndDate) {
      return false;
    }
    if (hasFilledEndDate && !hasFilledStartDate) {
      return false;
    }
  }
  
  // Se tiver ambas as datas preenchidas, endDate deve ser >= startDate
  if (hasFilledStartDate && hasFilledEndDate) {
    return data.promotionEndDate! >= data.promotionStartDate!;
  }
  return true;
}, {
  message: "Para promoção, informe valor promocional e período completo (início e fim)",
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  duration: true, // Duration é calculado automaticamente no backend
}).extend({
  serviceIds: z.array(z.string()).min(1, "Pelo menos um serviço deve ser selecionado"),
});

export const insertAppointmentServiceSchema = createInsertSchema(appointmentServices).omit({
  id: true,
});

export const insertTenantApiTokenSchema = createInsertSchema(tenantApiTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
});

export const insertBusinessHoursSchema = createInsertSchema(businessHours).omit({
  id: true,
  createdAt: true,
}).extend({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido. Use HH:MM"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido. Use HH:MM"),
});

export const insertProfessionalSchema = createInsertSchema(professionals).omit({
  id: true,
  createdAt: true,
}).extend({
  serviceIds: z.array(z.string()).min(1, "Pelo menos um serviço deve ser selecionado"),
  schedules: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido. Use HH:MM"),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido. Use HH:MM"),
  })).min(1, "Pelo menos um horário deve ser configurado"),
});

export const insertProfessionalServiceSchema = createInsertSchema(professionalServices).omit({
  id: true,
});

export const insertProfessionalScheduleSchema = createInsertSchema(professionalSchedules).omit({
  id: true,
}).extend({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido. Use HH:MM"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido. Use HH:MM"),
});

export const insertTenantModulePermissionSchema = createInsertSchema(tenantModulePermissions).omit({
  id: true,
});

// Schema para atualizar permissões de módulos em lote
export const updateTenantModulesSchema = z.object({
  modules: z.record(z.string(), z.boolean()), // { "clients": true, "api-tokens": false }
});

// ==================== DELIVERY SCHEMAS ====================

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  tenantId: true,
  createdAt: true,
}).extend({
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export const updateProductCategorySchema = insertProductCategorySchema.partial();

// Schema para bairros de entrega
export const insertDeliveryNeighborhoodSchema = createInsertSchema(deliveryNeighborhoods).omit({
  id: true,
  tenantId: true,
  createdAt: true,
}).extend({
  deliveryFee: z.coerce.number().min(0, "Taxa de entrega deve ser positiva ou zero"),
});

export const updateDeliveryNeighborhoodSchema = insertDeliveryNeighborhoodSchema.partial();

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  tenantId: true,
  createdAt: true,
}).extend({
  price: z.coerce.number().positive("Preço deve ser positivo"),
  quantity: z.coerce.number().int().min(0).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  isOnSale: z.boolean().optional().default(false),
  salePrice: z.coerce.number().positive("Preço promocional deve ser positivo").optional().nullable(),
});

export const updateProductSchema = insertProductSchema.partial();

// Schema para adicionais de produtos
export const insertProductAddonSchema = createInsertSchema(productAddons).omit({
  id: true,
  tenantId: true,
  createdAt: true,
}).extend({
  price: z.coerce.number().min(0, "Preço deve ser positivo ou zero"),
  maxQuantity: z.coerce.number().int().min(1, "Quantidade máxima deve ser pelo menos 1").default(1),
});

export const updateProductAddonSchema = insertProductAddonSchema.partial();

export const deliveryAddressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  reference: z.string().optional(),
});

export const insertOrderSchema = z.object({
  client: z.object({
    name: z.string().min(1, "Nome do cliente é obrigatório"),
    phone: z.string().min(1, "Telefone do cliente é obrigatório"),
  }),
  items: z.array(z.object({
    productId: z.string().min(1, "ID do produto é obrigatório"),
    quantity: z.coerce.number().int().positive("Quantidade deve ser positiva"),
  })).min(1, "Pelo menos um item é obrigatório"),
  paymentMethod: z.enum(PAYMENT_METHODS, { required_error: "Forma de pagamento é obrigatória" }),
  notes: z.string().optional(),
  changeFor: z.coerce.number().positive().optional(), // Troco para quanto (pagamento em dinheiro)
  deliveryAddress: deliveryAddressSchema.optional(),
  clientAddressId: z.string().optional(), // ID do endereço existente selecionado
  saveAddress: z.boolean().optional(), // Salvar novo endereço para próximos pedidos
  addressLabel: z.string().optional(), // Nome do novo endereço (Casa, Trabalho, etc.)
});

export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
}).extend({
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
});

// ==================== FINANCIAL SCHEMAS ====================

export const insertFinanceCategorySchema = createInsertSchema(financeCategories).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(TRANSACTION_TYPES),
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(TRANSACTION_TYPES),
  source: z.enum(TRANSACTION_SOURCES),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Use YYYY-MM-DD"),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

// Schema para registrar pagamento de agendamento
export const registerAppointmentPaymentSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS, { required_error: "Forma de pagamento é obrigatória" }),
  discount: z.coerce.number().min(0, "Desconto não pode ser negativo").optional().default(0),
  discountType: z.enum(['amount', 'percent']).optional().default('amount'),
});

// Schema para criar despesa manual
export const insertExpenseSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Use YYYY-MM-DD"),
});

// Schema para criar receita manual
export const insertIncomeSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Use YYYY-MM-DD"),
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertClientAddress = z.infer<typeof insertClientAddressSchema>;
export type ClientAddress = typeof clientAddresses.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Appointment com serviceIds (retornado pela API)
export type AppointmentWithServices = Appointment & {
  serviceIds: string[];
};

export type InsertAppointmentService = z.infer<typeof insertAppointmentServiceSchema>;
export type AppointmentService = typeof appointmentServices.$inferSelect;

export type InsertTenantApiToken = z.infer<typeof insertTenantApiTokenSchema>;
export type TenantApiToken = typeof tenantApiTokens.$inferSelect;

export type InsertBusinessHours = z.infer<typeof insertBusinessHoursSchema>;
export type BusinessHours = typeof businessHours.$inferSelect;

export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionals.$inferSelect;

export type InsertProfessionalService = z.infer<typeof insertProfessionalServiceSchema>;
export type ProfessionalService = typeof professionalServices.$inferSelect;

export type InsertProfessionalSchedule = z.infer<typeof insertProfessionalScheduleSchema>;
export type ProfessionalSchedule = typeof professionalSchedules.$inferSelect;

export type InsertTenantModulePermission = z.infer<typeof insertTenantModulePermissionSchema>;
export type TenantModulePermission = typeof tenantModulePermissions.$inferSelect;
export type UpdateTenantModules = z.infer<typeof updateTenantModulesSchema>;

// ==================== DELIVERY TYPES ====================

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type UpdateProductCategory = z.infer<typeof updateProductCategorySchema>;

export type InsertDeliveryNeighborhood = z.infer<typeof insertDeliveryNeighborhoodSchema>;
export type DeliveryNeighborhood = typeof deliveryNeighborhoods.$inferSelect;
export type UpdateDeliveryNeighborhood = z.infer<typeof updateDeliveryNeighborhoodSchema>;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

export type InsertProductAddon = z.infer<typeof insertProductAddonSchema>;
export type ProductAddon = typeof productAddons.$inferSelect;
export type UpdateProductAddon = z.infer<typeof updateProductAddonSchema>;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type UpdateOrderStatus = z.infer<typeof updateOrderStatusSchema>;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Pedido com detalhes do cliente e itens
export type OrderWithDetails = Order & {
  client: Client;
  items: (OrderItem & {
    product: Product;
  })[];
};

export type ProfessionalWithDetails = Professional & {
  serviceIds: string[];
  schedules: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
};

// ==================== FINANCIAL TYPES ====================

export type InsertFinanceCategory = z.infer<typeof insertFinanceCategorySchema>;
export type FinanceCategory = typeof financeCategories.$inferSelect;

export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;

export type RegisterAppointmentPayment = z.infer<typeof registerAppointmentPaymentSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;

// Transação com detalhes da categoria
export type TransactionWithCategory = FinancialTransaction & {
  category?: FinanceCategory;
};

// Resumo financeiro
export type FinancialSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByPaymentMethod: Record<PaymentMethod, number>;
  expenseByCategory: Record<string, number>;
};

// Função helper para verificar se serviço está em promoção
export function isServiceInPromotion(service: Service): boolean {
  if (!service.promotionalValue || !service.promotionStartDate || !service.promotionEndDate) {
    return false;
  }
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return today >= service.promotionStartDate && today <= service.promotionEndDate;
}

// Função helper para obter o valor efetivo do serviço (promocional ou normal) como número
export function getServiceEffectiveValue(service: Service): number {
  if (isServiceInPromotion(service) && service.promotionalValue) {
    return parseFloat(String(service.promotionalValue));
  }
  return parseFloat(String(service.value));
}

// SCHEMAS DE AUTENTICAÇÃO

// Schema para login
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória")
});

export type LoginData = z.infer<typeof loginSchema>;

// Schema para setup/instalação
export const setupSchema = z.object({
  username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres")
});

export type SetupData = z.infer<typeof setupSchema>;

// ==================== WEBHOOKS ====================

// Módulos que suportam webhooks
export const WEBHOOK_MODULES = [
  'clients',
  'services', 
  'products',
  'appointments',
  'orders',
  'professionals',
  'finance',
] as const;

export type WebhookModule = typeof WEBHOOK_MODULES[number];

export const WEBHOOK_MODULE_LABELS: Record<WebhookModule, string> = {
  clients: 'Clientes',
  services: 'Serviços',
  products: 'Produtos',
  appointments: 'Agendamentos',
  orders: 'Pedidos',
  professionals: 'Profissionais',
  finance: 'Financeiro',
};

// Eventos de webhook
export const WEBHOOK_EVENTS = ['create', 'update', 'delete'] as const;
export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
};

// Status de entrega do webhook
export const WEBHOOK_DELIVERY_STATUS = ['pending', 'success', 'failed'] as const;
export type WebhookDeliveryStatus = typeof WEBHOOK_DELIVERY_STATUS[number];

// Tabela de configuração de webhooks
export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  secret: text("secret"), // Para assinatura HMAC
  modules: text("modules").array().notNull(), // Array de módulos ['clients', 'services', ...]
  events: text("events").array().notNull(), // Array de eventos ['create', 'update', 'delete']
  active: boolean("active").notNull().default(true),
  headers: text("headers"), // JSON string de headers customizados
  retryCount: integer("retry_count").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// Tabela de log de entregas de webhooks
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  module: text("module").notNull(),
  event: text("event").notNull(),
  payload: text("payload").notNull(), // JSON string do payload enviado
  status: text("status").notNull().default("pending"), // pending, success, failed
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  responseStatus: integer("response_status"), // HTTP status code
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
  id: true,
  createdAt: true,
});

export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

// Tipo para payload de webhook
export type WebhookPayload = {
  event: WebhookEvent;
  module: WebhookModule;
  timestamp: string;
  tenantId: string;
  data: Record<string, unknown>;
};
