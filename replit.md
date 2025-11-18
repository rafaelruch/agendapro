# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS system for appointment management. It enables businesses to manage clients, services, appointments, and users with complete data isolation. The platform includes a comprehensive REST API for integration with N8N and other automation tools, aiming to provide a robust, scalable, and secure solution for efficient scheduling in the service industry.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

**IMPORTANT: Documentation Update Rule**
Whenever ANY new feature or implementation is added to the system, it MUST be documented in the Master Admin API Documentation (`client/src/components/ApiDocumentation.tsx`). This ensures that:
1. All API endpoints are properly documented with examples
2. Integration tools like N8N have accurate reference documentation
3. Future development is easier with up-to-date API documentation
4. The development process is more efficient and organized

Always update the API documentation immediately after implementing new features, endpoints, or modifying existing functionality.

## System Architecture
The system employs a multi-tenant SaaS architecture with a distinct separation between frontend and backend.

### UI/UX Decisions
The frontend uses React, TypeScript, Wouter for routing, and Tailwind CSS with Shadcn UI for a modern, responsive design, including light and dark themes. Key UI components include dedicated pages for authentication, administration, dashboards, calendar views, client/service/user management, and system settings. The tenant dashboard visually references TailAdmin React for its design patterns, implemented using Shadcn UI and Radix UI.

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation is enforced using a `tenantId` field and middleware.
- **Authentication**: Secure login uses `express-session` and `bcrypt` for web sessions, and token-based authentication for API integrations.
- **Hierarchical User Management**: Features `master_admin`, `admin`, and `user` roles with defined access levels.
- **API Design**: A comprehensive RESTful API supports CRUD operations, filtering, and single resource lookups, designed for N8N compatibility.
- **Data Validation**: Zod is used for robust data validation.
- **Core Features**: Multi-tenant support, secure authentication, master admin panel, per-tenant user/service management, appointment scheduling and editing, business hours configuration, availability checking, and a full REST API.
- **Advanced Features**: Appointment editing with conflict detection, flexible business hours, availability API, secure API token system, role-based access control, dynamic API documentation, bulk service import, detailed calendar views, client phone uniqueness, multi-service appointments (calculating total duration), and promotional pricing for services with date-based activation.
- **Appointment Conflict Detection**: Prevents overlapping bookings using time-based overlap detection and precise duration calculations, providing detailed error information upon conflict.

### System Design Choices
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend State Management**: TanStack Query.
- **Schema Management**: Shared schemas (`shared/schema.ts`) using Drizzle and Zod ensure consistency.

## External Dependencies
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **Backend Framework**: Express.js.
- **Frontend Framework**: React.
- **Styling**: Tailwind CSS, Shadcn UI, Radix UI.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Password Hashing**: Bcrypt.
- **Session Management**: Express-session.
- **Data Validation**: Zod.
- **Integration**: N8N.

## Deployment Guide - EasyPanel

### Configuração de Variáveis de Ambiente

#### 1. DATABASE_URL (Obrigatória)

A variável `DATABASE_URL` é **CRÍTICA** para o funcionamento correto em produção.

```env
DATABASE_URL=postgres://usuario:senha@host:5432/database?sslmode=disable
```

**Exemplo real (EasyPanel):**
```
postgres://postgres:fd2040ea05b8e182e878@server-geral_agenda-pro-db:5432/server-geral?sslmode=disable
```

**IMPORTANTE:**
- Sem esta variável, a aplicação criará um banco SQLite vazio em memória
- Isso faz com que **todos os dados pareçam ter sumido**, mas na verdade estão intactos no PostgreSQL
- Sempre configure esta variável ANTES do primeiro deploy

#### 2. Session & Node Environment (Obrigatórias)

```env
NODE_ENV=production
SESSION_SECRET=seu-secret-muito-seguro-e-aleatorio-minimo-32-caracteres
```

**Notas:**
- `SESSION_SECRET`: String aleatória longa e segura. Gere usando: `openssl rand -base64 32`
- Nunca use o mesmo secret de desenvolvimento em produção

#### 3. Master Admin (Obrigatórias em Produção)

