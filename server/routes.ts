import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authLimiter, uploadLimiter } from "./index";
import { 
  insertClientSchema, 
  insertServiceSchema,
  updateServiceSchema,
  insertAppointmentSchema,
  insertTenantSchema,
  insertUserSchema,
  insertBusinessHoursSchema,
  insertProfessionalSchema,
  loginSchema,
  setupSchema,
  type InsertUser,
  isServiceInPromotion,
  getServiceEffectiveValue
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
  // SEGURANÇA: Rate limiting para prevenir múltiplas tentativas
  app.post("/api/setup", authLimiter, async (req, res) => {
    try {
      // Verificar se já foi instalado
      const hasAdmin = await storage.hasMasterAdmin();
      if (hasAdmin) {
        return res.status(400).json({ error: "Sistema já foi instalado" });
      }

      // SEGURANÇA: Validação Zod
      const validatedData = setupSchema.parse(req.body);
      const { username, name, email, password } = validatedData;

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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error during setup:", error);
      res.status(500).json({ error: error.message || "Erro ao instalar sistema" });
    }
  });
  
  // ===========================================
  // ROTAS DE AUTENTICAÇÃO
  // ===========================================
  
  // POST /api/auth/login - Login
  // SEGURANÇA: Rate limiting (5 tentativas a cada 10 minutos)
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      // SEGURANÇA: Validação Zod
      const validatedData = loginSchema.parse(req.body);
      const { username, password } = validatedData;

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

      // Salvar dados na sessão existente (sem regenerate para evitar problemas com proxy)
      req.session.userId = user.id;
      req.session.tenantId = user.tenantId ?? undefined;
      req.session.role = user.role;
      req.session.username = user.username;

      // Log temporário para debug em produção
      console.log(`[LOGIN] User: ${user.username}, Role: ${user.role}, TenantId: ${user.tenantId || 'null'}, SessionID: ${req.sessionID}`);

      // Salvar sessão explicitamente antes de responder
      req.session.save((err) => {
        if (err) {
          console.error("Erro ao salvar sessão:", err);
          return res.status(500).json({ error: "Erro ao salvar sessão" });
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
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
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
  // ROTAS DE PROFISSIONAIS (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/professionals - List all professionals of current tenant
  app.get("/api/professionals", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const search = req.query.search as string;
      const serviceIds = req.query.serviceIds ? (req.query.serviceIds as string).split(',') : undefined;

      let professionals;

      if (serviceIds && serviceIds.length > 0) {
        professionals = await storage.getProfessionalsByServices(serviceIds, tenantId);
      } else if (search) {
        professionals = await storage.searchProfessionals(tenantId, search);
        const professionalDetails = await Promise.all(
          professionals.map(p => storage.getProfessionalWithDetails(p.id, tenantId))
        );
        professionals = professionalDetails.filter(Boolean);
      } else {
        professionals = await storage.getAllProfessionalsWithDetails(tenantId);
      }

      res.json(professionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ error: "Erro ao buscar profissionais" });
    }
  });

  // GET /api/professionals/:id - Get a specific professional
  app.get("/api/professionals/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const professional = await storage.getProfessionalWithDetails(req.params.id, tenantId);
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      res.json(professional);
    } catch (error) {
      console.error("Error fetching professional:", error);
      res.status(500).json({ error: "Erro ao buscar profissional" });
    }
  });

  // POST /api/professionals - Create a new professional
  app.post("/api/professionals", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validatedData = insertProfessionalSchema.omit({ tenantId: true }).parse(req.body);

      // Validate services exist and belong to tenant
      if (validatedData.serviceIds && validatedData.serviceIds.length > 0) {
        for (const serviceId of validatedData.serviceIds) {
          const service = await storage.getService(serviceId, tenantId);
          if (!service) {
            return res.status(400).json({ 
              error: "Um ou mais serviços inválidos",
              invalidServices: [serviceId]
            });
          }
        }
      }

      // Validate schedule times
      if (validatedData.schedules && validatedData.schedules.length > 0) {
        for (const schedule of validatedData.schedules) {
          if (schedule.startTime >= schedule.endTime) {
            return res.status(400).json({
              error: "Horário de início deve ser menor que horário de término"
            });
          }
        }
      }

      const professional = await storage.createProfessional(validatedData, tenantId);
      res.status(201).json(professional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error creating professional:", error);
      res.status(500).json({ error: "Erro ao criar profissional" });
    }
  });

  // PUT /api/professionals/:id - Update a professional
  app.put("/api/professionals/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validatedData = insertProfessionalSchema.omit({ tenantId: true }).partial().parse(req.body);

      // Validate services if provided
      if (validatedData.serviceIds && validatedData.serviceIds.length > 0) {
        for (const serviceId of validatedData.serviceIds) {
          const service = await storage.getService(serviceId, tenantId);
          if (!service) {
            return res.status(400).json({ 
              error: "Um ou mais serviços inválidos",
              invalidServices: [serviceId]
            });
          }
        }
      }

      // Validate schedule times if provided
      if (validatedData.schedules && validatedData.schedules.length > 0) {
        for (const schedule of validatedData.schedules) {
          if (schedule.startTime >= schedule.endTime) {
            return res.status(400).json({
              error: "Horário de início deve ser menor que horário de término"
            });
          }
        }
      }

      const professional = await storage.updateProfessional(req.params.id, tenantId, validatedData);
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      res.json(professional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error updating professional:", error);
      res.status(500).json({ error: "Erro ao atualizar profissional" });
    }
  });

  // DELETE /api/professionals/:id - Delete a professional
  app.delete("/api/professionals/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const success = await storage.deleteProfessional(req.params.id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting professional:", error);
      res.status(500).json({ error: "Erro ao deletar profissional" });
    }
  });

  // ===========================================
  // ROTAS DE CLIENTES (COM ISOLAMENTO TENANT)
  // ===========================================
  
  // GET /api/clients - List all clients of current tenant
  app.get("/api/clients", authenticateRequest, async (req, res) => {
    try {
      const userRole = req.session.role;
      let tenantId: string | null;

      if (userRole === 'master_admin') {
        tenantId = req.query.tenantId as string || null;
        if (!tenantId) {
          return res.status(400).json({ 
            error: "Master admin deve especificar tenantId via query param: ?tenantId=..." 
          });
        }
      } else {
        tenantId = getTenantId(req)!;
      }

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
      const userRole = req.session.role;
      let tenantId: string | null;

      if (userRole === 'master_admin') {
        tenantId = req.query.tenantId as string || null;
        if (!tenantId) {
          return res.status(400).json({ 
            error: "Master admin deve especificar tenantId via query param: ?tenantId=..." 
          });
        }
      } else {
        tenantId = getTenantId(req)!;
      }

      const search = req.query.search as string;
      let services;
      
      if (search) {
        services = await storage.searchServices(tenantId, search);
      } else {
        services = await storage.getAllServices(tenantId);
      }
      
      // Adicionar campos calculados de promoção
      const servicesWithPromotion = services.map(service => ({
        ...service,
        isPromotionActive: isServiceInPromotion(service),
        effectiveValue: getServiceEffectiveValue(service)
      }));
      
      res.json(servicesWithPromotion);
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
  // SEGURANÇA: Configuração de upload com limites rigorosos
  const MAX_CSV_ROWS = 1000; // Máximo de 1000 serviços por upload
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: MAX_FILE_SIZE,
      files: 1 // Apenas 1 arquivo por vez
    },
    fileFilter: (req, file, cb) => {
      // SEGURANÇA: Validar tipo de arquivo rigorosamente
      const isCSV = file.mimetype === 'text/csv' || 
                    file.mimetype === 'application/vnd.ms-excel' ||
                    file.originalname.toLowerCase().endsWith('.csv');
      
      if (isCSV) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos CSV são permitidos'));
      }
    }
  });

  // SEGURANÇA: Rate limiting para uploads (10 uploads por hora)
  app.post("/api/services/import", uploadLimiter, authenticateRequest, upload.single('file'), async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      // SEGURANÇA: Validar tamanho do arquivo
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({ 
          error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        });
      }

      // Parse CSV
      const csvText = req.file.buffer.toString('utf-8');
      
      // SEGURANÇA: Validar que o conteúdo é texto válido
      if (!csvText || csvText.trim().length === 0) {
        return res.status(400).json({ error: "Arquivo CSV vazio" });
      }
      
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
      
      // SEGURANÇA: Limitar número de linhas para prevenir DoS
      if (rows.length === 0) {
        return res.status(400).json({ 
          error: "CSV não contém dados válidos" 
        });
      }
      
      if (rows.length > MAX_CSV_ROWS) {
        return res.status(413).json({ 
          error: `Arquivo contém muitas linhas. Máximo permitido: ${MAX_CSV_ROWS} serviços` 
        });
      }
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
      // SEGURANÇA: Tratamento específico de erros do multer
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
          });
        }
        return res.status(400).json({ 
          error: 'Erro no upload', 
          details: error.message 
        });
      }
      
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
      
      // Adicionar campos calculados de promoção
      const serviceWithPromotion = {
        ...service,
        isPromotionActive: isServiceInPromotion(service),
        effectiveValue: getServiceEffectiveValue(service)
      };
      
      res.json(serviceWithPromotion);
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
      
      // Normalizar ANTES da validação: se qualquer campo promocional está presente,
      // garantir que todos estejam presentes (como null se ausentes) para validação funcionar
      const hasAnyPromoField = 
        'promotionalValue' in req.body || 
        'promotionStartDate' in req.body || 
        'promotionEndDate' in req.body;
      
      if (hasAnyPromoField) {
        // Normalizar strings vazias e undefined para null
        if (!('promotionalValue' in req.body)) req.body.promotionalValue = null;
        if (!('promotionStartDate' in req.body)) req.body.promotionStartDate = null;
        if (!('promotionEndDate' in req.body)) req.body.promotionEndDate = null;
        
        // Converter strings vazias em null
        if (req.body.promotionalValue === '' || req.body.promotionalValue === undefined) {
          req.body.promotionalValue = null;
        }
        if (req.body.promotionStartDate === '' || req.body.promotionStartDate === undefined) {
          req.body.promotionStartDate = null;
        }
        if (req.body.promotionEndDate === '' || req.body.promotionEndDate === undefined) {
          req.body.promotionEndDate = null;
        }
      }
      
      // VALIDAR para detectar erros de validação (ex: valor sem datas)
      const validatedData = updateServiceSchema.parse(req.body);
      
      // DEPOIS da validação, se promotionalValue é explicitamente null, limpar todos os campos
      // Isso permite remoção intencional sem mascarar erros de validação
      if ('promotionalValue' in validatedData && validatedData.promotionalValue === null) {
        validatedData.promotionStartDate = null;
        validatedData.promotionEndDate = null;
      }
      
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
      const userRole = req.session.role;
      let tenantId: string | null;

      if (userRole === 'master_admin') {
        tenantId = req.query.tenantId as string || null;
        if (!tenantId) {
          return res.status(400).json({ 
            error: "Master admin deve especificar tenantId via query param: ?tenantId=..." 
          });
        }
      } else {
        tenantId = getTenantId(req)!;
      }

      const { id, clientId, serviceId, status, startDate, endDate, date, time } = req.query;

      // Se foi passado um ID específico via query parameter (ideal para N8N)
      if (id) {
        const appointment = await storage.getAppointment(id as string, tenantId);
        if (!appointment) {
          return res.status(404).json({ error: "Agendamento não encontrado" });
        }
        // Adicionar serviceIds
        const services = await storage.getAppointmentServices(appointment.id);
        return res.json({
          ...appointment,
          serviceIds: services.map(s => s.id),
        });
      }

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

      // Filtrar agendamentos de um dia específico (sem time)
      if (date && !time) {
        const appointments = await storage.getAppointmentsByDateRange(
          tenantId,
          date as string,
          date as string,
          clientId as string | undefined
        );
        // Adicionar serviceIds a cada appointment
        const appointmentsWithServices = await Promise.all(
          appointments.map(async (apt) => {
            const services = await storage.getAppointmentServices(apt.id);
            return {
              ...apt,
              serviceIds: services.map(s => s.id),
            };
          })
        );
        return res.json(appointmentsWithServices);
      }

      if (startDate && endDate) {
        const appointments = await storage.getAppointmentsByDateRange(
          tenantId,
          startDate as string,
          endDate as string,
          clientId as string | undefined
        );
        // Adicionar serviceIds a cada appointment
        const appointmentsWithServices = await Promise.all(
          appointments.map(async (apt) => {
            const services = await storage.getAppointmentServices(apt.id);
            return {
              ...apt,
              serviceIds: services.map(s => s.id),
            };
          })
        );
        return res.json(appointmentsWithServices);
      }

      const appointments = await storage.getAllAppointments(
        tenantId,
        clientId as string | undefined,
        serviceId as string | undefined,
        status as string | undefined
      );
      
      // Adicionar serviceIds a cada appointment
      const appointmentsWithServices = await Promise.all(
        appointments.map(async (apt) => {
          const services = await storage.getAppointmentServices(apt.id);
          return {
            ...apt,
            serviceIds: services.map(s => s.id),
          };
        })
      );
      
      res.json(appointmentsWithServices);
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
      // Adicionar serviceIds
      const services = await storage.getAppointmentServices(appointment.id);
      res.json({
        ...appointment,
        serviceIds: services.map(s => s.id),
      });
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Erro ao buscar agendamento" });
    }
  });

  // POST /api/appointments - Create a new appointment
  app.post("/api/appointments", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;

      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        tenantId
      });

      // VALIDAÇÃO PRÉVIA: Verificar se o cliente existe e pertence ao tenant
      const client = await storage.getClient(validatedData.clientId, tenantId);
      if (!client) {
        return res.status(404).json({ 
          error: "Cliente não encontrado",
          details: `O cliente com ID '${validatedData.clientId}' não existe ou não pertence ao seu tenant.`
        });
      }

      // VALIDAÇÃO PRÉVIA: Verificar se todos os serviços existem e pertencem ao tenant
      const servicePromises = validatedData.serviceIds.map(serviceId => 
        storage.getService(serviceId, tenantId)
      );
      const services = await Promise.all(servicePromises);
      
      const invalidServices = validatedData.serviceIds.filter((id, index) => !services[index]);
      if (invalidServices.length > 0) {
        return res.status(400).json({ 
          error: "Serviços inválidos",
          details: `Os seguintes serviços não existem ou não pertencem ao seu tenant: ${invalidServices.join(', ')}`
        });
      }

      // VALIDAÇÃO DE CONFLITO: Verificar disponibilidade do profissional se atribuído
      if (validatedData.professionalId) {
        const totalDuration = services.reduce((sum, service) => sum + (service?.duration || 0), 0) || 60;
        const isAvailable = await storage.checkProfessionalAvailability(
          validatedData.professionalId,
          validatedData.date,
          validatedData.time,
          totalDuration
        );

        if (!isAvailable) {
          return res.status(409).json({
            code: 'PROFESSIONAL_CONFLICT',
            error: "Conflito de horário do profissional",
            message: "O profissional já possui um agendamento neste horário"
          });
        }
      }

      const appointment = await storage.createAppointment(validatedData);
      const appointmentServices = await storage.getAppointmentServices(appointment.id);
      res.status(201).json({
        ...appointment,
        serviceIds: appointmentServices.map(s => s.id),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de agendamento inválidos", details: error.errors });
      }
      
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.code === 'APPOINTMENT_CONFLICT') {
            return res.status(409).json(errorData);
          }
        } catch {
        }
      }
      
      // Logging melhorado para debug
      console.error("Error creating appointment:", {
        error: error instanceof Error ? error.message : error,
        tenantId: getTenantId(req),
        clientId: req.body.clientId,
        serviceIds: req.body.serviceIds,
      });
      res.status(500).json({ error: "Erro ao criar agendamento" });
    }
  });

  // PUT /api/appointments - Update an appointment (via query parameter - IDEAL PARA N8N)
  app.put("/api/appointments", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const appointmentId = req.query.id as string;
      
      if (!appointmentId) {
        return res.status(400).json({ error: "ID do agendamento é obrigatório (use ?id=apt-xxx)" });
      }

      const validatedData = insertAppointmentSchema.partial().parse(req.body);

      // VALIDAÇÃO PRÉVIA: Se estiver atualizando o cliente, verificar se existe
      if (validatedData.clientId) {
        const client = await storage.getClient(validatedData.clientId, tenantId);
        if (!client) {
          return res.status(404).json({ 
            error: "Cliente não encontrado",
            details: `O cliente com ID '${validatedData.clientId}' não existe ou não pertence ao seu tenant.`
          });
        }
      }

      // VALIDAÇÃO PRÉVIA: Se estiver atualizando os serviços, verificar se existem
      if (validatedData.serviceIds && validatedData.serviceIds.length > 0) {
        const servicePromises = validatedData.serviceIds.map(serviceId => 
          storage.getService(serviceId, tenantId)
        );
        const services = await Promise.all(servicePromises);
        
        const invalidServices = validatedData.serviceIds.filter((id, index) => !services[index]);
        if (invalidServices.length > 0) {
          return res.status(400).json({ 
            error: "Serviços inválidos",
            details: `Os seguintes serviços não existem ou não pertencem ao seu tenant: ${invalidServices.join(', ')}`
          });
        }
      }

      // VALIDAÇÃO DE CONFLITO: Verificar disponibilidade do profissional se atribuído ou sendo atualizado
      if (validatedData.professionalId) {
        const currentAppointment = await storage.getAppointment(appointmentId, tenantId);
        if (!currentAppointment) {
          return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        const finalDate = validatedData.date || currentAppointment.date;
        const finalTime = validatedData.time || currentAppointment.time;
        
        let totalDuration = currentAppointment.duration;
        if (validatedData.serviceIds && validatedData.serviceIds.length > 0) {
          const servicePromises = validatedData.serviceIds.map(serviceId => 
            storage.getService(serviceId, tenantId)
          );
          const services = await Promise.all(servicePromises);
          totalDuration = services.reduce((sum, service) => sum + (service?.duration || 0), 0) || 60;
        }

        const isAvailable = await storage.checkProfessionalAvailability(
          validatedData.professionalId,
          finalDate,
          finalTime,
          totalDuration,
          appointmentId
        );

        if (!isAvailable) {
          return res.status(409).json({
            code: 'PROFESSIONAL_CONFLICT',
            error: "Conflito de horário do profissional",
            message: "O profissional já possui um agendamento neste horário"
          });
        }
      }

      const appointment = await storage.updateAppointment(
        appointmentId,
        tenantId,
        validatedData
      );
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      // Adicionar serviceIds
      const appointmentServices = await storage.getAppointmentServices(appointment.id);
      res.json({
        ...appointment,
        serviceIds: appointmentServices.map(s => s.id),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de agendamento inválidos", details: error.errors });
      }
      
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.code === 'APPOINTMENT_CONFLICT') {
            return res.status(409).json(errorData);
          }
        } catch {
        }
      }
      
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
  });

  // PUT /api/appointments/:id - Update an appointment (via path parameter - alternativa)
  app.put("/api/appointments/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;

      const validatedData = insertAppointmentSchema.partial().parse(req.body);

      // VALIDAÇÃO PRÉVIA: Se estiver atualizando o cliente, verificar se existe
      if (validatedData.clientId) {
        const client = await storage.getClient(validatedData.clientId, tenantId);
        if (!client) {
          return res.status(404).json({ 
            error: "Cliente não encontrado",
            details: `O cliente com ID '${validatedData.clientId}' não existe ou não pertence ao seu tenant.`
          });
        }
      }

      // VALIDAÇÃO PRÉVIA: Se estiver atualizando os serviços, verificar se existem
      if (validatedData.serviceIds && validatedData.serviceIds.length > 0) {
        const servicePromises = validatedData.serviceIds.map(serviceId => 
          storage.getService(serviceId, tenantId)
        );
        const services = await Promise.all(servicePromises);
        
        const invalidServices = validatedData.serviceIds.filter((id, index) => !services[index]);
        if (invalidServices.length > 0) {
          return res.status(400).json({ 
            error: "Serviços inválidos",
            details: `Os seguintes serviços não existem ou não pertencem ao seu tenant: ${invalidServices.join(', ')}`
          });
        }
      }

      const appointment = await storage.updateAppointment(
        req.params.id,
        tenantId,
        validatedData
      );
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      // Adicionar serviceIds
      const appointmentServices = await storage.getAppointmentServices(appointment.id);
      res.json({
        ...appointment,
        serviceIds: appointmentServices.map(s => s.id),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de agendamento inválidos", details: error.errors });
      }
      
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.code === 'APPOINTMENT_CONFLICT') {
            return res.status(409).json(errorData);
          }
        } catch {
        }
      }
      
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
  });

  // PATCH /api/appointments/:id - Update appointment status only
  app.patch("/api/appointments/:id", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      
      // Validar apenas o status
      const statusSchema = z.object({
        status: z.enum(["scheduled", "completed", "cancelled"]),
      });
      
      const { status } = statusSchema.parse(req.body);
      
      const appointment = await storage.updateAppointment(
        req.params.id,
        tenantId,
        { status }
      );
      
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      
      // Adicionar serviceIds
      const services = await storage.getAppointmentServices(appointment.id);
      res.json({
        ...appointment,
        serviceIds: services.map(s => s.id),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Status inválido", details: error.errors });
      }
      console.error("Error updating appointment status:", error);
      res.status(500).json({ error: "Erro ao atualizar status do agendamento" });
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

      // Filtrar por serviceId se fornecido (já feito no storage.getAppointmentsByDateRange se necessário)
      const filteredAppointments = appointments;

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

        const appointmentsWithDuration = await Promise.all(
          dayAppointments.map(async (apt) => {
            const duration = await storage.getAppointmentTotalDuration(apt.id);
            const services = await storage.getAppointmentServices(apt.id);
            return {
              id: apt.id,
              time: apt.time,
              duration,
              clientId: apt.clientId,
              serviceIds: services.map(s => s.id),
              status: apt.status
            };
          })
        );

        availability.push({
          date: dateStr,
          dayOfWeek,
          businessHours: dayBusinessHours.map(bh => ({
            startTime: bh.startTime,
            endTime: bh.endTime
          })),
          appointments: appointmentsWithDuration
        });
      }

      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Erro ao buscar disponibilidade" });
    }
  });

  // ===========================================
  // ROTAS DE MIGRATIONS (MASTER ADMIN)
  // ===========================================
  
  // GET /api/debug/session - Debug de sessão (temporário)
  app.get("/api/debug/session", (req, res) => {
    res.json({
      hasSession: !!req.session,
      userId: req.session?.userId,
      role: req.session?.role,
      tenantId: req.session?.tenantId,
      sessionData: req.session
    });
  });
  
  // POST /api/migrations/run - Executar migrations via SQL direto
  app.post("/api/migrations/run", requireMasterAdmin, async (req, res) => {
    try {
      const { databaseUrl } = req.body;
      
      if (!databaseUrl || typeof databaseUrl !== 'string') {
        return res.status(400).json({ error: "DATABASE_URL é obrigatória" });
      }

      // Validar formato básico da URL
      if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
        return res.status(400).json({ error: "DATABASE_URL deve começar com postgres:// ou postgresql://" });
      }

      const logs: string[] = [];
      logs.push("[INFO] Iniciando migrations...");
      logs.push(`[INFO] Database: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`); // Ocultar senha no log

      // Criar conexão temporária com o banco fornecido
      const pgPkg = await import('pg');
      const Pool = pgPkg.default.Pool;
      
      const tempPool = new Pool({ connectionString: databaseUrl });

      try {
        // SQL para criar todas as tabelas baseado no schema.ts
        const migrations = [
          {
            name: "tenants",
            sql: `
              CREATE TABLE IF NOT EXISTS tenants (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            `
          },
          {
            name: "users",
            sql: `
              CREATE TABLE IF NOT EXISTS users (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            `
          },
          {
            name: "clients",
            sql: `
              CREATE TABLE IF NOT EXISTS clients (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                birthdate TEXT,
                CONSTRAINT clients_tenant_id_phone_unique UNIQUE (tenant_id, phone)
              );
            `
          },
          {
            name: "services",
            sql: `
              CREATE TABLE IF NOT EXISTS services (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                value NUMERIC(10, 2) NOT NULL,
                duration INTEGER NOT NULL DEFAULT 60,
                promotional_value NUMERIC(10, 2),
                promotion_start_date TEXT,
                promotion_end_date TEXT
              );
            `
          },
          {
            name: "appointments",
            sql: `
              CREATE TABLE IF NOT EXISTS appointments (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'scheduled',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            `
          },
          {
            name: "appointment_services",
            sql: `
              CREATE TABLE IF NOT EXISTS appointment_services (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                appointment_id VARCHAR NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
                service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE
              );
            `
          },
          {
            name: "tenant_api_tokens",
            sql: `
              CREATE TABLE IF NOT EXISTS tenant_api_tokens (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                revoked_at TIMESTAMP
              );
            `
          },
          {
            name: "business_hours",
            sql: `
              CREATE TABLE IF NOT EXISTS business_hours (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            `
          }
        ];

        // Executar cada migration
        for (const migration of migrations) {
          logs.push(`[RUNNING] Criando tabela ${migration.name}...`);
          await tempPool.query(migration.sql);
          logs.push(`[SUCCESS] Tabela ${migration.name} criada/verificada`);
        }

        // Criar índices
        logs.push("[RUNNING] Criando índices...");
        await tempPool.query(`CREATE INDEX IF NOT EXISTS idx_business_hours_tenant ON business_hours(tenant_id);`);
        await tempPool.query(`CREATE INDEX IF NOT EXISTS idx_business_hours_day ON business_hours(day_of_week);`);
        logs.push("[SUCCESS] Índices criados/verificados");

        logs.push("[SUCCESS] Migrations concluídas com sucesso!");
        logs.push("[INFO] Todas as tabelas foram criadas/verificadas:");
        logs.push("  ✓ tenants");
        logs.push("  ✓ users");
        logs.push("  ✓ clients");
        logs.push("  ✓ services");
        logs.push("  ✓ appointments");
        logs.push("  ✓ appointment_services");
        logs.push("  ✓ tenant_api_tokens");
        logs.push("  ✓ business_hours");

        res.json({ 
          success: true, 
          logs,
          message: "Migrations executadas com sucesso! Todas as tabelas foram criadas/atualizadas."
        });

      } catch (dbError: any) {
        logs.push(`[ERROR] Erro ao executar migrations: ${dbError.message}`);
        console.error("Migration error:", dbError);
        
        res.status(500).json({ 
          success: false, 
          logs,
          error: dbError.message 
        });
      } finally {
        // Sempre fechar conexão temporária
        await tempPool.end();
      }

    } catch (error: any) {
      console.error("Error running migrations:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Erro ao executar migrations" 
      });
    }
  });

  // POST /api/migrations/execute-sql - Executar SQL customizado (APENAS MASTER ADMIN)
  app.post("/api/migrations/execute-sql", requireMasterAdmin, async (req, res) => {
    try {
      const { databaseUrl, sql } = req.body;
      
      if (!databaseUrl || typeof databaseUrl !== 'string') {
        return res.status(400).json({ error: "DATABASE_URL é obrigatória" });
      }

      if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
        return res.status(400).json({ error: "SQL é obrigatório" });
      }

      // Validar formato básico da URL
      if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
        return res.status(400).json({ error: "DATABASE_URL deve começar com postgres:// ou postgresql://" });
      }

      const logs: string[] = [];
      logs.push("[INFO] Executando SQL customizado...");
      logs.push(`[INFO] Database: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`); // Ocultar senha no log
      logs.push(`[INFO] SQL: ${sql.length > 200 ? sql.substring(0, 200) + '...' : sql}`);

      // Criar conexão temporária com o banco fornecido
      const pgPkg = await import('pg');
      const Pool = pgPkg.default.Pool;
      
      const tempPool = new Pool({ connectionString: databaseUrl });

      try {
        logs.push("[RUNNING] Executando SQL...");
        const result = await tempPool.query(sql);
        
        logs.push(`[SUCCESS] SQL executado com sucesso!`);
        
        // Se houver rows retornados, mostrar
        if (result.rows && result.rows.length > 0) {
          logs.push(`[INFO] ${result.rows.length} linha(s) retornada(s)`);
          logs.push("[INFO] Resultado:");
          result.rows.forEach((row, idx) => {
            logs.push(`  ${idx + 1}. ${JSON.stringify(row)}`);
          });
        } else if (result.rowCount !== null && result.rowCount !== undefined) {
          logs.push(`[INFO] ${result.rowCount} linha(s) afetada(s)`);
        }

        res.json({ 
          success: true, 
          logs,
          rowCount: result.rowCount,
          rows: result.rows,
          message: "SQL executado com sucesso!"
        });

      } catch (dbError: any) {
        logs.push(`[ERROR] Erro ao executar SQL: ${dbError.message}`);
        console.error("SQL execution error:", dbError);
        
        res.status(500).json({ 
          success: false, 
          logs,
          error: dbError.message 
        });
      } finally {
        // Sempre fechar conexão temporária
        await tempPool.end();
      }

    } catch (error: any) {
      console.error("Error executing custom SQL:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Erro ao executar SQL customizado" 
      });
    }
  });

  // ===========================================
  // ROTAS DE CORREÇÃO DE DADOS (MASTER ADMIN)
  // ===========================================
  
  // GET /api/admin/orphan-appointments/:tenantId - Listar agendamentos sem serviços
  app.get("/api/admin/orphan-appointments/:tenantId", requireMasterAdmin, async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID é obrigatório" });
      }
      
      const orphans = await storage.findOrphanAppointments(tenantId);
      
      res.json({
        count: orphans.length,
        appointments: orphans
      });
    } catch (error: any) {
      console.error("Error finding orphan appointments:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar agendamentos órfãos" });
    }
  });
  
  // POST /api/admin/fix-orphan-appointments/:tenantId - Corrigir agendamentos sem serviços
  app.post("/api/admin/fix-orphan-appointments/:tenantId", requireMasterAdmin, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { defaultServiceId } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID é obrigatório" });
      }
      
      if (!defaultServiceId) {
        return res.status(400).json({ error: "ID do serviço padrão é obrigatório" });
      }
      
      const result = await storage.fixOrphanAppointments(tenantId, defaultServiceId);
      
      if (result.errors.length > 0) {
        console.warn("Errors during fix:", result.errors);
      }
      
      res.json({
        success: true,
        fixed: result.fixed,
        errors: result.errors,
        message: `${result.fixed} agendamento(s) corrigido(s) com sucesso`
      });
    } catch (error: any) {
      console.error("Error fixing orphan appointments:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Erro ao corrigir agendamentos órfãos" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
