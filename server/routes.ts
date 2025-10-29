import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, 
  insertServiceSchema, 
  insertAppointmentSchema,
  insertTenantSchema,
  insertUserSchema,
  insertBusinessHoursSchema,
  type InsertUser
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import Papa from "papaparse";

declare module 'express-serve-static-core' {
  interface Request {
    authContext?: {
      tenantId?: string;
      userId?: string;
      apiTokenId?: string;
    };
  }
}

// Helper para obter tenantId (session ou API token)
function getTenantId(req: Request): string | undefined {
  return req.authContext?.tenantId || req.session.tenantId;
}

// Middleware para autenticar request via session ou API token
// IMPORTANTE: Prioriza Bearer token se presente, para permitir teste de revogação
async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  // Verificar Authorization header PRIMEIRO (prioridade sobre session)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    const tokenData = await storage.validateApiToken(token);
    if (tokenData) {
      req.authContext = {
        tenantId: tokenData.tenantId,
        apiTokenId: tokenData.tokenId,
      };
      
      await storage.markApiTokenUsed(tokenData.tokenId);
      return next();
    }
    // Se Bearer token foi fornecido mas é inválido, retornar 401
    // Não fazer fallback para session
    return res.status(401).json({ error: "Token inválido ou revogado" });
  }
  
  // Se não há Bearer token, tentar autenticação por session
  // Master admin pode ter tenantId null
  if (req.session.userId) {
    req.authContext = {
      tenantId: req.session.tenantId || undefined,
      userId: req.session.userId,
    };
    return next();
  }
  
  return res.status(401).json({ error: "Não autenticado" });
}

