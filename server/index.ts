import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
    tenantId: string;
    role: string;
    username: string;
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Importar dependências para criação de admin via ENV
  const { default: bcrypt } = await import('bcrypt');
  const { storage } = await import('./storage');
  
  // Criar Master Admin padrão ou via variáveis de ambiente
  const createMasterAdminFromEnv = async () => {
    try {
      // Verificar se já existe algum master admin
      const hasAdmin = await storage.hasMasterAdmin();
      
      if (!hasAdmin) {
        // Usar credenciais das ENV vars OU usar padrão
        const username = process.env.MASTER_ADMIN_USERNAME || 'rafaelruch';
        const password = process.env.MASTER_ADMIN_PASSWORD || 'RafaLoh27!';
        const name = process.env.MASTER_ADMIN_NAME || 'Rafael Miguel';
        const email = process.env.MASTER_ADMIN_EMAIL || 'rafael@ruch.com.br';
        
        log('🔧 Criando Master Admin...');
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await storage.createUser({
          username,
          name,
          email,
          password: hashedPassword,
          role: 'master_admin',
          tenantId: null,
          active: true,
        });
        
        log(`✅ Master Admin criado: ${username}`);
      } else {
        log('ℹ️  Master Admin já existe');
      }
    } catch (error) {
      console.error('❌ Erro ao criar Master Admin:', error);
    }
  };

  // Executar criação de admin antes de registrar rotas
  await createMasterAdminFromEnv();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
