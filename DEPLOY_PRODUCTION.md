# Guia de Deploy para Produção - AgendaPro

## 1. Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Easypanel:

```env
# Banco de Dados PostgreSQL (obrigatório)
DATABASE_URL=postgresql://usuario:senha@host:5432/agendapro

# Segurança da Sessão (obrigatório - mínimo 32 caracteres)
SESSION_SECRET=sua_chave_secreta_muito_longa_e_segura_aqui_12345

# Proxy reverso (para Easypanel/produção)
ENABLE_TRUST_PROXY=true

# Porta (geralmente 5000 ou configurada pelo Easypanel)
PORT=5000

# Ambiente
NODE_ENV=production
```

### Gerando um SESSION_SECRET seguro

Execute no terminal:
```bash
openssl rand -base64 48
```

---

## 2. Script SQL para Criar o Banco de Dados

Execute o seguinte SQL no seu PostgreSQL de produção:

```sql
-- =====================================================
-- AgendaPro - Script de Criação do Banco de Dados
-- Versão: Dezembro 2025
-- =====================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================== TENANTS ====================
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== CLIENTS ====================
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birthdate TEXT,
    UNIQUE(tenant_id, phone)
);

-- ==================== CLIENT ADDRESSES ====================
CREATE TABLE IF NOT EXISTS client_addresses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Casa',
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    zip_code TEXT,
    reference TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== SERVICES ====================
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

-- ==================== APPOINTMENTS ====================
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    professional_id VARCHAR,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== APPOINTMENT SERVICES ====================
CREATE TABLE IF NOT EXISTS appointment_services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id VARCHAR NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE
);

-- ==================== TENANT API TOKENS ====================
CREATE TABLE IF NOT EXISTS tenant_api_tokens (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP
);

-- ==================== BUSINESS HOURS ====================
CREATE TABLE IF NOT EXISTS business_hours (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== PROFESSIONALS ====================
CREATE TABLE IF NOT EXISTS professionals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== PROFESSIONAL SERVICES ====================
CREATE TABLE IF NOT EXISTS professional_services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE
);

-- ==================== PROFESSIONAL SCHEDULES ====================
CREATE TABLE IF NOT EXISTS professional_schedules (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
);

-- ==================== TENANT MODULE PERMISSIONS ====================
CREATE TABLE IF NOT EXISTS tenant_module_permissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(tenant_id, module_id)
);

-- ==================== PRODUCTS (INVENTORY) ====================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    manage_stock BOOLEAN NOT NULL DEFAULT false,
    quantity INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ORDERS ====================
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_address_id VARCHAR REFERENCES client_addresses(id) ON DELETE SET NULL,
    order_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    delivery_street TEXT,
    delivery_number TEXT,
    delivery_complement TEXT,
    delivery_neighborhood TEXT,
    delivery_city TEXT,
    delivery_zip_code TEXT,
    delivery_reference TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- ==================== INDEXES PARA PERFORMANCE ====================
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_client_addresses_client ON client_addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_professionals_tenant ON professionals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
```

---

## 3. Checklist de Deploy no Easypanel

### Passo a Passo:

1. **Criar banco PostgreSQL**
   - No Easypanel, crie um serviço PostgreSQL
   - Anote a connection string (DATABASE_URL)

2. **Executar o SQL**
   - Conecte ao banco via psql, DBeaver, ou pgAdmin
   - Execute o script SQL acima

3. **Configurar variáveis de ambiente**
   - Adicione todas as variáveis listadas acima
   - Gere um SESSION_SECRET forte

4. **Deploy da aplicação**
   - Configure o build command: `npm run build`
   - Configure o start command: `npm start`
   - Porta: 5000

5. **Primeiro acesso**
   - Acesse a URL da aplicação
   - O sistema criará automaticamente o Master Admin
   - Credenciais padrão: `admin` / `Admin@123`
   - **IMPORTANTE**: Altere a senha imediatamente!

---

## 4. Comandos Úteis

### Build para produção:
```bash
npm run build
```

### Iniciar em produção:
```bash
npm start
```

### Sincronizar schema (desenvolvimento):
```bash
npm run db:push
```

---

## 5. Segurança em Produção

- [ ] SESSION_SECRET com mínimo 32 caracteres aleatórios
- [ ] HTTPS habilitado (Easypanel gerencia automaticamente)
- [ ] Alterar senha do Master Admin após primeiro login
- [ ] Backup regular do banco de dados
- [ ] Monitorar logs de acesso

---

## 6. Migração de Dados (Opcional)

Se você já tem dados no banco de desenvolvimento e quer migrar:

```bash
# Exportar dados do desenvolvimento
pg_dump -h host_dev -U usuario -d banco_dev > backup.sql

# Importar no produção
psql -h host_prod -U usuario -d banco_prod < backup.sql
```

---

## Suporte

Para dúvidas sobre o deploy, consulte a documentação do Easypanel ou entre em contato.