// Middleware para verificar autenticação (aceita session ou token)
// Permite master_admin sem tenant
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  // Master admin pode não ter tenant
  if (req.session.role === 'master_admin') {
    return next();
  }
  // Usuários normais precisam de tenant
  const tenantId = getTenantId(req);
  if (!tenantId) {
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

// Middleware para verificar se é admin do tenant (não permite API tokens nesta rota)
function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.tenantId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  if (req.session.role !== 'admin' && req.session.role !== 'master_admin') {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===========================================
  // ROTAS DE SETUP (SEM AUTENTICAÇÃO)
  // ===========================================
  
  // GET /api/setup/status - Verificar se o sistema já foi instalado
  app.get("/api/setup/status", async (req, res) => {
    try {
      const hasAdmin = await storage.hasMasterAdmin();
      res.json({ installed: hasAdmin });
    } catch (error) {
      console.error("Error checking setup status:", error);
      res.status(500).json({ error: "Erro ao verificar status da instalação" });
    }
  });

  // POST /api/setup - Instalar o sistema (criar primeiro admin master)
  app.post("/api/setup", async (req, res) => {
    try {
      // Verificar se já foi instalado
      const hasAdmin = await storage.hasMasterAdmin();
      if (hasAdmin) {
        return res.status(400).json({ error: "Sistema já foi instalado" });
      }

      const { username, name, email, password } = req.body;

      if (!username || !name || !email || !password) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
      }

      // Validar dados
      if (password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar primeiro admin master (sem tenantId)
      const adminData: InsertUser = {
        username,
        name,
        email,
        password: hashedPassword,
        role: "master_admin",
        tenantId: null,
        active: true,
      };

      const user = await storage.createUser(adminData);
      
      res.status(201).json({ 
        success: true,
        message: "Sistema instalado com sucesso",
        user: { id: user.id, username: user.username, name: user.name }
      });
    } catch (error: any) {
      console.error("Error during setup:", error);
      res.status(500).json({ error: error.message || "Erro ao instalar sistema" });
    }
  });
  
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

      // Master admin não precisa de tenant
      let tenant = null;
      if (user.role !== 'master_admin') {
        if (!user.tenantId) {
          return res.status(401).json({ error: "Usuário sem tenant associado" });
        }
        tenant = await storage.getTenant(user.tenantId);
        if (!tenant || !tenant.active) {
          return res.status(401).json({ error: "Tenant inativo" });
        }
      }

      req.session.userId = user.id;
      req.session.tenantId = user.tenantId ?? undefined;
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
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name
        } : null
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

      let tenant = null;
      if (user.tenantId) {
        tenant = await storage.getTenant(user.tenantId);
      }
      
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
  // MIDDLEWARE DE AUTENTICAÇÃO DUAL (SESSION + API TOKEN)
  // ===========================================
  // Aplicar authenticateRequest em todas as rotas protegidas (exceto login/logout)
  // Isso permite tanto autenticação via session quanto via Bearer token
  app.use("/api/clients", authenticateRequest);
  app.use("/api/services", authenticateRequest);
  app.use("/api/appointments", authenticateRequest);
  app.use("/api/settings", authenticateRequest);

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

  // GET /api/admin/tenants/:tenantId/api-tokens - List API tokens for specific tenant (master admin only)
  app.get("/api/admin/tenants/:tenantId/api-tokens", requireMasterAdmin, async (req, res) => {
    try {
      const tokens = await storage.getApiTokensByTenant(req.params.tenantId);
      const tokensWithoutHashes = tokens.map(({ tokenHash, ...token }) => token);
      res.json(tokensWithoutHashes);
    } catch (error) {
      console.error("Error fetching API tokens:", error);
      res.status(500).json({ error: "Erro ao buscar tokens" });
    }
  });

  // POST /api/admin/tenants/:tenantId/api-tokens - Create API token for specific tenant (master admin only)
  app.post("/api/admin/tenants/:tenantId/api-tokens", requireMasterAdmin, async (req, res) => {
    try {
      const { label } = req.body;
      const userId = req.session.userId;
      
      if (!label || typeof label !== 'string') {
        return res.status(400).json({ error: "Label é obrigatório" });
      }

      if (!userId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { token, tokenRecord } = await storage.createApiToken(req.params.tenantId, label, userId);
      
      const { tokenHash, ...tokenWithoutHash } = tokenRecord;
      res.status(201).json({
        ...tokenWithoutHash,
        token,
      });
    } catch (error) {
      console.error("Error creating API token:", error);
      res.status(500).json({ error: "Erro ao criar token" });
    }
  });

  // DELETE /api/admin/api-tokens/:id - Revoke API token (master admin only, any tenant)
  app.delete("/api/admin/api-tokens/:id", requireMasterAdmin, async (req, res) => {
    try {
      const success = await storage.revokeApiTokenAdmin(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Token não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error revoking API token:", error);
      res.status(500).json({ error: "Erro ao revogar token" });
    }
  });

  // GET /api/admin/appointments - List all appointments from all tenants (master admin only)
  app.get("/api/admin/appointments", requireMasterAdmin, async (req, res) => {
    try {
      const appointments = await storage.getAllAppointmentsAdmin();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching all appointments:", error);
      res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
  });

  // PUT /api/admin/appointments/:id - Update appointment from any tenant (master admin only)
  app.put("/api/admin/appointments/:id", requireMasterAdmin, async (req, res) => {
    try {
      // Validate conflict if date/time are being updated
      if (req.body.date && req.body.time) {
        // Get the appointment first to know its tenant
        const existingAppointment = await storage.getAppointmentAdmin(req.params.id);
        if (!existingAppointment) {
          return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        const existingAppointments = await storage.getAppointmentsByDateRange(
          existingAppointment.tenantId,
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
      const appointment = await storage.updateAppointmentAdmin(req.params.id, validatedData);
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

  // ===========================================
  // ROTAS DE GERENCIAMENTO DE USUÁRIOS (TENANT ADMIN)
  // ===========================================
  
  // GET /api/users - List all users of current tenant (admin only)
  app.get("/api/users", requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const users = await storage.getUsersByTenant(tenantId);
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // GET /api/users/:id - Get specific user (admin only)
  app.get("/api/users/:id", requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const user = await storage.getUserWithTenantIsolation(req.params.id, tenantId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  });

  // POST /api/users - Create new user in current tenant (admin only)
  app.post("/api/users", requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const { password, role, ...userData } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      const userRole = role || 'user';
      if (userRole !== 'user' && userRole !== 'admin') {
        return res.status(400).json({ error: "Role inválido. Use 'user' ou 'admin'" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const validatedData = insertUserSchema.parse({
        ...userData,
        password: hashedPassword,
        role: userRole,
        tenantId
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

  // PUT /api/users/:id - Update user (admin only)
  app.put("/api/users/:id", requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const { password, role, ...userData } = req.body;
      
      let updateData: Partial<InsertUser> = userData;

      if (role) {
        if (role !== 'user' && role !== 'admin') {
          return res.status(400).json({ error: "Role inválido. Use 'user' ou 'admin'" });
        }
        updateData.role = role;
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      const validatedData = insertUserSchema.partial().parse(updateData);
      const user = await storage.updateUserWithTenantIsolation(req.params.id, tenantId, validatedData);
      
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // DELETE /api/users/:id - Delete user (admin only)
  app.delete("/api/users/:id", requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      
      if (req.params.id === req.session.userId) {
        return res.status(400).json({ error: "Você não pode deletar seu próprio usuário" });
      }

      // Buscar o usuário antes de deletar para verificar se é master_admin
      const userToDelete = await storage.getUserWithTenantIsolation(req.params.id, tenantId);
      if (!userToDelete) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Proteger usuários master_admin contra exclusão
      if (userToDelete.role === 'master_admin') {
        return res.status(403).json({ error: "Usuários master admin não podem ser excluídos" });
      }

      const success = await storage.deleteUserWithTenantIsolation(req.params.id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Erro ao deletar usuário" });
    }
  });

  // ===========================================
  // ROTAS DE API TOKENS (GERENCIAMENTO)
  // ===========================================
  
  // GET /api/settings/api-tokens - List API tokens for current tenant
  app.get("/api/settings/api-tokens", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const tokens = await storage.getApiTokensByTenant(tenantId);
      const tokensWithoutHashes = tokens.map(({ tokenHash, ...token }) => token);
      res.json(tokensWithoutHashes);
    } catch (error) {
      console.error("Error fetching API tokens:", error);
      res.status(500).json({ error: "Erro ao buscar tokens" });
    }
  });

  // POST /api/settings/api-tokens - Create new API token
  app.post("/api/settings/api-tokens", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const userId = req.session.userId;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: "Não autenticado ou sem permissão" });
      }

      const { label } = req.body;
      if (!label || typeof label !== 'string') {
        return res.status(400).json({ error: "Label é obrigatório" });
      }

      const { token, tokenRecord } = await storage.createApiToken(tenantId, label, userId);
      
      const { tokenHash, ...tokenWithoutHash } = tokenRecord;
      res.status(201).json({
        ...tokenWithoutHash,
        token,
      });
    } catch (error) {
      console.error("Error creating API token:", error);
      res.status(500).json({ error: "Erro ao criar token" });
    }
  });

  // DELETE /api/settings/api-tokens/:id - Revoke API token
  app.delete("/api/settings/api-tokens/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const success = await storage.revokeApiToken(req.params.id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Token não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error revoking API token:", error);
      res.status(500).json({ error: "Erro ao revogar token" });
    }
  });

  // ===========================================
  // ROTAS DE HORÁRIOS DE FUNCIONAMENTO (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/business-hours - List business hours for current tenant
  app.get("/api/business-hours", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      
      const businessHours = await storage.getBusinessHours(tenantId);
      res.json(businessHours);
    } catch (error) {
      console.error("Error fetching business hours:", error);
      res.status(500).json({ error: "Erro ao buscar horários de funcionamento" });
    }
  });

  // POST /api/business-hours - Create business hours
  app.post("/api/business-hours", authenticateRequest, requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validatedData = insertBusinessHoursSchema.parse({
        ...req.body,
        tenantId
      });

      const businessHour = await storage.createBusinessHours(validatedData);
      res.status(201).json(businessHour);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error creating business hours:", error);
      res.status(500).json({ error: "Erro ao criar horário de funcionamento" });
    }
  });

  // PUT /api/business-hours/:id - Update business hours
  app.put("/api/business-hours/:id", authenticateRequest, requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Omit tenantId from update to prevent tenant reassignment
      const validatedData = insertBusinessHoursSchema.omit({ tenantId: true }).partial().parse(req.body);
      const businessHour = await storage.updateBusinessHours(req.params.id, tenantId, validatedData);
      
      if (!businessHour) {
        return res.status(404).json({ error: "Horário de funcionamento não encontrado" });
      }
      
      res.json(businessHour);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error updating business hours:", error);
      res.status(500).json({ error: "Erro ao atualizar horário de funcionamento" });
    }
  });

  // DELETE /api/business-hours/:id - Delete business hours
  app.delete("/api/business-hours/:id", authenticateRequest, requireTenantAdmin, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const success = await storage.deleteBusinessHours(req.params.id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Horário de funcionamento não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting business hours:", error);
      res.status(500).json({ error: "Erro ao deletar horário de funcionamento" });
    }
  });

  // ===========================================
  // ROTAS DE CLIENTES (COM ISOLAMENTO TENANT)
  // ===========================================
  
  // GET /api/clients - List all clients of current tenant
  app.get("/api/clients", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const search = req.query.search as string;
      let clients;
      
      if (search) {
        clients = await storage.searchClients(tenantId, search);
      } else {
        clients = await storage.getAllClients(tenantId);
      }
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  // GET /api/clients/:id - Get a specific client
  app.get("/api/clients/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const client = await storage.getClient(req.params.id, tenantId);
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
  app.post("/api/clients", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const validatedData = insertClientSchema.parse({
        ...req.body,
        tenantId
      });
      
      // Verificar se já existe um cliente com o mesmo telefone neste tenant
      const existingClient = await storage.getClientByPhone(validatedData.phone, tenantId);
      if (existingClient) {
        return res.status(409).json({ 
          error: "Já existe um cliente cadastrado com este número de telefone" 
        });
      }
      
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
  app.put("/api/clients/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const validatedData = insertClientSchema.partial().parse(req.body);
      
      // Se está atualizando o telefone, verificar se já existe outro cliente com esse telefone
      if (validatedData.phone) {
        const existingClient = await storage.getClientByPhone(validatedData.phone, tenantId);
        if (existingClient && existingClient.id !== req.params.id) {
          return res.status(409).json({ 
            error: "Já existe um cliente cadastrado com este número de telefone" 
          });
        }
      }
      
      const client = await storage.updateClient(req.params.id, tenantId, validatedData);
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
  app.delete("/api/clients/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const success = await storage.deleteClient(req.params.id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Erro ao deletar cliente" });
    }
  });

  // GET /api/clients/:id/appointments - Get all appointments for a specific client
  app.get("/api/clients/:id/appointments", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const client = await storage.getClient(req.params.id, tenantId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const appointments = await storage.getAppointmentsByClient(req.params.id, tenantId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching client appointments:", error);
      res.status(500).json({ error: "Erro ao buscar agendamentos do cliente" });
    }
  });

  // GET /api/clients/:id/stats - Get statistics for a specific client
  app.get("/api/clients/:id/stats", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const client = await storage.getClient(req.params.id, tenantId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const stats = await storage.getClientStats(req.params.id, tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching client stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas do cliente" });
    }
  });

  // ===========================================
  // ROTAS DE SERVIÇOS (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/services - List all services of current tenant
  app.get("/api/services", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const search = req.query.search as string;
      let services;
      
      if (search) {
        services = await storage.searchServices(tenantId, search);
      } else {
        services = await storage.getAllServices(tenantId);
      }
      
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Erro ao buscar serviços" });
    }
  });

  // GET /api/services/template - Download CSV template for bulk import
  // IMPORTANTE: Deve vir ANTES de /api/services/:id para não ser capturado como :id
  app.get("/api/services/template", authenticateRequest, async (req, res) => {
    try {
      // CSV template with headers and example row
      const csvContent = `nome,categoria,valor,descricao
Corte de Cabelo,Beleza,50.00,Corte de cabelo masculino ou feminino
Manicure,Beleza,35.00,Serviço de manicure completo
Pedicure,Beleza,40.00,Serviço de pedicure completo
Massagem Relaxante,Saúde,80.00,Massagem relaxante de 1 hora
Limpeza de Pele,Beleza,120.00,Limpeza de pele profunda`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=modelo-servicos.csv');
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ error: "Erro ao gerar modelo CSV" });
    }
  });

  // POST /api/services/import - Import services from CSV
  // IMPORTANTE: Deve vir ANTES de /api/services/:id para não ser capturado como :id
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos CSV são permitidos'));
      }
    }
  });

  app.post("/api/services/import", authenticateRequest, upload.single('file'), async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      // Parse CSV
      const csvText = req.file.buffer.toString('utf-8');
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase()
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({ 
          error: "Erro ao processar CSV", 
          details: parseResult.errors 
        });
      }

      const rows = parseResult.data as any[];
      const imported: any[] = [];
      const errors: any[] = [];

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          // Map Portuguese column names to English (papaparse already lowercased headers)
          const name = row.nome || row.name;
          const category = row.categoria || row.category;
          const valueStr = row.valor || row.value;
          const description = row.descricao || row.description;

          // Skip empty rows
          if (!name && !category && !valueStr) {
            continue;
          }

          // Validate and create service
          const validatedData = insertServiceSchema.parse({
            name: name,
            category: category,
            value: parseFloat(valueStr),
            description: description || null,
            tenantId
          });

          const service = await storage.createService(validatedData);
          imported.push(service);
        } catch (error) {
          errors.push({
            row: i + 2, // +2 because CSV has header row and is 1-indexed
            data: row,
            error: error instanceof z.ZodError ? error.errors : String(error)
          });
        }
      }

      res.json({
        success: true,
        imported: imported.length,
        errors: errors.length,
        details: {
          services: imported,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      console.error("Error importing services:", error);
      res.status(500).json({ error: "Erro ao importar serviços" });
    }
  });

  // GET /api/services/:id - Get a specific service
  app.get("/api/services/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const service = await storage.getService(req.params.id, tenantId);
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
  app.post("/api/services", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const validatedData = insertServiceSchema.parse({
        ...req.body,
        tenantId
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
  app.put("/api/services/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const validatedData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, tenantId, validatedData);
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
  app.delete("/api/services/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const success = await storage.deleteService(req.params.id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Erro ao deletar serviço" });
    }
  });

  // GET /api/services/:id/appointments - Get all appointments for a specific service
  app.get("/api/services/:id/appointments", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const service = await storage.getService(req.params.id, tenantId);
      if (!service) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      
      const appointments = await storage.getAppointmentsByService(req.params.id, tenantId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching service appointments:", error);
      res.status(500).json({ error: "Erro ao buscar agendamentos do serviço" });
    }
  });

  // ===========================================
  // ROTAS DE AGENDAMENTOS (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/appointments - List all appointments of current tenant
  app.get("/api/appointments", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const { clientId, serviceId, startDate, endDate, date, time } = req.query;

      if (date && time) {
        const appointments = await storage.getAppointmentsByDateRange(
          tenantId,
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
          tenantId,
          startDate as string,
          endDate as string,
          clientId as string | undefined
        );
        return res.json(appointments);
      }

      const appointments = await storage.getAllAppointments(
        tenantId,
        clientId as string | undefined,
        serviceId as string | undefined
      );
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
  });

  // GET /api/appointments/:id - Get a specific appointment
  app.get("/api/appointments/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const appointment = await storage.getAppointment(req.params.id, tenantId);
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
  app.post("/api/appointments", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const existingAppointments = await storage.getAppointmentsByDateRange(
        tenantId,
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
        tenantId
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
  app.put("/api/appointments/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      if (req.body.date && req.body.time) {
        const existingAppointments = await storage.getAppointmentsByDateRange(
          tenantId,
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
        tenantId,
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
  app.delete("/api/appointments/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const success = await storage.deleteAppointment(req.params.id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ error: "Erro ao deletar agendamento" });
    }
  });

  // ===========================================
  // ROTA DE DISPONIBILIDADE
  // ===========================================

  // GET /api/availability - Get available time slots
  app.get("/api/availability", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      let { startDate, endDate, clientId, serviceId } = req.query;

      // Se não fornecidos, usar valores padrão (hoje até 30 dias)
      if (!startDate) {
        startDate = new Date().toISOString().split('T')[0];
      }
      if (!endDate) {
        const defaultEndDate = new Date();
        defaultEndDate.setDate(defaultEndDate.getDate() + 30);
        endDate = defaultEndDate.toISOString().split('T')[0];
      }

      // Validar formato de data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
        return res.status(400).json({ error: "Formato de data inválido. Use YYYY-MM-DD" });
      }

      // Buscar horários de funcionamento
      const businessHours = await storage.getBusinessHours(tenantId);
      
      // Buscar agendamentos existentes no período
      const appointments = await storage.getAppointmentsByDateRange(
        tenantId,
        startDate as string,
        endDate as string,
        clientId as string | undefined
      );

      // Filtrar por serviceId se fornecido
      const filteredAppointments = serviceId 
        ? appointments.filter(apt => apt.serviceId === serviceId)
        : appointments;

      // Calcular disponibilidade por dia
      const availability = [];
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

        // Encontrar horários de funcionamento para este dia
        const dayBusinessHours = businessHours.filter(
          bh => bh.dayOfWeek === dayOfWeek && bh.active
        );

        if (dayBusinessHours.length === 0) {
          // Dia sem expediente
          continue;
        }

        // Agendamentos deste dia
        const dayAppointments = filteredAppointments.filter(
          apt => apt.date === dateStr
        );

        availability.push({
          date: dateStr,
          dayOfWeek,
          businessHours: dayBusinessHours.map(bh => ({
            startTime: bh.startTime,
            endTime: bh.endTime
          })),
          appointments: dayAppointments.map(apt => ({
            id: apt.id,
            time: apt.time,
            duration: apt.duration,
            clientId: apt.clientId,
            serviceId: apt.serviceId,
            status: apt.status
          }))
        });
      }

      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Erro ao buscar disponibilidade" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
