import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, 
  insertServiceSchema, 
  insertAppointmentSchema,
  insertTenantSchema,
  insertUserSchema 
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

// Middleware para verificar autenticação
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

// Middleware para verificar se é admin master
function requireMasterAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== 'master_admin') {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores master." });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===========================================
  // ROTAS DE AUTENTICAÇÃO
  // ===========================================
  
  // POST /api/auth/login - Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.active) {
        return res.status(401).json({ error: "Usuário ou senha inválidos" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Usuário ou senha inválidos" });
      }

      const tenant = await storage.getTenant(user.tenantId);
      if (!tenant || !tenant.active) {
        return res.status(401).json({ error: "Tenant inativo" });
      }

      req.session.userId = user.id;
      req.session.tenantId = user.tenantId;
      req.session.role = user.role;
      req.session.username = user.username;

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          role: user.role,
          tenantId: user.tenantId
        },
        tenant: {
          id: tenant.id,
          name: tenant.name
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  // POST /api/auth/logout - Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // GET /api/auth/me - Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const tenant = await storage.getTenant(user.tenantId);
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          role: user.role,
          tenantId: user.tenantId
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name
        } : null
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  });

  // ===========================================
  // ROTAS MASTER ADMIN - GESTÃO DE TENANTS
  // ===========================================
  
  // GET /api/admin/tenants - List all tenants (master admin only)
  app.get("/api/admin/tenants", requireMasterAdmin, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Erro ao buscar tenants" });
    }
  });

  // POST /api/admin/tenants - Create new tenant (master admin only)
  app.post("/api/admin/tenants", requireMasterAdmin, async (req, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(validatedData);
      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Erro ao criar tenant" });
    }
  });

  // PUT /api/admin/tenants/:id - Update tenant (master admin only)
  app.put("/api/admin/tenants/:id", requireMasterAdmin, async (req, res) => {
    try {
      const validatedData = insertTenantSchema.partial().parse(req.body);
      const tenant = await storage.updateTenant(req.params.id, validatedData);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant não encontrado" });
      }
      res.json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Erro ao atualizar tenant" });
    }
  });

  // DELETE /api/admin/tenants/:id - Delete tenant (master admin only)
  app.delete("/api/admin/tenants/:id", requireMasterAdmin, async (req, res) => {
    try {
      const success = await storage.deleteTenant(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tenant não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ error: "Erro ao deletar tenant" });
    }
  });

  // POST /api/admin/tenants/:id/users - Create user for tenant (master admin only)
  app.post("/api/admin/tenants/:tenantId/users", requireMasterAdmin, async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const validatedData = insertUserSchema.parse({
        ...userData,
        password: hashedPassword,
        tenantId: req.params.tenantId
      });
      
      const user = await storage.createUser(validatedData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  });

  // ===========================================
  // ROTAS DE USUÁRIOS
  // ===========================================
  
  // GET /api/users - List users of current tenant
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsersByTenant(req.session.tenantId!);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // ===========================================
  // ROTAS DE CLIENTES (COM ISOLAMENTO TENANT)
  // ===========================================
  
  // GET /api/clients - List all clients of current tenant
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const search = req.query.search as string;
      let clients;
      
      if (search) {
        clients = await storage.searchClients(req.session.tenantId!, search);
      } else {
        clients = await storage.getAllClients(req.session.tenantId!);
      }
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  // GET /api/clients/:id - Get a specific client
  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id, req.session.tenantId!);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Erro ao buscar cliente" });
    }
  });

  // POST /api/clients - Create a new client
  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse({
        ...req.body,
        tenantId: req.session.tenantId
      });
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de cliente inválidos", details: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Erro ao criar cliente" });
    }
  });

  // PUT /api/clients/:id - Update a client
  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, req.session.tenantId!, validatedData);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de cliente inválidos", details: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  });

  // DELETE /api/clients/:id - Delete a client
  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteClient(req.params.id, req.session.tenantId!);
      if (!success) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Erro ao deletar cliente" });
    }
  });

  // ===========================================
  // ROTAS DE SERVIÇOS (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/services - List all services of current tenant
  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const search = req.query.search as string;
      let services;
      
      if (search) {
        services = await storage.searchServices(req.session.tenantId!, search);
      } else {
        services = await storage.getAllServices(req.session.tenantId!);
      }
      
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Erro ao buscar serviços" });
    }
  });

  // GET /api/services/:id - Get a specific service
  app.get("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const service = await storage.getService(req.params.id, req.session.tenantId!);
      if (!service) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ error: "Erro ao buscar serviço" });
    }
  });

  // POST /api/services - Create a new service
  app.post("/api/services", requireAuth, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse({
        ...req.body,
        tenantId: req.session.tenantId
      });
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de serviço inválidos", details: error.errors });
      }
      console.error("Error creating service:", error);
      res.status(500).json({ error: "Erro ao criar serviço" });
    }
  });

  // PUT /api/services/:id - Update a service
  app.put("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, req.session.tenantId!, validatedData);
      if (!service) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de serviço inválidos", details: error.errors });
      }
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Erro ao atualizar serviço" });
    }
  });

  // DELETE /api/services/:id - Delete a service
  app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteService(req.params.id, req.session.tenantId!);
      if (!success) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Erro ao deletar serviço" });
    }
  });

  // ===========================================
  // ROTAS DE AGENDAMENTOS (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/appointments - List all appointments of current tenant
  app.get("/api/appointments", requireAuth, async (req, res) => {
    try {
      const { clientId, serviceId, startDate, endDate, date, time } = req.query;

      if (date && time) {
        const appointments = await storage.getAppointmentsByDateRange(
          req.session.tenantId!,
          date as string,
          date as string
        );
        const existingAppointment = appointments.find(
          (apt) => apt.date === date && apt.time === time
        );
        return res.json({ available: !existingAppointment });
      }

      if (startDate && endDate) {
        const appointments = await storage.getAppointmentsByDateRange(
          req.session.tenantId!,
          startDate as string,
          endDate as string,
          clientId as string | undefined
        );
        return res.json(appointments);
      }

      const appointments = await storage.getAllAppointments(
        req.session.tenantId!,
        clientId as string | undefined
      );
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
  });

  // GET /api/appointments/:id - Get a specific appointment
  app.get("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id, req.session.tenantId!);
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Erro ao buscar agendamento" });
    }
  });

  // POST /api/appointments - Create a new appointment
  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const existingAppointments = await storage.getAppointmentsByDateRange(
        req.session.tenantId!,
        req.body.date,
        req.body.date
      );
      const conflict = existingAppointments.find(
        (apt) => apt.date === req.body.date && apt.time === req.body.time
      );
      if (conflict) {
        return res.status(409).json({ error: "Já existe um agendamento neste horário" });
      }

      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        tenantId: req.session.tenantId
      });
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de agendamento inválidos", details: error.errors });
      }
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Erro ao criar agendamento" });
    }
  });

  // PUT /api/appointments/:id - Update an appointment
  app.put("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      if (req.body.date && req.body.time) {
        const existingAppointments = await storage.getAppointmentsByDateRange(
          req.session.tenantId!,
          req.body.date,
          req.body.date
        );
        const conflict = existingAppointments.find(
          (apt) =>
            apt.date === req.body.date &&
            apt.time === req.body.time &&
            apt.id !== req.params.id
        );
        if (conflict) {
          return res.status(409).json({ error: "Já existe um agendamento neste horário" });
        }
      }

      const validatedData = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(
        req.params.id,
        req.session.tenantId!,
        validatedData
      );
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de agendamento inválidos", details: error.errors });
      }
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
  });

  // DELETE /api/appointments/:id - Delete an appointment
  app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteAppointment(req.params.id, req.session.tenantId!);
      if (!success) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ error: "Erro ao deletar agendamento" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