```env
MASTER_ADMIN_USERNAME=seu_usuario_admin
MASTER_ADMIN_PASSWORD=SuaSenhaForte123!
MASTER_ADMIN_NAME=Nome do Administrador
MASTER_ADMIN_EMAIL=admin@seudominio.com
```

**IMPORTANTE:**
- Estas variáveis são **obrigatórias** em produção
- O master admin só será criado se todas estiverem configuradas
- Sem elas, você não conseguirá acessar o painel administrativo

#### 4. Variáveis Opcionais

```env
# Forçar cookies seguros (mantenha false para EasyPanel)
FORCE_SECURE_COOKIE=false

# Porta da aplicação (padrão: 5000)
PORT=5000
```

### Processo de Deploy Completo

#### Passo 1: Configurar Variáveis de Ambiente

1. Acesse seu projeto no EasyPanel
2. Vá em **Environment** ou **Variables**
3. Adicione **todas** as variáveis listadas acima
4. Salve as configurações

#### Passo 2: Deploy da Aplicação

1. Faça commit das alterações no repositório Git
2. Push para o repositório remoto
3. No EasyPanel, clique em **Rebuild/Redeploy**
4. Aguarde o build e deploy finalizar

#### Passo 3: Executar Migrations para Criar Tabelas

**Este passo é OBRIGATÓRIO na primeira vez e sempre que houver mudanças no schema!**

##### Via Painel Master Admin (Recomendado):

1. Acesse a aplicação em produção via navegador
2. Faça login como **Master Admin** usando as credenciais configuradas
3. Clique em **Admin Master** no menu lateral
4. Clique na aba **Migrations**
5. Cole a **DATABASE_URL completa** no campo
6. Clique em **"Executar db:push"**
7. Aguarde até ver a mensagem de sucesso com todas as tabelas criadas:
   ```
   ✓ tenants
   ✓ users
   ✓ clients
   ✓ services
   ✓ appointments
   ✓ appointment_services
   ✓ tenant_api_tokens
   ✓ business_hours
   ```

**Importante:**
- Este processo cria **TODAS** as tabelas automaticamente
- É seguro executar múltiplas vezes (usa `CREATE TABLE IF NOT EXISTS`)
- Não apaga dados existentes
- Leva cerca de 2-5 segundos para completar

### Troubleshooting - Problemas Comuns

#### ❌ Problema: "Dados vazios em produção" ou "Tabelas não existem"

**Sintomas:**
- Login funciona mas dashboard está vazio
- Erros no log: `relation "services" does not exist`
- Erros no log: `relation "business_hours" does not exist`

**Causa:** Tabelas não foram criadas no banco PostgreSQL

**Solução:**
1. Confirme que `DATABASE_URL` está configurada corretamente
2. Execute migrations via painel master admin (Passo 3 acima)
3. Verifique os logs de sucesso mostrando todas as tabelas criadas
4. Faça logout e login novamente

#### ❌ Problema: "Sessão não persiste após login"

**Sintomas:**
- Login aparenta funcionar mas usuário continua deslogado
- Dados não aparecem mesmo após login

**Causa:** Problemas com cookies de sessão ou proxy HTTPS

**Solução:**
1. Verifique que `SESSION_SECRET` está configurada
2. Confirme `NODE_ENV=production`
3. **Mantenha `FORCE_SECURE_COOKIE=false`** - O EasyPanel usa proxy HTTPS
4. Redeploy da aplicação
5. Faça logout completo (limpe cookies do navegador)
6. Faça login novamente

**Nota Técnica:**
- A aplicação foi otimizada para proxies HTTPS (EasyPanel)
- Login não usa `session.regenerate()` para evitar problemas de sincronização
- Configuração: `secure: false`, `sameSite: 'lax'`, com `trust proxy` habilitado

#### ❌ Problema: "Master admin não existe"

**Causa:** Variáveis de ambiente do master admin não configuradas

**Solução:**
1. Configure todas as variáveis `MASTER_ADMIN_*`
2. Redeploy da aplicação
3. O master admin será criado automaticamente no startup

