import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// SEGURANÇA: Rate Limiting para prevenir ataques de força bruta
// 1. Limitador para endpoints de autenticação (login, cadastro)
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // 5 tentativas por janela
  message: { 
    error: 'Muitas tentativas de autenticação. Tente novamente em 10 minutos.' 
  },
  standardHeaders: true, // Headers RFC-compliant (RateLimit-*)
  legacyHeaders: false, // Desabilitar headers antigos (X-RateLimit-*)
  skipSuccessfulRequests: true, // Não contar logins bem-sucedidos
  handler: (req, res) => {
    log(`⚠️  Rate limit atingido: ${req.ip} em ${req.path}`);
    res.status(429).json({
      error: 'Muitas tentativas de autenticação. Tente novamente em 10 minutos.',
      retryAfter: '10 minutos'
    });
  }
});

// 2. Limitador geral para API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log(`⚠️  Rate limit API: ${req.ip} em ${req.path}`);
    res.status(429).json({
      error: 'Muitas requisições. Tente novamente mais tarde.'
    });
  }
});

// 3. Limitador para uploads (operações pesadas)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 uploads por hora
  message: { error: 'Limite de uploads excedido. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log(`⚠️  Rate limit upload: ${req.ip} em ${req.path}`);
    res.status(429).json({
      error: 'Limite de uploads excedido. Tente novamente em 1 hora.'
    });
  }
});

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

// Configurar trust proxy APENAS quando há um proxy reverso confiável
// Em produção (Replit Deploy, Easypanel, etc), há um proxy reverso que define X-Forwarded-For
// Em desenvolvimento local SEM proxy, não devemos confiar em headers arbitrários
// Use ENABLE_TRUST_PROXY=true para habilitar manualmente se necessário
const shouldTrustProxy = process.env.ENABLE_TRUST_PROXY === 'true' || 
                         process.env.NODE_ENV === 'production';

if (shouldTrustProxy) {
  app.set('trust proxy', 1);
  console.log('🔒 Trust proxy habilitado (modo produção/proxy reverso)');
} else {
  console.log('⚠️  Trust proxy desabilitado (modo desenvolvimento)');
}

// SEGURANÇA CRÍTICA: SESSION_SECRET obrigatório em TODOS os ambientes
// Não há fallback - a aplicação DEVE falhar se SESSION_SECRET não estiver definido
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  console.error('\n❌ ERRO CRÍTICO DE SEGURANÇA ❌');
  console.error('SESSION_SECRET não está definido!');
  console.error('\nEm produção: Configure SESSION_SECRET com um valor secreto forte.');
  console.error('Em desenvolvimento: Use SESSION_SECRET=dev-secret-change-me ou similar.');
  console.error('\nA aplicação NÃO pode iniciar sem um SESSION_SECRET válido.\n');
  throw new Error('SESSION_SECRET é obrigatório. Configure esta variável de ambiente.');
}

// SEGURANÇA: Validar entropia mínima do SESSION_SECRET
if (sessionSecret.length < 32) {
  console.error('\n⚠️  AVISO DE SEGURANÇA ⚠️');
  console.error(`SESSION_SECRET muito curto (${sessionSecret.length} caracteres).`);
  console.error('Recomendado: mínimo 32 caracteres com alta entropia.');
  console.error('Use: openssl rand -base64 32 para gerar um secret seguro.\n');
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET muito curto para produção (mínimo 32 caracteres).');
  }
}

log(`🔒 SESSION_SECRET configurado (${sessionSecret.length} caracteres)`);

app.use(session({
  secret: sessionSecret, // SEM FALLBACK - sempre usa a variável de ambiente
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    httpOnly: true,
    // Em produção: secure=true (requer HTTPS), sameSite=strict (proteção CSRF)
    // Em desenvolvimento: secure=false (permite HTTP local)
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
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
  
  // Criar Master Admin via variáveis de ambiente
  const createMasterAdminFromEnv = async () => {
    try {
      // Verificar se já existe algum master admin
      const hasAdmin = await storage.hasMasterAdmin();
      
      if (!hasAdmin) {
        const isProduction = process.env.NODE_ENV === 'production';
        
        // Em produção: EXIGIR variáveis de ambiente (segurança)
        // Em desenvolvimento: Usar padrão para facilitar testes
        let username, password, name, email;
        
        if (isProduction) {
          // PRODUÇÃO: Variáveis de ambiente são OBRIGATÓRIAS
          username = process.env.MASTER_ADMIN_USERNAME;
          password = process.env.MASTER_ADMIN_PASSWORD;
          name = process.env.MASTER_ADMIN_NAME;
          email = process.env.MASTER_ADMIN_EMAIL;
          
          if (!username || !password) {
            log('⚠️  AVISO: Variáveis MASTER_ADMIN_USERNAME e MASTER_ADMIN_PASSWORD não configuradas!');
            log('⚠️  Master Admin NÃO foi criado. Configure as variáveis de ambiente.');
            return;
          }
        } else {
          // DESENVOLVIMENTO: Usar padrão (apenas para facilitar desenvolvimento local)
          username = process.env.MASTER_ADMIN_USERNAME || 'rafaelruch';
          password = process.env.MASTER_ADMIN_PASSWORD || 'RafaLoh27!';
          name = process.env.MASTER_ADMIN_NAME || 'Rafael Miguel';
          email = process.env.MASTER_ADMIN_EMAIL || 'rafael@ruch.com.br';
        }
        
        log('🔧 Criando Master Admin...');
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await storage.createUser({
          username,
          name: name || username,
          email: email || `${username}@agendapro.local`,
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
