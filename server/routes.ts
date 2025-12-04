import express, { type Express, type Request, type Response, type NextFunction } from "express";
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
  insertProductCategorySchema,
  updateProductCategorySchema,
  insertProductSchema,
  updateProductSchema,
  insertOrderSchema,
  updateOrderStatusSchema,
  insertFinanceCategorySchema,
  insertExpenseSchema,
  insertIncomeSchema,
  registerAppointmentPaymentSchema,
  loginSchema,
  setupSchema,
  type InsertUser,
  type OrderStatus,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  isServiceInPromotion,
  getServiceEffectiveValue,
  MODULE_DEFINITIONS
} from "@shared/schema";
import path from "path";
import fs from "fs";
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

// Middleware factory para verificar se módulo está habilitado para o tenant
function requireModule(moduleId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Master admin sempre tem acesso a todos os módulos
    if (req.session.role === 'master_admin') {
      return next();
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const isEnabled = await storage.isModuleEnabledForTenant(tenantId, moduleId);
    if (!isEnabled) {
      return res.status(403).json({ 
        error: "Módulo não disponível",
        message: `O módulo '${moduleId}' não está habilitado para o seu tenant. Entre em contato com o administrador.`
      });
    }

    next();
  };
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
      let allowedModules: string[] = [];
      
      if (user.tenantId) {
        tenant = await storage.getTenant(user.tenantId);
        // Buscar módulos permitidos para o tenant
        const tenantModules = await storage.getTenantModules(user.tenantId);
        allowedModules = tenantModules;
      } else if (user.role === 'master_admin') {
        // Master admin tem acesso a todos os módulos
        allowedModules = MODULE_DEFINITIONS.map(m => m.id);
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
        } : null,
        allowedModules
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

  // ===========================================
  // ROTAS MASTER ADMIN - GESTÃO DE MÓDULOS POR TENANT
  // ===========================================

  // GET /api/admin/modules - List all available modules
  app.get("/api/admin/modules", requireMasterAdmin, async (req, res) => {
    try {
      const modules = await storage.listAllModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ error: "Erro ao buscar módulos" });
    }
  });

  // GET /api/admin/tenants/:id/modules - Get tenant module permissions
  app.get("/api/admin/tenants/:id/modules", requireMasterAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant não encontrado" });
      }

      const enabledModules = await storage.getTenantModules(req.params.id);
      const allModules = await storage.listAllModules();
      
      // Retorna lista detalhada de módulos com status de habilitação
      const modulesWithStatus = allModules.map(m => ({
        ...m,
        enabled: enabledModules.includes(m.id)
      }));

      res.json({
        tenantId: req.params.id,
        tenantName: tenant.name,
        modules: modulesWithStatus
      });
    } catch (error) {
      console.error("Error fetching tenant modules:", error);
      res.status(500).json({ error: "Erro ao buscar módulos do tenant" });
    }
  });

  // PUT /api/admin/tenants/:id/modules - Update tenant module permissions
  app.put("/api/admin/tenants/:id/modules", requireMasterAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant não encontrado" });
      }

      const { enabledModules } = req.body;
      if (!Array.isArray(enabledModules)) {
        return res.status(400).json({ error: "enabledModules deve ser um array de IDs de módulos" });
      }

      // Validar que todos os IDs são válidos
      const allModules = await storage.listAllModules();
      const validIds = allModules.map(m => m.id);
      const invalidIds = enabledModules.filter((id: string) => !validIds.includes(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          error: "IDs de módulos inválidos", 
          invalidIds 
        });
      }

      await storage.setTenantModules(req.params.id, enabledModules);
      
      // Retorna estado atualizado
      const updatedModules = await storage.getTenantModules(req.params.id);
      const modulesWithStatus = allModules.map(m => ({
        ...m,
        enabled: updatedModules.includes(m.id)
      }));

      res.json({
        tenantId: req.params.id,
        tenantName: tenant.name,
        modules: modulesWithStatus
      });
    } catch (error) {
      console.error("Error updating tenant modules:", error);
      res.status(500).json({ error: "Erro ao atualizar módulos do tenant" });
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
  // Protegido pelo módulo "users"
  // ===========================================
  
  // GET /api/users - List all users of current tenant (admin only)
  app.get("/api/users", requireModule("users"), requireTenantAdmin, async (req, res) => {
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
  app.get("/api/users/:id", requireModule("users"), requireTenantAdmin, async (req, res) => {
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
  app.post("/api/users", requireModule("users"), requireTenantAdmin, async (req, res) => {
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
  app.put("/api/users/:id", requireModule("users"), requireTenantAdmin, async (req, res) => {
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
  app.delete("/api/users/:id", requireModule("users"), requireTenantAdmin, async (req, res) => {
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
  // Protegido pelo módulo "api-tokens"
  // ===========================================
  
  // GET /api/settings/api-tokens - List API tokens for current tenant
  app.get("/api/settings/api-tokens", authenticateRequest, requireModule("api-tokens"), async (req, res) => {
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
  app.post("/api/settings/api-tokens", authenticateRequest, requireModule("api-tokens"), async (req, res) => {
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
  app.delete("/api/settings/api-tokens/:id", authenticateRequest, requireModule("api-tokens"), async (req, res) => {
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
  // Protegido pelo módulo "business-hours"
  // ===========================================

  // GET /api/business-hours - List business hours for current tenant
  app.get("/api/business-hours", authenticateRequest, requireModule("business-hours"), async (req, res) => {
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
  app.post("/api/business-hours", authenticateRequest, requireModule("business-hours"), requireTenantAdmin, async (req, res) => {
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
  app.put("/api/business-hours/:id", authenticateRequest, requireModule("business-hours"), requireTenantAdmin, async (req, res) => {
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
  app.delete("/api/business-hours/:id", authenticateRequest, requireModule("business-hours"), requireTenantAdmin, async (req, res) => {
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
  // Protegido pelo módulo "professionals"
  // ===========================================

  // GET /api/professionals - List all professionals of current tenant
  app.get("/api/professionals", authenticateRequest, requireModule("professionals"), async (req, res) => {
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
  app.get("/api/professionals/:id", authenticateRequest, requireModule("professionals"), async (req, res) => {
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
  app.post("/api/professionals", authenticateRequest, requireModule("professionals"), async (req, res) => {
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
  app.put("/api/professionals/:id", authenticateRequest, requireModule("professionals"), async (req, res) => {
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
  app.delete("/api/professionals/:id", authenticateRequest, requireModule("professionals"), async (req, res) => {
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
  // Protegido pelo módulo "clients"
  // ===========================================
  
  // GET /api/clients - List all clients of current tenant
  app.get("/api/clients", authenticateRequest, requireModule("clients"), async (req, res) => {
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
  app.get("/api/clients/:id", authenticateRequest, requireModule("clients"), async (req, res) => {
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
  app.post("/api/clients", authenticateRequest, requireModule("clients"), async (req, res) => {
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
  app.put("/api/clients/:id", authenticateRequest, requireModule("clients"), async (req, res) => {
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
  app.delete("/api/clients/:id", authenticateRequest, requireModule("clients"), async (req, res) => {
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
  app.get("/api/clients/:id/appointments", authenticateRequest, requireModule("clients"), async (req, res) => {
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
  app.get("/api/clients/:id/stats", authenticateRequest, requireModule("clients"), async (req, res) => {
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
  // ROTAS DE ENDEREÇOS DE CLIENTE (COM ISOLAMENTO TENANT)
  // Protegido pelo módulo "clients"
  // ===========================================

  // GET /api/clients/:id/addresses - List all addresses of a specific client
  app.get("/api/clients/:id/addresses", authenticateRequest, requireModule("clients"), async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const client = await storage.getClient(req.params.id, tenantId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const addresses = await storage.getClientAddresses(req.params.id, tenantId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching client addresses:", error);
      res.status(500).json({ error: "Erro ao buscar endereços do cliente" });
    }
  });

  // POST /api/clients/:id/addresses - Create a new address for a client
  app.post("/api/clients/:id/addresses", authenticateRequest, requireModule("clients"), async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const clientId = req.params.id;
      
      const client = await storage.getClient(clientId, tenantId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const addressData = {
        ...req.body,
        clientId,
        tenantId,
      };
      
      const address = await storage.createClientAddress(addressData);
      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating client address:", error);
      res.status(500).json({ error: "Erro ao criar endereço do cliente" });
    }
  });

  // PUT /api/clients/:clientId/addresses/:addressId - Update a client address
  app.put("/api/clients/:clientId/addresses/:addressId", authenticateRequest, requireModule("clients"), async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const { clientId, addressId } = req.params;
      
      const client = await storage.getClient(clientId, tenantId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const address = await storage.updateClientAddress(addressId, tenantId, req.body);
      if (!address) {
        return res.status(404).json({ error: "Endereço não encontrado" });
      }
      res.json(address);
    } catch (error) {
      console.error("Error updating client address:", error);
      res.status(500).json({ error: "Erro ao atualizar endereço do cliente" });
    }
  });

  // DELETE /api/clients/:clientId/addresses/:addressId - Delete a client address
  app.delete("/api/clients/:clientId/addresses/:addressId", authenticateRequest, requireModule("clients"), async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const { clientId, addressId } = req.params;
      
      const client = await storage.getClient(clientId, tenantId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const success = await storage.deleteClientAddress(addressId, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Endereço não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client address:", error);
      res.status(500).json({ error: "Erro ao deletar endereço do cliente" });
    }
  });

  // PUT /api/clients/:clientId/addresses/:addressId/default - Set address as default
  app.put("/api/clients/:clientId/addresses/:addressId/default", authenticateRequest, requireModule("clients"), async (req, res) => {
    try {
      const tenantId = getTenantId(req)!;
      const { clientId, addressId } = req.params;
      
      const client = await storage.getClient(clientId, tenantId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const address = await storage.setDefaultClientAddress(addressId, clientId, tenantId);
      if (!address) {
        return res.status(404).json({ error: "Endereço não encontrado" });
      }
      res.json(address);
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ error: "Erro ao definir endereço padrão" });
    }
  });

  // ===========================================
  // ROTAS DE SERVIÇOS (COM ISOLAMENTO TENANT)
  // Protegido pelo módulo "services"
  // ===========================================

  // GET /api/services - List all services of current tenant
  app.get("/api/services", authenticateRequest, requireModule("services"), async (req, res) => {
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
  app.get("/api/services/template", authenticateRequest, requireModule("services"), async (req, res) => {
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
  app.post("/api/services/import", uploadLimiter, authenticateRequest, requireModule("services"), upload.single('file'), async (req, res) => {
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
  app.get("/api/services/:id", authenticateRequest, requireModule("services"), async (req, res) => {
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
  app.post("/api/services", authenticateRequest, requireModule("services"), async (req, res) => {
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
  app.put("/api/services/:id", authenticateRequest, requireModule("services"), async (req, res) => {
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
  app.delete("/api/services/:id", authenticateRequest, requireModule("services"), async (req, res) => {
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
  app.get("/api/services/:id/appointments", authenticateRequest, requireModule("services"), async (req, res) => {
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

  // ===========================================
  // CONFIGURAÇÃO DE UPLOAD DE IMAGENS
  // ===========================================
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });
  
  const imageUpload = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.'));
      }
    }
  });

  // Servir arquivos de upload
  app.use('/uploads', express.static(uploadsDir));

  // POST /api/upload/image - Upload de imagem
  app.post("/api/upload/image", authenticateRequest, uploadLimiter, imageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem enviada" });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: error.message || "Erro ao fazer upload da imagem" });
    }
  });

  // POST /api/upload/service-image - Upload de imagem de serviço
  app.post("/api/upload/service-image", authenticateRequest, uploadLimiter, imageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem enviada" });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error: any) {
      console.error("Error uploading service image:", error);
      res.status(500).json({ error: error.message || "Erro ao fazer upload da imagem do serviço" });
    }
  });

  // ===========================================
  // ROTAS DE CATEGORIAS DE PRODUTOS (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/inventory/categories - Listar categorias
  app.get("/api/inventory/categories", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const activeOnly = req.query.active === 'true';
      const categories = activeOnly 
        ? await storage.getActiveProductCategories(tenantId)
        : await storage.getAllProductCategories(tenantId);

      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar categorias" });
    }
  });

  // GET /api/inventory/categories/:id - Obter categoria específica
  app.get("/api/inventory/categories/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const category = await storage.getProductCategory(req.params.id, tenantId);
      if (!category) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }

      res.json(category);
    } catch (error: any) {
      console.error("Error fetching category:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar categoria" });
    }
  });

  // POST /api/inventory/categories - Criar categoria
  app.post("/api/inventory/categories", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = insertProductCategorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const category = await storage.createProductCategory({
        ...validation.data,
        tenantId,
      });

      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: error.message || "Erro ao criar categoria" });
    }
  });

  // PUT /api/inventory/categories/:id - Atualizar categoria
  app.put("/api/inventory/categories/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = updateProductCategorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const category = await storage.updateProductCategory(req.params.id, tenantId, validation.data);
      if (!category) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }

      res.json(category);
    } catch (error: any) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar categoria" });
    }
  });

  // POST /api/inventory/categories/reorder - Reordenar categorias
  app.post("/api/inventory/categories/reorder", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: "orderedIds deve ser um array" });
      }

      await storage.reorderProductCategories(tenantId, orderedIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ error: error.message || "Erro ao reordenar categorias" });
    }
  });

  // DELETE /api/inventory/categories/:id - Excluir categoria
  app.delete("/api/inventory/categories/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const deleted = await storage.deleteProductCategory(req.params.id, tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir categoria" });
    }
  });

  // ===========================================
  // ROTAS DE PRODUTOS / ESTOQUE (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/inventory/products - Listar produtos
  app.get("/api/inventory/products", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const search = req.query.search as string;
      const activeOnly = req.query.active === 'true';

      let productsList;
      if (search) {
        productsList = await storage.searchProducts(tenantId, search);
      } else if (activeOnly) {
        productsList = await storage.getActiveProducts(tenantId);
      } else {
        productsList = await storage.getAllProducts(tenantId);
      }

      res.json(productsList);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar produtos" });
    }
  });

  // GET /api/inventory/products/:id - Obter produto específico
  app.get("/api/inventory/products/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const product = await storage.getProduct(req.params.id, tenantId);
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      res.json(product);
    } catch (error: any) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar produto" });
    }
  });

  // POST /api/inventory/products - Criar produto
  app.post("/api/inventory/products", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = insertProductSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const product = await storage.createProduct({
        ...validation.data,
        tenantId,
      });

      res.status(201).json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: error.message || "Erro ao criar produto" });
    }
  });

  // PUT /api/inventory/products/:id - Atualizar produto
  app.put("/api/inventory/products/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = updateProductSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const product = await storage.updateProduct(req.params.id, tenantId, validation.data);
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      res.json(product);
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar produto" });
    }
  });

  // PATCH /api/inventory/products/:id/stock - Ajustar estoque
  app.patch("/api/inventory/products/:id/stock", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { adjustment } = req.body;
      if (typeof adjustment !== 'number') {
        return res.status(400).json({ error: "adjustment deve ser um número" });
      }

      const product = await storage.adjustProductStock(req.params.id, tenantId, adjustment);
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado ou sem controle de estoque" });
      }

      res.json(product);
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      res.status(500).json({ error: error.message || "Erro ao ajustar estoque" });
    }
  });

  // DELETE /api/inventory/products/:id - Excluir produto
  app.delete("/api/inventory/products/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const deleted = await storage.deleteProduct(req.params.id, tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir produto" });
    }
  });

  // ===========================================
  // ROTAS DE PEDIDOS (COM ISOLAMENTO TENANT)
  // ===========================================

  // GET /api/orders - Listar pedidos
  app.get("/api/orders", authenticateRequest, requireModule("orders"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const status = req.query.status as OrderStatus | undefined;
      const activeOnly = req.query.active === 'true';

      let ordersList;
      if (status && ORDER_STATUSES.includes(status)) {
        ordersList = await storage.getOrdersByStatus(tenantId, status);
      } else if (activeOnly) {
        ordersList = await storage.getActiveOrders(tenantId);
      } else {
        ordersList = await storage.getAllOrdersWithDetails(tenantId);
      }

      res.json(ordersList);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar pedidos" });
    }
  });

  // GET /api/orders/active - Listar pedidos ativos (para painel da cozinha)
  app.get("/api/orders/active", authenticateRequest, requireModule("orders"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const ordersList = await storage.getActiveOrders(tenantId);
      res.json(ordersList);
    } catch (error: any) {
      console.error("Error fetching active orders:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar pedidos ativos" });
    }
  });

  // GET /api/orders/:id - Obter pedido específico
  app.get("/api/orders/:id", authenticateRequest, requireModule("orders"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const order = await storage.getOrderWithDetails(req.params.id, tenantId);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar pedido" });
    }
  });

  // POST /api/orders - Criar pedido (compatível com N8N)
  app.post("/api/orders", authenticateRequest, requireModule("orders"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = insertOrderSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const { client, items, paymentMethod, notes, deliveryAddress, clientAddressId, saveAddress, addressLabel } = validation.data;

      // Verificar/criar cliente pelo telefone
      let existingClient = await storage.getClientByPhone(client.phone, tenantId);
      if (!existingClient) {
        existingClient = await storage.createClient({
          tenantId,
          name: client.name,
          phone: client.phone,
        });
      }

      // Determinar endereço de entrega final
      let finalDeliveryAddress = deliveryAddress;

      // Se um endereço existente foi selecionado, buscar dados do endereço
      if (clientAddressId) {
        const addresses = await storage.getClientAddresses(existingClient.id, tenantId);
        const selectedAddress = addresses.find(a => a.id === clientAddressId);
        if (selectedAddress) {
          finalDeliveryAddress = {
            street: selectedAddress.street || undefined,
            number: selectedAddress.number || undefined,
            complement: selectedAddress.complement || undefined,
            neighborhood: selectedAddress.neighborhood || undefined,
            city: selectedAddress.city || undefined,
            zipCode: selectedAddress.zipCode || undefined,
            reference: selectedAddress.reference || undefined,
          };
        }
      }
      // Salvar novo endereço se solicitado
      else if (saveAddress && deliveryAddress && (deliveryAddress.street || deliveryAddress.neighborhood)) {
        await storage.createClientAddress({
          tenantId,
          clientId: existingClient.id,
          label: addressLabel || "Casa",
          street: deliveryAddress.street || null,
          number: deliveryAddress.number || null,
          complement: deliveryAddress.complement || null,
          neighborhood: deliveryAddress.neighborhood || null,
          city: deliveryAddress.city || null,
          zipCode: deliveryAddress.zipCode || null,
          reference: deliveryAddress.reference || null,
          isDefault: false, // O primeiro endereço será automaticamente definido como padrão pelo storage
        });
      }

      // Criar pedido com endereço de entrega e referência ao endereço salvo
      const order = await storage.createOrder(tenantId, existingClient.id, items, paymentMethod, notes, finalDeliveryAddress, clientAddressId);

      res.status(201).json(order);
    } catch (error: any) {
      console.error("Error creating order:", error);
      
      // Erro de estoque insuficiente
      if (error.message.includes("Estoque insuficiente")) {
        return res.status(409).json({ error: error.message });
      }
      // Produto não encontrado
      if (error.message.includes("Produto não encontrado") || error.message.includes("indisponível")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message || "Erro ao criar pedido" });
    }
  });

  // PATCH /api/orders/:id/status - Atualizar status do pedido (um clique)
  app.patch("/api/orders/:id/status", authenticateRequest, requireModule("orders"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = updateOrderStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Status inválido",
          validStatuses: ORDER_STATUSES
        });
      }

      const order = await storage.updateOrderStatus(req.params.id, tenantId, validation.data.status);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Criar transação financeira quando pedido for entregue
      console.log(`[FINANCE] Status recebido: ${validation.data.status}, order.status: ${order.status}`);
      if (validation.data.status === 'delivered') {
        console.log(`[FINANCE] Pedido ${order.id} entregue, criando transação financeira...`);
        try {
          // Check if finance module is enabled before creating transaction
          const isFinanceEnabled = await storage.isModuleEnabledForTenant(tenantId, 'finance');
          console.log(`[FINANCE] Módulo finance habilitado: ${isFinanceEnabled}`);
          if (isFinanceEnabled) {
            const transaction = await storage.createTransactionFromOrder(order.id, tenantId);
            console.log(`[FINANCE] Transação criada: ${transaction.id}, valor: ${transaction.amount}`);
          }
        } catch (txError) {
          console.error("[FINANCE] Error creating financial transaction:", txError);
          // Don't fail the order update if transaction creation fails
        }
      }

      // Retornar pedido completo com detalhes
      const orderWithDetails = await storage.getOrderWithDetails(order.id, tenantId);
      res.json(orderWithDetails);
    } catch (error: any) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar status" });
    }
  });

  // POST /api/orders/:id/cancel - Cancelar pedido (restaura estoque)
  app.post("/api/orders/:id/cancel", authenticateRequest, requireModule("orders"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const order = await storage.cancelOrder(req.params.id, tenantId);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado ou não pode ser cancelado" });
      }

      // Retornar pedido completo com detalhes
      const orderWithDetails = await storage.getOrderWithDetails(order.id, tenantId);
      res.json(orderWithDetails);
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ error: error.message || "Erro ao cancelar pedido" });
    }
  });

  // ==================== FINANCIAL MODULE ROUTES ====================

  // GET /api/finance/payment-methods - Listar formas de pagamento disponíveis
  app.get("/api/finance/payment-methods", authenticateRequest, requireModule("finance"), async (req, res) => {
    res.json({
      methods: PAYMENT_METHODS,
      labels: PAYMENT_METHOD_LABELS
    });
  });

  // GET /api/finance/categories - Listar categorias financeiras
  app.get("/api/finance/categories", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Seed default categories if none exist
      await storage.seedDefaultCategories(tenantId);
      
      const type = req.query.type as string | undefined;
      let categories;
      
      if (type && (type === 'income' || type === 'expense')) {
        categories = await storage.getFinanceCategoriesByType(tenantId, type);
      } else {
        categories = await storage.getAllFinanceCategories(tenantId);
      }
      
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching finance categories:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar categorias" });
    }
  });

  // POST /api/finance/categories - Criar categoria financeira
  app.post("/api/finance/categories", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = insertFinanceCategorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const category = await storage.createFinanceCategory({ ...validation.data, tenantId });
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating finance category:", error);
      res.status(500).json({ error: error.message || "Erro ao criar categoria" });
    }
  });

  // PATCH /api/finance/categories/:id - Atualizar categoria
  app.patch("/api/finance/categories/:id", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const category = await storage.updateFinanceCategory(req.params.id, tenantId, req.body);
      if (!category) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }
      
      res.json(category);
    } catch (error: any) {
      console.error("Error updating finance category:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar categoria" });
    }
  });

  // DELETE /api/finance/categories/:id - Excluir categoria
  app.delete("/api/finance/categories/:id", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const deleted = await storage.deleteFinanceCategory(req.params.id, tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting finance category:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir categoria" });
    }
  });

  // GET /api/finance/transactions - Listar transações financeiras
  app.get("/api/finance/transactions", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const filters: any = {};
      if (req.query.type) filters.type = req.query.type;
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;
      if (req.query.paymentMethod) filters.paymentMethod = req.query.paymentMethod;
      if (req.query.categoryId) filters.categoryId = req.query.categoryId;

      const transactions = await storage.getAllFinancialTransactions(tenantId, filters);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar transações" });
    }
  });

  // POST /api/finance/expenses - Criar despesa manual
  app.post("/api/finance/expenses", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = insertExpenseSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const transaction = await storage.createExpense(tenantId, validation.data);
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: error.message || "Erro ao criar despesa" });
    }
  });

  // POST /api/finance/incomes - Criar receita manual
  app.post("/api/finance/incomes", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = insertIncomeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const transaction = await storage.createIncome(tenantId, validation.data);
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error("Error creating income:", error);
      res.status(500).json({ error: error.message || "Erro ao criar receita" });
    }
  });

  // DELETE /api/finance/transactions/:id - Excluir transação (só manuais)
  app.delete("/api/finance/transactions/:id", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Get transaction to check if it's manual
      const tx = await storage.getFinancialTransaction(req.params.id, tenantId);
      if (!tx) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }
      
      if (tx.source !== 'manual') {
        return res.status(400).json({ error: "Apenas transações manuais podem ser excluídas" });
      }

      const deleted = await storage.deleteTransaction(req.params.id, tenantId);
      res.json({ success: deleted });
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir transação" });
    }
  });

  // GET /api/finance/summary - Resumo financeiro
  app.get("/api/finance/summary", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Default to current month if no dates provided
      const today = new Date();
      const startDate = (req.query.startDate as string) || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = (req.query.endDate as string) || today.toISOString().split('T')[0];

      const summary = await storage.getFinancialSummary(tenantId, startDate, endDate);
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar resumo financeiro" });
    }
  });

  // GET /api/finance/monthly-chart - Dados para gráfico mensal de receitas e despesas
  app.get("/api/finance/monthly-chart", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const monthlyData = await storage.getMonthlyFinanceData(tenantId, year);
      res.json(monthlyData);
    } catch (error: any) {
      console.error("Error fetching monthly chart data:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar dados do gráfico" });
    }
  });

  // GET /api/finance/top-products - Produtos mais vendidos
  app.get("/api/finance/top-products", authenticateRequest, requireModule("finance"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const topProducts = await storage.getTopSellingProducts(tenantId, limit);
      res.json(topProducts);
    } catch (error: any) {
      console.error("Error fetching top products:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar produtos mais vendidos" });
    }
  });

  // POST /api/appointments/:id/payment - Registrar pagamento do agendamento
  app.post("/api/appointments/:id/payment", authenticateRequest, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const validation = registerAppointmentPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const appointment = await storage.registerAppointmentPayment(
        req.params.id, 
        tenantId, 
        validation.data
      );
      
      res.json(appointment);
    } catch (error: any) {
      console.error("Error registering payment:", error);
      
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes("concluídos") || error.message.includes("já registrado")) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message || "Erro ao registrar pagamento" });
    }
  });

  // ===========================================
  // ROTAS PÚBLICAS DO CARDÁPIO (SEM AUTENTICAÇÃO)
  // ===========================================

  // GET /api/menu/:slug - Obter dados do cardápio público
  app.get("/api/menu/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      // Normalizar slug para minúsculas (case-insensitive)
      const normalizedSlug = slug.toLowerCase();
      
      // Buscar tenant pelo slug
      const tenant = await storage.getTenantByMenuSlug(normalizedSlug);
      if (!tenant || !tenant.active) {
        return res.status(404).json({ error: "Cardápio não encontrado" });
      }

      const menuType = tenant.menuType || 'delivery';
      const modules = await storage.getTenantAllowedModules(tenant.id);

      // Verificar se o módulo apropriado está habilitado
      if (menuType === 'delivery' && !modules.includes('inventory')) {
        return res.status(404).json({ error: "Cardápio não disponível" });
      }
      if (menuType === 'services' && !modules.includes('services')) {
        return res.status(404).json({ error: "Cardápio não disponível" });
      }

      // Resposta base com dados do tenant
      const baseResponse = {
        tenant: {
          name: tenant.name,
          logoUrl: tenant.menuLogoUrl,
          brandColor: tenant.menuBrandColor || '#ea7c3f',
          bannerUrl: tenant.menuBannerUrl,
          menuType: menuType,
          minOrderValue: menuType === 'delivery' && tenant.minOrderValue 
            ? parseFloat(String(tenant.minOrderValue)) 
            : null,
        },
      };

      // Se for delivery, retornar produtos
      if (menuType === 'delivery') {
        // Buscar categorias ativas
        const categories = await storage.getActiveProductCategories(tenant.id);

        // Buscar produtos ativos
        const allProducts = await storage.getActiveProducts(tenant.id);

        // Buscar produtos em destaque
        const featuredProducts = await storage.getFeaturedProducts(tenant.id);

        // Buscar produtos em promoção
        const productsOnSale = await storage.getProductsOnSale(tenant.id);

        // Buscar bairros de entrega
        const deliveryNeighborhoods = await storage.getActiveDeliveryNeighborhoods(tenant.id);

        // Buscar adicionais de todos os produtos
        const allAddons = await storage.getAllProductAddons(tenant.id);

        // Mapear produtos com seus adicionais
        const formatProduct = (product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: parseFloat(String(product.price)),
          salePrice: product.salePrice ? parseFloat(String(product.salePrice)) : null,
          isOnSale: product.isOnSale,
          isFeatured: product.isFeatured,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
          addons: allAddons
            .filter(addon => addon.productId === product.id && addon.isActive)
            .map(addon => ({
              id: addon.id,
              name: addon.name,
              price: parseFloat(String(addon.price)),
              isRequired: addon.isRequired,
              maxQuantity: addon.maxQuantity,
            })),
        });

        return res.json({
          ...baseResponse,
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
          })),
          products: allProducts.map(formatProduct),
          featuredProducts: featuredProducts.map(formatProduct),
          productsOnSale: productsOnSale.map(formatProduct),
          deliveryNeighborhoods: deliveryNeighborhoods.map(n => ({
            id: n.id,
            name: n.name,
            deliveryFee: parseFloat(String(n.deliveryFee)),
          })),
        });
      }

      // Se for services, retornar serviços
      if (menuType === 'services') {
        // Buscar serviços ativos para cardápio público
        const allServices = await storage.getActiveServicesForMenu(tenant.id);

        // Buscar serviços em destaque
        const featuredServices = allServices.filter(s => s.isFeatured);

        // Buscar serviços em promoção (com promotionalValue válido)
        const today = new Date().toISOString().split('T')[0];
        const servicesOnSale = allServices.filter(s => 
          s.promotionalValue && 
          s.promotionStartDate && 
          s.promotionEndDate &&
          s.promotionStartDate <= today && 
          s.promotionEndDate >= today
        );

        // Obter categorias únicas dos serviços
        const serviceCategories = Array.from(new Set(allServices.map(s => s.category)));

        // Mapear serviços para o formato público
        const formatService = (service: any) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          price: parseFloat(String(service.value)),
          salePrice: service.promotionalValue ? parseFloat(String(service.promotionalValue)) : null,
          isOnSale: !!(
            service.promotionalValue && 
            service.promotionStartDate && 
            service.promotionEndDate &&
            service.promotionStartDate <= today && 
            service.promotionEndDate >= today
          ),
          isFeatured: service.isFeatured,
          imageUrl: service.imageUrl,
          category: service.category,
          duration: service.duration,
        });

        return res.json({
          ...baseResponse,
          categories: serviceCategories.map(cat => ({
            id: cat,
            name: cat,
          })),
          services: allServices.map(formatService),
          featuredServices: featuredServices.map(formatService),
          servicesOnSale: servicesOnSale.map(formatService),
        });
      }

      // Fallback (não deveria chegar aqui)
      res.status(404).json({ error: "Tipo de menu inválido" });
    } catch (error: any) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar cardápio" });
    }
  });

  // GET /api/menu/:slug/client/:phone/orders - Buscar pedidos do cliente por telefone (público)
  app.get("/api/menu/:slug/client/:phone/orders", async (req, res) => {
    try {
      const { slug, phone } = req.params;
      const normalizedSlug = slug.toLowerCase();
      
      // Buscar tenant pelo slug
      const tenant = await storage.getTenantByMenuSlug(normalizedSlug);
      if (!tenant || !tenant.active) {
        return res.status(404).json({ error: "Cardápio não encontrado" });
      }

      // Limpar telefone - apenas números
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: "Telefone inválido" });
      }

      // Buscar cliente pelo telefone
      const client = await storage.getClientByPhone(cleanPhone, tenant.id);
      if (!client) {
        return res.json({ orders: [], history: [] });
      }

      // Buscar todos os pedidos do cliente
      const allOrders = await storage.getOrdersByClient(client.id, tenant.id);
      
      // Separar pedidos ativos e histórico
      const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering'];
      const historyStatuses = ['delivered', 'cancelled'];
      
      const activeOrders = allOrders.filter(o => activeStatuses.includes(o.status));
      const historyOrders = allOrders.filter(o => historyStatuses.includes(o.status));

      const formatOrder = (order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: parseFloat(String(order.total)),
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        createdAt: order.createdAt,
        deliveryStreet: order.deliveryStreet,
        deliveryNumber: order.deliveryNumber,
        deliveryNeighborhood: order.deliveryNeighborhood,
        items: order.items?.map((item: any) => ({
          id: item.id,
          productName: item.product?.name || 'Produto',
          quantity: item.quantity,
          unitPrice: parseFloat(String(item.unitPrice)),
        })) || [],
      });

      res.json({
        orders: activeOrders.map(formatOrder),
        history: historyOrders.map(formatOrder),
      });
    } catch (error: any) {
      console.error("Error fetching client orders:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar pedidos" });
    }
  });

  // GET /api/menu/:slug/client/:phone - Buscar cliente por telefone (público)
  app.get("/api/menu/:slug/client/:phone", async (req, res) => {
    try {
      const { slug, phone } = req.params;
      const normalizedSlug = slug.toLowerCase();
      
      // Buscar tenant pelo slug
      const tenant = await storage.getTenantByMenuSlug(normalizedSlug);
      if (!tenant || !tenant.active) {
        return res.status(404).json({ error: "Cardápio não encontrado" });
      }

      // Limpar telefone - apenas números
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: "Telefone inválido" });
      }

      // Buscar cliente pelo telefone
      const client = await storage.getClientByPhone(cleanPhone, tenant.id);
      if (!client) {
        return res.json({ found: false });
      }

      // Buscar endereços do cliente
      const addresses = await storage.getClientAddresses(client.id, tenant.id);

      res.json({
        found: true,
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
        },
        addresses: addresses.map(addr => ({
          id: addr.id,
          label: addr.label,
          street: addr.street,
          number: addr.number,
          complement: addr.complement,
          neighborhood: addr.neighborhood,
          city: addr.city,
          zipCode: addr.zipCode,
          reference: addr.reference,
          isDefault: addr.isDefault,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching client by phone:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar cliente" });
    }
  });

  // POST /api/menu/:slug/orders - Criar pedido público (sem autenticação)
  app.post("/api/menu/:slug/orders", async (req, res) => {
    try {
      const { slug } = req.params;
      const normalizedSlug = slug.toLowerCase();
      
      // Buscar tenant pelo slug
      const tenant = await storage.getTenantByMenuSlug(normalizedSlug);
      if (!tenant || !tenant.active) {
        return res.status(404).json({ error: "Cardápio não encontrado" });
      }

      // Verificar se o módulo de pedidos está habilitado
      const modules = await storage.getTenantAllowedModules(tenant.id);
      if (!modules.includes('orders')) {
        return res.status(400).json({ error: "Pedidos não habilitados para este estabelecimento" });
      }

      // Validar dados do pedido
      const validation = insertOrderSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validation.error.errors 
        });
      }

      const { client, items, paymentMethod, notes, changeFor, deliveryAddress, saveAddress, addressLabel } = validation.data;

      // Verificar/criar cliente pelo telefone
      let existingClient = await storage.getClientByPhone(client.phone, tenant.id);
      if (!existingClient) {
        existingClient = await storage.createClient({
          tenantId: tenant.id,
          name: client.name,
          phone: client.phone,
        });
      } else {
        // Atualizar nome se diferente
        if (existingClient.name !== client.name) {
          await storage.updateClient(existingClient.id, tenant.id, { name: client.name });
        }
      }

      // Salvar novo endereço se solicitado
      let clientAddressId: string | undefined;
      if (saveAddress && deliveryAddress && (deliveryAddress.street || deliveryAddress.neighborhood)) {
        const newAddress = await storage.createClientAddress({
          tenantId: tenant.id,
          clientId: existingClient.id,
          label: addressLabel || "Casa",
          street: deliveryAddress.street || null,
          number: deliveryAddress.number || null,
          complement: deliveryAddress.complement || null,
          neighborhood: deliveryAddress.neighborhood || null,
          city: deliveryAddress.city || null,
          zipCode: deliveryAddress.zipCode || null,
          reference: deliveryAddress.reference || null,
          isDefault: false,
        });
        clientAddressId = newAddress.id;
      }

      // Criar pedido
      const order = await storage.createOrder(
        tenant.id, 
        existingClient.id, 
        items, 
        paymentMethod, 
        notes, 
        deliveryAddress, 
        clientAddressId,
        changeFor
      );

      res.status(201).json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        message: "Pedido realizado com sucesso!",
      });
    } catch (error: any) {
      console.error("Error creating public order:", error);
      
      if (error.message.includes("Estoque insuficiente")) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes("Produto não encontrado") || error.message.includes("indisponível")) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message || "Erro ao criar pedido" });
    }
  });

  // GET /api/menu/:slug/availability - Buscar horários disponíveis para agendamento (público)
  app.get("/api/menu/:slug/availability", async (req, res) => {
    try {
      const { slug } = req.params;
      const normalizedSlug = slug.toLowerCase();
      
      // Buscar tenant pelo slug
      const tenant = await storage.getTenantByMenuSlug(normalizedSlug);
      if (!tenant || !tenant.active) {
        return res.status(404).json({ error: "Estabelecimento não encontrado" });
      }

      // Verificar se é tipo de serviços
      if (tenant.menuType !== 'services') {
        return res.status(400).json({ error: "Este estabelecimento não trabalha com agendamentos" });
      }

      // Verificar módulos necessários
      const modules = await storage.getTenantAllowedModules(tenant.id);
      if (!modules.includes('services') || !modules.includes('business-hours')) {
        return res.status(400).json({ error: "Agendamentos não disponíveis" });
      }

      let { date, serviceIds, duration } = req.query;

      // Data obrigatória
      if (!date) {
        return res.status(400).json({ error: "Data é obrigatória" });
      }

      // Validar formato de data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date as string)) {
        return res.status(400).json({ error: "Formato de data inválido. Use YYYY-MM-DD" });
      }

      // Calcular duração total
      let totalDuration = 60; // Padrão 1 hora
      if (serviceIds) {
        const ids = (serviceIds as string).split(',');
        let calculatedDuration = 0;
        for (const id of ids) {
          const service = await storage.getService(id, tenant.id);
          if (service) {
            calculatedDuration += service.duration;
          }
        }
        if (calculatedDuration > 0) {
          totalDuration = calculatedDuration;
        }
      } else if (duration) {
        totalDuration = parseInt(duration as string, 10) || 60;
      }

      // Buscar horários de funcionamento
      const businessHours = await storage.getBusinessHours(tenant.id);
      
      // Obter dia da semana
      const dateObj = new Date(date as string + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();

      // Encontrar horários de funcionamento para este dia
      const dayBusinessHours = businessHours.filter(
        bh => bh.dayOfWeek === dayOfWeek && bh.active
      );

      if (dayBusinessHours.length === 0) {
        return res.json({
          date: date,
          closed: true,
          message: "Fechado neste dia",
          availableSlots: [],
        });
      }

      // Buscar agendamentos existentes no dia
      const appointments = await storage.getAppointmentsByDateRange(
        tenant.id,
        date as string,
        date as string
      );

      // Calcular slots ocupados
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const minutesToTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };

      // Calcular duração de cada agendamento existente
      const occupiedSlots: { start: number; end: number }[] = [];
      for (const apt of appointments) {
        const aptDuration = await storage.getAppointmentTotalDuration(apt.id);
        const startMinutes = timeToMinutes(apt.time);
        const endMinutes = startMinutes + (aptDuration || 60);
        occupiedSlots.push({ start: startMinutes, end: endMinutes });
      }

      // Gerar slots disponíveis (intervalos de 30 minutos)
      const slotInterval = 30;
      const availableSlots: string[] = [];

      for (const bh of dayBusinessHours) {
        const startMinutes = timeToMinutes(bh.startTime);
        const endMinutes = timeToMinutes(bh.endTime);

        for (let slot = startMinutes; slot + totalDuration <= endMinutes; slot += slotInterval) {
          const slotEnd = slot + totalDuration;
          
          // Verificar se há conflito com agendamentos existentes
          const hasConflict = occupiedSlots.some(occupied => 
            (slot >= occupied.start && slot < occupied.end) ||
            (slotEnd > occupied.start && slotEnd <= occupied.end) ||
            (slot <= occupied.start && slotEnd >= occupied.end)
          );

          if (!hasConflict) {
            availableSlots.push(minutesToTime(slot));
          }
        }
      }

      // Remover duplicatas e ordenar
      const uniqueSlots = [...new Set(availableSlots)].sort();

      res.json({
        date: date,
        closed: false,
        businessHours: dayBusinessHours.map(bh => ({
          startTime: bh.startTime,
          endTime: bh.endTime,
        })),
        requiredDuration: totalDuration,
        availableSlots: uniqueSlots,
      });
    } catch (error: any) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar disponibilidade" });
    }
  });

  // GET /api/menu/:slug/client/:phone/appointments - Buscar agendamentos do cliente (público)
  app.get("/api/menu/:slug/client/:phone/appointments", async (req, res) => {
    try {
      const { slug, phone } = req.params;
      const normalizedSlug = slug.toLowerCase();
      
      // Buscar tenant pelo slug
      const tenant = await storage.getTenantByMenuSlug(normalizedSlug);
      if (!tenant || !tenant.active) {
        return res.status(404).json({ error: "Estabelecimento não encontrado" });
      }

      // Limpar telefone - apenas números
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: "Telefone inválido" });
      }

      // Buscar cliente pelo telefone
      const client = await storage.getClientByPhone(cleanPhone, tenant.id);
      if (!client) {
        return res.json({ appointments: [], history: [] });
      }

      // Buscar agendamentos do cliente
      const today = new Date().toISOString().split('T')[0];
      const futureEnd = new Date();
      futureEnd.setMonth(futureEnd.getMonth() + 3);
      const futureEndStr = futureEnd.toISOString().split('T')[0];

      const appointments = await storage.getAppointmentsByDateRange(
        tenant.id,
        '2020-01-01', // Buscar desde o início
        futureEndStr,
        client.id
      );

      // Separar ativos e histórico
      // Histórico mostra APENAS concluídos ou cancelados
      const historyStatuses = ['completed', 'cancelled'];
      
      const activeAppointments = appointments.filter(apt => 
        !historyStatuses.includes(apt.status)
      );
      const historyAppointments = appointments.filter(apt => 
        historyStatuses.includes(apt.status)
      );

      const formatAppointment = async (apt: any) => {
        const services = await storage.getAppointmentServices(apt.id);
        return {
          id: apt.id,
          date: apt.date,
          time: apt.time,
          status: apt.status,
          duration: apt.duration,
          notes: apt.notes,
          services: services.map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            value: parseFloat(String(s.value)),
          })),
        };
      };

      const formattedActive = await Promise.all(activeAppointments.map(formatAppointment));
      const formattedHistory = await Promise.all(historyAppointments.map(formatAppointment));

      res.json({
        appointments: formattedActive.sort((a, b) => 
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        ),
        history: formattedHistory.sort((a, b) => 
          b.date.localeCompare(a.date) || b.time.localeCompare(a.time)
        ).slice(0, 10), // Últimos 10
      });
    } catch (error: any) {
      console.error("Error fetching client appointments:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar agendamentos" });
    }
  });

  // POST /api/menu/:slug/appointments - Criar agendamento público (sem autenticação)
  app.post("/api/menu/:slug/appointments", async (req, res) => {
    try {
      const { slug } = req.params;
      const normalizedSlug = slug.toLowerCase();
      
      // Buscar tenant pelo slug
      const tenant = await storage.getTenantByMenuSlug(normalizedSlug);
      if (!tenant || !tenant.active) {
        return res.status(404).json({ error: "Estabelecimento não encontrado" });
      }

      // Verificar se é tipo de serviços
      if (tenant.menuType !== 'services') {
        return res.status(400).json({ error: "Este estabelecimento não trabalha com agendamentos" });
      }

      // Verificar módulos necessários
      const modules = await storage.getTenantAllowedModules(tenant.id);
      if (!modules.includes('services') || !modules.includes('appointments')) {
        return res.status(400).json({ error: "Agendamentos não habilitados" });
      }

      const { client, serviceIds, date, time, notes } = req.body;

      // Validar dados obrigatórios
      if (!client?.name || !client?.phone) {
        return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
      }
      if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ error: "Selecione pelo menos um serviço" });
      }
      if (!date || !time) {
        return res.status(400).json({ error: "Data e horário são obrigatórios" });
      }

      // Validar formato de data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: "Formato de data inválido. Use YYYY-MM-DD" });
      }

      // Validar formato de hora
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(time)) {
        return res.status(400).json({ error: "Formato de hora inválido. Use HH:MM" });
      }

      // Verificar se os serviços existem e calcular duração total
      let totalDuration = 0;
      for (const serviceId of serviceIds) {
        const service = await storage.getService(serviceId, tenant.id);
        if (!service) {
          return res.status(404).json({ error: `Serviço não encontrado: ${serviceId}` });
        }
        totalDuration += service.duration;
      }

      // Verificar disponibilidade do horário
      const timeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const slotStart = timeToMinutes(time);
      const slotEnd = slotStart + totalDuration;

      // Verificar horário de funcionamento
      const businessHours = await storage.getBusinessHours(tenant.id);
      const dateObj = new Date(date + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();
      
      const dayBusinessHours = businessHours.filter(
        bh => bh.dayOfWeek === dayOfWeek && bh.active
      );

      if (dayBusinessHours.length === 0) {
        return res.status(400).json({ 
          error: "Fechado neste dia",
          message: "O estabelecimento não funciona neste dia." 
        });
      }

      // Verificar se o horário está dentro do expediente
      const isWithinBusinessHours = dayBusinessHours.some(bh => {
        const bhStart = timeToMinutes(bh.startTime);
        const bhEnd = timeToMinutes(bh.endTime);
        return slotStart >= bhStart && slotEnd <= bhEnd;
      });

      if (!isWithinBusinessHours) {
        return res.status(400).json({ 
          error: "Horário fora do expediente",
          message: "O horário escolhido está fora do horário de funcionamento." 
        });
      }

      // Buscar agendamentos existentes no dia
      const existingAppointments = await storage.getAppointmentsByDateRange(
        tenant.id,
        date,
        date
      );

      // Verificar conflitos
      for (const apt of existingAppointments) {
        const aptDuration = await storage.getAppointmentTotalDuration(apt.id);
        const aptStart = timeToMinutes(apt.time);
        const aptEnd = aptStart + (aptDuration || 60);

        const hasConflict = (slotStart >= aptStart && slotStart < aptEnd) ||
                           (slotEnd > aptStart && slotEnd <= aptEnd) ||
                           (slotStart <= aptStart && slotEnd >= aptEnd);

        if (hasConflict) {
          return res.status(409).json({ 
            error: "Horário indisponível",
            message: "Já existe um agendamento neste horário. Por favor, escolha outro horário." 
          });
        }
      }

      // Limpar telefone
      const cleanPhone = client.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: "Telefone inválido" });
      }

      // Verificar/criar cliente pelo telefone
      let existingClient = await storage.getClientByPhone(cleanPhone, tenant.id);
      if (!existingClient) {
        existingClient = await storage.createClient({
          tenantId: tenant.id,
          name: client.name,
          phone: cleanPhone,
        });
      } else {
        // Atualizar nome se diferente
        if (existingClient.name !== client.name) {
          await storage.updateClient(existingClient.id, tenant.id, { name: client.name });
        }
      }

      // Criar agendamento
      const appointment = await storage.createAppointment({
        tenantId: tenant.id,
        clientId: existingClient.id,
        date: date,
        time: time,
        status: 'pending',
        notes: notes || null,
        professionalId: null,
        serviceIds: serviceIds,
      });

      // Buscar serviços adicionados
      const appointmentServices = await storage.getAppointmentServices(appointment.id);
      const totalValue = appointmentServices.reduce((sum, s) => sum + parseFloat(String(s.value)), 0);

      res.status(201).json({
        success: true,
        appointmentId: appointment.id,
        message: "Agendamento realizado com sucesso!",
        appointment: {
          id: appointment.id,
          date: appointment.date,
          time: appointment.time,
          duration: appointment.duration,
          status: appointment.status,
          services: appointmentServices.map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            value: parseFloat(String(s.value)),
          })),
          totalValue: totalValue,
        },
      });
    } catch (error: any) {
      console.error("Error creating public appointment:", error);
      res.status(500).json({ error: error.message || "Erro ao criar agendamento" });
    }
  });

  // ===========================================
  // ROTAS DE CONFIGURAÇÃO DO CARDÁPIO (COM AUTENTICAÇÃO)
  // ===========================================

  // GET /api/menu-settings - Obter configurações do cardápio
  app.get("/api/menu-settings", authenticateRequest, requireModule("public-menu"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant não encontrado" });
      }

      res.json({
        menuSlug: tenant.menuSlug,
        menuLogoUrl: tenant.menuLogoUrl,
        menuBrandColor: tenant.menuBrandColor || '#ea7c3f',
        menuBannerUrl: tenant.menuBannerUrl,
        menuType: tenant.menuType || 'delivery',
        minOrderValue: tenant.minOrderValue ? parseFloat(String(tenant.minOrderValue)) : null,
      });
    } catch (error: any) {
      console.error("Error fetching menu settings:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar configurações" });
    }
  });

  // PUT /api/menu-settings - Atualizar configurações do cardápio
  app.put("/api/menu-settings", authenticateRequest, requireModule("public-menu"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { menuSlug, menuLogoUrl, menuBrandColor, menuBannerUrl, menuType, minOrderValue } = req.body;

      // Validar slug
      if (menuSlug) {
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(menuSlug)) {
          return res.status(400).json({ 
            error: "Slug inválido. Use apenas letras minúsculas, números e hífens." 
          });
        }

        // Verificar se slug já existe (de outro tenant)
        const existingTenant = await storage.getTenantByMenuSlug(menuSlug);
        if (existingTenant && existingTenant.id !== tenantId) {
          return res.status(400).json({ error: "Este endereço já está em uso" });
        }
      }

      // Validar menuType
      if (menuType && !['delivery', 'services'].includes(menuType)) {
        return res.status(400).json({ 
          error: "Tipo de menu inválido. Use 'delivery' ou 'services'." 
        });
      }

      const updated = await storage.updateTenant(tenantId, {
        menuSlug: menuSlug || null,
        menuLogoUrl: menuLogoUrl || null,
        menuBrandColor: menuBrandColor || '#ea7c3f',
        menuBannerUrl: menuBannerUrl || null,
        menuType: menuType || 'delivery',
        minOrderValue: minOrderValue ? String(minOrderValue) : null,
      });

      if (!updated) {
        return res.status(404).json({ error: "Tenant não encontrado" });
      }

      res.json({
        menuSlug: updated.menuSlug,
        menuLogoUrl: updated.menuLogoUrl,
        menuBrandColor: updated.menuBrandColor,
        menuBannerUrl: updated.menuBannerUrl,
        menuType: updated.menuType,
        minOrderValue: updated.minOrderValue ? parseFloat(String(updated.minOrderValue)) : null,
      });
    } catch (error: any) {
      console.error("Error updating menu settings:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar configurações" });
    }
  });

  // ===========================================
  // ROTAS DE BAIRROS DE ENTREGA (COM AUTENTICAÇÃO)
  // ===========================================

  // GET /api/delivery-neighborhoods - Listar bairros
  app.get("/api/delivery-neighborhoods", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const activeOnly = req.query.active === 'true';
      const neighborhoods = activeOnly 
        ? await storage.getActiveDeliveryNeighborhoods(tenantId)
        : await storage.getAllDeliveryNeighborhoods(tenantId);

      res.json(neighborhoods.map(n => ({
        ...n,
        deliveryFee: parseFloat(String(n.deliveryFee)),
      })));
    } catch (error: any) {
      console.error("Error fetching neighborhoods:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar bairros" });
    }
  });

  // POST /api/delivery-neighborhoods - Criar bairro
  app.post("/api/delivery-neighborhoods", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { name, deliveryFee, isActive } = req.body;

      if (!name || deliveryFee === undefined) {
        return res.status(400).json({ error: "Nome e taxa de entrega são obrigatórios" });
      }

      const neighborhood = await storage.createDeliveryNeighborhood({
        name,
        deliveryFee: Number(deliveryFee),
        isActive: isActive ?? true,
        tenantId,
      });

      res.status(201).json({
        ...neighborhood,
        deliveryFee: parseFloat(String(neighborhood.deliveryFee)),
      });
    } catch (error: any) {
      console.error("Error creating neighborhood:", error);
      res.status(500).json({ error: error.message || "Erro ao criar bairro" });
    }
  });

  // PUT /api/delivery-neighborhoods/:id - Atualizar bairro
  app.put("/api/delivery-neighborhoods/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { name, deliveryFee, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (deliveryFee !== undefined) updateData.deliveryFee = Number(deliveryFee);
      if (isActive !== undefined) updateData.isActive = isActive;

      const neighborhood = await storage.updateDeliveryNeighborhood(req.params.id, tenantId, updateData);
      if (!neighborhood) {
        return res.status(404).json({ error: "Bairro não encontrado" });
      }

      res.json({
        ...neighborhood,
        deliveryFee: parseFloat(String(neighborhood.deliveryFee)),
      });
    } catch (error: any) {
      console.error("Error updating neighborhood:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar bairro" });
    }
  });

  // DELETE /api/delivery-neighborhoods/:id - Excluir bairro
  app.delete("/api/delivery-neighborhoods/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const deleted = await storage.deleteDeliveryNeighborhood(req.params.id, tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Bairro não encontrado" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting neighborhood:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir bairro" });
    }
  });

  // ===========================================
  // ROTAS DE ADICIONAIS DE PRODUTOS (COM AUTENTICAÇÃO)
  // ===========================================

  // GET /api/product-addons - Listar adicionais
  app.get("/api/product-addons", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const productId = req.query.productId as string;
      const addons = productId
        ? await storage.getProductAddons(productId, tenantId)
        : await storage.getAllProductAddons(tenantId);

      res.json(addons.map(a => ({
        ...a,
        price: parseFloat(String(a.price)),
      })));
    } catch (error: any) {
      console.error("Error fetching addons:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar adicionais" });
    }
  });

  // POST /api/product-addons - Criar adicional
  app.post("/api/product-addons", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { productId, name, price, isRequired, maxQuantity, isActive } = req.body;

      if (!productId || !name || price === undefined) {
        return res.status(400).json({ error: "Produto, nome e preço são obrigatórios" });
      }

      // Verificar se o produto existe
      const product = await storage.getProduct(productId, tenantId);
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      const addon = await storage.createProductAddon({
        productId,
        name,
        price: Number(price),
        isRequired: isRequired ?? false,
        maxQuantity: maxQuantity ?? 1,
        isActive: isActive ?? true,
        tenantId,
      });

      res.status(201).json({
        ...addon,
        price: parseFloat(String(addon.price)),
      });
    } catch (error: any) {
      console.error("Error creating addon:", error);
      res.status(500).json({ error: error.message || "Erro ao criar adicional" });
    }
  });

  // PUT /api/product-addons/:id - Atualizar adicional
  app.put("/api/product-addons/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { name, price, isRequired, maxQuantity, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = Number(price);
      if (isRequired !== undefined) updateData.isRequired = isRequired;
      if (maxQuantity !== undefined) updateData.maxQuantity = maxQuantity;
      if (isActive !== undefined) updateData.isActive = isActive;

      const addon = await storage.updateProductAddon(req.params.id, tenantId, updateData);
      if (!addon) {
        return res.status(404).json({ error: "Adicional não encontrado" });
      }

      res.json({
        ...addon,
        price: parseFloat(String(addon.price)),
      });
    } catch (error: any) {
      console.error("Error updating addon:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar adicional" });
    }
  });

  // DELETE /api/product-addons/:id - Excluir adicional
  app.delete("/api/product-addons/:id", authenticateRequest, requireModule("inventory"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const deleted = await storage.deleteProductAddon(req.params.id, tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Adicional não encontrado" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting addon:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir adicional" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
