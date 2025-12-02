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
    id: "api-tokens",
    label: "Tokens API",
    description: "Integração com N8N e automações",
    isCore: false,
    defaultEnabled: false,
  },
  {
    id: "users",
    label: "Usuários",
    description: "Gestão de usuários do tenant",
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

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
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

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull().default(60),
  promotionalValue: numeric("promotional_value", { precision: 10, scale: 2 }),
  promotionStartDate: text("promotion_start_date"),
  promotionEndDate: text("promotion_end_date"),
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

// Schema base para serviços (sem validação de promoção)
const baseServiceSchema = createInsertSchema(services).omit({
  id: true,
}).extend({
  value: z.coerce.number().positive(),
  duration: z.coerce.number().int().positive().default(60),
  promotionalValue: z.coerce.number().positive().optional().nullable(),
  promotionStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Use YYYY-MM-DD").optional().nullable(),
  promotionEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Use YYYY-MM-DD").optional().nullable(),
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

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

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

export type ProfessionalWithDetails = Professional & {
  serviceIds: string[];
  schedules: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
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