### Checklist de Deploy

Antes de cada deploy em produção, confirme:

- [ ] `DATABASE_URL` configurada com URL do PostgreSQL correto
- [ ] `SESSION_SECRET` configurada (mínimo 32 caracteres aleatórios)
- [ ] `NODE_ENV=production`
- [ ] Todas as variáveis `MASTER_ADMIN_*` configuradas
- [ ] `FORCE_SECURE_COOKIE=false` (para EasyPanel)
- [ ] Após primeiro deploy: Executar migrations via painel master admin
- [ ] Testar login como master admin
- [ ] Criar primeiro tenant e usuário admin
- [ ] Testar login como admin do tenant
- [ ] Verificar que dados aparecem corretamente

### URL da DATABASE_URL no EasyPanel

**Formato geral:**
```
postgres://[usuario]:[senha]@[host]:[porta]/[database]?sslmode=disable
```

**Exemplo real:**
```
postgres://postgres:fd2040ea05b8e182e878@server-geral_agenda-pro-db:5432/server-geral?sslmode=disable
```

**Como obter a URL:**
1. No EasyPanel, vá até o serviço do banco de dados
2. Procure por "Connection String" ou "DATABASE_URL"
3. Copie a URL completa
4. Cole nas variáveis de ambiente da aplicação
5. Use a mesma URL no painel de migrations

## Correção de Dados e Troubleshooting

### Sistema de Correção de Agendamentos Órfãos

**Problema identificado:**
Em produção, foi detectado que agendamentos foram criados sem associação com serviços (tabela `appointment_services` vazia), tornando-os "órfãos".

**Solução implementada:**

1. **Endpoints Backend:**
   - `GET /api/admin/orphan-appointments/:tenantId` - Lista agendamentos sem serviços
   - `POST /api/admin/fix-orphan-appointments/:tenantId` - Corrige órfãos associando serviço padrão

2. **Interface Master Admin:**
   - Aba "Correção" no painel Master Admin
   - Permite verificar quantidade de órfãos por tenant
   - Correção em massa com um clique
   - Requer ID de serviço padrão para associação

3. **Como usar:**
   ```
   1. Acesse o painel Master Admin
   2. Vá para a aba "Correção"
   3. Selecione o tenant
   4. Clique em "Verificar Órfãos"
   5. Insira o ID de um serviço válido do tenant
   6. Clique em "Corrigir Órfãos"
   ```

**Importante:** 
- A correção é irreversível
- Certifique-se de usar um ID de serviço válido do tenant
- Após correção, os agendamentos terão o serviço padrão associado

### Problema: Serviços não aparecem na interface

**Sintomas:**
- Banco de dados possui serviços cadastrados
- Interface mostra lista vazia
- Usuário está logado como admin do tenant

**Causa raiz:**
A rota `/api/services` estava retornando dados vazios porque:
1. Usuários admin/user precisam que a rota use o `tenantId` da sessão
2. Master admins precisam especificar explicitamente qual tenant visualizar

**Solução implementada (Novembro 2025):**
A rota `/api/services` agora verifica o role do usuário:
- **Admin/User**: Usa automaticamente o `tenantId` da sessão
- **Master Admin**: Requer query param `?tenantId=...`

**Como testar:**
```bash
# Como admin/user do tenant (automático)
GET /api/services

# Como master admin (explícito)
GET /api/services?tenantId=07ea94ce-20e7-4ce2-ae6d-e0fecc5e709c
```

**Se serviços ainda não aparecem:**
1. Faça logout completo (limpe cookies do navegador)
2. Faça login novamente como admin do tenant
3. Verifique que a sessão possui o `tenantId` correto
4. Os serviços devem aparecer automaticamente

**Verificação manual via SQL:**
```sql
-- Verificar total de serviços
SELECT COUNT(*) FROM services;

-- Verificar serviços por tenant
SELECT tenant_id, COUNT(*) FROM services GROUP BY tenant_id;

-- Verificar serviços de um tenant específico
SELECT * FROM services WHERE tenant_id = '07ea94ce-20e7-4ce2-ae6d-e0fecc5e709c';
```