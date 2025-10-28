import { 
  type Client, 
  type InsertClient,
  type Appointment,
  type InsertAppointment,
  clients,
  appointments
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // Client operations
  getClient(id: string): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Appointment operations
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAllAppointments(clientId?: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string, clientId?: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Client operations
  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db
      .update(clients)
      .set(clientData)
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  // Appointment operations
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async getAllAppointments(clientId?: string): Promise<Appointment[]> {
    if (clientId) {
      return await db
        .select()
        .from(appointments)
        .where(eq(appointments.clientId, clientId))
        .orderBy(desc(appointments.date), desc(appointments.time));
    }
    return await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  async getAppointmentsByDateRange(
    startDate: string,
    endDate: string,
    clientId?: string
  ): Promise<Appointment[]> {
    const conditions = [
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
    appointmentData: Partial<InsertAppointment>
  ): Promise<Appointment | undefined> {
    const result = await db
      .update(appointments)
      .set(appointmentData)
      .where(eq(appointments.id, id))
      .returning();
    return result[0];
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
