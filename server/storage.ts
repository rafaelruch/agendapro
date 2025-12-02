import { 
  type Client, 
  type InsertClient,
  type Service,
  type InsertService,
  type Appointment,
  type InsertAppointment,
  type Tenant,
  type InsertTenant,
  type User,
  type InsertUser,
  type TenantApiToken,
  type InsertTenantApiToken,
  type BusinessHours,
  type InsertBusinessHours,
  type AppointmentService,
  type InsertAppointmentService,
  type Professional,
  type InsertProfessional,
  type ProfessionalService,
  type InsertProfessionalService,
  type ProfessionalSchedule,
  type InsertProfessionalSchedule,
  type ProfessionalWithDetails,
  type TenantModulePermission,
  clients,
  services,
  appointments,
  tenants,
  users,
  tenantApiTokens,
  businessHours,
  appointmentServices,
  professionals,
  professionalServices,
  professionalSchedules,
  tenantModulePermissions,
  MODULE_DEFINITIONS,
  getCoreModuleIds,
  getDefaultEnabledModules
} from "@shared/schema";
import { randomBytes } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, desc, or, like, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  hasMasterAdmin(): Promise<boolean>;
  
  // User operations with tenant isolation (for tenant admin management)
  getUserWithTenantIsolation(id: string, tenantId: string): Promise<User | undefined>;
  updateUserWithTenantIsolation(id: string, tenantId: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUserWithTenantIsolation(id: string, tenantId: string): Promise<boolean>;

  // Client operations (with tenant isolation)
  getClient(id: string, tenantId: string): Promise<Client | undefined>;
  getClientByPhone(phone: string, tenantId: string): Promise<Client | undefined>;
  getAllClients(tenantId: string): Promise<Client[]>;
  searchClients(tenantId: string, searchTerm: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, tenantId: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string, tenantId: string): Promise<boolean>;

  // Service operations (with tenant isolation)
  getService(id: string, tenantId: string): Promise<Service | undefined>;
  getAllServices(tenantId: string): Promise<Service[]>;
  searchServices(tenantId: string, searchTerm: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, tenantId: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string, tenantId: string): Promise<boolean>;

  // Appointment operations (with tenant isolation)
  getAppointment(id: string, tenantId: string): Promise<Appointment | undefined>;
  getAllAppointments(tenantId: string, clientId?: string, serviceId?: string, status?: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(tenantId: string, startDate: string, endDate: string, clientId?: string): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: string, tenantId: string): Promise<Appointment[]>;
  getAppointmentsByService(serviceId: string, tenantId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, tenantId: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string, tenantId: string): Promise<boolean>;
  
  // Appointment Services operations
  getAppointmentServices(appointmentId: string): Promise<Service[]>;
  setAppointmentServices(appointmentId: string, serviceIds: string[]): Promise<void>;
  getAppointmentTotalDuration(appointmentId: string): Promise<number>;
  
  // Stats operations
  getClientStats(clientId: string, tenantId: string): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    lastAppointment: Appointment | undefined;
  }>;

  // API Token operations
  createApiToken(tenantId: string, label: string, createdBy: string): Promise<{ token: string; tokenRecord: TenantApiToken }>;
  getApiTokensByTenant(tenantId: string): Promise<TenantApiToken[]>;
  revokeApiToken(id: string, tenantId: string): Promise<boolean>;
  revokeApiTokenAdmin(id: string): Promise<boolean>;
  validateApiToken(token: string): Promise<{ tenantId: string; tokenId: string } | null>;
  markApiTokenUsed(id: string): Promise<void>;

  // Business Hours operations (with tenant isolation)
  getBusinessHours(tenantId: string): Promise<BusinessHours[]>;
  createBusinessHours(businessHour: InsertBusinessHours): Promise<BusinessHours>;
  updateBusinessHours(id: string, tenantId: string, businessHour: Partial<InsertBusinessHours>): Promise<BusinessHours | undefined>;
  deleteBusinessHours(id: string, tenantId: string): Promise<boolean>;

  // Professional operations (with tenant isolation)
  getProfessional(id: string, tenantId: string): Promise<Professional | undefined>;
  getProfessionalWithDetails(id: string, tenantId: string): Promise<ProfessionalWithDetails | undefined>;
  getAllProfessionals(tenantId: string): Promise<Professional[]>;
  getAllProfessionalsWithDetails(tenantId: string): Promise<ProfessionalWithDetails[]>;
  getProfessionalsByServices(serviceIds: string[], tenantId: string): Promise<ProfessionalWithDetails[]>;
  searchProfessionals(tenantId: string, searchTerm: string): Promise<Professional[]>;
  createProfessional(professional: Omit<InsertProfessional, 'tenantId'>, tenantId: string): Promise<ProfessionalWithDetails>;
  updateProfessional(id: string, tenantId: string, professional: Partial<Omit<InsertProfessional, 'tenantId'>>): Promise<ProfessionalWithDetails | undefined>;
  deleteProfessional(id: string, tenantId: string): Promise<boolean>;
  checkProfessionalAvailability(professionalId: string, date: string, time: string, duration: number, excludeAppointmentId?: string): Promise<boolean>;

  // Admin operations (no tenant isolation)
  getAllAppointmentsAdmin(): Promise<Appointment[]>;
  getAppointmentAdmin(id: string): Promise<Appointment | undefined>;
  updateAppointmentAdmin(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  
  // Data correction operations
  findOrphanAppointments(tenantId: string): Promise<Appointment[]>;
  fixOrphanAppointments(tenantId: string, defaultServiceId: string): Promise<{ fixed: number; errors: string[] }>;

  // Module Permission operations
  getTenantModulePermissions(tenantId: string): Promise<TenantModulePermission[]>;
  getTenantAllowedModules(tenantId: string): Promise<string[]>;
  updateTenantModulePermissions(tenantId: string, modules: Record<string, boolean>): Promise<void>;
  isModuleEnabledForTenant(tenantId: string, moduleId: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0];
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const result = await db.insert(tenants).values(insertTenant).returning();
    return result[0];
  }

  async updateTenant(id: string, tenantData: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const result = await db
      .update(tenants)
      .set(tenantData)
      .where(eq(tenants.id, id))
      .returning();
    return result[0];
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id)).returning();
    return result.length > 0;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async hasMasterAdmin(): Promise<boolean> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.role, 'master_admin'))
      .limit(1);
    return result.length > 0;
  }

  // User operations with tenant isolation (for tenant admin management)
  async getUserWithTenantIsolation(id: string, tenantId: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async updateUserWithTenantIsolation(id: string, tenantId: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(userData)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async deleteUserWithTenantIsolation(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  }

  // Client operations (with tenant isolation)
  async getClient(id: string, tenantId: string): Promise<Client | undefined> {
    const result = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getClientByPhone(phone: string, tenantId: string): Promise<Client | undefined> {
    const result = await db
      .select()
      .from(clients)
      .where(and(eq(clients.phone, phone), eq(clients.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getAllClients(tenantId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.tenantId, tenantId));
  }

  async searchClients(tenantId: string, searchTerm: string): Promise<Client[]> {
    const searchPattern = `%${searchTerm}%`;
    return await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, tenantId),
          or(
            like(clients.name, searchPattern),
            like(clients.phone, searchPattern)
          )
        )
      );
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: string, tenantId: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db
      .update(clients)
      .set(clientData)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async deleteClient(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  }

  // Service operations (with tenant isolation)
  async getService(id: string, tenantId: string): Promise<Service | undefined> {
    const result = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getAllServices(tenantId: string): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.tenantId, tenantId))
      .orderBy(services.category, services.name);
  }

  async searchServices(tenantId: string, searchTerm: string): Promise<Service[]> {
    const searchPattern = `%${searchTerm}%`;
    return await db
      .select()
      .from(services)
      .where(
        and(
          eq(services.tenantId, tenantId),
          or(
            like(services.name, searchPattern),
            like(services.category, searchPattern)
          )
        )
      )
      .orderBy(services.category, services.name);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const serviceData: any = {
      ...insertService,
      value: insertService.value.toString(),
    };
    const result = await db.insert(services).values(serviceData).returning();
    return result[0];
  }

  async updateService(id: string, tenantId: string, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    const updateData: any = { ...serviceData };
    if (updateData.value !== undefined) {
      updateData.value = updateData.value.toString();
    }
    const result = await db
      .update(services)
      .set(updateData)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async deleteService(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(services)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  }

  // Appointment operations (with tenant isolation)
  async getAppointment(id: string, tenantId: string): Promise<Appointment | undefined> {
    const result = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getAllAppointments(tenantId: string, clientId?: string, serviceId?: string, status?: string): Promise<Appointment[]> {
    let appointmentResults: Appointment[];
    
    if (serviceId) {
      const appointmentIds = await db
        .select({ appointmentId: appointmentServices.appointmentId })
        .from(appointmentServices)
        .where(eq(appointmentServices.serviceId, serviceId));
      
      const ids = appointmentIds.map(a => a.appointmentId);
      if (ids.length === 0) return [];
      
      const conditions = [
        eq(appointments.tenantId, tenantId),
        or(...ids.map(id => eq(appointments.id, id)))!,
      ];
      
      if (clientId) {
        conditions.push(eq(appointments.clientId, clientId));
      }
      
      if (status) {
        conditions.push(eq(appointments.status, status));
      }
      
      appointmentResults = await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(desc(appointments.date), desc(appointments.time));
    } else {
      const conditions = [eq(appointments.tenantId, tenantId)];
      
      if (clientId) {
        conditions.push(eq(appointments.clientId, clientId));
      }
      
      if (status) {
        conditions.push(eq(appointments.status, status));
      }
      
      appointmentResults = await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(desc(appointments.date), desc(appointments.time));
    }
    
    const enrichedAppointments = await Promise.all(
      appointmentResults.map(async (apt) => {
        const servicesRelations = await db
          .select({ serviceId: appointmentServices.serviceId })
          .from(appointmentServices)
          .where(eq(appointmentServices.appointmentId, apt.id));
        
        return {
          ...apt,
          serviceIds: servicesRelations.map(s => s.serviceId),
        };
      })
    );
    
    return enrichedAppointments;
  }

  async getAppointmentsByClient(clientId: string, tenantId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.clientId, clientId)))
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  async getAppointmentsByService(serviceId: string, tenantId: string): Promise<Appointment[]> {
    const appointmentIds = await db
      .select({ appointmentId: appointmentServices.appointmentId })
      .from(appointmentServices)
      .where(eq(appointmentServices.serviceId, serviceId));
    
    const ids = appointmentIds.map(a => a.appointmentId);
    if (ids.length === 0) return [];
    
    return await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        or(...ids.map(id => eq(appointments.id, id)))!
      ))
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  async getAppointmentsByDateRange(
    tenantId: string,
    startDate: string,
    endDate: string,
    clientId?: string
  ): Promise<Appointment[]> {
    const conditions = [
      eq(appointments.tenantId, tenantId),
      gte(appointments.date, startDate),
      lte(appointments.date, endDate),
    ];

    if (clientId) {
      conditions.push(eq(appointments.clientId, clientId));
    }

    return await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async calculateAppointmentDuration(appointmentId: string): Promise<number> {
    const totalDuration = await this.getAppointmentTotalDuration(appointmentId);
    return totalDuration > 0 ? totalDuration : 60;
  }

  async findOverlappingAppointments(
    tenantId: string,
    date: string,
    time: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<Appointment[]> {
    const newStartMinutes = this.timeToMinutes(time);
    const newEndMinutes = newStartMinutes + duration;

    let conditions = [
      eq(appointments.tenantId, tenantId),
      eq(appointments.date, date),
    ];

    if (excludeAppointmentId) {
      conditions.push(eq(appointments.id, excludeAppointmentId));
    }

    const existingAppointments = excludeAppointmentId
      ? await db
          .select()
          .from(appointments)
          .where(and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.date, date)
          ))
      : await db
          .select()
          .from(appointments)
          .where(and(...conditions));

    const conflicting: Appointment[] = [];

    for (const apt of existingAppointments) {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) {
        continue;
      }

      const existingStartMinutes = this.timeToMinutes(apt.time);
      const existingDuration = await this.calculateAppointmentDuration(apt.id);
      const existingEndMinutes = existingStartMinutes + existingDuration;

      const hasOverlap = 
        (newStartMinutes >= existingStartMinutes && newStartMinutes < existingEndMinutes) ||
        (newEndMinutes > existingStartMinutes && newEndMinutes <= existingEndMinutes) ||
        (newStartMinutes <= existingStartMinutes && newEndMinutes >= existingEndMinutes);

      if (hasOverlap) {
        conflicting.push(apt);
      }
    }

    return conflicting;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const { serviceIds, ...appointmentData } = insertAppointment;
    
    let totalDuration = 0;
    for (const serviceId of serviceIds) {
      const service = await db
        .select()
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.tenantId, appointmentData.tenantId)))
        .limit(1);
      if (!service[0]) {
        throw new Error(`Serviço ${serviceId} não encontrado`);
      }
      if (service[0].duration) {
        totalDuration += service[0].duration;
      }
    }
    
    if (totalDuration === 0) {
      totalDuration = 60;
    }
    
    const conflicts = await this.findOverlappingAppointments(
      appointmentData.tenantId,
      appointmentData.date,
      appointmentData.time,
      totalDuration
    );
    
    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      const conflictDuration = await this.calculateAppointmentDuration(conflict.id);
      const conflictStartMinutes = this.timeToMinutes(conflict.time);
      const conflictEndMinutes = conflictStartMinutes + conflictDuration;
      const endHours = Math.floor(conflictEndMinutes / 60);
      const endMinutes = conflictEndMinutes % 60;
      const conflictEnd = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      
      throw new Error(JSON.stringify({
        error: 'Horário indisponível',
        code: 'APPOINTMENT_CONFLICT',
        details: {
          conflictingAppointmentId: conflict.id,
          conflictStart: conflict.time,
          conflictEnd,
          message: `Já existe um agendamento das ${conflict.time} às ${conflictEnd}. Próximo horário disponível: ${conflictEnd}`
        }
      }));
    }
    
    return await db.transaction(async (tx) => {
      // Preparar dados para inserção, garantindo que professionalId seja null se vazio
      const dataToInsert: any = {
        ...appointmentData,
        duration: totalDuration,
        professionalId: appointmentData.professionalId || null,
      };
      
      const result = await tx.insert(appointments).values(dataToInsert).returning();
      const appointment = result[0];
      
      const values = serviceIds.map(serviceId => ({
        appointmentId: appointment.id,
        serviceId,
      }));
      await tx.insert(appointmentServices).values(values);
      
      return appointment;
    });
  }

  async updateAppointment(
    id: string,
    tenantId: string,
    appointmentData: Partial<InsertAppointment>
  ): Promise<Appointment | undefined> {
    // Remover duration e serviceIds do appointmentData antes de usar
    const { serviceIds, ...dataToUpdate } = appointmentData;
    
    const currentAppointment = await this.getAppointment(id, tenantId);
    if (!currentAppointment) return undefined;
    
    // Validar serviceIds ANTES de calcular duration
    if (serviceIds !== undefined && serviceIds.length === 0) {
      throw new Error('Pelo menos um serviço deve ser selecionado');
    }
    
    const dateChanged = dataToUpdate.date !== undefined;
    const timeChanged = dataToUpdate.time !== undefined;
    const servicesChanged = serviceIds !== undefined;
    
    if (dateChanged || timeChanged || servicesChanged) {
      const finalDate = dataToUpdate.date || currentAppointment.date;
      const finalTime = dataToUpdate.time || currentAppointment.time;
      
      let totalDuration = 0;
      
      if (servicesChanged && serviceIds) {
        for (const serviceId of serviceIds) {
          const service = await db
            .select()
            .from(services)
            .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
            .limit(1);
          if (!service[0]) {
            throw new Error(`Serviço ${serviceId} não encontrado`);
          }
          if (service[0].duration) {
            totalDuration += service[0].duration;
          }
        }
        if (totalDuration === 0) {
          totalDuration = 60;
        }
      } else {
        // Serviços não mudaram, usar duração existente
        const existingDuration = await this.calculateAppointmentDuration(id);
        totalDuration = existingDuration;
      }
      
      // SEMPRE adicionar duration ao dataToUpdate quando há mudanças
      (dataToUpdate as any).duration = totalDuration;
      
      const conflicts = await this.findOverlappingAppointments(
        tenantId,
        finalDate,
        finalTime,
        totalDuration,
        id
      );
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const conflictDuration = await this.calculateAppointmentDuration(conflict.id);
        const conflictStartMinutes = this.timeToMinutes(conflict.time);
        const conflictEndMinutes = conflictStartMinutes + conflictDuration;
        const endHours = Math.floor(conflictEndMinutes / 60);
        const endMinutes = conflictEndMinutes % 60;
        const conflictEnd = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        throw new Error(JSON.stringify({
          error: 'Horário indisponível',
          code: 'APPOINTMENT_CONFLICT',
          details: {
            conflictingAppointmentId: conflict.id,
            conflictStart: conflict.time,
            conflictEnd,
            message: `Já existe um agendamento das ${conflict.time} às ${conflictEnd}. Próximo horário disponível: ${conflictEnd}`
          }
        }));
      }
    }
    
    const updatedAppointment = await db.transaction(async (tx) => {
      let appointment;
      
      if (Object.keys(dataToUpdate).length > 0) {
        const result = await tx
          .update(appointments)
          .set(dataToUpdate)
          .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
          .returning();
        
        if (result.length === 0) return undefined;
        appointment = result[0];
      } else {
        const result = await tx
          .select()
          .from(appointments)
          .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
          .limit(1);
        
        if (result.length === 0) return undefined;
        appointment = result[0];
      }
      
      if (serviceIds !== undefined) {
        await tx.delete(appointmentServices).where(eq(appointmentServices.appointmentId, id));
        
        const values = serviceIds.map(serviceId => ({
          appointmentId: id,
          serviceId,
        }));
        await tx.insert(appointmentServices).values(values);
        
        // Validar serviços apenas quando serviceIds foi especificado
        const finalServices = await tx
          .select()
          .from(appointmentServices)
          .where(eq(appointmentServices.appointmentId, id));
        
        if (finalServices.length === 0) {
          throw new Error('Agendamento deve ter pelo menos um serviço associado');
        }
      }
      
      return appointment;
    });
    
    if (!updatedAppointment) return undefined;
    
    return updatedAppointment;
  }

  async deleteAppointment(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  }

  // Appointment Services operations
  async getAppointmentServices(appointmentId: string): Promise<Service[]> {
    const result = await db
      .select({
        id: services.id,
        tenantId: services.tenantId,
        name: services.name,
        category: services.category,
        value: services.value,
        duration: services.duration,
      })
      .from(appointmentServices)
      .innerJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(eq(appointmentServices.appointmentId, appointmentId));
    
    return result as Service[];
  }

  async setAppointmentServices(appointmentId: string, serviceIds: string[]): Promise<void> {
    if (serviceIds.length === 0) {
      throw new Error('Pelo menos um serviço deve ser associado ao agendamento');
    }
    
    await db.delete(appointmentServices).where(eq(appointmentServices.appointmentId, appointmentId));
    
    const values = serviceIds.map(serviceId => ({
      appointmentId,
      serviceId,
    }));
    await db.insert(appointmentServices).values(values);
  }

  async getAppointmentTotalDuration(appointmentId: string): Promise<number> {
    const services = await this.getAppointmentServices(appointmentId);
    return services.reduce((total, service) => total + (service.duration || 0), 0);
  }

  // Stats operations
  async getClientStats(clientId: string, tenantId: string): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    lastAppointment: Appointment | undefined;
  }> {
    const allAppointments = await this.getAppointmentsByClient(clientId, tenantId);
    
    const totalAppointments = allAppointments.length;
    const completedAppointments = allAppointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = allAppointments.filter(a => a.status === 'cancelled').length;
    const lastAppointment = allAppointments[0];
    
    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      lastAppointment,
    };
  }

  // API Token operations
  async createApiToken(tenantId: string, label: string, createdBy: string): Promise<{ token: string; tokenRecord: TenantApiToken }> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    
    const result = await db.insert(tenantApiTokens).values({
      tenantId,
      tokenHash,
      label,
      createdBy,
    }).returning();
    
    return {
      token,
      tokenRecord: result[0],
    };
  }

  async getApiTokensByTenant(tenantId: string): Promise<TenantApiToken[]> {
    return await db
      .select()
      .from(tenantApiTokens)
      .where(and(
        eq(tenantApiTokens.tenantId, tenantId),
        isNull(tenantApiTokens.revokedAt)
      ))
      .orderBy(desc(tenantApiTokens.createdAt));
  }

  async revokeApiToken(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .update(tenantApiTokens)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(tenantApiTokens.id, id),
        eq(tenantApiTokens.tenantId, tenantId),
        isNull(tenantApiTokens.revokedAt)
      ))
      .returning();
    return result.length > 0;
  }

  async revokeApiTokenAdmin(id: string): Promise<boolean> {
    const result = await db
      .update(tenantApiTokens)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(tenantApiTokens.id, id),
        isNull(tenantApiTokens.revokedAt)
      ))
      .returning();
    return result.length > 0;
  }

  async validateApiToken(token: string): Promise<{ tenantId: string; tokenId: string } | null> {
    const allTokens = await db
      .select()
      .from(tenantApiTokens)
      .where(isNull(tenantApiTokens.revokedAt));
    
    for (const tokenRecord of allTokens) {
      const isValid = await bcrypt.compare(token, tokenRecord.tokenHash);
      if (isValid) {
        return {
          tenantId: tokenRecord.tenantId,
          tokenId: tokenRecord.id,
        };
      }
    }
    
    return null;
  }

  async markApiTokenUsed(id: string): Promise<void> {
    await db
      .update(tenantApiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(tenantApiTokens.id, id));
  }

  // Business Hours operations
  async getBusinessHours(tenantId: string): Promise<BusinessHours[]> {
    return await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.tenantId, tenantId))
      .orderBy(businessHours.dayOfWeek, businessHours.startTime);
  }

  async createBusinessHours(businessHour: InsertBusinessHours): Promise<BusinessHours> {
    const result = await db.insert(businessHours).values(businessHour).returning();
    return result[0];
  }

  async updateBusinessHours(id: string, tenantId: string, businessHourData: Partial<InsertBusinessHours>): Promise<BusinessHours | undefined> {
    const result = await db
      .update(businessHours)
      .set(businessHourData)
      .where(and(eq(businessHours.id, id), eq(businessHours.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async deleteBusinessHours(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(businessHours)
      .where(and(eq(businessHours.id, id), eq(businessHours.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  }

  // Professional operations
  async getProfessional(id: string, tenantId: string): Promise<Professional | undefined> {
    const result = await db
      .select()
      .from(professionals)
      .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getProfessionalWithDetails(id: string, tenantId: string): Promise<ProfessionalWithDetails | undefined> {
    const professional = await this.getProfessional(id, tenantId);
    if (!professional) return undefined;

    const services = await db
      .select({ serviceId: professionalServices.serviceId })
      .from(professionalServices)
      .where(eq(professionalServices.professionalId, id));

    const schedules = await db
      .select()
      .from(professionalSchedules)
      .where(eq(professionalSchedules.professionalId, id))
      .orderBy(professionalSchedules.dayOfWeek, professionalSchedules.startTime);

    return {
      ...professional,
      serviceIds: services.map(s => s.serviceId),
      schedules: schedules.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    };
  }

  async getAllProfessionals(tenantId: string): Promise<Professional[]> {
    return await db
      .select()
      .from(professionals)
      .where(eq(professionals.tenantId, tenantId))
      .orderBy(professionals.name);
  }

  async getAllProfessionalsWithDetails(tenantId: string): Promise<ProfessionalWithDetails[]> {
    const allProfessionals = await this.getAllProfessionals(tenantId);
    const results: ProfessionalWithDetails[] = [];

    for (const prof of allProfessionals) {
      const details = await this.getProfessionalWithDetails(prof.id, tenantId);
      if (details) {
        results.push(details);
      }
    }

    return results;
  }

  async getProfessionalsByServices(serviceIds: string[], tenantId: string): Promise<ProfessionalWithDetails[]> {
    if (serviceIds.length === 0) {
      return await this.getAllProfessionalsWithDetails(tenantId);
    }

    const allProfessionals = await this.getAllProfessionalsWithDetails(tenantId);
    
    return allProfessionals.filter(prof => {
      return serviceIds.every(serviceId => prof.serviceIds.includes(serviceId));
    });
  }

  async searchProfessionals(tenantId: string, searchTerm: string): Promise<Professional[]> {
    return await db
      .select()
      .from(professionals)
      .where(
        and(
          eq(professionals.tenantId, tenantId),
          like(professionals.name, `%${searchTerm}%`)
        )
      )
      .orderBy(professionals.name);
  }

  async createProfessional(
    professionalData: Omit<InsertProfessional, 'tenantId'>,
    tenantId: string
  ): Promise<ProfessionalWithDetails> {
    const { serviceIds, schedules, ...professionalInfo } = professionalData;

    const [professional] = await db
      .insert(professionals)
      .values({ ...professionalInfo, tenantId })
      .returning();

    if (serviceIds && serviceIds.length > 0) {
      await db.insert(professionalServices).values(
        serviceIds.map(serviceId => ({
          professionalId: professional.id,
          serviceId,
        }))
      );
    }

    if (schedules && schedules.length > 0) {
      await db.insert(professionalSchedules).values(
        schedules.map(schedule => ({
          professionalId: professional.id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        }))
      );
    }

    const details = await this.getProfessionalWithDetails(professional.id, tenantId);
    return details!;
  }

  async updateProfessional(
    id: string,
    tenantId: string,
    professionalData: Partial<Omit<InsertProfessional, 'tenantId'>>
  ): Promise<ProfessionalWithDetails | undefined> {
    const existing = await this.getProfessional(id, tenantId);
    if (!existing) return undefined;

    const { serviceIds, schedules, ...professionalInfo } = professionalData;

    if (Object.keys(professionalInfo).length > 0) {
      await db
        .update(professionals)
        .set(professionalInfo)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
    }

    if (serviceIds !== undefined) {
      await db.delete(professionalServices).where(eq(professionalServices.professionalId, id));
      if (serviceIds.length > 0) {
        await db.insert(professionalServices).values(
          serviceIds.map(serviceId => ({
            professionalId: id,
            serviceId,
          }))
        );
      }
    }

    if (schedules !== undefined) {
      await db.delete(professionalSchedules).where(eq(professionalSchedules.professionalId, id));
      if (schedules.length > 0) {
        await db.insert(professionalSchedules).values(
          schedules.map(schedule => ({
            professionalId: id,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          }))
        );
      }
    }

    return await this.getProfessionalWithDetails(id, tenantId);
  }

  async deleteProfessional(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(professionals)
      .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  }

  async checkProfessionalAvailability(
    professionalId: string,
    date: string,
    time: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const startMinutes = timeToMinutes(time);
    const endMinutes = startMinutes + duration;

    let query = db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.professionalId, professionalId),
          eq(appointments.date, date)
        )
      );

    const existingAppointments = await query;

    for (const apt of existingAppointments) {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) {
        continue;
      }

      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + apt.duration;

      const hasConflict = (startMinutes < aptEnd && endMinutes > aptStart);
      
      if (hasConflict) {
        return false;
      }
    }

    return true;
  }

  // Admin operations (no tenant isolation)
  async getAllAppointmentsAdmin(): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  async getAppointmentAdmin(id: string): Promise<Appointment | undefined> {
    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    return result[0];
  }

  async updateAppointmentAdmin(id: string, appointmentData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const result = await db
      .update(appointments)
      .set(appointmentData)
      .where(eq(appointments.id, id))
      .returning();
    return result[0];
  }
  
  async findOrphanAppointments(tenantId: string): Promise<Appointment[]> {
    const allAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId))
      .orderBy(desc(appointments.date), desc(appointments.time));
    
    const orphans: Appointment[] = [];
    
    for (const apt of allAppointments) {
      const linkedServices = await db
        .select()
        .from(appointmentServices)
        .where(eq(appointmentServices.appointmentId, apt.id))
        .limit(1);
      
      if (linkedServices.length === 0) {
        orphans.push(apt);
      }
    }
    
    return orphans;
  }
  
  async fixOrphanAppointments(tenantId: string, defaultServiceId: string): Promise<{ fixed: number; errors: string[] }> {
    const serviceExists = await db
      .select()
      .from(services)
      .where(and(eq(services.id, defaultServiceId), eq(services.tenantId, tenantId)))
      .limit(1);
    
    if (serviceExists.length === 0) {
      return {
        fixed: 0,
        errors: ['Serviço padrão não encontrado ou não pertence ao tenant']
      };
    }
    
    const orphans = await this.findOrphanAppointments(tenantId);
    const errors: string[] = [];
    let fixed = 0;
    
    for (const apt of orphans) {
      try {
        await db.insert(appointmentServices).values({
          appointmentId: apt.id,
          serviceId: defaultServiceId,
        });
        fixed++;
      } catch (error) {
        errors.push(`Erro ao corrigir agendamento ${apt.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    return { fixed, errors };
  }

  // Module Permission operations
  async getTenantModulePermissions(tenantId: string): Promise<TenantModulePermission[]> {
    return await db
      .select()
      .from(tenantModulePermissions)
      .where(eq(tenantModulePermissions.tenantId, tenantId));
  }

  async getTenantAllowedModules(tenantId: string): Promise<string[]> {
    // Get explicit permissions from database
    const permissions = await this.getTenantModulePermissions(tenantId);
    const permissionMap = new Map(permissions.map(p => [p.moduleId, p.enabled]));

    // Build allowed modules list
    const allowedModules: string[] = [];
    
    for (const module of MODULE_DEFINITIONS) {
      if (module.isCore) {
        // Core modules are always enabled
        allowedModules.push(module.id);
      } else {
        // Check if there's an explicit permission
        const hasExplicitPermission = permissionMap.has(module.id);
        if (hasExplicitPermission) {
          if (permissionMap.get(module.id)) {
            allowedModules.push(module.id);
          }
        } else {
          // No explicit permission, use default
          if (module.defaultEnabled) {
            allowedModules.push(module.id);
          }
        }
      }
    }

    return allowedModules;
  }

  async updateTenantModulePermissions(tenantId: string, modules: Record<string, boolean>): Promise<void> {
    const coreModuleIds = getCoreModuleIds();

    for (const [moduleId, enabled] of Object.entries(modules)) {
      // Skip core modules - they're always enabled
      if (coreModuleIds.includes(moduleId)) {
        continue;
      }

      // Check if permission already exists
      const existing = await db
        .select()
        .from(tenantModulePermissions)
        .where(and(
          eq(tenantModulePermissions.tenantId, tenantId),
          eq(tenantModulePermissions.moduleId, moduleId)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing permission
        await db
          .update(tenantModulePermissions)
          .set({ enabled })
          .where(eq(tenantModulePermissions.id, existing[0].id));
      } else {
        // Insert new permission
        await db.insert(tenantModulePermissions).values({
          tenantId,
          moduleId,
          enabled,
        });
      }
    }
  }

  async isModuleEnabledForTenant(tenantId: string, moduleId: string): Promise<boolean> {
    // Core modules are always enabled
    const coreModuleIds = getCoreModuleIds();
    if (coreModuleIds.includes(moduleId)) {
      return true;
    }

    // Check explicit permission
    const permission = await db
      .select()
      .from(tenantModulePermissions)
      .where(and(
        eq(tenantModulePermissions.tenantId, tenantId),
        eq(tenantModulePermissions.moduleId, moduleId)
      ))
      .limit(1);

    if (permission.length > 0) {
      return permission[0].enabled;
    }

    // No explicit permission, check default
    const moduleDef = MODULE_DEFINITIONS.find(m => m.id === moduleId);
    return moduleDef?.defaultEnabled ?? false;
  }
}

export const storage = new DbStorage();
