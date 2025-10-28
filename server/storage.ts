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
  clients,
  services,
  appointments,
  tenants,
  users
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, desc, or, like } from "drizzle-orm";

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

  // Client operations (with tenant isolation)
  getClient(id: string, tenantId: string): Promise<Client | undefined>;
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
  getAllAppointments(tenantId: string, clientId?: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(tenantId: string, startDate: string, endDate: string, clientId?: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, tenantId: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string, tenantId: string): Promise<boolean>;
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

  // Client operations (with tenant isolation)
  async getClient(id: string, tenantId: string): Promise<Client | undefined> {
    const result = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
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

  async getAllAppointments(tenantId: string, clientId?: string): Promise<Appointment[]> {
    if (clientId) {
      return await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.tenantId, tenantId), eq(appointments.clientId, clientId)))
        .orderBy(desc(appointments.date), desc(appointments.time));
    }
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId))
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
    const result = await db.insert(appointments).values(insertAppointment).returning();
    return result[0];
  }

  async updateAppointment(
    id: string,
    tenantId: string,
    appointmentData: Partial<InsertAppointment>
  ): Promise<Appointment | undefined> {
    const result = await db
      .update(appointments)
      .set(appointmentData)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async deleteAppointment(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
