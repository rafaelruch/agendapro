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
  clients,
  services,
  appointments,
  tenants,
  users,
  tenantApiTokens,
  businessHours,
  appointmentServices
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

  // Admin operations (no tenant isolation)
  getAllAppointmentsAdmin(): Promise<Appointment[]>;
  getAppointmentAdmin(id: string): Promise<Appointment | undefined>;
  updateAppointmentAdmin(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
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
            like(clients.email, searchPattern),
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
    const serviceData = {
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
      
      return await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(desc(appointments.date), desc(appointments.time));
    }
    
    const conditions = [eq(appointments.tenantId, tenantId)];
    
    if (clientId) {
      conditions.push(eq(appointments.clientId, clientId));
    }
    
    if (status) {
      conditions.push(eq(appointments.status, status));
    }
    
    return await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.date), desc(appointments.time));
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

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const { serviceIds, ...appointmentData } = insertAppointment;
    
    return await db.transaction(async (tx) => {
      const result = await tx.insert(appointments).values(appointmentData).returning();
      const appointment = result[0];
      
      if (serviceIds && serviceIds.length > 0) {
        const values = serviceIds.map(serviceId => ({
          appointmentId: appointment.id,
          serviceId,
        }));
        await tx.insert(appointmentServices).values(values);
      }
      
      return appointment;
    });
  }

  async updateAppointment(
    id: string,
    tenantId: string,
    appointmentData: Partial<InsertAppointment>
  ): Promise<Appointment | undefined> {
    const { serviceIds, ...dataToUpdate } = appointmentData;
    
    return await db.transaction(async (tx) => {
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
        
        if (serviceIds.length > 0) {
          const values = serviceIds.map(serviceId => ({
            appointmentId: id,
            serviceId,
          }));
          await tx.insert(appointmentServices).values(values);
        }
      }
      
      return appointment;
    });
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
    await db.delete(appointmentServices).where(eq(appointmentServices.appointmentId, appointmentId));
    
    if (serviceIds.length > 0) {
      const values = serviceIds.map(serviceId => ({
        appointmentId,
        serviceId,
      }));
      await db.insert(appointmentServices).values(values);
    }
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
}

export const storage = new DbStorage();
